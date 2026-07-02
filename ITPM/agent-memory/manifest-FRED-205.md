# Acceptance Check Manifest — FRED-205 (Preload tab1 portfolio — hold splash for fresh data)

Phase 1 only. Frontend-only. No backend change. Build ON TOP of the existing (uncommitted)
`tryOptimisticNav()` optimistic-nav feature in `app.component.ts` — do not revert/duplicate it.

Selective frontend-unit command:
`cd frontend && ng test --include='**/portfolio-store.service.spec.ts' --watch=false --browsers=ChromeHeadless`
AOT gate: `cd frontend && ng build --configuration dev` (NOT `development`).

VERIFIER RE-DERIVATION (2026-06-30, atimmer) — builder self-marks overwritten with independent evidence.

---

## AC-1: PortfolioStoreService exists as a single-flight root singleton
- Type:     frontend-unit
- Check:    `frontend/src/app/services/portfolio-store.service.ts` is `@Injectable({providedIn:'root'})` and exposes `prime(period?)` and `load$(period?, force?)`. `load$` returns a cached bundle when fresh (60s TTL, keyed by localStorage `userId`), else the in-flight observable if one exists, else a new shared (`shareReplay(1)`) fetch. Two overlapping `load$()` calls yield ONE HTTP fetch set.
- Evidence: VERIFIED. Read of service confirms `@Injectable({providedIn:'root'})` (line 31), `TTL_MS=60_000` (33), `isFresh()` keyed by `uid()`→`localStorage 'userId'` (49-58), `load$` fresh→`of(entry.bundle)` / in-flight→`inFlight$` / new→`shareReplay(1)` (70-93). Spec run: `portfolio-store.service.spec.ts` → TOTAL 8 SUCCESS; "two load$() subscriptions yield exactly one HTTP request per endpoint" green; "fresh cache … no new HTTP request" green.
- Status:   pass

## AC-2: The three portfolio GETs run in parallel (forkJoin), optionals tolerate failure, bounded timeout
- Type:     frontend-unit
- Check:    `fetchBundle$` = `forkJoin` of `PortfolioService.getPortfolioDashboard()` (fatal), `.getPerformance()` (optional, `catchError`→`[]`), `.getPortfolioHistory(period)` (optional, `catchError`→`null`), piped `timeout(10_000)`. All three requests issued concurrently.
- Evidence: VERIFIED. Code lines 95-103: `forkJoin({dashboard, performance.pipe(catchError→of([])), history.pipe(catchError→of(null))}).pipe(timeout(10_000))`. Spec "all three portfolio URLs are open simultaneously before any flush" green; "erroring performance and history … yields dashboard + perf:[] + history:null" green (errorFired false, bundle.performance [], bundle.history null). Endpoint URLs cross-checked against portfolio.service.ts (dashboard/performance path GETs, history GET with `params:{period}` query).
- Status:   pass

## AC-3: prime() fires at the tab1 choke point and is safely gated
- Type:     frontend-unit + code-review
- Check:    `PortfolioStoreService.prime()` is called inside `AppComponent.tryOptimisticNav()`'s `if (hint === 'complete')` block, immediately before `navigateByUrl('/tabs/tab1', {replaceUrl:true})`. `prime()` is a no-op when `localStorage 'jwtToken'` is absent or the cache is already fresh; never issues a request in those cases.
- Evidence: VERIFIED. app.component.ts `tryOptimisticNav()`: gated by `JwtTokenUtils.getValidJwtToken()` + `!appLockService.isEnabled()` + `!isCurrentlyLocked()` + `onboardingEntryRoutes.includes(currentBaseUrl)`; inside `if (hint === 'complete')` calls `this.portfolioStore.prime()` then `navigateByUrl('/tabs/tab1',{replaceUrl:true})`. Service prime() (110-114): `if(!localStorage.getItem('jwtToken')) return; if(this.isFresh()) return;`. Spec "prime() with no jwtToken → no HTTP requests" green; "prime() with a jwtToken → one fetch set" green; "prime() after a completed load$() issues no new request" green. NOTE: prime() reads `localStorage.getItem('jwtToken')` directly rather than `JwtTokenUtils.getValidJwtToken()` — AC behaviour holds (upstream caller validates), logged as a minor convention nit below.
- Status:   pass

## AC-4: No spinner at first paint on a normal network (cover holds for data) — MANUAL/device
- Type:     ui-acceptance
- Check:    Cold-launch (and passkey re-auth) as a fully-onboarded user on a normal network ⇒ tab1's first painted frame shows the real dashboard (equity + chart + freedom badge), NOT the "Loading your portfolio…" spinner; the launch cover holds until data paints, then lifts onto it.
- Evidence: NOT PRODUCIBLE IN THIS PASS. Backend :8080 is not running and no Capacitor iOS build / 430×932 webview stack is available in the verifier sandbox — a live first-frame screenshot cannot be captured. Repro for Andy: (1) start backend on :8080; (2) `cd frontend && ng serve` (or a local Capacitor iOS build); (3) fully-onboarded user (`ns:'complete'` JWT), App Lock OFF, normal network; (4) cold-launch to `/` and confirm the launch cover holds, then lifts directly onto equity + chart + freedom badge with NO "Loading your portfolio…" spinner; (5) repeat via passkey re-auth (authSucceeded$ path). Static reasoning supports the design (see AC-5), but the runtime artifact is required.
- Status:   blocked-manual — device re-verify pending
- Device finding (2026-07-01): Andy's on-device test showed cold-start WITHOUT reauth works (portfolio at first paint, no spinner); cold-start WITH reauth did NOT hold the cover (spinner shown). ROOT CAUSE: post-reauth iOS resume fires `resumeNoLock$ → checkSurveyStatusAndNavigate()` while `userProgress$` is null (loadUserProgress in flight) → the `!progress` branch called `hideCoversWhenReady()` with NO route arg → ungated hide on the current (non-tab1) route lifted the cover before tab1 data, beating the later tab1-gated hide (hideAllCovers is one-shot). FIX: `tryOptimisticNav()` now returns boolean; `checkSurveyStatusAndNavigate()`'s null-progress branch defers to it so a fully-onboarded (`ns:'complete'`) user gets the tab1 DATA-GATED cover-hide instead of the ungated current-route hide. Regression test app.component.spec `(vii)` was written failing (red on old code) then green after the fix. Needs Andy's device re-verify of the reauth cold-start.
- Device finding #2 (2026-07-01, deeper root cause via diagnose-reauth-cover-blank workflow — supersedes #1 as the primary cause): the reauth blank was NOT the checkSurveyStatusAndNavigate race. TRUE ROOT CAUSE: on cold-start reauth, `AppLockService.lockApp()` calls `hideAppCover()` (app-lock.service.ts:290) to unblock the passkey modal, and `unlockApp()` (341-346) NEVER re-shows it; the only `showAppCover()` call site (:179) is gated off by `isModalOpen`/5s unlock-grace — so the launch cover stays display:none through the whole reauth→tab1 path. The passkey modal (animated:false, its OWN Lottie) dismisses instantly onto an unpainted lazy tab1 → blank white → spinner → data. The data-gate was moot (no cover left to hold). Non-reauth never calls lockApp so the index.html cover stays up. FIX (shipped): (1) new `onReauthSuccess` callback @Input on PasskeyPromptComponent, called right BEFORE the modal dismiss; AppLockService passes `onReauthSuccess: () => this.showAppCover()` via componentProps (gap-free re-raise, no circular DI). (2) Companion: `waitForTab1DataPainted` selector hardened from `ion-router-outlet ion-content` to `app-portfolio-dashboard ion-content.portfolio-content` so the now-load-bearing gate can't resolve against the outgoing page's stale ion-content (a latent 2nd defect). Build + app.component.spec 8/8 + store spec 9/9 green. STILL device-only — needs Andy's reauth cold-start re-verify.

## AC-5: tab1 cover-gate is bounded, tab1-only, and never hangs
- Type:     frontend-unit + code-review
- Check:    The cover-hide path gates ONLY `/tabs/tab1` on portfolio data being painted, bounded by a ~2s cap. No other route's cover timing changes. On cap expiry (slow net) or fetch error the cover still lifts. Non-tab1 `waitForRoutePainted()` behaviour unchanged.
- Evidence: VERIFIED (code-review). `hideCoversWhenReady` (323-328): `dataReady = route==='/tabs/tab1' ? waitForTab1DataPainted() : Promise.resolve()`; non-tab1 path is behaviourally identical to the old chain (painted→hideAllCovers). `waitForTab1DataPainted` (339-355) resolves when `ion-router-outlet ion-content` has `offsetHeight>0` and `.loading-container` is ABSENT — confirmed `.loading-container` is the `*ngIf="loading"` wrapper (portfolio-dashboard.component.html:27), so its absence = data block (`*ngIf="dashboard && !loading"`) or error card (`*ngIf="error && !loading"`) painted. Hard cap `setTimeout(finish, 2000)` guarantees lift. Rejection-safety: `waitForTab1DataPainted`/`waitForRoutePainted` executors only ever `resolve`; `preloadAssetsForRoute` wraps all font/image work in catch/finish + 1.5s race → never rejects; therefore `Promise.all([painted, dataReady])` cannot reject-and-hang → `hideAllCovers()` always fires within ~2s.
- Status:   pass

## AC-6: Single-flight join — prime() + component load = one set of GETs
- Type:     frontend-unit
- Check:    A `prime()` followed by the component's `load$()` (same period, before the primed fetch resolves) results in exactly ONE set of the three GETs, not two.
- Evidence: VERIFIED. Period alignment confirmed: `prime()` default `period='ALL'` (service:110) and component initial `selectedPeriod='ALL'` (portfolio-dashboard.component.ts:46); `loadPortfolioData()` calls `load$(this.selectedPeriod, isRefresh)` at initial load → `load$('ALL', false)` JOINS the primed in-flight. Spec "prime() then load$() before flush → exactly one set of three GETs" green (dashboard/performance/history each count 1, not 2).
- Status:   pass

## AC-7: Dollar figures unchanged — applyBundle preserves perf-sync math verbatim
- Type:     frontend-unit + code-review
- Check:    `loadPortfolioData()` sources one bundle from `store.load$(selectedPeriod, isRefresh)`; extracted `applyBundle(bundle, isRefresh)` reproduces the perf-sync money-math (old lines 176-220) and the history→chart→freedom→MFU ordering (227-239) VERBATIM.
- Evidence: VERIFIED (byte-for-byte diff). Total perf: `startValue=dashboard.totalInvested`, `endValue=summary.portfolioValue`, `totalReturn=totalGainLoss`, `totalReturnPercent=totalGainLossPercent` — identical to removed block. Today perf: `endValue=summary.portfolioValue`, `todayPL=positions.reduce((s,p)=>s+(p.todayGainLoss||0),0)`, `totalReturn=todayPL`, `startValue=endValue-totalReturn`, percent guard `if(startValue!==0) …*100 else 0` — identical; no drift/reorder/dropped-guard. history→chart equivalence: OLD `loadHistoryForPeriod` did success-truthy→`dashboard.history=history; chartData=processChartData(history)`, error→`chartData=[]`; NEW does truthy→same (line 238-239, SAME `processChartData` fn), null→`chartData=[]`. `getPortfolioHistory().map` always emits a truthy object, so `bundle.history===null` ⟺ history GET errored, exactly matching OLD's error→[] branch. Ordering (performance-sync → history→chart → freedom label → MFU on !isRefresh) preserved. AOT build green (no type errors).
- Status:   pass

## AC-8: Pull-to-refresh intact; no auth-race/navigation regression
- Type:     frontend-unit
- Check:    `onRefresh()` → `loadPortfolioData(true)` → `store.load$(period, force:true)` bypasses cache/in-flight; `isRefreshing` and `event.target.complete()` paths unchanged. `prime()` is a read-only GET, no `isLoggedIn`/`completeStep`/navigation side effects.
- Evidence: VERIFIED. `onRefresh` (256-259) → `loadPortfolioData(true)` → `load$(this.selectedPeriod, isRefresh=true)`; `load$` force branch (71-78) skips fresh + in-flight checks, always starts a new fetch. `isRefreshing` set (158) / reset in finally (172-176); `event.target.complete()` (258). prime()/store perform only GETs — no auth/nav mutation. `app.component.spec.ts` → TOTAL 7 SUCCESS (cold-start (i)-(v), post-reauth (vi), smoke) — no auth/nav regression.
- Status:   pass

## AC-9: Build/lint/specs green, no new debt
- Type:     frontend-unit
- Check:    `ng build --configuration dev` passes AOT; new/changed specs pass; no new dead code, TODOs, or unused imports.
- Evidence: VERIFIED. `ng build --configuration dev` → "Application bundle generation complete. [3.162 seconds]" (exit 0); 12 warnings are ALL pre-existing unused-import warnings in unrelated files (recurring-investments, sell-withdraw, portfolio-customize) — none in any FRED-205-touched file. Specs: store 8/8, app.component 7/7. No TODO/FIXME in changed files. New imports all used (`JwtTokenUtils`, `PortfolioStoreService`, `PortfolioBundle`, `firstValueFrom`). `loadHistoryForPeriod` retained (referenced by `onPeriodChange`:269) — not dead. No NEW `.toPromise()` introduced (the one at :277 is pre-existing, inside the kept period-switcher).
- Status:   pass

---
VERIFIER SUMMARY: 8/9 pass with evidence; AC-4 blocked-manual (device-only, backend :8080 + iOS/webview unavailable in sandbox). Zero in-scope failures.
