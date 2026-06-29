# Implementation Notes — FRED-186

## Design Decisions
- Both lump-sum and portfolio-customize share the same forkJoin(equity + ETF) pattern, placed verbatim inside switchMap per the approved approach.
- For stockselection: using HttpClient directly (not AlpacaService) to match the other two components' pattern and to pass a `search` param (AlpacaService.getAssets doesn't accept a search term).
- isSearching toggled using tap() before switchMap and set false inside subscription; used tap on the inner observable to set isSearching=true right before the HTTP calls.
- catchError on inner observable returns of([]) (empty array) so outer stream survives.
- lump-sum had `debounce="300"` on ion-searchbar in template — removing it since the Subject pipe now owns debounce (avoid double-debounce).
- portfolio-customize same: removing `debounce="300"` from ion-searchbar template.
- stockselection removes `debounce="300"` from ion-searchbar template too.
- stockselection's `isLoadingAssets` field and related template block removed (no preload anymore); using `isSearching` for the search spinner only.
- The `filteredResults` field in stockselection is kept (it's used for selectedStocks display logic is separate), actually it was only for internal use — removing it since it's no longer needed.
- Min-length guard: using `switchMap(term => term.length < 2 ? of([]) : forkJoin(...))` pattern — clear results when < 2 chars, fire no request.

## Deviations from Spec
- stockselection template: `*ngIf="!isLoadingAssets"` wrapper must be removed since `isLoadingAssets` is deleted; content goes unconditional (search bar always visible).
- For the isSearching toggle across the async boundary: using tap() before the inner observable and ensuring it's set false in the subscription's next/error handlers.

## Open Questions
- None; spec is clear.
