# FRED-205 — Preload tab1 portfolio — hold splash for fresh data

## Before (from backlog.md)
> ## FRED-205 — Preload tab1 portfolio — hold splash for fresh data
> Eliminate the "Loading your portfolio…" spinner at tab1 first paint for onboarded users. Root cause: `waitForRoutePainted()` (app.component.ts:337-352) lifts the launch cover when `ion-content` has layout, NOT when portfolio data arrives, so the cover reveals the spinner while the 3 sequential portfolio GETs are still in flight. Phase 1 (tournament-selected, approved plan): (1) new `PortfolioStoreService`; (2) `prime()` at tryOptimisticNav; (3) data-gated tab1 cover; (4) `forkJoin` bundle + `applyBundle()`. No backend change.

## After (structured ticket)

**Summary:** Kill the "Loading your portfolio…" spinner at tab1's first paint for onboarded users by fetching the portfolio data at launch and holding the launch cover until that data is painted, then lifting onto real numbers. Frontend-only.

**Systems / files involved** (all under `frontend/src/app/`):
- **New:** `services/portfolio-store.service.ts` — `@Injectable({ providedIn: 'root' })`. In-memory single-flight cache (`shareReplay(1)` + in-flight guard, 60s TTL keyed by `userId`), `load$(period, force)`, `prime()` (token-gated, fire-and-forget), `whenSettled(period, capMs)` (bounded readiness for the cover gate), and `fetchBundle$` = `forkJoin` of the three existing `PortfolioService` calls (dashboard fatal; performance + history optional via `catchError`; `timeout(10_000)`). Clears in-memory state on `auth.isLoggedIn$ === false`.
- `app.component.ts` — inject the store; call `prime()` at :419 inside `tryOptimisticNav()`'s `hint==='complete'` block before `navigateByUrl('/tabs/tab1')`; gate the tab1 cover-hide (`hideCoversWhenReady`) on the data being painted, bounded by the existing ~2s cap, branching only on `/tabs/tab1`.
- `components/portfolio-dashboard/portfolio-dashboard.component.ts` — rewire `loadPortfolioData()` to source one bundle from `store.load$(this.selectedPeriod, isRefresh)`; extract `applyBundle(bundle, isRefresh)` preserving the perf-sync money-math (lines 176-220) and the history→chart→freedom→MFU ordering (227-239) verbatim.
- *(Optional, low value)* `components/investmentconfirmation/investmentconfirmation.component.ts` — `prime()` in the `completeStep('investmentConfirmation')` success callback (~:657) as an onboarder head-start. Note: onboarder nav to tab1 has no launch cover, so the splash-hold doesn't apply there; reasonable to defer to FRED-206.

**Doc references:**
- `./FREDdocs/API_ENDPOINTS.md` — the `/portfolio/dashboard`, `/portfolio/performance`, `/portfolio/history` contracts the bundle wraps.
- `./FREDdocs/PROGRESS_TRACKING_SYSTEM.md` — `loadUserProgress()` is the fetch-once/timeout/retry pattern the store's `fetchBundle$` mirrors (`timeout(10_000)`).
- `./FREDdocs/AUTHENTICATION_AND_JWT.md` — `JwtTokenUtils` token gating for `prime()` (never fire token-less).
- Reuse precedents in-repo: `trading.service.ts` (in-memory brokerage state), `freedom-stats.service.ts` (snapshot precedent — used in FRED-206).
- Approved plan: `.claude/plans/we-want-to-add-ancient-cook.md`.

**Acceptance Criteria:**
1. A `PortfolioStoreService` (`@Injectable({ providedIn: 'root' })`) exists at `frontend/src/app/services/portfolio-store.service.ts` exposing `prime()`, `load$(period, force)`, and `whenSettled(period, capMs)`, backed by an in-memory single-flight cache (60s TTL, keyed by `userId`) that returns the in-flight observable rather than issuing a second request.
2. The three portfolio GETs execute in parallel via `forkJoin` (not three sequential `await`s): dashboard is fatal; performance and history are optional (`catchError` → `[]` / `null`); the whole bundle is bounded by `timeout(10_000)`.
3. `prime()` is invoked at `app.component.ts:419` inside `tryOptimisticNav()`'s `hint==='complete'` block, before `navigateByUrl('/tabs/tab1')`. It is a no-op when there is no JWT or the cache is already fresh, and cannot fire when the user is not routing to tab1 (existing gates preserved).
4. On a normal network, cold-launching (and re-authenticating via passkey) as a fully-onboarded user shows tab1's real portfolio — equity, chart, freedom badge — at first paint with **no** "Loading your portfolio…" spinner; the launch cover holds until the data is painted, then lifts onto it. Verified on a local Capacitor iOS build (or 430×932 webview).
5. The tab1 cover-gate is bounded by the existing ~2s safety cap and branches only on `/tabs/tab1`; no other route's cover timing changes; the cover never hangs — slow network → cap fires → today's spinner; backend down → existing error card + "Try Again".
6. `prime()` plus the component's own `load$()` produce exactly **one** set of the three GETs (single-flight join), not two — verified in the network panel; the calls are parallel, not serial.
7. Dollar figures are unchanged: `applyBundle()` preserves the perf-sync math (`portfolio-dashboard.component.ts:176-220`) and the history→chart→freedom→MFU ordering verbatim — the cover-revealed first frame and a subsequent pull-to-refresh show identical equity, total/period return, chart series, and freedom badge for the same account.
8. Pull-to-refresh still works (`load$(force:true)`, `isRefreshing` spinner, `event.target.complete()`); no auth-race/navigation regression on cold launch, background/resume, locked vs unlocked (Face ID), or dev login.
9. `ng build` (plain or `--configuration dev` — NOT `development`) passes AOT; lint clean; existing `portfolio-dashboard` / `tab1` specs pass; no new dead code or TODOs.

**Edge cases / open questions:**
- Onboarder finishing onboarding: no launch cover on the in-app nav → may still see a (shorter, prime-warmed) spinner; the durable fix for them is the FRED-206 snapshot. Decide whether to include the optional `investmentconfirmation` `prime()` now or defer.
- >60s gap between `prime()` and mount → TTL discards the warm result and re-fetches (harmless — just no head start).
- Cover-hide / Lottie logic is delicate (multiple backstops, 2s bound) — the gate change is the primary risk; keep the 2s cap as a hard ceiling.
- Reactive idiom for the in-memory layer: plain field + Observable (single-flight) is simplest and matches the sketch; BehaviorSubject/signals optional.

**Time estimate:** `1-3hr` (S–M)
**Label:** `[code]`
