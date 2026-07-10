# Implementation Notes — FRED-212
Dedupe boot-time API calls via single-flight stores

---

## Pre-change Audit (AC-1) — captured 2026-07-08

Puppeteer harness: `?devPage=/tabs/tab3` and `?devPage=/tabs/tab1`, 9s settle after networkidle0.

### TAB3 cold boot (20 requests total)

| Endpoint | Count |
|---|---|
| GET /api/portfolio/dashboard | 2 ← DUPLICATE |
| GET /api/alpaca/account/kyc | 2 ← DUPLICATE |
| GET /api/investment-schedule/current | 2 ← DUPLICATE |
| GET /api/alpaca/my-account-status | 1 |
| GET /api/monthly-freedom-update/check | 1 |
| GET /api/user/progress | 1 |
| OPTIONS (preflight for each unique URL) | mirrors GET count |

### TAB1 cold boot (16 requests total)

| Endpoint | Count |
|---|---|
| GET /api/user/progress | 3 ← duplicate, OUT OF SCOPE for FRED-212 |
| GET /api/portfolio/dashboard | 1 ✓ (already single-flight via store) |
| GET /api/portfolio/performance | 1 |
| GET /api/portfolio/history?period=ALL | 1 |
| GET /api/alpaca/my-account-status | 1 |
| GET /api/monthly-freedom-update/check | 1 |

### Root cause

All three tab3 duplicates come from **the same source**: `FreedomStatsService`.

- `FreedomStatsService` constructor fires `_fetchEquity()`, `_fetchBirthYear()`, `_fetchSchedule()` on first injection (when tab3 renders).
- `tab3.page.ts ionViewWillEnter()` immediately calls `freedomStatsService.refresh()`, which calls all three again.
- Because the underlying service methods return fresh `HttpClient` observables each time (no cache), two concurrent subscribers produce two HTTP calls each.

**The `devPage` double-init consideration**: the `?devPage=/tabs/tab3` boot fires `dev/authenticate-as-user` (1x) then navigates to tab3. The duplication is NOT a devPage-only artifact — the constructor+ionViewWillEnter pattern fires on every real cold launch of tab3, not just the devPage path.

### Responsible call sites

**portfolio/dashboard** (tab3: 2x):
- `FreedomStatsService._fetchEquity()` → `portfolioService.getPortfolioDashboard()` — call #1 (constructor)
- `FreedomStatsService.refresh()` → `_fetchEquity()` → same method — call #2 (ionViewWillEnter)
- Fix: route _fetchEquity() through PortfolioStoreService.load$() (existing FRED-205 store)

**alpaca/account/kyc** (tab3: 2x):
- `FreedomStatsService._fetchBirthYear()` → `alpacaService.getKycData()` — call #1 (constructor)
- `FreedomStatsService.refresh()` → `_fetchBirthYear()` → same method — call #2 (ionViewWillEnter)
- Fix: add single-flight cache to AlpacaService.getKycData()

**investment-schedule/current** (tab3: 2x):
- `FreedomStatsService._fetchSchedule()` → `authService.getCurrentInvestmentSchedule()` — call #1 (constructor)
- `FreedomStatsService.refresh()` → `_fetchSchedule()` → same method — call #2 (ionViewWillEnter)
- Fix: add single-flight cache to AuthService.getCurrentInvestmentSchedule()

**user/progress** (tab1: 3x) — OUT OF SCOPE for FRED-212. Not one of the three target endpoints; deferred as a backlog item.

---

## Design decisions

- **FreedomStatsService._fetchEquity()**: Route through `portfolioStoreService.load$()` and extract `bundle.dashboard.summary.equity`. This means one HTTP source for portfolio/dashboard app-wide; the store TTL (60s) covers both the constructor call and the immediate ionViewWillEnter refresh without any new HTTP.

- **AlpacaService.getKycData()**: Add minimal single-flight pattern (kycEntry + kycInFlight$ + static TTL_MS + userId-keying). Same structural pattern as PortfolioStoreService. Errors never cached — finalize() clears inFlight$, tap() only fires on success.

- **AuthService.getCurrentInvestmentSchedule()**: Add identical minimal single-flight pattern (scheduleEntry + scheduleInFlight$ + TTL_MS + userId-keying). AuthService already imports shareReplay, finalize, tap, of.

- **TTL**: 60_000ms (60s) for both new caches — consistent with PortfolioStoreService.TTL_MS.

- **Logout clearing**: Both new caches validate userId on read. If userId changes (logout → login as different user), the cached value's userId won't match current userId and a fresh fetch starts. No cross-user bleed.

- **Force-refresh**: No `force` parameter added to getKycData() or getCurrentInvestmentSchedule() — no pull-to-refresh UI path goes through them (the tab1 PTR only forces PortfolioStoreService). FreedomStatsService.refresh() is a stale-while-revalidate call; within TTL, returning cached is correct behaviour.

- **No changes to PortfolioStoreService**: The FRED-205/206 store is untouched — FreedomStatsService.load$() calls now JOIN the existing in-flight store observable, making the store do even more useful work.

## Deviations

- FreedomStatsService now injects PortfolioStoreService (replacing portfolioService for the equity fetch). This is a minimal dependency addition; PortfolioStoreService is already `providedIn: 'root'`.
- Removed `portfolioService` injection from FreedomStatsService (was only used for the equity fetch); the store is the authoritative source.

## Open questions / post-ship

- user/progress 3x on tab1: investigate separately. Three callers appear to subscribe to `authService.userProgress$` or call `getUserProgress()` independently during tab1 boot. Backlog candidate.
- Whether the ionViewWillEnter+refresh pattern should be changed to only fire refresh() if the store is NOT fresh (guard on `portfolioStore.isFresh()`) — currently fixed by the cache, but a future refactor could make the intent explicit.

---

## Post-change request log (AC-2 evidence)

### TAB3 cold boot — AFTER fix (18 requests, 0 duplicates in target endpoints)

| Endpoint | Before | After |
|---|---|---|
| GET /api/portfolio/dashboard | 2x | **1x** ✓ |
| GET /api/alpaca/account/kyc | 2x | **1x** ✓ |
| GET /api/investment-schedule/current | 2x | **1x** ✓ |
| GET /api/portfolio/performance | 0x | 1x (store forkJoin, new — see note) |
| GET /api/portfolio/history?period=ALL | 0x | 1x (store forkJoin, new — see note) |
| GET /api/alpaca/my-account-status | 1x | 1x |
| GET /api/monthly-freedom-update/check | 1x | 1x |
| GET /api/user/progress | 1x | 1x |

Note on performance + history appearing on tab3: routing FreedomStatsService._fetchEquity()
through the store's load$() causes the store's forkJoin (dashboard + performance + history)
to fire on tab3. Before the fix, FreedomStatsService bypassed the store and only called
dashboard directly. The extra performance + history calls are a net positive — they populate
the store cache so the user's first tab1 visit gets an instant cached bundle.

### TAB1 cold boot — AFTER fix (16 requests, unchanged)

| Endpoint | Before | After |
|---|---|---|
| GET /api/portfolio/dashboard | 1x | **1x** ✓ |
| GET /api/user/progress | 3x | 3x (out of scope — unchanged) |

### FRED-212 quality gates (AC-7) — final (go-back 2)
- `ng build --configuration dev` — exit 0 (only pre-existing IonToolbar warnings, none in FRED-212 files)
- fred-212-dedupe.service.spec.ts: 13/13 PASS (incl. new cross-service InvestmentService→AuthService invalidation test)
- freedom-stats.service.spec.ts: 26/26 PASS
- portfolio-store.service.spec.ts: 14/14 PASS

## Go-back 2 fix — 2026-07-08

- Gap: `recurring-investments.page.ts:656` mutates the schedule via `InvestmentService.createSchedule()` — a separate service hitting the same endpoint — which did not clear the `AuthService` schedule cache.
- Fix (option b): injected `AuthService` into `InvestmentService`; added `tap(() => this.authService.clearScheduleCache())` to all four schedule mutators: `createSchedule`, `pauseSchedule`, `resumeSchedule`, `updateInvestmentSchedule` (last has zero callers but wired for contract completeness).
- No circular dep risk: `InvestmentService` imported only `@angular/core`, `@angular/common/http`, `rxjs`, `environment` before this change.
- New spec added (#13): warm AuthService cache → InvestmentService.createSchedule() success → assert AuthService.getCurrentInvestmentSchedule() fires fresh HTTP.
- portfolio-store.service.spec.ts: 14/14 PASS
