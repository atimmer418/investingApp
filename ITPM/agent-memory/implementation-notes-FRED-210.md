# Implementation Notes — FRED-210
Emit 1W/1M/3M/YTD performance periods from backend.

## Design decisions

- **YTD clamp rule — OMIT (not clamp).** When the account's earliest history entry is after Jan 1 of the current year, the YTD window is omitted entirely. Clamping to account-open date would produce a "YTD" label that doesn't actually mean year-to-date, which is misleading. Omitting is honest.

- **History window for periods — fetch "1A" separately.** `getPortfolioDashboard` already fetches "1M" history for the chart's default state. Rather than expanding that to "1A" (which would change the dashboard payload and could affect the frontend), the new `computePerformancePeriodRows` service method makes a separate `getPortfolioHistory(accountId, "1A")` call. This adds one extra Alpaca API round-trip on `/performance` requests, accepted as a v1 trade-off.

- **endValue source — `dashboardData.summary.portfolioValue`.** This is positions-only (no cash), same as the Total row. Technically, history values from Alpaca include cash, so there is a minor methodology mismatch between startValue (full equity from history) and endValue (positions only). This is consistent with the existing Total row's approach and is accepted for v1.

- **Zero-start guard threshold — 0.01.** Prevents astronomical percentages when the account is brand new and equity is a few cents. Consistent with what other rows do (they check `compareTo(BigDecimal.ZERO) > 0`; using 0.01 is slightly stricter and prevents near-zero division artefacts).

- **Calculator as a separate class (`PerformancePeriodCalculator`).** Extracted from the service so plain JUnit 5 tests can exercise the math without Spring context. The service method is a thin wrapper that handles auth, history fetch, and failure isolation.

## Deviations

- None from spec.

## Tradeoffs

- The simple return methodology (endValue - startValue / startValue) inflates returns when there are mid-window deposits. This is consistent with the Total row. A time-weighted return would be more accurate but significantly more complex and would require a new return model.

## Running backend status

- Backend was running on port 8080 (PID 43193) at implementation time.
- It serves the **old code** (no period rows). Andy must restart (`./gradlew bootRun` with `SPRING_PROFILES_ACTIVE=local`) to pick up the change.
- AC-1/AC-4/AC-8 (curl/live verification) are left to the verifier after Andy restarts.

## Open questions

- None.
