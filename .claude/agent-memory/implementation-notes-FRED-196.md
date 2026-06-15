# Implementation Notes — FRED-196

## Design decisions

- The retry logic in `tab3.page.ts` was already fully implemented when the story started (the diff shows it had already been written). The main work was writing the spec.

- Used `overrideProvider` on concrete service class tokens (not string tokens) in the spec. Angular standalone component test harnesses need this because `providedIn: 'root'` services are resolved from the root injector; overrideProvider replaces the instance for the test module's injector.

- Used `new Observable(...)` (class-based) instead of `new rxjs.Observable(...)` from a dynamic import. Karma's Webpack bundler fails on dynamic `await import('rxjs')` inside fakeAsync test bodies (ChunkLoadError). Top-level imports are required.

- Added `customLaunchers.ChromeHeadlessNoSandbox` to `karma.conf.js` to run tests as root (no Chrome sandbox). This is a CI environment requirement — the base `ChromeHeadless` launcher crashes with "Running as root without --no-sandbox" error.

- `tick(10000)` at the end of each fakeAsync test drains the `timeout(10_000)` operator's pending macro-task timer. Without this, Jasmine warns about async tasks still pending after the test.

- For AC-1b (401 not retried): asserting `callCount === 1` is the direct proof that no retry happened. The retry `delay` function returns `throwError(() => err)` for non-transient statuses, which causes retry to propagate the error immediately.

## Deviations

- The spec could not use `TestBed.compileComponents()` with a `beforeEach` because each test requires a different `kycObservable`. Used a per-test `configureTestBed(kycObservable)` helper instead, with `TestBed.resetTestingModule()` in `afterEach`.

## Tradeoffs

- Considered using `TestScheduler` from `rxjs/testing` for marble-based timing, but `fakeAsync` + `tick()` is simpler and already the zone.js-native pattern for Angular tests. No need to introduce marble testing infrastructure.

## Open questions

- None. The scope was clear and the approved approach was exact.
