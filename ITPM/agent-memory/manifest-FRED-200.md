# Acceptance Check Manifest — FRED-200: Always-loaded tab3 stat strip via signals service

> VERIFIER RE-RUN (2026-06-19): every check below independently re-executed by the
> verifier agent. Builder's pre-filled `pass`/evidence was NOT trusted — confirmed or
> refuted with artifacts produced in this run. Sandbox CANNOT drive the live app
> (egress allowlist blocks local.fredvested.com → HTTP 403; backend :8080 down), so
> UI ACs use rigorous CODE-LEVEL proofs, explicitly labelled, per the task fallback.

## AC-1: New `freedom-stats.service.ts` owns the three fetches + freedom-date/age/dollars-away math, preserved exactly
- Type:     frontend-unit
- Check:    `freedom-stats.service.ts` exists at `frontend/src/app/services/` with `@Injectable({ providedIn: 'root' })`. A spec verifies the math against fixed inputs: target = `retirementIncome / 0.04` ($1.5M default when income absent), `freedomAge = freedomYear − birthYear`, `dollarsAway = max(0, target − equity)`. Computed stats equal the values tab3 produced before for the same inputs.
- Evidence:  VERIFIER-RUN. `@Injectable({ providedIn: 'root' })` present (line 37). Math ported byte-for-byte: diffed against `git show HEAD:tab3.page.ts` loadStatStrip — `_calculateMonthsToTarget`/`_calculateFreedomYearClientSide`/`_formatCompactCurrency` identical (incl. 600 sentinel, 100yr cap, ASSUMED_ANNUAL_RETURN 0.10, SWR 0.04, $1.5M default). Live spec run: `ng test --include='**/freedom-stats.service.spec.ts' --browsers=ChromeHeadlessNoSandbox` (CHROME_BIN=/opt/pw-browsers chromium) → TOTAL: 22 SUCCESS, EXIT=0. AC-1 suite (5 tests) green.
- Status:   pass

## AC-2: Signals are the reactive primitive; old loadStatStrip orchestration removed; comment notes first signals usage
- Type:     frontend-unit
- Check:    Service uses `toSignal(authService.userProgress$)`, writable signals for equity + birth-year via `.set()`, `computed()` for stats + loading signal. tab3 renders from the signal. `loadStatStrip()`, done-flags, `tryRender()`, manual subscribe/takeUntil for the strip gone from tab3.page.ts. Comment marks first signals deviation.
- Evidence:  VERIFIER-RUN. `toSignal(userProgress$)` line 88; `signal()` equity/birthYear lines 64/70; `computed()` isLoading/stats lines 92/99. Deviation comment lines 8-9. grep "loadStatStrip|tryRender|progressDone|portfolioDone|kycDone|statStripLoading" in tab3.page.ts → No matches. grep "freedomYear|freedomAge|dollarsAway|calculateMonthsToTarget|...|PortfolioService|AlpacaService|AuthService" in tab3.page.ts → No matches (all old machinery deleted, not commented). tab3.html binds `freedomStatsService.isLoading()`/`stats()`. tab3 spec → TOTAL: 4 SUCCESS, EXIT=0.
- Status:   pass

## AC-3: Always loaded across navigation — instant on re-entry, no dashes, no second cold round; silent background refresh
- Type:     ui-acceptance (verified CODE-LEVEL — live tunnel/backend unavailable in sandbox)
- Check:    Singleton holds computed stats; re-entry renders last values instantly (no `—`); re-entry triggers SILENT stale-while-revalidate refresh; never a dash on re-entry.
- Evidence:  CODE-LEVEL PROOF. Service is `providedIn:'root'` singleton → state survives navigation. `ionViewWillEnter()` (tab3.page.ts:270) calls `freedomStatsService.refresh()`. `refresh()` (service:182-185) calls ONLY `_fetchEquity()`+`_fetchBirthYear()`; neither resets equity/birthYear to null (only `.set()` on next/error). `isLoading()` is `(equity===null||birthYear===null)&&!snapshot` → stays false after first load → no `—` on re-entry. Live spec "calls portfolio and KYC again without resetting equity to null" (refresh suite) green within the 22 SUCCESS run; tab3 spec "calls refresh() on ionViewWillEnter" green within 4 SUCCESS.
- Status:   pass

## AC-4: Auto-updates on My Profile change
- Type:     ui-acceptance (verified CODE-LEVEL)
- Check:    After `my-profile.page.ts saveChanges()` succeeds, strip reflects new monthly-investment / retirement-income with no manual reload, via loadUserProgress() → userProgress$ → toSignal.
- Evidence:  CODE-LEVEL PROOF. `pages/my-profile/my-profile.page.ts:488` saveChanges() success → `authService.loadUserProgress()` → pushes onto userProgressSubject (auth.service.ts:250) → userProgress$ emits → `toSignal` bridge (service:88) updates `userProgress()` → `stats()` computed re-reads `progress()` (service:100,117-118) → recomputes target/contribution → tab3 template (binds stats()) re-renders. equity/birthYear already non-null so real values produced. No tab3 recreation needed.
- Status:   pass

## AC-5: FRED-196 KYC resilience preserved
- Type:     frontend-unit
- Check:    Bounded transient-only retry (TimeoutError / status 0 / status ≥ 500; never 401/403/404; bounded backoff). Freedom Age degrades honestly. Freedom Date & To Go independent of KYC. No regression.
- Evidence:  VERIFIER-RUN. `_fetchBirthYear` (service:252-286): `timeout(10_000)` + `retry({count:2, delay})` with transient gate `isTimeout||status===0||status>=500`, else `throwError` (no retry); backoff `400*2^(attempt-1)` = 400/800ms — IDENTICAL to original tab3 FRED-196 block (diffed). birthYear=0 on miss/fail → freedomAge '—' (honest); freedomYear/dollarsAway computed independently of birthYear. AC-5 suite (5 tests: 503-retry-success, 401-no-retry, 503-exhausted, missing-DOB, year/dollars-unaffected) green within 22 SUCCESS.
- Status:   pass

## AC-6: tab3-vs-MFU split intact
- Type:     frontend-unit
- Check:    Service computes income-based freedom year ONLY; does not read/converge MFU contribution-based projection.
- Evidence:  VERIFIER-RUN. grep "currentFreedomEstimate|monthlyInvestment *\* *300|timeToFI|× *300" in freedom-stats.service.ts → only a COMMENT (line 122), zero reads. target is `retirementIncome/0.04` (income-based), never `monthlyInvestment×300`. AC-6 spec "does not read currentFreedomEstimate (2030)" green within 22 SUCCESS.
- Status:   pass

## AC-7: Unhappy paths handled; liveEquity preserved
- Type:     ui-acceptance (unit-backed + CODE-LEVEL)
- Check:    First load `—` via loading signal. Null/zero equity → max(0,…). Failed userProgress/portfolio degrades (no crash/eject/raw error). liveEquity feeds FRED-195 pig.
- Evidence:  VERIFIER-RUN + CODE-LEVEL. First-load `—`: isLoading() true at construction (equity&birthYear null, no snapshot) → tab3 spec "shows — placeholders while isLoading is true" green. Zero equity: `max(0,target-0)` (service:157) → AC-7 spec "$1.50M" green. Failed portfolio: error handler sets equity=0, isLoading false, no crash → AC-7 spec green. liveEquity fed via `effect()` (tab3.page.ts:207-209) from equity signal → tab3 spec "liveEquity is updated from equity signal" (75000) green. Stat strip styled in tab3.page.scss (.stat-strip/.stat-value); `—` rendered in styled tile (not stuck spinner/raw error). 22 + 4 SUCCESS.
- Status:   pass

## AC-8: Instant on cold launch via user-scoped localStorage snapshot
- Type:     ui-acceptance (unit-backed + CODE-LEVEL)
- Check:    User-scoped snapshot of displayed values persisted; hydrate on cold launch (real numbers, no `—`) then background-refresh; keyed/validated against userId; cleared in clearJwtData() BEFORE userId removed; missing/corrupt/foreign → `—` (no crash); derived display values only; no TTL.
- Evidence:  VERIFIER-RUN + CODE-LEVEL. Key `fred.statStrip.v1.<userId>` (service:35,196,226). `_hydrateFromSnapshot` validates `snapshot.userId===userId` + all-fields-present, try/catch on JSON.parse → corrupt/foreign fall back to `—`. Snapshot shape `{userId,freedomYear,freedomAge,dollarsAway}` — derived strings only, no tokens/PII. No TTL logic present. clearJwtData (jwt-token.utils.ts:104) removes snapshot INSIDE `if(userId)` BEFORE `removeItem('userId')` (line 108) — FRED-199 ordering confirmed. AC-8 suite (persist, user-scoping, corrupt-fallback, no-dash-guard) green within 22 SUCCESS. CODE-LEVEL CAVEAT/RISK: `_persistSnapshot` is invoked from INSIDE `computed()` (service:164) — a side effect in a pure primitive. It DOES fire in this app because tab3's template reads `stats()` (active consumer → CD evaluates it), so snapshot is written whenever tab3 renders real data. Architectural smell (idiomatic = effect()), filed out-of-scope; does NOT break the observable AC-8 contract.
- Status:   pass

## AC-9: No new debt; compiles clean; verified at 430×932
- Type:     frontend-unit
- Check:    Old machinery deleted (not commented); no orphaned imports / dead destroy$. `npx tsc --noEmit` exits 0; no new TS/SCSS warnings. Strip verified at 430×932.
- Evidence:  VERIFIER-RUN. `cd frontend && npx tsc --noEmit` → EXIT=0 (only pre-existing TS5101/TS5107 tsconfig deprecations, acceptable). Old loadStatStrip/math/done-flags grep → No matches (deleted). FRED-196 rxjs imports (timeout/retry/timer/throwError) removed from tab3; remaining rxjs imports (Subject/takeUntil/filter/take/Observable/effect) all still used; destroy$ still used by MFU/settings/plaid subs (not dead). safe-area-lint on tab3.page.html → clean, EXIT=0 (header untouched; only .stat-value bindings changed). 430×932 visual NOT live-rendered (sandbox egress blocks tunnel) — verified at code level only. Both specs green (22 + 4 SUCCESS).
- Status:   pass

---
## VERIFIER VERDICT: APPROVED
All 9 checks pass with verifier-produced artifacts. UI ACs (3,4,7,8) proven at
code level because the sandbox cannot reach the live app (egress 403 + backend down);
this is a documented fallback, not a silent downgrade. One architectural smell
(side effect inside computed()) noted as out-of-scope debt — does not violate any AC.
