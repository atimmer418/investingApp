# Selective Route Preload — Design

**Date:** 2026-07-03
**Status:** Implemented + adversarially reviewed (pending Andy's review)
**Origin:** Andy: onboarded users shouldn't pay to prefetch onboarding routes; derive onboarded-ness from the JWT `ns` claim.

## Problem

`main.ts` used `withPreloading(PreloadAllModules)`: after the first navigation, every lazy route is fetched in the background — including onboarding-only chunks that a fully onboarded user never visits again.

Cost by environment:
- **Prod native iOS:** chunks come from the local bundle — cost is background parse + memory only. Modest.
- **Dev on device via tunnel:** `local.fredvested.com` is served `Cache-Control: no-store`, so every reload re-pulls all onboarding modules through the tunnel. This is the real win.
- **Any future web deployment:** genuine bandwidth waste per session.

## Decision

Replace `PreloadAllModules` with a custom `SelectivePreloadStrategy`:

- Routes marked `data: { onboardingOnly: true }` are **skipped** when `JwtTokenUtils.getNextStepHint()` returns `'complete'`.
- Every other state — logged out, mid-onboarding, pre-`ns` token, expired token — preloads everything, i.e. the old behavior. A skipped chunk still lazy-loads on demand at navigation, so the worst case is never breakage.
- The fall-through `load()` is wrapped in `catchError(() => EMPTY)`, mirroring `PreloadAllModules` internals. Without it, one failed chunk fetch errors the RouterPreloader's single no-error-callback subscription and silently kills preloading for the rest of the session (confirmed against @angular/router 19.2.22 source).

### Why the JWT `ns` claim
`/user/progress` arrives async — after the router preloader has already fired on the first `NavigationEnd`. The `ns` claim is readable synchronously via `JwtTokenUtils`, and `ns === 'complete'` is the same signal `app.component`'s cold-start fast-path already trusts.

### Expired tokens (revised after adversarial review)
First draft added an expiry-ignoring reader on the theory that most cold opens hold an expired JWT (30-min idle cap). Review disproved this: `AuthService.checkExistingSession()` runs synchronously at bootstrap and deletes expired tokens (auth.service.ts:112 and :115) before any navigation happens, and with `withDisabledInitialNavigation` the preloader only fires after the first manual navigation — by which point re-auth has minted a fresh valid token. The strict, validity-checked `getNextStepHint()` therefore behaves identically in every real scenario, so the strategy uses it and no new util method exists.

### Routes flagged `onboardingOnly` (6)
get-started, survey-initial, fi-plan-results, investment-schedule, investment-confirmation, recovery — ~313 KB of chunks skipped for onboarded users.

Explicitly NOT flagged:
- **kyc-verification** — Security Settings "Update KYC" (`security-settings.page.ts:225`, `?edit=true` editMode) is a designed post-onboarding flow (caught in review)
- **auth-finalize** — `AppLockService.forceRecovery()` (app-lock.service.ts:106) navigates logged-in users here as last-resort lock recovery (caught in review)
- **portfolio-customize** — reachable post-onboarding (tab3.page.ts:397)
- **document-upload** — reachable post-onboarding (my-profile.page.ts:132)
- **link-bank** — `LinkPlaidComponent` is statically imported (main bundle; preloading doesn't apply)

### stock-selection removed (same session)
The review surfaced that `stock-selection` had no navigation sites anywhere; Andy confirmed it was a dead route and asked for removal. Deleted: the route, `components/stockselection/` (4 files), and the stale `needsStockSelection` scenario in `test-user-simulator.utils.ts` (it referenced `choseToPickStocks`/`stockSelectionCompleted` progress flags that no longer exist in `UserProgress`).

## Components

- `frontend/src/app/selective-preload.strategy.ts` — the strategy (root-provided injectable)
- `frontend/src/app/app.routes.ts` — `data: { onboardingOnly: true }` on the 6 routes
- `frontend/src/main.ts` — `withPreloading(SelectivePreloadStrategy)`

## Testing

- Unit: `selective-preload.strategy.spec.ts` — flag × ns-claim matrix, expired-token (strict) case, malformed token, and catchError swallow.
- Live (dev server network log): logged out ⇒ all chunks still preload (regression); dev login with real `ns: 'complete'` JWT ⇒ flagged chunks absent, tabs + post-onboarding pages present.

## Out of scope / follow-ups

- tax-documents.page chunk is 1.1 MB — the single largest preload for everyone; candidate for its own deferral decision.
- Lazifying LinkPlaidComponent.
