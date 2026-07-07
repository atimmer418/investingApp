# Acceptance Check Manifest — Freedom Date Unification
Spec: docs/superpowers/specs/2026-07-07-freedom-date-unification-design.md

## AC-1: MFU target is live income-based; stored targetPortfolio ignored; $1.5M default
- Type:     backend-unit
- Check:    cd backend && ./gradlew test --tests com.investingapp.backend.service.MonthlyFreedomUpdateServiceTest
- Evidence: `./gradlew test --tests com.investingapp.backend.service.MonthlyFreedomUpdateServiceTest --rerun` → BUILD SUCCESSFUL in 1s. JUnit XML (`build/test-results/test/TEST-com.investingapp.backend.service.MonthlyFreedomUpdateServiceTest.xml`): `tests="4" skipped="0" failures="0" errors="0"`. Testcases present and green: `targetIsLiveIncomeBasedAndIgnoresStoredTargetPortfolio()`, `targetDefaultsWhenIncomeAbsent()`, `targetDefaultsWhenIncomeZero()` (plus `parityFixtureFreedomYear()`, see AC-2).
- Status:   pass

## AC-2: Backend parity fixture ($10k / $500 / $1.5M → currentYear + 32)
- Type:     backend-unit
- Check:    same gradle command as AC-1
- Evidence: same run as AC-1 (single gradle invocation, 4/4 green). JUnit XML testcase `parityFixtureFreedomYear()` present with no failure/error entry — green.
- Status:   pass

## AC-3: FreedomStatsService prefers schedule monthly-equivalent, survey fallback, gate never hangs
- Type:     frontend-unit
- Check:    cd frontend && ng test --include='**/freedom-stats.service.spec.ts' --watch=false --browsers=ChromeHeadless
- Evidence: Karma/ChromeHeadless run → `TOTAL: 26 SUCCESS` (0 failed), matching source (26 `it()` blocks in the spec file). `describe('unified contribution source', ...)` (spec.ts:582) contains and ran green: `'uses the actual schedule monthly-equivalent when a schedule exists'` (584), `'falls back to the survey monthlyInvestment when no schedule exists'` (595), `'falls back to the survey value and resolves the gate when the schedule fetch errors'` (606) — schedule/fallback/error-gate tests all green, gate resolves (no hang/timeout in the run).
- Status:   pass

## AC-4: Frontend parity fixture matches AC-2's year
- Type:     frontend-unit
- Check:    same ng test command as AC-3
- Evidence: same run as AC-3 (single spec file, 26/26 green). `'cross-stack parity fixture: $10k equity, $500/mo schedule, $60k income → currentYear + 32'` (spec.ts:617, inside `describe('unified contribution source')`) executed and green — same fixture inputs/output year as AC-2's `parityFixtureFreedomYear()`.
- Status:   pass

## AC-5: my-profile derives freedom year from FreedomStatsService (dash → placeholder)
- Type:     frontend-unit
- Check:    cd frontend && ng test --include='**/my-profile.page.spec.ts' --watch=false --browsers=ChromeHeadless
- Evidence: Karma/ChromeHeadless run → `TOTAL: 3 SUCCESS` (0 failed). `describe('MyProfilePage — freedom timeline', ...)` (spec.ts:34) — 3/3 green: `'derives the numeric freedom year from the live FreedomStatsService signal'` (36), `'computes yearsToFreedom from the live year'` (41), `'returns null (placeholder branch) while stats show the loading dash'` (46).
- Status:   pass

## AC-6: On the dev account, tab3 strip, MFU sheet (reopen), and my-profile show the same freedom year
- Type:     ui-acceptance
- Check:    servlocal + backend bootRun (local profile); log in as facebook@gmail.com
            (uncomment simulateUserLogin in app.component.ts ~line 130 OR use ?devPage=).
            Visit tab3 → note freedom year; open MFU via reopen from FRED tab; open my-profile.
- Evidence: screenshots of all three surfaces showing the identical year
- Status:   pending — requires local stack (servlocal + backend bootRun); deferred to verifier agent with browser tools. Not attempted in this pass: no servers were started and app.component.ts was not touched (per binding constraint).

## AC-7: Existing 'does not read currentFreedomEstimate' spec passes unmodified
- Type:     frontend-unit
- Check:    same ng test command as AC-3
- Evidence: same run as AC-3 (single spec file, 26/26 green). `describe('AC-6: tab3-vs-MFU split', ...)` (spec.ts:353) → `'does not read currentFreedomEstimate (MFU value) when computing freedom year'` (355) executed and green.
- Status:   pass
