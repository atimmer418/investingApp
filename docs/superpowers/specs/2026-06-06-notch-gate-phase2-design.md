# Notch Gate — Verifier Phase 2 Design Spec

- **Date:** 2026-06-06
- **Status:** Tier A SHIPPED (static safe-area gate wired into verifier). Tier B + PROVISIONAL = designed, awaiting Andy's review before build.
- **Origin:** Selected by a 6-approach / 3-judge tournament (`sandbox-verification-tournament-v2`), weighted on catching the FRED-124 iPhone-notch class of bug.
- **Builds on:** `docs/superpowers/specs/2026-06-06-verifier-agent-optimization-design.md` (this is its deferred "Phase 2").

## 1. Problem

The verifier's Phase 2 (API), Phase 3 (UI), and `ng`-based frontend-unit checks **do not run in the unattended `itpm-execute` sandbox**: Angular CLI / `@angular/compiler-cli` are absent (`ng` can't run; only `tsc --noEmit`), and the sandbox can't reach `:8080` or `local.fredvested.com` (host-allowlist). FRED-124 shipped a header **cut off by the iPhone notch** — a `env(safe-area-inset-top)` failure that a generic-viewport Chrome render would never reveal. We need the verifier to catch that class of bug *before merge*.

## 2. The decision (and why)

**Key code-grounded finding:** the sandbox cannot render an authenticated route offline at all. `frontend/src/app/app.component.ts:158` (`simulateUserLoginToPage`) fires a **live** `authenticateAsUser` POST; with no backend it bails to `/get-started` and never renders the target page. Therefore every "shim the notch in headless Chrome inside the sandbox" approach is **moot in practice** — its render never happens. The only honest mechanisms are:
- **(A) static source analysis** — needs no render, no network, no backend; and
- **(B) a real iOS-WebKit device render** — only possible where the backend + Xcode/Simulator live, i.e. Andy's Mac.

So the winner is a **two-tier "Notch Gate"**: a cheap, proven static gate in the sandbox + an authoritative device-pixel gate on the Mac, with a new **`PROVISIONAL`** verdict that prevents APPROVED until the Mac confirms. This makes the gate **stricter** than today (today's path is generic-viewport Chrome — exactly what let FRED-124 through), which is the correct posture for a real-money app.

The judge panel actually scored the lighter offline-only approaches (OCSL, Notch Sentinel) highest; the synthesizer overrode them with code evidence that they can't render in the sandbox. Their best ideas are grafted in (§6).

## 3. Architecture

```
Builder ships → Verifier (sandbox)
                 ├─ Tier A: static safe-area lint  ── HARD gate, runs here ✅
                 ├─ Phase 2 / Phase 3-runtime / frontend-unit  ── can't run here
                 │     → mark checks `deferred`, emit PROVISIONAL,
                 │       enqueue ITPM/pending/deferred-gate/<story>.json
                 └─ verdict: APPROVED only if nothing deferred; else PROVISIONAL
                                   │
                 Mac launchd job (mirrors itpm cron) polls the queue → Tier B:
                   real Phase 2 (:8080), real ng test, xcrun simctl screenshot + visual-diff
                   → flips deferred checks pass|fail → writes final verdict (signed bundle)
                                   │
                 itpm-execute Step E: dashboard → `completed` ONLY after Tier B passes
```

## 4. Tier A — static safe-area lint (SHIPPED)

- **Artifact:** `test/ui/safe-area-lint.mjs` (written + verified 2026-06-06). Pure SCSS/HTML analysis, zero network/browser. Flags a top-pinned header/hero (`ion-header` child div, `*-hero-header`, `position:fixed|sticky; top:0`) that lacks `env(safe-area-inset-top)` and has `< 44px` top spacing. Exit 1 = offender(s).
- **Verified:** flags `change-bank-account.page.scss:45 .blue-hero-header` (the FRED-124 bug) + the bespoke-header-div HTML; clean on `global.scss`. App-wide it flags exactly **5 genuine offenders** across 5 files (change-bank-account, tab3, app.component) — low noise, no `.card-header`-style false positives.
- **Wired:** `verifier-agent.md` Phase 1 now runs it on changed top-chrome files; an offender is an in-scope failure with file:line Evidence. This alone would have blocked FRED-124.
- **Pre-existing offenders found (candidate backlog items):** `tab3.page.scss/html` (blue header — ties into FRED-192 redesign) and `app.component.scss` likely have the same notch risk.
- **Follow-up tuning:** validate against known-good patterns (`global.scss .safe-area-top`, `tabs.page.scss calc(...env(safe-area-inset-bottom))`); allow a documented per-file override if a header legitimately sits below a real `ion-toolbar` (which Ionic auto-insets).

## 5. Tier B — Mac confirmation tier (TO BUILD)

A `launchd` job mirroring the existing itpm cron, on Andy's Mac (has MySQL + tunnel + Xcode/Simulator). Polls `ITPM/pending/deferred-gate/` and for each queued story runs:
- **Real Phase 2:** `test/api/run-all.sh` + `lib/auth.sh` POSTing `/api/dev/authenticate-as-user` against `:8080` for the touched domains. Seed both `hottie2@yn.con` (config.local.sh API user) and `facebook@gmail.com` (devPage user).
- **Real frontend-unit:** `npm ci` (with the `findings.md` karma nested-override `glob ^7.1.7`/`minimatch ^3.0.4` + `--legacy-peer-deps`) then `ng test --include='**/<name>.spec.ts' --watch=false --browsers=ChromeHeadless`.
- **Real Phase 3 device-visual:** `xcrun simctl boot "iPhone 16 Pro"` (~59px top inset) → deterministic status-bar override → load `?devPage=/route` (renders here because the backend is up) → screenshot → pixel-diff the top safe-area band (y=0..120) vs `test/visual/baseline/<route>@iphone16pro.png`. A title drawn under the notch trips the diff and fails the gate with the diff image as Evidence.
- **New files:** `test/visual/` (baselines + `run-visual.sh` using `sips`/ImageMagick + a one-command `--bless` to re-bless on intentional header restyles), `test/api/run-deferred-gate.sh` orchestrator. `test/ui/device-render.mjs` (already written by the tournament) is the Mac/attended renderer; prefer CDP `Emulation.setSafeAreaInsetsOverride` (engine-native) over a CSS `env()` string rewrite for any web-render fallback.

## 6. The PROVISIONAL verdict + deferred-gate queue (TO BUILD)

- **`verifier-agent.md`:** add a fourth verdict value **`PROVISIONAL`**. The three current "skip and note" branches (Phase 2 `:8080` probe, Phase 3 tunnel probe, frontend-unit `ng test`) become: mark that manifest check `Status: deferred`, emit `PROVISIONAL` (never `APPROVED`), and write `ITPM/pending/deferred-gate/<story-id>.json` `{story, routes[], domains[], specs[], provisionalVerdict, manifestPath}` (the sandbox CAN push to develop).
- **`itpm-execute` Step E:** on `PROVISIONAL`, do **not** set the dashboard to `completed`; set an intermediate `verifying-on-device` state + PushNotification "shipped pending device gate." Only the Mac result flips it to `completed` (or `failed`, with the notch-diff image attached).

## 7. Grafts from runner-up (OCSL) — fold into Tier A/sandbox

1. **Offline fixture-replay** of `test/api/*.sh` via a `FRED_OFFLINE=1` branch in `lib/auth.sh` + `run_curl`, with **per-fixture controller-blob-hash staleness guards** — gives the sandbox a real Phase 2 *contract* check (URL/method/status/field-shape) without the backend-boot fragility, so `PROVISIONAL` carries real API signal. A changed controller reports "fixture stale, re-record on Mac" rather than passing silently.
2. **Static controller-vs-service contract-diff** (`test/contract/check-contract.mjs`): key-name + method/URL mismatch + secret-in-payload detection. It already finds the `accountSubtype` vs `accountSubType` casing bug (now FRED-189) **and flags a possible `accessToken` leaking in a GET response body** — a new security item to verify.
3. **Honesty labels:** mark offline API results "contract-only, runtime unverified" so a real-money mutation path still demands the Mac live run before merge.

## 8. Safety / scope guards

- The Mac job is **report-only**: writes ONLY under `ITPM/verify/` and `ITPM/pending/`, never commits to `/backend` or `/frontend`.
- **Checksum/sign** the Mac results bundle; the cron verifier REJECTS a stale/missing/unsigned bundle rather than passing (closes the provenance hole when the verdict depends on a JSON another host wrote).
- "Mac asleep / gate pending > N hours" → staleness alert + PushNotification; a failed Gate B → `failed`-with-diff-image, never a silent pass. GitHub Actions `macos-14` is a cold-start fallback for Gate B when the Mac is asleep (bounded poll, fail-closed-with-note).

## 9. Open questions (resolve before/with Tier B)

1. **Sandbox vs WebKit fidelity:** is the static lint + Mac `simctl` enough, or do we also want CDP safe-area emulation as a middle tier? (Highest-leverage unknown.)
2. **Mac-liveness SLA:** how long may a story sit PROVISIONAL on develop before the GH-Actions fallback fires? Real-money code is transiently on develop until Gate B runs — define N hours + auto-revert/auto-issue policy.
3. **Baseline blessing:** FRED-124 was itself a header restyle, so baselines change legitimately; the `--bless` flow must be one-command + audited.
4. **`simctl openurl` deep-link timing:** does it reliably settle hydration before screenshot, or is a "wait for selector" hook needed to avoid flaky top-band diffs?
5. **Can the verifier SUBAGENT fire a launchd job / write the queue, or must the parent `itpm-execute` do it?** (findings.md flags nested-agent limits for `/code-review`.) Confirm on first real run.
6. **Linter precision tuning:** validate against the 14 top-chrome SCSS files that currently use no inset before any new hard-block edge; allow a documented per-file override.

## 10. Status / phased plan

- **Step 1 — SHIPPED:** `test/ui/safe-area-lint.mjs` + wired as a hard Phase-1 gate in `verifier-agent.md`.
- **Step 2 — this spec, awaiting review:** PROVISIONAL verdict + deferred-gate queue (verifier-agent.md + itpm-execute) + OCSL fixture-replay/contract-diff grafts in-sandbox.
- **Step 3 — this spec, awaiting review:** Mac `launchd` confirmation tier (simctl visual-diff, real Phase 2, real ng test) + signed-bundle safety.
