# FRED-201 — Keep loading screen up during cold-start reauth nav

## Before (from backlog.md)
> add story for painting the loading screen while navigation is happening instead of just showing an all blank white screen after a cold start with reauth. the loading screen should stay until the page underneath it is ready to appear and then it should disappear. this only happens on cold starts and after a reauth so that workflow should be the only one adjusted/modified to receive this fix

## After

### Summary
On a cold start that requires reauth, after the passkey ceremony succeeds the app navigates to its destination route but shows an all-blank white screen during that navigation instead of the loading cover. Keep the existing loading cover (the `coin-drop` Lottie over white, defined as `#app-resume-cover` in `index.html`) painted continuously through the cold-start → reauth → navigate sequence, and only hide it once the destination page underneath has actually rendered. Scope is strictly the cold-start + reauth workflow — no other show/hide path changes.

### Systems / files involved
- `frontend/src/app/app.component.ts`
  - `hideCoversWhenReady()` / `preloadAssetsForRoute()` (lines ~300-329) — current "page ready" heuristic only awaits fonts + a fixed route-image list + one `requestAnimationFrame`; it does NOT wait for the routed Angular view to actually paint, which is the white-gap.
  - `setupNavigationLogic()` / `navigateBasedOnProgress()` / `checkSurveyStatusAndNavigate()` (lines ~149-341) — the post-auth navigation path that ends in `hideCoversWhenReady(...)`.
- `frontend/src/app/services/app-lock.service.ts`
  - `showAppCover()` / `hideAppCover()` / `hideAllCovers()` (lines ~186-227), `checkLockOnResume()` / `lockApp()` reauth path, and the `_fredCoverAnim` `.play()` resume logic.
- `frontend/src/index.html`
  - Baked-in `#app-resume-cover` + `#app-resume-cover-lottie` + `#app-resume-cover-fallback` (lines 34-37) and the 20s backstop timer (`_cancelCoverHideTimer`).

### Doc references
- `./FREDdocs/AUTHENTICATION_AND_JWT.md` — JWT expiry + passkey reauth flow that the cold-start reauth path runs.
- Related prior work (memory): AppLockService behavior, auth-navigation race fixes, native iOS passkey bridge, progress-fallback eject guard.

### Acceptance criteria
1. **Repro fixed:** cold start (app fully terminated, not a background resume) with reauth required (JWT expired and/or App Lock on) → after the passkey ceremony succeeds, no all-blank white screen appears during navigation; the loading cover (coin-drop Lottie over white) stays painted instead.
2. **Cover persists across the whole sequence:** the loading cover remains continuously visible from native-splash hide → passkey reauth → route navigation, with no intermediate white frame.
3. **Hide only when the page is actually ready:** the cover is hidden only after the destination routed view has rendered/painted beneath it — not merely when `preloadAssetsForRoute` fonts/images resolve. "Page ready" detection is strengthened for this path (e.g. await the routed component's view being present/stable in the DOM in addition to the existing font/image preload + rAF) so the cover never hides over a blank view.
4. **Scope limited to cold-start + reauth only:** the normal background-resume path, the normal cold-start-without-reauth path, and the dev `?devPage=` path keep their current cover timing — no regressions.
5. **Safety nets intact:** the 12s `hideAllCovers()` watchdog in `ngOnInit`, the 20s `index.html` backstop, and `forceRecovery()` still force-hide the cover so a user can never be permanently trapped behind it.
6. **Clean single handoff:** no new white flash, no double-hide, and no cover flicker introduced at the cover→page transition.
7. `npx tsc --noEmit` exits 0; verified on a local Capacitor iOS build (or 430×932 webview) by reproducing the cold-start + reauth flow and confirming the cover-to-page handoff is seamless.

### Edge cases / open questions
- **Cold-start vs resume detection:** confirm the signal used to scope the change to cold start only (no prior in-memory session / first `platform.ready()` vs the resume path driven by `resumeNoLock$` / `lockWasShownThisResume`). This is the key scoping decision.
- **Destination varies:** the "view painted" signal must work generically — `/tabs/tab1`, an onboarding route, or `/recovery` — since `navigateBasedOnProgress` can land anywhere.
- **Progress-load failure / fallback:** `holdAuthenticatedUserOnFallback()` and the null-progress branch in `checkSurveyStatusAndNavigate()` must still end in the cover being hidden eventually (no permanent cover).
- **Lottie must be animating, not frozen:** ensure `_fredCoverAnim.play()` is active during the wait so the "loading screen" is the animation, not a frozen first frame / plain white.

### Estimate / label
1-3hr · [code]
