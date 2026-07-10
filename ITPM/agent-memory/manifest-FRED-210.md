# Acceptance Check Manifest — FRED-210
Emit 1W/1M/3M/YTD performance periods from the backend so the FRED-209 expander renders live.
Story: `FREDdocs/.stories/FRED-210.md`.

> Verifier pass (static + unit tier) — 2026-07-07. AC-2..7 and AC-9 independently
> re-verified and set to `pass` with attached evidence. AC-1 and AC-8 require a live
> backend and stay `pending` (Andy must restart :8080 — the running instance serves
> pre-change code). Verdict for this tier: APPROVED-static.

## AC-1: New period rows with identical shape
- Type: api-integration
- Check: GET /api/portfolio/performance (authed) returns 1W/1M/3M/YTD rows with period/startValue/endValue/totalReturn/totalReturnPercent.
- Evidence: curl output (dev backend, facebook@gmail.com JWT) — NOT YET CAPTURED
- Status: pending — requires backend restart by Andy — live verification queued. Static support: controller lines 208-212 insert `computePerformancePeriodRows` rows between Today (206) and Total (221); Calculator emits period/startValue/endValue/totalReturn/totalReturnPercent (LinkedHashMap, PerformancePeriodCalculator.java:91-97), field shape unit-verified by `periodRowFieldShape`.

## AC-2: Methodology consistency with history source
- Type: backend-unit + api-integration
- Check: startValue = equity at/closest-before window start from the chart's history source; return math matches Total's model; zero-start guarded.
- Evidence: VERIFIER-CONFIRMED (static + unit). (1) Same parser as the chart: `computePerformancePeriodRows` calls the private `getPortfolioHistory(accountId,"1A")` (PortfolioDashboardService.java:237), the identical method the chart's public `getPortfolioHistoryForPeriod` delegates to (line 213) — no divergent parser. (2) Format compatible: parser emits `ISO_LOCAL_DATE` date strings from epoch seconds (line 736-739), exactly what `LocalDate.parse` in `findStartValue` consumes; null-equity entries skipped inside the parser (lines 720-728) with `dates`/`values` appended together (749-750) so they stay parallel. (3) closest-at-or-before resolution correct (`!d.isAfter(windowStart)`, keeps most-recent ≤ start, breaks on ascending overshoot) — unit tests `exactPointResolution`, `closestPriorPointResolution`, `windowStartEqualsEarliestDate`. (4) endValue = `dashboardData.summary.portfolioValue` (controller:209) = the Total row's endValue (controller:218); totalReturn = end−start; percent = return/start×100 with `abs() ≤ 0.01` guard — unit tests `normalPercentComputation`, `negativeReturnPercent`, `zeroStartPercentGuard`, `nearZeroStartPercentGuard`, `periodRowFieldShape`. Live curl cross-check folded into AC-1.
- Status: pass (static + unit); live curl cross-check queued under AC-1

## AC-3: Account-age omission + YTD clamp
- Type: backend-unit
- Check: windows older than earliest history point omitted; YTD clamp rule implemented + documented.
- Evidence: VERIFIER-CONFIRMED. `findStartValue` returns `Optional.empty()` when windowStart predates all history; `computePeriods` `continue`s and logs on empty (PerformancePeriodCalculator.java:82-86). YTD window = Jan 1 of current year (line 74); OMIT-not-clamp rule documented in implementation-notes-FRED-210.md and the class Javadoc (lines 28-31). Unit tests `windowsOlderThanHistoryOmitted`, `windowOlderThanAllHistoryReturnsEmpty`, `ytdClampRuleOmitsWhenAccountOpenedAfterJanFirst` all green.
- Status: pass

## AC-4: Ordering Today→1W→1M→3M→YTD→Total
- Type: api-integration
- Check: response array order.
- Evidence: VERIFIER-CONFIRMED (static + unit). Calculator emits [1W,1M,3M,YTD] in that fixed order (`periodLabels`/`windowStarts` arrays, lines 69-75) — unit test `responseOrderIsOneW_OneM_ThreeM_YTD` asserts all four in order. Controller assembles Today (206) → `addAll(periodRows)` (212) → Total (221). Full-array live curl order confirmation folded into AC-1.
- Status: pass (static + unit); live curl order queued under AC-1

## AC-5: Failure-isolated degradation
- Type: backend-unit
- Check: empty/failed history → Today+Total unchanged; per-window failure logs and skips (no 500).
- Evidence: VERIFIER-CONFIRMED. Service method wraps decrypt + history fetch + compute in try/catch returning `Collections.emptyList()` on ANY exception (PortfolioDashboardService.java:234-242) — never throws. Calculator: null/empty history → empty list (lines 65-67); per-window try/catch logs `warn` and continues (lines 80-100). Controller Today (180-206) and Total (214-221) rows are byte-unchanged in the diff (single insertion hunk between them); the new lines dereference only `dashboardData.summary.portfolioValue`, already dereferenced by the Today row above, so they introduce no new 500 path. Unit tests `emptyHistoryDegradation`, `nullHistoryDegradation` green.
- Status: pass

## AC-6: Layering
- Type: static
- Check: computation in PortfolioDashboardService; controller assembles only.
- Evidence: VERIFIER-CONFIRMED. Math lives in `PerformancePeriodCalculator` (pure static, no Spring); fetch + failure-isolation in `PortfolioDashboardService.computePerformancePeriodRows`; controller adds exactly one call + `addAll` (no math). Controller and service diffs are 1 hunk each.
- Status: pass

## AC-7: Plain JUnit coverage
- Type: backend-unit
- Check: `cd backend && ./gradlew test --tests <Class>` green; no @SpringBootTest/DB.
- Evidence: VERIFIER-RAN `./gradlew clean test --tests "com.investingapp.backend.service.PerformancePeriodCalculatorTest"` → BUILD SUCCESSFUL, all 5 tasks executed (not cached). JUnit XML: `tests="14" skipped="0" failures="0" errors="0"`. Test class imports only `org.junit.jupiter.api.Test` — no `@SpringBootTest`, no DB. 14 tests cover closest-prior, exact-point, boundary, missing-window omission, zero/near-zero guard, normal/negative percent, YTD omit, empty+null degradation, ordering, field shape.
- Status: pass

## AC-8: Expander renders live with zero frontend changes
- Type: ui-acceptance
- Check: tab1 analytics shows "Tap to show more"; expanding reveals the new rows with bars; git shows no frontend diffs from this story.
- Evidence: FRED-210 backend footprint is exactly 4 files (Calculator + test new; Service + Controller each a single hunk) — zero frontend files attributable to this story (the frontend diffs in the tree belong to FRED-208/209). Live screenshot pending backend restart + device.
- Status: pending — requires backend restart by Andy + live device verification — queued

## AC-9: Quality gates
- Type: build
- Check: backend compiles; other endpoints unchanged; SLF4J on skip paths; no TODOs.
- Evidence: VERIFIER-RAN `./gradlew clean compileJava` (via clean test) → BUILD SUCCESSFUL from scratch. Controller diff = 1 hunk in `getPerformanceMetrics` only (no other `put("period"`, no new @Mapping, no other endpoint response changed); Service diff = 1 hunk (new method only). SLF4J: `logger.info` on omit + `logger.warn` on per-window error (Calculator 83/99), `logger.warn` on history failure (Service 240). No TODO/FIXME in new or modified code.
- Status: pass
