# Verifier Agent Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the verifier agent execute a shared, evidence-gated Acceptance Check Manifest, run a bounded builder↔verifier fix-loop, and perform the checks Andy does by hand (inline code-review, backend compile + runtime-log scan, network-waterfall sanity, loading/error/empty states, exploratory→backlog), while the builder works manifest-first with selective TDD.

**Architecture:** Four markdown contracts are edited — `CONTEXT.md` (canonical Manifest format + bounded-loop procedure, the source of truth), `builder-agent.md` (manifest-first + selective TDD), `verifier-agent.md` (manifest execution + evidence gate + new checks + two output channels), and `itpm-execute/SKILL.md` (manifest generation in Step B, bounded loop in Step C). Two executable proof tasks de-risk the xUnit pillars the design relies on (one Jasmine pure-util spec, one Gradle smoke). No `/backend` or `/frontend` product code changes.

**Tech Stack:** Markdown agent/skill prompts · Angular CLI + Karma/Jasmine 5 (frontend-unit) · Gradle + JUnit 5 (backend-unit) · Chrome MCP + computer-use (UI verification).

---

## Spec Reference

Design spec: `docs/superpowers/specs/2026-06-06-verifier-agent-optimization-design.md`. Locked decisions: (1) bounded fix-loop, not converse-until-agree; (2) Manifest + selective xUnit; (3) core-first (iOS-sim + worktree isolation are Phase 2, NOT built here); (4) hybrid loading/error/empty checks.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `.claude/CONTEXT.md` | modify (Agents section) | Canonical Manifest format + bounded-loop procedure + selective-xUnit commands. The single source of truth other files point to. |
| `.claude/agents/builder-agent.md` | modify | Manifest-first workflow; selective TDD; fix-only-flagged-failures on handback. |
| `.claude/agents/verifier-agent.md` | modify | Manifest execution; evidence-gated verdict; backend compile + xUnit + inline code-review; runtime-log scan; network-waterfall sanity; console warnings; loading/error/empty hybrid; exploratory pass; tiering; two output channels; backlog drafts. |
| `.claude/skills/itpm-execute/SKILL.md` | modify | Generate manifest in Step B; replace unbounded loop in Step C item 7 with the bounded, evidence-gated loop (cap 2, channel separation, escalation, backlog-draft confirm). |
| `frontend/src/app/utils/jwt-token.utils.spec.ts` | create | Executable proof of the frontend-unit pillar (pure util, no `TestBed`). |

**Cap N = 2 fix cycles** is used throughout. **`/simplify` is never used by the verifier** (mutates the tree). The verifier always targets a single spec with `--include` (never the whole suite — legacy specs may be red).

---

## Task 1: Frontend-unit pillar proof (executable de-risk — do first)

> ✅ **COMPLETED** in commit `fix(frontend): scope karma to glob7/minimatch3 so ng test runs`. Root cause of the runner being red was a security-`overrides` glob/minimatch major bump that broke karma@6.4.4; fixed via a nested `overrides.karma` pin. `decodeJwtPayload` spec created and runs `2/2 SUCCESS` headless. Findings recorded. **Skip this task during execution.**

Validates spec open-question #1 (does `ng test` run green headless?) and the selective-xUnit path the design leans on, using the existing pure function `JwtTokenUtils.decodeJwtPayload`.

**Files:**
- Create: `frontend/src/app/utils/jwt-token.utils.spec.ts`

- [ ] **Step 1: Write the spec** (characterization test of existing pure code — no `TestBed`, no providers)

````typescript
import { JwtTokenUtils } from './jwt-token.utils';

describe('JwtTokenUtils.decodeJwtPayload', () => {
  // Build a real JWT-shaped string: header.payload.signature, each segment base64.
  function makeToken(payload: object): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.fake-signature`;
  }

  it('decodes the claims from a valid JWT payload segment', () => {
    const token = makeToken({ sub: '1234567890', email: 'test@fred.com', exp: 9999999999 });
    const result = JwtTokenUtils.decodeJwtPayload(token);
    expect(result).toEqual({ sub: '1234567890', email: 'test@fred.com', exp: 9999999999 });
  });

  it('returns null for a malformed token', () => {
    const result = JwtTokenUtils.decodeJwtPayload('not-a-jwt');
    expect(result).toBeNull();
  });
});
````

- [ ] **Step 2: Run the single spec headless**

Run:
````bash
cd frontend && ng test --include='**/jwt-token.utils.spec.ts' --watch=false --browsers=ChromeHeadless 2>&1 | tail -30
````
Expected: `Executed 2 of 2 SUCCESS` (the second test logs a `console.error` from the catch block — that is expected, not a failure).

If Chrome isn't found, set `CHROME_BIN` to the installed Chrome and re-run:
````bash
export CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
````

- [ ] **Step 3: Record the result of the FULL suite (informational only — do not fix it here)**

Run:
````bash
cd frontend && ng test --watch=false --browsers=ChromeHeadless 2>&1 | tail -25
````
Whatever the result (likely some legacy CLI-generated specs are red), note the count. This is WHY the verifier always uses `--include` to target one spec. Append a one-line note to `.claude/agent-memory/findings.md`:
`2026-06-06 — frontend tests — full ng test suite state: <N passed / M failed>; verifier targets single specs via --include to avoid legacy red specs blocking the gate.`

- [ ] **Step 4: Commit**

````bash
git add frontend/src/app/utils/jwt-token.utils.spec.ts .claude/agent-memory/findings.md
git commit -m "test: add decodeJwtPayload spec; prove headless frontend-unit path"
````

---

## Task 2: Backend-unit pillar smoke (executable de-risk)

Confirms the backend-unit command path and surfaces the DB-dependency nuance that the builder's guidance must account for.

**Files:** none created — observation + a findings note.

- [ ] **Step 1: Run the existing backend test**

Run:
````bash
cd backend && ./gradlew test 2>&1 | tail -30
````
Expected: `BUILD SUCCESSFUL` with `BackendApplicationTests` passing — UNLESS the `@SpringBootTest` context-load test requires a MySQL connection in the `local` profile, in which case it may fail to load the context.

- [ ] **Step 2: Confirm the fast, DB-independent compile path works regardless**

Run:
````bash
cd backend && ./gradlew compileTestJava 2>&1 | tail -15
````
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Record the nuance in findings**

Append to `.claude/agent-memory/findings.md`:
`2026-06-06 — backend tests — ./gradlew test runs JUnit 5 (useJUnitPlatform). BackendApplicationTests is @SpringBootTest and may need MySQL; builder-written backend-unit tests MUST be plain JUnit (no @SpringBootTest) so they run without a DB. Verifier runs them via ./gradlew test --tests <Class>.`

- [ ] **Step 4: Commit**

````bash
git add .claude/agent-memory/findings.md
git commit -m "test: confirm backend JUnit path; document no-@SpringBootTest rule for unit tests"
````

---

## Task 3: Define the canonical Manifest + bounded loop in CONTEXT.md

This is the source of truth the other files reference. Do it before editing the agents.

**Files:**
- Modify: `.claude/CONTEXT.md` (the `## Agents` section, after `### How They Work`)

- [ ] **Step 1: Insert the Manifest + loop subsections**

In `.claude/CONTEXT.md`, find the line `### When to Spawn Them` (inside `## Agents`). Immediately BEFORE it, insert:

````markdown
### The Acceptance Check Manifest (shared contract)
Every non-trivial story carries a manifest at
`.claude/agent-memory/manifest-<story-id>.md` (use `manifest.md` if no story ID).
It is the single source of truth for "done": the orchestrator generates it, the
builder satisfies it, the verifier executes it. One entry per acceptance criterion:

```
## AC-1: <the acceptance criterion, restated>
- Type:     backend-unit | frontend-unit | api-integration | ui-acceptance
- Check:    <concrete, executable pass-condition>
- Evidence: <artifact that proves it — JUnit test name / curl assertion /
             screenshot path + network assertion>
- Status:   pending        # verifier flips to pass | fail
```

**Evidence gate:** the verifier may only return APPROVED when EVERY check is `pass`
with an attached Evidence artifact. No artifact ⇒ that item cannot be approved.

**Selective xUnit commands:**
- backend-unit: `cd backend && ./gradlew test --tests <FullyQualifiedClass>`
  — write plain JUnit 5 (NOT `@SpringBootTest`) so unit tests need no DB.
- frontend-unit: `cd frontend && ng test --include='**/<name>.spec.ts' --watch=false --browsers=ChromeHeadless`
  — ALWAYS target the specific spec with `--include`; never run the whole suite
  (legacy CLI-generated component specs may be red and would block the gate).

### The Bounded Fix-Loop (builder ↔ verifier)
The builder and verifier never talk directly — whoever orchestrates them
(`itpm-execute`, or this session for manual runs) mediates. This is what keeps the
loop bounded and the verifier independent:
1. Dispatch **builder** (story + A/C + manifest). It implements, writes selective
   xUnit, self-fills the checks it can, returns.
2. Dispatch **verifier** (diff + manifest). It flips each Status, attaches evidence,
   returns a verdict plus TWO separate lists: in-scope failures and out-of-scope
   discoveries.
3. If REVISION REQUIRED and cycle < 2: hand ONLY the in-scope failures back to the
   builder, then re-verify (back to step 2). Out-of-scope discoveries NEVER go to the
   builder.
4. Still REVISION REQUIRED after 2 cycles: escalate to Andy. Do NOT keep looping.
5. Out-of-scope discoveries → drafted backlog items (backlog-add semantics, confirm
   before appending) — they NEVER block the verdict.

Termination is on objective evidence (checks pass), never on "agreement."
````

- [ ] **Step 2: Verify the insert landed and the fences are balanced**

Run:
````bash
grep -n "Acceptance Check Manifest\|Bounded Fix-Loop\|Evidence gate" .claude/CONTEXT.md
````
Expected: three matching lines. Confirm by eye that the inner ``` fences are intact.

- [ ] **Step 3: Commit**

````bash
git add .claude/CONTEXT.md
git commit -m "docs: define Acceptance Check Manifest + bounded fix-loop in CONTEXT"
````

---

## Task 4: Builder-agent — manifest-first + selective TDD

**Files:**
- Modify: `.claude/agents/builder-agent.md`

- [ ] **Step 1: Add the manifest-first + TDD block**

In `.claude/agents/builder-agent.md`, find:
````
Before editing any file: read it, find the exact change needed, modify 
only that section. Preserve existing style and patterns.
````
Immediately AFTER that paragraph, insert:

````markdown

Work manifest-first. Read the story's Acceptance Check Manifest at
`.claude/agent-memory/manifest-<story-id>.md` (or `manifest.md`) before coding — it
defines the exact, executable pass-condition for each acceptance criterion. Your code
must make every Check satisfiable, and you self-fill the `Status` of any check you can
verify yourself (run the command and confirm). Do NOT return a story with a
self-verifiable check still `pending`.

Selective TDD (invoke superpowers:test-driven-development for these units):
- Backend service / business logic and pure frontend utils → write the failing test
  FIRST, then implement to green. Backend tests are plain JUnit 5 (NOT `@SpringBootTest`,
  so they need no DB); name them in the manifest as the Evidence for that check.
- UI components → satisfy the manifest's `ui-acceptance` checks (no Karma spec required).

Fix-loop discipline: when the verifier returns in-scope failures, fix ONLY those
specific failures. Do not re-architect, refactor unrelated code, or address
out-of-scope items (those are the verifier's backlog drafts, not your work).
````

- [ ] **Step 2: Verify**

Run:
````bash
grep -n "manifest-first\|Selective TDD\|Fix-loop discipline" .claude/agents/builder-agent.md
````
Expected: three matching lines.

- [ ] **Step 3: Commit**

````bash
git add .claude/agents/builder-agent.md
git commit -m "feat(builder-agent): manifest-first workflow + selective TDD + fix-loop discipline"
````

---

## Task 5: Verifier-agent — frontmatter + intro + contract sections

Applied as a sequence of targeted edits (Tasks 5–8) so each change is small and reviewable. The verifier keeps its report-only invariant throughout.

**Files:**
- Modify: `.claude/agents/verifier-agent.md`

- [ ] **Step 1: Update frontmatter (description + add `Skill` tool)**

Replace the `description:` line with:
````
description: "Use after the builder-agent completes any non-trivial implementation. Executes the story's Acceptance Check Manifest, reviews changes for correctness/safety/consistency, and returns an evidence-gated verdict. Always invoke after auth-related or database changes."
````
Replace the `tools:` line with (adds `Skill` for best-effort /code-review):
````
tools: Glob, Grep, Read, WebFetch, WebSearch, Bash, Write, Skill, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__get_page_text, mcp__claude-in-chrome__read_console_messages, mcp__claude-in-chrome__read_network_requests, mcp__computer-use__screenshot, mcp__claude-in-chrome__javascript_tool
````

- [ ] **Step 2: Replace the intro paragraph with independence + manifest + write-scope language**

Replace:
````
You are the Verifier Agent for FRED. Review code changes made by the
builder-agent across three phases: static review, API integration, and
UI verification. Do not implement fixes to source code — report issues only.
Write is permitted only within /test/ (adding curl calls to domain scripts,
saving screenshots). Never write to /backend/ or /frontend/.
````
with:
````
You are the Verifier Agent for FRED. You decide whether the builder-agent's changes
satisfy the story's acceptance criteria (A/C). You are an INDEPENDENT, ADVERSARIAL
check — your verdict is gated on objective evidence, never on agreement with the
builder. Review across three phases: static review, API integration, UI verification.

Do not implement fixes to source code — report issues only. Write is permitted ONLY
within: /test/ (curl calls, screenshots); the story manifest
(.claude/agent-memory/manifest-<story-id>.md — flipping Status, attaching Evidence);
backlog drafts in your output; and .claude/agent-memory/findings.md. NEVER write to
/backend/ or /frontend/. NEVER run /simplify (it mutates the working tree).
````

- [ ] **Step 3: Insert Manifest contract + two-channel + tiering sections**

Immediately BEFORE the line `--- Phase 1: Static Review ---`, insert:
````markdown
--- The Manifest is your contract ---
Read `.claude/agent-memory/manifest-<story-id>.md` (or `manifest.md`). It has one
entry per A/C item: a Type, an executable Check, an Evidence slot, a Status. Execute
every Check, set Status to pass|fail, and attach an Evidence artifact for each pass.

EVIDENCE GATE: return APPROVED only when EVERY check is `pass` WITH an attached
Evidence artifact (test name, curl result, or screenshot path + network assertion).
Any check without evidence ⇒ REVISION REQUIRED.

--- Two output channels (never mix them) ---
- In-scope failures: manifest checks that are `fail`, compile errors, broken tests,
  A/C-relevant correctness bugs. These drive the verdict and go back to the builder.
- Out-of-scope discoveries: good-to-do things NOT in the A/C. These NEVER affect the
  verdict and NEVER go to the builder — draft them as backlog items (see Output).

--- Tiering (skip what the diff doesn't touch) ---
From `git diff --name-only develop...HEAD`:
- Frontend-only diff → skip backend compile + runtime-log scan.
- Backend-only diff → skip Phase 3 UI unless a consumed API contract changed.
- Trivial/copy-only change → skip the inline code-review pass and the exploratory pass.

````

- [ ] **Step 4: Verify**

Run:
````bash
grep -n "INDEPENDENT, ADVERSARIAL\|The Manifest is your contract\|Two output channels\|Tiering (skip" .claude/agents/verifier-agent.md
````
Expected: four matching lines.

- [ ] **Step 5: Commit**

````bash
git add .claude/agents/verifier-agent.md
git commit -m "feat(verifier-agent): manifest contract, evidence gate, two channels, tiering"
````

---

## Task 6: Verifier-agent — Phase 1 compile gates, xUnit, inline code-review

**Files:**
- Modify: `.claude/agents/verifier-agent.md`

- [ ] **Step 1: Replace the TypeScript-only compile section with both compile gates + xUnit + code-review**

Replace:
````
TypeScript compilation check — run if any frontend .ts files changed:
  cd frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -60
Any compiler error is an immediate REVISION REQUIRED flag with the error
message and file:line. Do not proceed to Phase 3 if compilation fails.
````
with:
````
Compile gates (immediate REVISION REQUIRED on error — do NOT proceed to later phases):
- If any frontend .ts changed:
    cd frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -60
- If any backend .java changed:
    cd backend && ./gradlew compileJava 2>&1 | tail -40
Report the error message and file:line for any failure.

Selective xUnit — run the manifest's unit checks and use the result as Evidence:
- backend-unit:  cd backend && ./gradlew test --tests <FullyQualifiedClass> 2>&1 | tail -30
- frontend-unit: cd frontend && ng test --include='**/<name>.spec.ts' --watch=false --browsers=ChromeHeadless 2>&1 | tail -30
  ALWAYS target the specific spec with --include. NEVER run the whole suite — legacy
  CLI-generated component specs may be red and would block the gate.
Any unit failure → in-scope failure; record the failing test name as Evidence.

Code-review pass (correctness + simplification):
Review the diff INLINE for bugs, duplicated logic, simpler equivalents, and dead code
(the same lens /code-review uses). This inline review is the reliable path and the
gate never depends on anything else. Additionally, IF you can invoke the /code-review
skill (plain effort — NEVER `ultra`, NEVER `--fix`), run it and merge its findings.
Route A/C-relevant issues to in-scope failures; everything else to out-of-scope
backlog drafts. Never run /simplify.
````

- [ ] **Step 2: Verify**

Run:
````bash
grep -n "Compile gates\|Selective xUnit\|Code-review pass\|compileJava" .claude/agents/verifier-agent.md
````
Expected: four+ matching lines.

- [ ] **Step 3: Commit**

````bash
git add .claude/agents/verifier-agent.md
git commit -m "feat(verifier-agent): backend compile gate, selective xUnit run, inline code-review"
````

---

## Task 7: Verifier-agent — Phase 2 runtime-log scan + Phase 3 UI checks

**Files:**
- Modify: `.claude/agents/verifier-agent.md`

- [ ] **Step 1: Add the backend runtime-log scan to Phase 2**

Find the end of Phase 2 (the step 6 block that begins `6. Cross-check: read the Angular service file(s)` and ends `frontend changes that touch existing API calls can still break the contract.`). Immediately AFTER it, insert:
````markdown
7. Backend runtime-log scan: after exercising the changed endpoints, scan the bootRun
   output for stack traces / ERROR lines tied to those endpoints. If bootRun logs to a
   file, tail it; if logs are not capturable, note "backend runtime logs unavailable".
   Any stack trace on an exercised endpoint is an in-scope flag.
````

- [ ] **Step 2: Add network-waterfall sanity, console warnings, loading/error/empty hybrid, and exploratory pass to Phase 3**

Find the end of Phase 3 (after the line `6. Read console messages — any JS error is a flag.`). Immediately AFTER it, insert:
````markdown

7. Network-waterfall sanity (use read_network_requests): for the changed code's calls,
   assert no 4xx/5xx, no duplicate identical calls, no calls that should not fire, and
   non-empty/sane payloads. Do NOT chase LCP/FCP/INP web-vitals — irrelevant for an
   authenticated, data-driven app.

8. Console: any JS error is an in-scope flag; ALSO report warnings on the changed route.

9. Loading / error / empty states (HYBRID):
   - ALWAYS (static): for each changed component that renders async data, confirm a
     styled loading + error + empty branch exists (read the template + SCSS against the
     design system). A missing branch is an in-scope flag.
   - ONLY WHEN the A/C is about those states (runtime): force them and screenshot each —
     use mcp__claude-in-chrome__javascript_tool to override fetch/XHR to reject
     (→ error state) or return an empty payload (→ empty state); confirm a styled state
     renders (not a stuck spinner or a raw error string). Attach each screenshot as
     Evidence for the relevant AC.

10. Exploratory pass (skip if the diff is trivial): briefly click through the affected
    area and note any discrepancies/issues, even unrelated ones → out-of-scope backlog
    drafts.
````

- [ ] **Step 3: Verify**

Run:
````bash
grep -n "Backend runtime-log scan\|Network-waterfall sanity\|HYBRID\|Exploratory pass" .claude/agents/verifier-agent.md
````
Expected: four matching lines.

- [ ] **Step 4: Commit**

````bash
git add .claude/agents/verifier-agent.md
git commit -m "feat(verifier-agent): runtime-log scan, network-waterfall sanity, loading/error/empty hybrid, exploratory pass"
````

---

## Task 8: Verifier-agent — output format (manifest results + two channels + backlog drafts)

**Files:**
- Modify: `.claude/agents/verifier-agent.md`

- [ ] **Step 1: Insert manifest results + channels into the output format**

Find:
````
--- Output Format ---
APPROVED / REVISION REQUIRED

Key Findings:
````
Replace it with:
````
--- Output Format ---
APPROVED / REVISION REQUIRED

Manifest results (every A/C item, with its evidence):
  AC-1: pass|fail — Evidence: <test name / curl result / screenshot path>
  AC-2: pass|fail — Evidence: <...>

In-scope failures (drive the verdict; handed back to the builder):
  - <file:line — what failed — which AC>
Out-of-scope discoveries (backlog drafts; do NOT affect the verdict, do NOT go to the
builder). Do NOT append to backlog.md yourself — that needs Andy's confirm via the
backlog-add skill. One line each:
  - [<PREFIX>] <title> — <one-line rationale> — bug|enhancement

Key Findings:
````

- [ ] **Step 2: Verify the whole file is coherent**

Run:
````bash
grep -n "Manifest results\|In-scope failures\|Out-of-scope discoveries" .claude/agents/verifier-agent.md
grep -c '^```' .claude/agents/verifier-agent.md   # sanity: even number of code fences if any
````
Expected: three matching lines from the first grep. Read the file top-to-bottom once to confirm the phases still flow.

- [ ] **Step 3: Commit**

````bash
git add .claude/agents/verifier-agent.md
git commit -m "feat(verifier-agent): output format with manifest results + in/out-of-scope channels"
````

---

## Task 9: itpm-execute — generate the manifest in Step B

**Files:**
- Modify: `.claude/skills/itpm-execute/SKILL.md`

- [ ] **Step 1: Add manifest generation to Step B**

In the `### Step B — Read Context` section, find item `3. Read `ITPM/memory/fred_vision.md` for design system context.` Immediately AFTER it, insert:
````markdown
4. **Generate the Acceptance Check Manifest** at
   `.claude/agent-memory/manifest-<story-id>.md` from the story's acceptance criteria
   (format defined in `.claude/CONTEXT.md` → Agents → The Acceptance Check Manifest).
   One entry per A/C item: pick the right `Type` (backend-unit | frontend-unit |
   api-integration | ui-acceptance), write a concrete executable `Check`, leave
   `Evidence` empty and `Status: pending`. Commit it:
   ```bash
   git add .claude/agent-memory/manifest-*.md
   git commit -m "itpm: manifest for <story-id>" && git push origin develop
   ```
````

- [ ] **Step 2: Verify**

Run:
````bash
grep -n "Generate the Acceptance Check Manifest" .claude/skills/itpm-execute/SKILL.md
````
Expected: one matching line.

- [ ] **Step 3: Commit**

````bash
git add .claude/skills/itpm-execute/SKILL.md
git commit -m "feat(itpm-execute): generate Acceptance Check Manifest in Step B"
````

---

## Task 10: itpm-execute — bounded fix-loop in Step C

**Files:**
- Modify: `.claude/skills/itpm-execute/SKILL.md`

- [ ] **Step 1: Pass the manifest to the builder**

In `### Step C — Implement`, in the item `4. Invoke **builder-agent** with a complete spec:`, add a bullet under it (after `- Any additional context from Andrew`):
````markdown
   - The path to the Acceptance Check Manifest (`.claude/agent-memory/manifest-<story-id>.md`)
     — instruct the builder to work manifest-first and self-fill the checks it can verify
````

- [ ] **Step 2: Replace the unbounded loop (item 7) with the bounded, evidence-gated loop**

Replace:
````
6. Invoke **verifier-agent**: verify acceptance criteria, run available tests, check FRED design system compliance, check for regressions in adjacent screens.
7. If verifier finds issues: return to builder-agent with the specific findings. Repeat until verifier passes OR you hit a hard blocker.
````
with:
````
6. Invoke **verifier-agent** with the diff + the manifest path. It executes every
   manifest Check, attaches Evidence, and returns: a verdict (APPROVED / REVISION
   REQUIRED), an **in-scope failures** list, and an **out-of-scope discoveries** list.
7. Bounded fix-loop (cap = 2 cycles):
   - If REVISION REQUIRED and cycles_done < 2: hand back to builder-agent ONLY the
     in-scope failures ("fix exactly these; do not re-architect or touch out-of-scope
     items"), then re-invoke the verifier (back to step 6). Increment the cycle count.
   - If still REVISION REQUIRED after 2 cycles: treat as a Hard Blocker (below) — do
     NOT keep looping. The failure-detail must list the surviving in-scope failures.
   - Out-of-scope discoveries are NEVER handed to the builder and NEVER block the
     verdict.
8. On APPROVED: surface the verifier's out-of-scope discoveries to Andy as backlog
   drafts. Use the backlog-add skill to append them ONLY after Andrew confirms (include
   them in the completion PushNotification / dashboard so he can confirm). Do not
   silently append.
````

- [ ] **Step 3: Verify**

Run:
````bash
grep -n "Bounded fix-loop (cap = 2\|in-scope failures\|out-of-scope discoveries\|manifest path" .claude/skills/itpm-execute/SKILL.md
````
Expected: multiple matching lines. Confirm the old "Repeat until verifier passes" text is gone:
````bash
grep -n "Repeat until verifier passes" .claude/skills/itpm-execute/SKILL.md   # expect: no output
````

- [ ] **Step 4: Commit**

````bash
git add .claude/skills/itpm-execute/SKILL.md
git commit -m "feat(itpm-execute): bounded evidence-gated fix-loop + backlog-draft confirm"
````

---

## Task 11: Resolve the /code-review-in-subagent question (spike) + final consistency check

**Files:** none modified unless a fix is needed.

- [ ] **Step 1: Spike — can the verifier subagent invoke /code-review?**

Dispatch a throwaway verifier-agent against the current (small) diff and observe whether its attempt to invoke the `/code-review` skill succeeds or errors (nested-agent limit). If it errors, that is FINE by design — the inline review is the reliable path. Record the outcome:
`echo "2026-06-06 — verifier — /code-review skill in subagent: <works|unsupported, inline review used>" >> .claude/agent-memory/findings.md`

If unsupported, edit `verifier-agent.md` Step (Task 6) to soften the wording from "IF you can invoke" to "Do the inline review only; the orchestrator may run /code-review separately" — but only if the attempt produces noisy errors that derail the run.

- [ ] **Step 2: Cross-file Manifest-format consistency check**

Run:
````bash
grep -rn "backend-unit | frontend-unit | api-integration | ui-acceptance" .claude/CONTEXT.md .claude/agents/*.md .claude/skills/itpm-execute/SKILL.md
````
Expected: the four `Type` values appear consistently. Confirm `manifest-<story-id>.md` is the path used everywhere (no drift like `manifest_<id>` or `manifests/`).

- [ ] **Step 3: Invariant check — verifier never writes to product code**

Run:
````bash
grep -n "NEVER write to /backend/ or /frontend/\|report issues only" .claude/agents/verifier-agent.md
````
Expected: the report-only / never-write language is present.

- [ ] **Step 4: Commit any spike fixes**

Use explicit paths only — never `git add -A`. Two unrelated files (`.claude/skills/backlog-add/SKILL.md`, `.claude/skills/triage/SKILL.md`) are intentionally left modified-and-uncommitted in the working tree; they must NOT be swept into this commit.

````bash
git add .claude/agents/verifier-agent.md .claude/agent-memory/findings.md 2>/dev/null
git commit -m "chore: resolve /code-review subagent spike + consistency checks" || echo "nothing to commit"
````

---

## Self-Review (completed by plan author)

**1. Spec coverage** — every spec section maps to a task:
- 3.A Manifest (format, location, evidence gate) → Task 3 (CONTEXT), executed by Task 5/6/8 (verifier), generated by Task 9 (itpm-execute).
- 3.B Bounded fix-loop → Task 3 (procedure) + Task 10 (itpm-execute control flow).
- 3.C verifier upgrades: backend compile + xUnit + code-review → Task 6; runtime-log scan + network-waterfall + console warnings + loading/error/empty hybrid + exploratory + tiering → Tasks 5 & 7; output channels + backlog drafts → Task 8.
- 3.D builder TDD → Task 4.
- 3.E invariants preserved → Task 5 (intro) + Task 11 Step 3.
- Open-question #1 (Karma green) → Task 1. Backend DB nuance → Task 2. /code-review-in-subagent → Task 11.
- Phase 2 items (iOS-sim, worktree isolation) → intentionally NOT in this plan (deferred per locked decision 3).

**2. Placeholder scan** — `<story-id>`, `<FullyQualifiedClass>`, `<name>`, `<PREFIX>`, `<title>` are intentional fill-in tokens inside agent prompt TEMPLATES (the agents fill them at runtime), not plan placeholders. All plan steps contain exact commands/content.

**3. Type consistency** — Manifest `Type` enum (`backend-unit | frontend-unit | api-integration | ui-acceptance`), the path `.claude/agent-memory/manifest-<story-id>.md`, cap = 2, and `--include='**/<name>.spec.ts' --watch=false --browsers=ChromeHeadless` are used identically across Tasks 3, 4, 5, 6, 9, 10. Task 11 Step 2 asserts this.

**Ordering note:** Tasks 1–2 (executable de-risk) run first; Task 3 (source of truth) before the agent edits (4–10) that reference it; Task 11 last.
