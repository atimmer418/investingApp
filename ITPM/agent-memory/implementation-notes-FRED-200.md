# Implementation Notes — FRED-200

## Design Decisions

- **Signal injection context**: `toSignal()` requires an injection context. Service constructor runs in one, so direct call is fine without `runInInjectionContext`.
- **`userProgress$` bridge**: `toSignal(authService.userProgress$, { initialValue: null })` — initial value needed because BehaviorSubject has no guaranteed non-null emit before injection.
- **Loading gate**: Uses a single `computed()` `isLoading` that returns `true` while either equity or birth-year haven't been resolved. Equity uses a sentinel `null` for "not yet fetched" vs `0` for "fetched, zero balance".
- **Snapshot key**: `fred.statStrip.v1.<userId>` — user-scoped, versioned. Clears in `clearJwtData()` using the userId read BEFORE removal (FRED-199 ordering lesson).
- **Silent background refresh on re-entry**: `ionViewWillEnter` in tab3 calls `freedomStatsService.refresh()` which re-fires equity + KYC fetches WITHOUT resetting loading state (so displayed values stay visible). Progress auto-refreshes via the `userProgress$` bridge.
- **`liveEquity` in tab3**: Still a plain class property updated from the service's `equity` signal via an `effect()` in ngOnInit (keeps FRED-195 pig avatar input feeding pattern intact).
- **`refresh()` method**: Triggers equity + KYC re-fetches (the two writable signals). Progress is always fresh via the reactive bridge; no need to re-fetch it on refresh.
- **`formatCompactCurrency` and the two `calculate*` methods**: Moved into the service (private). Tab3 no longer needs them.
- **My Profile `saveChanges()`**: Already calls `authService.loadUserProgress()` which pushes fresh data into `userProgress$` → the signal bridge auto-updates the stat strip. No additional explicit `refresh()` needed for progress. The equity/KYC signals stay as-is (My Profile doesn't change equity or DOB).
- **Old spec file (tab3.page.spec.ts)**: The FRED-196 tests tested `loadStatStrip()` properties on Tab3Page. After the refactor those properties are gone from tab3; the tests must be updated to test the service directly (new spec file) and tab3 becomes a thin render layer.

## Deviations

- **Old tab3.page.spec.ts tests**: The FRED-196 tests tested Tab3Page properties (`freedomAge`, `freedomYear`, `dollarsAway`, `statStripLoading`) directly. After this story those are removed from Tab3Page. I updated tab3.page.spec.ts to test the service's interface instead (removing the old Tab3Page-specific assertions that are now in the service spec).
- **`loadUserProgress()` call from `my-profile`**: Already present — no change needed.

## Tradeoffs

- Used `effect()` in tab3 to sync `liveEquity` from service signal rather than reading signal directly in getter — keeps the pig avatar reactive without template signal calls (tab3 uses class properties throughout).
- Snapshot persists only computed display values (year/age/dollarsAway strings) — not raw equity/income — so it's minimal and contains no financial PII beyond what's already displayed.

## Open Questions

- None at this time.
