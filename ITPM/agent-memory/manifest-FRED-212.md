# Acceptance Check Manifest — FRED-212
Dedupe boot-time API calls via single-flight stores (FRED-205 pattern).
Story: `FREDdocs/.stories/FRED-212.md`.

> VERIFIER VERDICT (2026-07-08 pass-3, FINAL): **APPROVED** — all 7 ACs pass with evidence.
> History: rev.1 REVISION REQUIRED (all mutation paths unwired) → builder wired KYC + AuthService
> schedule mutators (tap-on-success) → pass-2 REVISION REQUIRED (one residual: recurring-investments
> edited the schedule via investmentService.createSchedule, a sibling service that didn't clear the
> AuthService cache) → builder took the complete-contract fix: InvestmentService now injects AuthService
> and tap-clears the cache on all four of its schedule mutators. pass-3 verified: no circular DI
> (static: no AuthService→InvestmentService back-edge; runtime: recurring-investments + tab3 boot clean,
> 0 uncaught/DI errors, real data renders), new cross-service spec passes (dedupe 13/13), build clean.

## AC-1: Pre-change boot network audit documented
- Type: static
- Check: implementation-notes lists each duplicated endpoint, count, responsible call sites, pre-change.
- Evidence: implementation-notes-FRED-212.md §Pre-change Audit — tab3 2x dashboard/kyc/schedule; root cause (constructor L184-186 + ionViewWillEnter refresh L194-197 fire same 3 fetches). Matches code.
- Status: pass

## AC-2: Exactly-once per cold boot
- Type: ui-acceptance
- Check: cold boot tab1 & tab3 → exactly 1 request each to portfolio/dashboard, investment-schedule/current, alpaca account/KYC.
- Evidence: VERIFIER independent audit (fred212-verify-audit.js, fresh incognito context per tab, :8100), re-run on the post-fix tree. TAB3: dashboard 1x, alpaca/account/kyc 1x, investment-schedule/current 1x. TAB1: dashboard 1x; kyc/schedule absent (tab3-only). tap-clear fires only on writes → cold-boot counts unchanged.
- Status: pass

## AC-3: Single-flight pattern conformance
- Type: static
- Check: shareReplay(1) refCount:false + TTL + explicit invalidation; no new state lib.
- Evidence: rxjs 7.8 → shareReplay(1) refCount:false. Both new caches: inFlight$ + entry + 60s TTL + finalize + tap, userId-keyed. _fetchEquity routes through existing load$(). No new lib. Invalidation via tap-clear on every schedule/KYC mutation.
- Status: pass

## AC-4: Behavior identity
- Type: ui-acceptance
- Check: consumer values unchanged vs before; mutation forces fresh; status-driven UI updates on same triggers.
- Evidence (read path): tab3 stat strip identical 2069 / 79 / $1.80M (fred212-verify-tab3.png + fred212-p3-tab3.png); tab1 normal; equity source byte-identical (store bundle.dashboard === getPortfolioDashboard()).
- Evidence (write path — ALL mutators now invalidate on SUCCESS):
  - KYC: updateKyc (alpaca.service.ts:220-228 tap→clearKycCache) — only KYC write. Complete.
  - Schedule via AuthService: createOrUpdateInvestmentSchedule (:535), pauseInvestmentSchedule (:607), resumeInvestmentSchedule (:615) tap→clearScheduleCache.
  - Schedule via InvestmentService (pass-3 fix): constructor injects AuthService (:107); tap→authService.clearScheduleCache() on updateInvestmentSchedule (:150), createSchedule (:205), pauseSchedule (:214), resumeSchedule (:223). All tap-on-success (failure leaves cache intact).
  - Coverage: every schedule-config mutator that changes a consumer-visible field (investmentAmount/frequency/isPaused/startDate) now clears. UNCOVERED but invisible: updateAchRequestId (both services) changes only achRequestId/userEmail — not read by any cache consumer; createManualInvestment is a one-time execution, not a schedule-config change.
- Evidence (specs): fred-212-dedupe.service.spec.ts 13/13 — incl. success-invalidates + failure-does-NOT-clear (KYC 422 :276-292, schedule 500 :380-391, both assert 0 fresh GET + cached value), and the cross-service test (:404-457) with REAL AuthService+InvestmentService: warm cache → investmentService.createSchedule() → next getCurrentInvestmentSchedule() fires a fresh GET.
- Evidence (circular-DI): InvestmentService→AuthService is a new edge; AuthService has zero InvestmentService refs and its 3 deps (DeviceId/KeychainSync/NativePasskey) don't reference InvestmentService → no cycle. Runtime (fred212-di-boot-check.js): /recurring-investments boots clean (renders "$50 / Every Friday", 0 uncaught errors, 0 circular-DI matches; the 2 console errors are a benign pre-existing Capacitor "Keyboard plugin not implemented on web" warning); /tabs/tab3 boots with 0 console errors.
- Status: pass

## AC-5: Auth untouched; errors not cached
- Type: frontend-unit + static
- Check: no interceptor/header change; errored request not replayed.
- Evidence: diff adds only shareReplay import + cache/invalidation + Investment#authService injection; no auth/JWT/interceptor/header change. Error-not-cached by code trace (tap only on next, finalize nulls inFlight$ on error) + spec 13/13 (incl. AC-5 error cases).
- Status: pass

## AC-6: FRED-205/206 store coexistence
- Type: static
- Check: existing store API + snapshot paths intact (attribute vs uncommitted tree work).
- Evidence: portfolio-store.service.ts has ZERO FRED-212 changes; the 92-line git diff HEAD is entirely FRED-206 snapshot work. load$/prime/TTL exist at HEAD. portfolio-store.service.spec.ts 14/14.
- Status: pass

## AC-7: Quality gates
- Type: frontend-unit + build
- Check: ng build --configuration dev AOT-clean; targeted specs green incl. join + invalidation specs; no TODOs.
- Evidence: VERIFIER re-ran `ng build --configuration dev` → exit 0 (only 3 pre-existing IonToolbar warnings, none in FRED-212 files). dedupe 13/13, freedom-stats 26/26, portfolio-store 14/14 (all fresh, pass-3). httpMock.match assertions; no TODOs in the cache logic.
- Status: pass

## Out-of-scope (non-blocking) — for Andy
- GET /api/user/progress fires 2x on tab1 cold boot (builder logged 3x; verifier saw 2x isolated) — pre-existing, not a FRED-212 target endpoint.
- New caches' inFlight$ refs (kyc/schedule) are not userId-keyed (only the settled entry is) — a request in-flight across logout→login-as-different-user could serve the previous user's data. Very narrow window; cached-entry cross-user bleed IS prevented by the key check, so the story edge case is met — hardening nit.
- updateAchRequestId (auth + investment services) doesn't clear the schedule cache — invisible today (achRequestId not surfaced by any consumer); would matter only if a future consumer reads it.
