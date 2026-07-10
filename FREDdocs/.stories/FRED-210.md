# FRED-210 — Emit 1W/1M/3M/YTD performance periods from backend

## Before (backlog entry, verbatim)

> ## FRED-210 — Emit 1W/1M/3M/YTD performance periods from backend
> The FRED-209 analytics card collapses to Daily + All Time with a "Tap to show more" expander for the middle periods — but `/api/portfolio/performance` (PortfolioDashboardController.getPerformanceMetrics) only ever emits "Today" and "Total", so `getMiddlePerformancePeriods()` is always empty and the expander never renders in production. Add 1W, 1M, 3M, and YTD period rows computed from the same portfolio-history data the chart uses, so the approved expander comes alive with zero frontend changes.

## After (structured ticket)

**One-line summary:** Extend the backend performance endpoint to compute and return 1W/1M/3M/YTD period rows (same response shape as Today/Total, methodology consistent with the existing rows and the chart's history source), omitting any window older than the account, with plain-JUnit coverage — no frontend changes.

**Label:** `[code]` · **Time estimate:** `1-3hr`

### Files / systems involved

- `backend/src/main/java/com/investingapp/backend/controller/PortfolioDashboardController.java` — `getPerformanceMetrics()` (~line 156+): currently builds "Today" (trading-day aware) and "Total" rows. Keep controller thin — computation belongs in the service.
- `backend/src/main/java/com/investingapp/backend/service/PortfolioDashboardService.java` — history retrieval (the null-skipping equity parser ~693-724 already feeds the chart) and wherever Total-period math lives; add per-window computation here.
- New/updated plain JUnit 5 test class (NOT `@SpringBootTest`) for the period-window math.
- **Frontend contract (do not change frontend):** `portfolio-dashboard.component.ts` renders `performanceData` rows where `period` ∉ {'Today','Total'} as the expandable middle, ordered as returned, with fields `period`, `startValue`, `endValue`, `totalReturn`, `totalReturnPercent`. Frontend labels display the `period` string verbatim — use display-ready names: `1W`, `1M`, `3M`, `YTD`.

### Acceptance Criteria

1. **New periods.** `/api/portfolio/performance` returns rows for `1W`, `1M`, `3M`, and `YTD` between "Today" and "Total", each with the exact same field shape as existing rows (`period`, `startValue`, `endValue`, `totalReturn`, `totalReturnPercent`).
2. **Methodology consistency.** Each window's `startValue` is the account equity at (or the closest available point before) the window start, sourced from the SAME portfolio-history data the chart consumes (null-skipping parser preserved); `endValue` = current equity consistent with the Total row; `totalReturn = endValue − startValue`; `totalReturnPercent = totalReturn / startValue × 100` guarding division by zero. The approach mirrors the existing Total row's methodology — no new return model.
3. **Account-age handling.** Windows older than the account's earliest history point are OMITTED (not zero-filled): an account opened 2 months ago returns Today, 1W, 1M, YTD*, Total (*YTD only if the account existed before Jan 1 of the current year or YTD window clamps to account start — builder documents the chosen clamp rule).
4. **Ordering.** Response order: Today, 1W, 1M, 3M, YTD, Total — the frontend renders middles in the order received.
5. **Degradation.** If history retrieval fails or is empty, the endpoint still returns Today + Total exactly as it does now (new computation is additive and failure-isolated — a window computation error logs and skips that row, never 500s the endpoint).
6. **Controller stays thin.** Window computation lives in PortfolioDashboardService; the controller only assembles rows (matching existing layering conventions).
7. **Tests.** Plain JUnit 5 (no Spring context, no DB): window-start resolution (exact point, closest-prior point, missing → omitted), percent math incl. zero/near-zero start guard, YTD clamp rule, empty-history degradation. Run selectively: `cd backend && ./gradlew test --tests <FullyQualifiedClass>`.
8. **Frontend proof (no frontend changes).** With the backend running, tab1's analytics card now shows the "Tap to show more" toggle, and expanding reveals the 1W/1M/3M/YTD rows with animated bars — verified live (this is the FRED-209 expander coming alive untouched).
9. **Quality gates.** Backend compiles (`./gradlew compileJava` or the test run); no changes to other endpoints' responses; SLF4J logging on skip/degradation paths; no TODOs.

### Edge cases

- Market closed today (existing Today=0 logic untouched).
- Account younger than 1 week → only Today + Total (+ possibly YTD per clamp rule).
- Sparse history (gaps/weekends) → closest-prior-point resolution, never interpolation-NaN.
- Deposits mid-window inflate simple returns — ACCEPTED for v1 (consistent with the existing Total row's simple methodology; note it in the response docs/comment).
- Timezone: window boundaries computed in the market timezone consistently with existing isTradingDay() usage.

### Open questions (non-blocking)

- Whether YTD clamps to account-start when the account is younger than the year (builder picks + documents; A/C 3 governs).
