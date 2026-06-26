# Acceptance Check Manifest — FRED-186: Update API searches to use debounce and switchMap

Scope (per Andrew's 2026-06-25 approval): lump-sum-investment stock search,
portfolio-customize stock search, and stockselection search (the last converted
from a client-side filter to a backend `/alpaca/assets` search). The my-profile
referral validator is OUT of scope.

## AC-1: lump-sum + portfolio-customize searches use a debounced switchMap Subject pipe
- Type:     frontend-unit
- Check:    In `lump-sum-investment.page.ts` and `portfolio-customize.component.ts`, a `Subject<string>` (e.g. `searchInput$`) is fed by the input handler via `.next(value)` (the handler no longer calls the async `searchStocks` directly), and is subscribed once in `ngOnInit` with `debounceTime(300)` → `distinctUntilChanged()` → `switchMap(...)` → `takeUntil(this.destroy$)`. Verify by grep for `searchInput$`, `debounceTime(300)`, `distinctUntilChanged`, `switchMap`, `takeUntil(this.destroy$)` in both files; confirm the template `(ionInput)` handler calls `.next(...)`.
- Evidence:
- Status:   pending

## AC-2: equity + ETF /alpaca/assets calls folded into one cancellable forkJoin
- Type:     frontend-unit
- Check:    In both stock-search components the equity and ETF `/alpaca/assets` requests run inside a single `forkJoin(...)` placed inside the `switchMap`, so a newer keystroke cancels both together. Verify by grep for `forkJoin` inside the switchMap body in both files; confirm there are no longer two sequential `await ... toPromise()` calls outside the stream.
- Evidence:
- Status:   pending

## AC-3: stockselection converted to a backend /alpaca/assets search (no frontend filtering)
- Type:     frontend-unit
- Check:    In `stockselection.component.ts` the in-memory `allAssets` filter and the `loadAssets()` preload are removed; the search feeds a `Subject<string>` through the same `debounceTime(300)` → `distinctUntilChanged()` → `switchMap(term => /alpaca/assets request)` → `takeUntil(destroy$)` pipe and maps results into `StockAsset {symbol,name}`. Verify by grep: `allAssets`/`loadAssets` no longer drive search (preload removed), and `/alpaca/assets` (or an AlpacaService search call) appears inside the switchMap.
- Evidence:
- Status:   pending

## AC-4: switchMap cancels in-flight requests — stale-result race fixed on all three searches
- Type:     frontend-unit
- Check:    Each of the three searches routes its request through `switchMap` (not a bare `subscribe`/`await`), guaranteeing the previous request is unsubscribed when a new term arrives. Verify the request observable is the return value of the `switchMap` projection in all three components.
- Evidence:
- Status:   pending

## AC-5: min-length + empty-input guards preserved; 300ms debounce
- Type:     frontend-unit
- Check:    Stock searches still require ≥2 chars; empty/too-short input clears `searchResults` and fires no request (guard inside the pipe, e.g. `filter`/early map to empty). Debounce window is exactly `debounceTime(300)`. Verify by reading the pipe in all three components.
- Evidence:
- Status:   pending

## AC-6: loading / empty / error states intact; failed request does not kill the stream
- Type:     frontend-unit
- Check:    `isSearching` is set true before the request and false on completion across the async boundary; the inner request observable has `catchError` (returns a safe empty value) so a failure does NOT terminate the outer Subject pipe — the next keystroke still searches. Verify `catchError` is INSIDE the switchMap (inner observable), not on the outer stream.
- Evidence:
- Status:   pending

## AC-7: subscriptions cleaned up via takeUntil(this.destroy$); no leaks
- Type:     frontend-unit
- Check:    Each new search subscription is chained with `takeUntil(this.destroy$)` and `ngOnDestroy` calls `this.destroy$.next(); this.destroy$.complete();`. Verify in all three components.
- Evidence:
- Status:   pending

## AC-8: my-profile referral validator unchanged (out of scope)
- Type:     frontend-unit
- Check:    `my-profile.page.ts` `onReferralCodeInput` / referral-validation code is not modified by this change (git diff shows no change to that file's search logic).
- Evidence:
- Status:   pending

## AC-9: typecheck + build clean
- Type:     api-integration
- Check:    `cd frontend && npx tsc --noEmit` exits 0; `cd frontend && ng build --configuration=ci` (or the project's CI build config) succeeds within budget.
- Evidence:
- Status:   pending
