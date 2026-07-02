# Implementation Notes — FRED-205 (Phase 1)

## Design Decisions

- `whenSettled` is excluded: the approved plan and story instructions explicitly mark it Phase 2. The service exposes only `prime()`, `load$()`, `isFresh()`, `clearMemory()`.
- `force=true` in `load$()` bypasses both the fresh-cache check and the in-flight check, then overwrites `inFlight$` with the new observable. In the edge case where an old in-flight and a force call race, the old tap may overwrite the new entry — acceptable since pull-to-refresh never races with a live primed fetch in practice.
- `shareReplay(1)` (refCount:false default) used rather than `shareReplay({refCount:true})`: source stays subscribed even if prime()'s fire-and-forget sub unsubscribes early; component sub always gets the replayed value. This is the correct multicasting behavior for single-flight.
- History in `applyBundle`: reproduces `loadHistoryForPeriod()` logic verbatim (`this.dashboard.history = bundle.history; this.chartData = this.processChartData(bundle.history)`). `loadHistoryForPeriod` is left INTACT for the period-switcher.
- `app.component.spec.ts` — added a `portfolioStoreStub` (`prime: jasmine.createSpy`) and provided it in all TestBed configurations to prevent open HTTP requests from `prime()` in tests where `ns:'complete'` token is seeded.
- `waitForTab1DataPainted` 2s cap mirrors `waitForRoutePainted`'s 2s cap; both run in parallel via `Promise.all`, so the effective cap on tab1 is still ~2s (the longer of the two caps).
- URL matching in spec uses `req.url.includes('/portfolio/...')` (not full-URL string) so the spec is environment-agnostic across test/dev/local env configs.

## Open Questions

- AC-4 is device-only — cannot be verified without live backend + iOS build. Flagging to Andy.
