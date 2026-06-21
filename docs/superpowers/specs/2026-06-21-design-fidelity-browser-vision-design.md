# Plan 2 — Design-Fidelity via Browser-Mobile Render + Vision Judge

- **Date:** 2026-06-21
- **Status:** Approved design — awaiting Andy's review of this written spec before the implementation plan.
- **Supersedes:** the Mac-`launchd` / `simctl` "Tier B" device-visual approach in `docs/superpowers/specs/2026-06-13-cloud-verification-tier-design.md` §6/§8. The notch/safe-area class is covered deterministically by the already-shipped Tier-A static linter (`test/ui/safe-area-lint.mjs`), so a full native iOS build is unnecessary; this uses a cheap browser-mobile render on Linux instead.

## 1. Goal

Catch the "the final render looks slightly off from the UI option I picked" class of bug — design drift between the **approved mockup** and the **actual rendered page** — as a CI gate on the PR, before it merges to develop. Reuse the proven PR-gated CI; add the check to the existing Linux job (no macOS, no native build, no pixel baselines).

## 2. Locked decisions

1. **Browser-mobile render on Linux** (Playwright/headless Chromium at iPhone-16-Pro viewport) — not a macOS native `simctl` build. The static linter owns notch/safe-area; this owns design-fidelity.
2. **One Claude-vision check** does the judging (design-match + obvious layout issues) — no committed pixel baselines, no re-bless flow.
3. **The vision step runs in CI** (a workflow step calls the Claude vision API) so design-fidelity is a gating check on the PR.
4. **Calibration/reference pass:** before judging the story's render, render two known-good reference pages (tab3 + a representative tab3-linked settings page) and give them to the judge as the app's established design language + correct notch spacing, so it calibrates against the real app, not a vacuum.
5. **Conditional:** the render + vision steps run only for UI stories that have a captured design-ref. Backend-only / no-mockup PRs skip them.

## 3. Architecture

Extends the existing Linux `backend-frontend` job in `.github/workflows/verify.yml` (it already boots the ci backend on `:8080` and builds the frontend). No new job, no `needs` restructuring — the existing auto-merge step (already last in that job, gated on all prior steps passing) naturally requires the vision check to pass.

```
backend-frontend job (Linux, on PR):
  [existing] MySQL service → boot ci backend (:8080) → Phase 2 API → tsc → ng test
  [NEW, only if a design-ref exists for the story]
    → ng build --configuration=ci        (app points at the ci backend)
    → serve www on a local port
    → Playwright (iPhone-16-Pro viewport):
         render tab3                       ─┐ calibration references
         render a representative settings page ─┘ (known-good: design language + notch spacing)
         render the story's changed route(s)   (devPage-authed against :8080, no passkey)
       screenshot each
    → Vision step: Claude vision API with
         [reference shots] + [approved mockup] + [story render]
       → PASS, or FAIL + specific drift/layout notes
  [existing] auto-merge routine PR on green
```

A FAIL turns the job red → the PR can't auto-merge → the routine's existing ≤2-go-back fix-loop hands the drift notes back to the builder.

## 4. New build configuration (answers "does ng build need a config?")

The default `local` Angular config points `backendApiUrl` at `https://local.fredvested.com/api` (the Cloudflare tunnel) — unreachable in CI. So:
- Add `frontend/src/environments/environment.ci.ts`: `backendApiUrl: 'http://localhost:8080/api'`, `rpId: 'localhost'`, `local: true`, `production: false`.
- Add a `ci` configuration to `angular.json` (fileReplacement `environment.ts` → `environment.ci.ts`).
- The job builds with `ng build --configuration=ci` so the served app talks to the ci backend running in the same job. The iOS simulator concern is gone (no native build); Playwright hits the served `www` directly.

## 5. Components

| Piece | Responsibility |
|---|---|
| `frontend/src/environments/environment.ci.ts` + `angular.json` `ci` config | Build the app pointed at the ci backend (`:8080`). |
| `verify.yml` (new steps in `backend-frontend`) | Build (ci), serve, Playwright-render, screenshot, call the vision check. Conditional on a design-ref existing. |
| `test/visual/render.mjs` (new) | Playwright driver: boot Chromium at iPhone-16-Pro metrics, navigate `?devPage=/<route>&testing=true`, wait for a render-settled signal, `screenshot()`. Used for both reference pages and the story route. |
| `test/visual/design-judge.mjs` (new) | Calls the Claude vision API with [reference shots + mockup + story render] + the judging prompt; exits 0 (pass) / 1 (fail) and prints the drift notes. |
| Design-ref (`ITPM/verify/design-ref/<story>`) | The approved mockup — already captured by itpm Step D2. |
| Route record | Which route(s) to render for this story (see Open Questions). |
| `ANTHROPIC_API_KEY` repo secret | Auth for the vision API call. **(Andy provides.)** |

## 6. The calibration/reference pass (Andy's addition)

Before judging, `render.mjs` captures two **known-good** pages at the iPhone viewport:
- **tab3** (the settings tab) — the app's established surface.
- **A representative tab3-linked settings page** — one with the blue-hero-header pattern (e.g. `change-bank-account` or `my-profile`; exact page chosen in the plan, fixed for stability).

These go to the vision judge as reference exemplars: "These are real, current, correct FRED pages — use them as the bar for the app's design language and for how much top space the notch/safe-area gets." The judge then assesses the story render against BOTH the approved mockup AND consistency with these references (design language + notch spacing). This keeps the judge calibrated to the real app instead of an invented standard, and re-rendering them each run keeps the bar current as the design evolves.

## 7. The vision judge — inputs & verdict

- **Inputs:** the 2 reference screenshots, the approved mockup image, the story's rendered screenshot(s).
- **Prompt (essence):** "Reference shots show FRED's current, correct design language and notch/safe-area spacing. The mockup is the approved design for this story. Does the render (a) match the approved mockup, and (b) fit the app's established design language + notch spacing? Report any concrete drift (spacing, color, type, radius, alignment, icon, overflow, header/notch spacing)."
- **Verdict:** `pass`, or `fail` + a concrete, builder-actionable list of differences. Fail → red → fix-loop.
- **Determinism caveat:** vision is non-deterministic; to avoid flaky gates, the judge is prompted to fail ONLY on clear, describable drift (not subjective nitpicks), and the static linter remains the deterministic floor for the notch class.

## 8. Phasing

- **Phase A:** the render infra — `environment.ci.ts` + `ci` build config + `render.mjs` (Playwright at iPhone viewport, devPage-authed against the ci backend, screenshot). Prove it reliably screenshots tab3 + a route in CI.
- **Phase B:** the vision judge — `design-judge.mjs` (Claude API), the calibration references, wire it into `verify.yml` as a conditional gating step.

## 9. Open questions (resolve in the plan)

1. **Route recording:** how the routine tells CI which route(s) to render — e.g. the routine writes `ITPM/verify/route-<story>.txt` next to the design-ref, or CI derives the route from the changed `*.page.ts` → route mapping. Pick the simpler reliable one.
2. **Which settings page** is the fixed calibration reference (change-bank-account vs my-profile) — pick one with the canonical blue-hero-header.
3. **Render-settled signal:** how `render.mjs` knows the page finished rendering (network-idle + a known selector) to avoid flaky mid-render screenshots.
4. **Mockup format:** the design-ref may be an image or HTML; if HTML, render it to an image first for the judge.
5. **Cost/trigger:** the vision call is ~cents/PR; the render is cheap on Linux. Run on every UI-story PR (no macOS cost concern now).

## 10. Non-goals

- No macOS runner, no native iOS build, no `simctl`, no CocoaPods/`xcodebuild`.
- No committed pixel baselines, no re-bless flow.
- Not replacing the static linter (it stays the deterministic notch/safe-area floor) or the Linux API/unit checks.

## 11. Success criteria

- A UI story whose render drifts from the approved mockup (wrong spacing/color/header) fails the vision check and can't auto-merge; the drift notes reach the builder.
- A faithful render passes. Backend-only PRs skip the check entirely.
- The judge's bar is grounded in real tab3 + settings references, not an invented standard.
