# Verifier Agent Optimization — Design Spec

- **Date:** 2026-06-06
- **Status:** Approved design — ready for implementation plan
- **Owner:** Andy
- **Related files:** `.claude/agents/verifier-agent.md`, `.claude/agents/builder-agent.md`, `.claude/skills/itpm-execute/SKILL.md`, `.claude/CONTEXT.md`

## 1. Motivation

The verifier agent is the most important checkpoint in FRED's development lifecycle:
it is the gate that decides whether builder-agent output actually satisfies a story's
acceptance criteria (A/C). Today it does a competent static + API + UI review, but:

- It has no **shared, executable definition of "done"** — it re-derives success from the
  diff each run, so the builder and verifier can disagree about what the bar even is.
- Its build/verify loop (in `itpm-execute`) is **unbounded** ("repeat until verifier
  passes"), with no evidence gate and no separation of in-scope failures from
  out-of-scope discoveries.
- Several checks Andy does by hand are not encoded: read-only code review, network
  waterfall sanity, backend compile + runtime-log scan, explicit loading/error/empty
  state verification, and capturing out-of-scope discoveries into the backlog.

**Goal:** make the verifier do — deterministically — what Andy does by hand: confirm the
work is testable against the A/C, compiles cleanly, has been exercised (static + API +
UI), genuinely fulfills the story description, and that any newly discovered work is
routed to the backlog.

## 2. Locked Decisions

These were decided during brainstorming and are not open for re-litigation in the plan:

1. **Control flow = bounded fix-loop** (not "converse until they agree"). The verifier
   stays an independent, adversarial check. Two feedback channels that never mix:
   in-scope A/C failures go through a capped builder fix-loop; out-of-scope discoveries
   go to the backlog. The verdict terminates on **objective evidence**, never on
   "agreement."
2. **Test model = Manifest + selective xUnit.** An Acceptance Check Manifest is always
   produced (one executable pass-condition per A/C item). Real JUnit is written for
   backend service/business logic and Jasmine for pure frontend utils. UI stays
   manifest-only (screenshot + network + console assertions).
3. **Scope = core first.** Phase 1 (this spec) ships the Manifest contract, the bounded
   fix-loop, and the low-infra verifier upgrades. The iOS-simulator path and isolated
   worktree verification are documented as Phase 2 and deferred.
4. **Loading/error/empty checks = hybrid.** Always static-assert that a styled
   loading/error/empty branch exists. Additionally runtime-force + screenshot those
   states only when the story's A/C is specifically about them.

## 3. Phase 1 Design

### 3.A. The Acceptance Check Manifest — the shared contract

A structured artifact, one entry per A/C item. The orchestrator generates it, the builder
satisfies it, the verifier executes it. It is the single source of truth for "done."

- **Location:** `.claude/agent-memory/manifest-<story-id>.md` (use `manifest.md` if no
  story ID is in play, mirroring the builder's implementation-notes convention).
- **Format:**

  ```
  ## AC-1: <the acceptance criterion, restated>
  - Type:     backend-unit | frontend-unit | api-integration | ui-acceptance
  - Check:    <concrete, executable pass-condition>
  - Evidence: <artifact that proves it — JUnit test name / curl assertion /
               screenshot path + network assertion>
  - Status:   pending        # verifier flips to pass | fail
  ```

- **Lifecycle:**
  1. **Generated** in `itpm-execute` **Step B** — it already reads the story's A/C from
     `backlog.md` there, so no change to the planning skill (`.claude/skills/itpm/SKILL.md`)
     is required. For manual (non-itpm) runs, the orchestrating session generates it from
     the A/C before dispatching the builder.
  2. **Read by the builder** before coding. The builder writes code + the selective xUnit
     tests so each check can pass, and self-fills the `Status` of any check it can verify
     on its own. It must not return a story with self-verifiable checks still `pending`.
  3. **Executed by the verifier.** It flips each `Status` to `pass`/`fail` and attaches an
     `Evidence` artifact for every `pass`.
- **Evidence gate (the determinism win):** an `APPROVED` verdict **requires every check
  to be `pass` with an attached evidence artifact.** No artifact ⇒ that item cannot be
  approved. This is the concrete encoding of "what success constraint tells the builder
  the code accomplished the A/C."

### 3.B. The bounded fix-loop

Replaces `itpm-execute` Step C item 7 ("repeat until verifier passes"). The builder and
verifier never talk directly — the orchestrator (`itpm-execute`, or the main session for
manual runs) mediates, which is what keeps the loop bounded and evidence-gated.

1. Orchestrator → **builder** with: story ID/title, approved approach (verbatim), A/C, and
   the manifest.
2. Builder implements, writes selective xUnit, self-fills the checks it can, returns.
3. Orchestrator → **verifier** with: the diff + the manifest. The verifier flips each
   `Status`, attaches evidence, and returns:
   - a verdict (`APPROVED` / `REVISION REQUIRED`),
   - **in-scope failures** (manifest checks that are `fail`, compile errors, broken tests),
   - **out-of-scope discoveries** (drafted backlog items).
4. If `REVISION REQUIRED` **and** cycle < **N (default 2)** → orchestrator hands **only the
   in-scope failures** back to the builder ("fix exactly these"). Builder fixes, returns.
   Go to step 3 (re-verify).
5. If still `REVISION REQUIRED` after N cycles → **escalate to Andy** via the existing
   `data-state="failed"` path in `today.html` (plain-language failure detail, log to
   `routine_memory.md`, PushNotification). Do **not** keep looping.
6. **Out-of-scope discoveries** → drafted as backlog items and surfaced for Andy's
   confirmation. They are **never** handed to the builder as fixes and **never** block the
   verdict.

**Guarantees:** termination on evidence (checks pass), not agreement; verifier
independence preserved; bounded token cost; out-of-scope work captured without
scope-creeping the build.

### 3.C. Low-infra verifier upgrades

Added to the verifier's existing three phases. All preserve the report-only invariant.

- **Phase 1 — Static review (additions):**
  - **Backend compile:** if backend files changed, run `./gradlew compileJava` (and
    `compileTestJava` if test sources changed). Any compile error is an immediate
    `REVISION REQUIRED`, mirroring the existing `tsc --noEmit` gate. Do not proceed to
    later phases on a compile failure.
  - **Selective xUnit run:** run the manifest's `backend-unit` / `frontend-unit` checks
    (`./gradlew test --tests <Class>` for backend; `ng test --include <spec> --watch=false
    --browsers=ChromeHeadless` for frontend). Failures become in-scope failures.
  - **Read-only `/code-review`:** run `/code-review` (NOT `ultra`, NOT `--fix`) on the
    diff. Route its findings: A/C-relevant correctness issues → in-scope failures;
    everything else → out-of-scope backlog drafts. `/simplify` is explicitly forbidden
    here — it mutates the working tree and would break the report-only invariant.
- **Phase 2 — API integration (addition):**
  - **Backend runtime-log scan:** after exercising the changed endpoints, scan the
    `bootRun` output (see open question 6.3) for stack traces / `ERROR` lines tied to
    those endpoints. Any found → flag.
- **Phase 3 — UI verification (additions):**
  - **Network-waterfall sanity** (the narrowed "core web vitals"): from
    `read_network_requests`, assert no 4xx/5xx on relevant calls, no duplicate identical
    calls, no calls that should not fire, and non-empty/sane payloads. Explicitly **not**
    LCP/FCP/INP vanity metrics — they are low-value for an authenticated, data-driven app.
  - **Console scan:** widen the existing error scan to include **warnings** on the changed
    route.
  - **Loading/error/empty (hybrid):** always statically confirm the changed component has
    a styled loading + error + empty branch (read the template + SCSS against the design
    system). Additionally, **only when the A/C is about those states**, runtime-force them
    — Chrome `javascript_tool` overriding `fetch`/XHR to reject (→ error state), forced
    empty response or no-data path (→ empty state) — and screenshot each, confirming a
    styled state renders (not a stuck spinner or a raw error string).
  - **Exploratory click-around:** after verifying the A/C, briefly click through the
    affected area, noting discrepancies/issues even if unrelated, and draft them as
    out-of-scope backlog items (automating Andy's manual habit).
- **Tiering by diff scope (cost control, extends the existing skip philosophy):**
  - Frontend-only diff → skip backend compile + runtime-log scan.
  - Backend-only diff → skip Phase 3 UI unless a consumed API contract changed.
  - Trivial/copy-only change → skip `/code-review` and the exploratory pass.

### 3.D. Builder TDD change (`builder-agent.md`)

- Read the manifest **before** coding.
- For **backend service/business logic and pure frontend utils**: write the failing test
  first, then implement to green (invoke `superpowers:test-driven-development` for those
  units).
- For **UI**: satisfy the manifest's `ui-acceptance` checks (no Karma requirement imposed
  on components).
- Do not return a story with self-verifiable manifest checks still `pending`.
- On a fix-loop handback, fix **only** the flagged in-scope failures — no re-architecting
  or unsolicited refactors.

### 3.E. Invariants preserved

- Verifier stays **report-only** on `/backend` and `/frontend` — the builder makes every
  source fix. The fix-loop does not change this.
- Verifier `Write` stays scoped to: `/test/` (curl additions, screenshots), the manifest
  `Status`/`Evidence`, backlog drafts, and `.claude/agent-memory/findings.md`.
- `/simplify` is never run by the verifier (mutates the tree). `/code-review` is run
  read-only (no `--fix`, never `ultra`).

## 4. Files Touched (Phase 1)

- `.claude/agents/verifier-agent.md` — manifest execution + evidence-gated verdict; the
  new per-phase checks; tiering; in-scope/out-of-scope separation in the output format;
  backlog drafting.
- `.claude/agents/builder-agent.md` — manifest-first workflow; selective TDD; fix-only-
  flagged-failures on handback.
- `.claude/skills/itpm-execute/SKILL.md` — generate the manifest in Step B; replace the
  unbounded loop in Step C item 7 with the bounded, evidence-gated fix-loop (cap N=2,
  channel separation, escalation, backlog-draft confirmation).
- `.claude/CONTEXT.md` — document the Manifest format and the bounded-loop procedure in
  the Agents section, so manual (non-itpm) runs follow the same contract.

## 5. Phase 2 (documented, NOT built in this work)

- **iOS simulator verification** via `xcrun simctl` (boot a simulator, install the
  Capacitor-built `.app`, `simctl io screenshot`). Gated to diffs that touch
  native/Capacitor/Lottie/passkey code; Chrome remains the default fast path for
  everything else. Chosen over a new simulator MCP because there is none connected today
  and a Bash-driven `simctl` flow is deterministic and needs no new install.
- **Isolated worktree verification.** The real blocker is that
  `frontend/src/environments/environment.ts` pins `backendApiUrl` to
  `https://local.fredvested.com/api`, so a worktree frontend on an alternate port still
  routes its API calls through the tunnel to the **primary** backend on :8080 — the
  worktree's backend changes never get exercised. Fix: add a `local-direct` Angular serve
  configuration whose `backendApiUrl` points at the worktree's backend port
  (`http://localhost:<port>/api`); have the verifier load the worktree frontend directly
  via the Chrome MCP (auth bypassed by `?devPage=`/`?testing=true`, so the `rpId` passkey
  mismatch on localhost is moot). The Cloudflare tunnel stays pinned to the primary copy
  for Andy's own phone testing — do not try to make one named tunnel serve N worktrees.

## 6. Open Questions / Caveats (resolve during implementation)

1. **Karma/Jasmine green state.** The harness is already fully scaffolded (deps,
   `angular.json` test target, `karma.conf.js`, `src/test.ts`, `tsconfig.spec.json`, and
   15 existing `.spec.ts` files). The open question is whether `ng test` currently runs
   green or has bit-rotted (CLI-generated default specs often fail once components gain
   `HttpClient`/`Router`/Ionic dependencies). Confirm and fix before relying on
   `frontend-unit` checks. `karma.conf.js` also defaults to non-headless `Chrome` with
   `singleRun: false` — agent/CI runs must pass `--watch=false --browsers=ChromeHeadless`.
2. **Frontend API-base for worktrees (Phase 2).** The `local-direct` config must let the
   backend port be parameterized per worktree (env substitution or per-port config).
3. **Backend log location for the runtime-log scan.** Confirm where `bootRun` writes
   (stdout of the launch process vs a file) so the verifier can scan it deterministically.

## 7. Non-Goals

- No change to the planning skill (`.claude/skills/itpm/SKILL.md`) — manifest generation
  lives in `itpm-execute`.
- No full Core Web Vitals instrumentation.
- No Karma specs forced onto UI components.
- No direct agent-to-agent (team) messaging — the loop is orchestrator-mediated by design.

## 8. Success Criteria for This Work

- A story run through `itpm-execute` produces a manifest, and the verifier's verdict cites
  per-A/C `pass`/`fail` with evidence artifacts.
- The fix-loop demonstrably stops after ≤N cycles and escalates rather than looping.
- Out-of-scope discoveries surface as confirmable backlog drafts, separate from the
  verdict.
- Backend compile errors and backend runtime stack traces are caught.
- Loading/error/empty states are reported per the hybrid rule.
- The verifier never writes to `/backend` or `/frontend`.
