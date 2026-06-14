# Cloud Verification Tier — Verifier Phase 2 · Step 3 Design Spec

- **Date:** 2026-06-13
- **Status:** Approved architecture — awaiting Andy's review of this written spec before the implementation plan.
- **Builds on:** `docs/superpowers/specs/2026-06-06-notch-gate-phase2-design.md` (replaces its Mac-`launchd` Tier B with a cloud CI tier).

## 1. Goal

Make the verifier's runtime phases — Phase 2 (API), frontend-unit (`ng test`), and Phase 3 device-visual — **actually run, in the cloud, unattended**, so the daily itpm flow gets real verification without depending on Andy's Mac being awake. Catch issues (broken API contract, failing specs, iPhone-notch cutoffs, **and renders that drift from the approved design**) **before** code reaches `develop`. This is also FRED's first CI.

## 2. Locked decisions

1. **PR-based gate.** itpm-execute opens a PR to `develop` instead of committing directly; CI runs on the PR; auto-merge to `develop` only when green. Code is verified before it lands.
2. **Full Capacitor native build + `simctl`** for the device-visual check — true full-screen WKWebView fidelity (the real FRED-124 condition), not Safari-on-simulator.
3. **Design-fidelity = vision judge**, not pixel-diff: compare the real `simctl` screenshot against the approved UI mockup and report concrete drift.

## 3. Architecture & what "green" means

```
itpm-execute (sandbox)
  ├─ Sandbox verifier — cheap static tier it CAN run unattended:
  │    static review, compile gates, Tier-A safe-area lint, manifest static checks,
  │    plain-JUnit backend-unit. Marks runtime checks `deferred-to-CI`, emits PROVISIONAL.
  ├─ Opens a PR to develop (gh CLI). Dashboard → `verifying-in-ci`.
  │
  └─ GitHub Actions on the PR (.github/workflows/verify.yml):
       ├─ Linux job (every PR):
       │    MySQL service container + bootRun (Spring `ci` profile, external clients stubbed)
       │    → touched-domain test/api/*.sh (Phase 2) → tsc --noEmit → selective ng test
       └─ macOS job (only if frontend/native files changed):
            npm ci → ng build → cap sync ios → pod install (cached) →
            xcodebuild -scheme App -sdk iphonesimulator → simctl boot "iPhone 16 Pro" →
            install/launch → simctl openurl ?devPage=/route (pre-authed) →
            screenshot → (a) safe-area visual-diff vs baseline  (b) design-fidelity vision-judge vs approved mockup
  │
  GREEN = Linux job pass AND (macOS job pass OR not triggered) AND static notch lint pass
        → auto-merge PR → dashboard → completed.
  RED   = PR stays open, dashboard → failed-with-evidence (logs / notch-diff / design-drift report);
          bounded fix-loop hands the failures back to the builder on the same PR branch.
```

**"Green" in one line:** the ephemeral Java+MySQL backend verifies the API contract, the frontend builds and its unit specs pass, and the real iPhone-simulator render is both **device-correct** (no notch cutoff) and **on-design** (matches the approved mockup).

## 4. Components / files

| File | Change | Responsibility |
|---|---|---|
| `.github/workflows/verify.yml` | create | The CI pipeline: Linux + macOS jobs, triggered on PRs to develop; path-filter the macOS job. |
| `backend/src/main/resources/application-ci.properties` + `@Profile` guards | create/modify | New `ci` Spring profile; guard the eager external clients so the context boots offline (see §5). |
| `test/visual/` | create | Baselines `<route>@iphone16pro.png` + `run-visual.sh` (sips/ImageMagick band diff) + a one-command `--bless`. |
| `test/ci/` | create | `simctl` driver: boot, install, `openurl ?devPage`, screenshot, deep-link helper. |
| `test/ui/safe-area-lint.mjs` | modify | Fix the global-utility-class false-positive (§7). |
| `.claude/agents/verifier-agent.md` | modify | Runtime checks emit `deferred-to-CI` + PROVISIONAL; add the design-fidelity vision check; the CI run is authoritative. |
| `.claude/skills/itpm-execute/SKILL.md` | modify | Step C/E: open a PR + capture the approved mockup as the design reference; on CI green auto-merge + complete; on red, failed-with-evidence. |
| develop branch protection | config | Require the CI checks before merge (enforces the gate). |

## 5. Linux job — ephemeral backend (the `ci` profile)

- **DB:** GitHub Actions MySQL service container (matches prod DDL better than H2 — entities carry MySQL `columnDefinition`). `application-ci.properties` points the datasource at the service container; `hibernate.ddl-auto=update`.
- **Neutralize boot-time external deps** (the tournament confirmed there are **zero `@Profile` guards** today and several clients hit the network at startup): `@Profile("!ci")` on `PineconeConfig` (eagerly builds a Pinecone client) and the Plaid/Alpaca/OpenAI/Persona client beans, with `ci`-profile no-op/stub beans or disabled base-urls; `investment.scheduler.enabled=false`. This is the one backend touch — **additive config + guards, no runtime behavior change for prod** (guarded by `!ci`). Flag to Andy per builder Hard Rules.
- **Seed users:** a `@Profile("ci")` `CommandLineRunner` (or `data-ci.sql`) inserts `facebook@gmail.com` (devPage user) and `hottie2@yn.con` (config.local.sh API user), each with a `UserProgress` row, so `/api/dev/authenticate-as-user` returns a token.
- **Run:** boot, poll `/actuator/health`, then the verifier's existing Phase 2 (`test/api/lib/auth.sh` → touched-domain scripts) verbatim against `localhost:8080`; `tsc --noEmit`; selective `ng test --include=... --watch=false --browsers=ChromeHeadless` (apply the karma nested-override + `--legacy-peer-deps` from findings.md).

## 6. macOS job — device-visual + pre-auth (no passkey)

- Build: `npm ci` → `ng build` → `npx cap sync ios` → `pod install` (cache Pods + DerivedData) → `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator` (simulator builds need **no code signing**).
- Boot + auth: `simctl boot "iPhone 16 Pro"` → `simctl install` → launch → **`simctl openurl "<app-scheme>://…?devPage=/<route>&testing=true"`**. devPage calls `/api/dev/authenticate-as-user` against the CI backend → mints a JWT → app lands authenticated. **The passkey prompt never appears.** Open item for the plan: confirm how `devPage` reaches the native launch (custom URL scheme registered in `ios/App` vs a CI-only `environment.ci.ts` auto-login flag); pick whichever the app already supports.
- Capture: `simctl io screenshot`. Then two checks on that screenshot:
  - **(a) Safe-area visual-diff** — diff the top band (y=0..120) vs `test/visual/baseline/<route>@iphone16pro.png`. A title under the notch trips it. `--bless` re-blesses on intentional restyles.
  - **(b) Design-fidelity vision-judge** — see §8.

## 7. Tier-A linter refinement (false-positive fix)

`safe-area-lint.mjs` only parses component SCSS, so it false-flags an element whose safe-area comes from a **global utility class** (your tab3 `.custom-profile-header` carries global `.safe-area-top` → `padding-top: env(safe-area-inset-top) !important` in `global.scss:535`). Fix: when an HTML element references a known global safe-area utility class (`.safe-area-top`, configurable list), or its SCSS `@extend`s one, treat it as satisfied. Cross-check `global.scss` before emitting an offender. Keeps the gate precise as more headers adopt the global utility.

## 8. Design-fidelity check (the "render looks slightly off" gap)

**Problem:** the builder implements the UI mockup option Andy picked, but the real iPhone render drifts (spacing, radius, color, weight). Today nothing catches that.

**Mechanism:**
1. **Reference capture (at approval):** itpm-execute already records the chosen UI mockup option in the approval content. Persist it as the design reference — `ITPM/verify/design-ref/<story-id>.<png|html>` (render the mockup HTML to PNG if it's HTML). Commit alongside the PR.
2. **Real render:** the macOS job's `simctl` screenshot of the implemented route (§6).
3. **Vision comparison:** the verifier (vision-capable) compares *[design-ref]* vs *[screenshot]* and returns a structured drift report — per-aspect deltas (layout/spacing, color, typography, radius/shadow, iconography) with a pass/fail and concrete notes. **Not pixel-diff** (a mockup won't pixel-match a render); a perceptual/structural judgment focused on "does the build match the approved design."
4. **Loop:** drift → in-scope failure with the drift notes as Evidence → bounded fix-loop hands the specifics to the builder ("match the approved option: tighten X, restore radius Y"). This realizes both of Andy's ideas — the intended design is supplied (1) and the verifier screenshots + asks the builder to reconcile (3–4).

**Where the vision step runs:** the macOS job emits the screenshot as a PR artifact; the comparison is a verifier step (Claude vision) consuming `design-ref` + screenshot — either invoked in CI (Claude API step) or by the verifier-agent post-CI reading the artifact. Decide in the plan; the artifact interface is the same either way.

## 9. Step 2 — PROVISIONAL verdict + deferred handoff (built alongside, cloud-agnostic)

- `verifier-agent.md`: add a fourth verdict `PROVISIONAL`. The three current "skip and note" branches (Phase 2 `:8080` probe, Phase 3 tunnel probe, frontend-unit `ng test`) become `Status: deferred-to-CI` + emit `PROVISIONAL` (never `APPROVED`).
- `itpm-execute` Step E: on `PROVISIONAL`, do not set `completed`; the PR + its CI run are the deferred gate; the CI result drives the final dashboard state.
- This is the interface the cloud tier consumes — needed regardless of CI provider.

## 10. Cost control

Linux job on every PR (cheap). macOS native-build + device-visual job only when `frontend/**` or `ios/**` changes (path filter) — ~1 build/day at itpm's cadence; a `run-device-visual` PR label forces it. Cache Pods + DerivedData + npm to bound macOS minutes.

## 11. Safety / non-goals

- CI is report-only on app code; it never edits `/backend` or `/frontend` — it builds/tests and reports a status. Fixes go through the builder on the PR branch.
- The `ci` profile must never reach real Plaid/Alpaca/Persona/OpenAI/Pinecone — stubs/disabled base-urls only; no real-money path is exercised against live services.
- Not building a general device farm or multi-device matrix now (iPhone 16 Pro only); not replacing the static lint (it stays the cheap always-on floor).

## 12. Open questions (resolve in the plan)

1. Can the unattended itpm sandbox open a PR + enable auto-merge (gh CLI + a PAT with `repo` scope)? Likely yes.
2. `devPage` injection into the native launch — custom URL scheme vs `environment.ci.ts` auto-login flag (§6).
3. Where the design-fidelity vision step runs (CI Claude-API step vs verifier-agent post-CI) (§8).
4. Baseline + design-ref storage and the `--bless` audit flow.
5. Depth of `ci`-profile external-dep stubbing (disable vs mock responses) per endpoint the API tests touch.
6. Does the dashboard (today.html on develop) stay on develop while code is on the PR branch? (Intended: yes — only the story's code goes via PR.)

## 13. Success criteria

- A story flows: itpm → sandbox PROVISIONAL → PR → CI green (real backend contract + build + specs + correct, on-design iPhone render) → auto-merge → completed; or CI red → builder fix-loop on the PR.
- A header under the notch fails the macOS job (safe-area diff). A render that drifts from the approved mockup fails the design-fidelity judge. A broken API contract fails the Linux job. None reach develop.
- No real external service is touched in CI.
