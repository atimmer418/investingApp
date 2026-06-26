# Acceptance Check Manifest — FRED-186: Update API searches to use debounce and switchMap

Scope (per Andrew's 2026-06-25 approval): lump-sum-investment stock search,
portfolio-customize stock search, and stockselection search (the last converted
from a client-side filter to a backend `/alpaca/assets` search). The my-profile
referral validator is OUT of scope.

## AC-1: lump-sum + portfolio-customize searches use a debounced switchMap Subject pipe
- Type:     frontend-unit
- Check:    In `lump-sum-investment.page.ts` and `portfolio-customize.component.ts`, a `Subject<string>` (e.g. `searchInput$`) is fed by the input handler via `.next(value)` (the handler no longer calls the async `searchStocks` directly), and is subscribed once in `ngOnInit` with `debounceTime(300)` → `distinctUntilChanged()` → `switchMap(...)` → `takeUntil(this.destroy$)`. Verify by grep for `searchInput$`, `debounceTime(300)`, `distinctUntilChanged`, `switchMap`, `takeUntil(this.destroy$)` in both files; confirm the template `(ionInput)` handler calls `.next(...)`.
- Evidence: Both .ts files declare `searchInput$ = new Subject<string>()` and pipe `debounceTime(300) → distinctUntilChanged() → switchMap(...) → takeUntil(this.destroy$)` in ngOnInit. `onSearchInput(event)` calls `this.searchInput$.next(value)`. Both .html templates changed `(ionInput)="searchStocks()"` → `(ionInput)="onSearchInput($event)"` and the old `searchStocks()` async method was deleted. (git diff, both component pairs.)
- Status:   pass

## AC-2: equity + ETF /alpaca/assets calls folded into one cancellable forkJoin
- Type:     frontend-unit
- Check:    In both stock-search components the equity and ETF `/alpaca/assets` requests run inside a single `forkJoin(...)` placed inside the `switchMap`, so a newer keystroke cancels both together. Verify by grep for `forkJoin` inside the switchMap body in both files; confirm there are no longer two sequential `await ... toPromise()` calls outside the stream.
- Evidence: Both files build `equity$` and `etf$` (each `http.get<AlpacaAsset[]>('/alpaca/assets', {asset_class us_equity / etf})`) and return `forkJoin([equity$, etf$])` from inside `switchMap`. The two prior sequential `await ...toPromise()` calls were deleted with the old `searchStocks()` method. (git diff.)
- Status:   pass

## AC-3: stockselection converted to a backend /alpaca/assets search (no frontend filtering)
- Type:     frontend-unit
- Check:    In `stockselection.component.ts` the in-memory `allAssets` filter and the `loadAssets()` preload are removed; the search feeds a `Subject<string>` through the same `debounceTime(300)` → `distinctUntilChanged()` → `switchMap(term => /alpaca/assets request)` → `takeUntil(destroy$)` pipe and maps results into `StockAsset {symbol,name}`. Verify by grep: `allAssets`/`loadAssets` no longer drive search (preload removed), and `/alpaca/assets` (or an AlpacaService search call) appears inside the switchMap.
- Evidence: `allAssets`, `loadAssets()`, `isLoadingAssets`, `filteredResults` and the demo-data fallback all removed; `AlpacaService` import/dependency dropped in favor of `HttpClient` + `JwtTokenUtils` + `environment`. New ngOnInit pipe runs the same `debounceTime(300)→distinctUntilChanged()→switchMap(forkJoin equity$/etf$ on /alpaca/assets)→takeUntil(destroy$)`, mapping results to `{symbol, name}`. Template removed the `*ngIf="!isLoadingAssets"` wrapper and `isLoadingAssets` spinner, switched `(ionInput)` to `onSearchInput($event)`, kept loading/empty/results states. (git diff stockselection .ts + .html.)
- Status:   pass

## AC-4: switchMap cancels in-flight requests — stale-result race fixed on all three searches
- Type:     frontend-unit
- Check:    Each of the three searches routes its request through `switchMap` (not a bare `subscribe`/`await`), guaranteeing the previous request is unsubscribed when a new term arrives. Verify the request observable is the return value of the `switchMap` projection in all three components.
- Evidence: In all three components the `forkJoin([equity$, etf$])` observable (or `of(null)` for the <2-char guard) is the return value of the `switchMap` projection; no bare `subscribe`/`await toPromise()` remains for search. switchMap unsubscribes the prior inner observable on each new emission. (git diff, all three.)
- Status:   pass

## AC-5: min-length + empty-input guards preserved; 300ms debounce
- Type:     frontend-unit
- Check:    Stock searches still require ≥2 chars; empty/too-short input clears `searchResults` and fires no request (guard inside the pipe, e.g. `filter`/early map to empty). Debounce window is exactly `debounceTime(300)`. Verify by reading the pipe in all three components.
- Evidence: All three switchMap bodies begin `if (!term || term.length < 2) { this.searchResults = []; this.isSearching = false; return of(null); }` — clears results and fires no HTTP request. Each pipe uses exactly `debounceTime(300)`. The template `debounce="300"` was removed from all three ion-searchbars to avoid double-debounce (pipe now owns it). (git diff, all three .ts + .html.)
- Status:   pass

## AC-6: loading / empty / error states intact; failed request does not kill the stream
- Type:     frontend-unit
- Check:    `isSearching` is set true before the request and false on completion across the async boundary; the inner request observable has `catchError` (returns a safe empty value) so a failure does NOT terminate the outer Subject pipe — the next keystroke still searches. Verify `catchError` is INSIDE the switchMap (inner observable), not on the outer stream.
- Evidence: `this.isSearching = true` is set inside switchMap before issuing the requests; `this.isSearching = false` is set at the top of the subscribe handler. Each of `equity$`/`etf$` has `.pipe(catchError(() => of([])))` and the `forkJoin` itself has `catchError(() => of([[],[]]))` — all INSIDE the switchMap projection. No `catchError` on the outer stream, so a failed request emits a safe empty array and the outer Subject pipe survives; the next keystroke still searches. Templates retain `*ngIf="isSearching"` spinner, results `ion-list`, and empty `No stocks found` branches. (git diff, all three.)
- Status:   pass

## AC-7: subscriptions cleaned up via takeUntil(this.destroy$); no leaks
- Type:     frontend-unit
- Check:    Each new search subscription is chained with `takeUntil(this.destroy$)` and `ngOnDestroy` calls `this.destroy$.next(); this.destroy$.complete();`. Verify in all three components.
- Evidence: All three pipes end with `takeUntil(this.destroy$)` before `.subscribe(...)`. lump-sum already had `destroy$` + ngOnDestroy; portfolio-customize and stockselection now `implements OnDestroy` and add `ngOnDestroy(){ this.destroy$.next(); this.destroy$.complete(); }` plus `private destroy$ = new Subject<void>()`. (git diff, all three.)
- Status:   pass

## AC-8: my-profile referral validator unchanged (out of scope)
- Type:     frontend-unit
- Check:    `my-profile.page.ts` `onReferralCodeInput` / referral-validation code is not modified by this change (git diff shows no change to that file's search logic).
- Evidence: `git diff --name-only` lists only the 6 expected files (lump-sum .ts/.html, portfolio-customize .ts/.html, stockselection .ts/.html). `my-profile.page.ts` is absent from the diff — referral validator untouched.
- Status:   pass

## AC-9: typecheck + build clean
- Type:     api-integration
- Check:    `cd frontend && npx tsc --noEmit` exits 0; `cd frontend && ng build --configuration=ci` (or the project's CI build config) succeeds within budget.
- Evidence: `npx tsc --noEmit` exited 0 (zero type errors; tsconfig NOT in diff). `npx ng build --configuration=ci` exited 0, output written to /home/user/FRED/frontend/www. Only pre-existing warnings emitted (TS-998113 `IonToolbar not used` in unrelated pages, `html2canvas not ESM`) — none from the three changed components. API contract cross-checked: backend `GET /api/alpaca/assets` (AlpacaController:189) accepts `status`/`asset_class`/`search` exactly as all three components send; documented in FREDdocs/API_ENDPOINTS.md:140.
- Status:   pass
