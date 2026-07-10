# FRED-209 — Refactor tab1 into tab2's premium design language

## Before (backlog entry, verbatim)

> ## FRED-209 — Refactor tab1 into tab2's premium design language
> Tab1 UI lift so it stops feeling styled differently from the new tab2: same pieces, re-dressed. Gradient hero flip card (tab2's blue world becomes tab1's statement piece), tab2-compact switcher pill, zone labels, chart card with tab2-style period chips + gradient area fill + press-drag scrubbing (no axis labels — scrub gives exact values), performance analytics collapsed to Daily + All Time with "Tap to show more" expanding the remaining periods as animated return bars, and the horizontally-scrolling Portfolio Insight table replaced by holdings rows with a root-level position detail sheet. No data-flow or backend changes — presentation only.
> Approved interactive prototype: ITPM/agent-memory/FRED-209-prototype.html (built from live account values; copy/layout verbatim).

## After (structured ticket)

**One-line summary:** Restyle tab1 (portfolio-dashboard + portfolio-chart) into tab2's design grammar — gradient flip hero, chip-driven scrubbable chart, collapsed analytics with expandable periods, holdings rows + detail sheet — while leaving the data pipeline, money math, and launch-cover contract byte-identical.

**Label:** `[code]` · **Time estimate:** `3hr+`

### Files / systems involved

- `frontend/src/app/components/portfolio-dashboard/portfolio-dashboard.component.{html,ts,scss}` — hero, switcher styling, zone cards, analytics collapse, holdings rows, detail sheet launch. DATA LOGIC UNTOUCHED (see A/C 10).
- `frontend/src/app/components/portfolio-chart/portfolio-chart.component.{html,ts,scss}` — visual restyle: smoothed FRED-blue line, gradient area fill, no plot border/axis labels, press-drag scrub emitting value+date to the readout. Same `[data]`/`[selectedPeriod]` inputs.
- **New** small standalone position-detail sheet (component under portfolio-dashboard/ or reuse of the `mc-bottom-sheet-modal` presentation pattern) — root-level ModalController bottom sheet.
- **Visual spec:** `ITPM/agent-memory/FRED-209-prototype.html`.
- **Regression context:** FRED-205 launch-cover gate depends on this component's DOM (`data-fresh` attr, `.loading-container`); perf-sync money math lives at portfolio-dashboard.component.ts (~applyBundle/loadPortfolioData region) — byte-preserve.

### Acceptance Criteria

1. **Gradient hero flip card.** The hero becomes the blue-gradient statement piece per the prototype: front = "TOTAL EQUITY" eyebrow, white whole/cents equity numerals, glass freedom badge (existing `freedomLabel` binding), "TAP FOR DETAILS" hint; back = 2×2 glass tiles (Total Invested, Portfolio Value, Buying Power, Settled Cash — existing bindings). The 3D flip interaction and `isFlipped` behavior are preserved; values render identically to today for the same account.
2. **Switcher consistency.** Tab1's ios-tab-switcher restyles to tab2's compact pill (same two tabs, same behavior, ~64px buttons, white active pill) — the header toolbar/title otherwise untouched.
3. **Zone grammar.** Uppercase zone labels ("Performance", "Performance Analytics", "Holdings" + "TAP FOR DETAILS" hint) and white 18px-radius zone cards per the prototype replace the old mobile-card styling in this component.
4. **Chart card.** The EXISTING `periodOptions` values render as tab2-style segmented chips (same underlying period keys → same API/history calls — the prototype's 1W/1M/3M/YTD/ALL set is illustrative only). A scrub readout row sits above the chart: idle = current value + visible date range; while scrubbing = exact value + date under the finger with hairline + dot on the chart; release restores idle. Chart visual: smoothed #2563EB line, soft gradient area fill, no plot border, NO axis/tick labels (approved). Scrubbing works with touch and mouse and must not hijack vertical page scroll (touch-action scoped to the chart box).
5. **Cumulative return row.** The per-period cumulative pre-tax return row is preserved beneath the chart with existing values/logic, restyled per prototype.
6. **Analytics collapse.** Performance Analytics shows exactly two rows collapsed — Daily and All Time — with a "Tap to show more" control that smoothly expands the remaining existing periods between them (animated return bars scaled to the max |return| in the list, bold %, start→end + $ subline) and flips to "Show less". Daily comes from existing data (an API daily period if present, else computed from the dashboard's existing day gain/loss fields — NO backend change; document the source).
7. **Holdings rows.** The positions table is replaced by rows (symbol tile, symbol, name, market value, total-return pill) + a totals footer (positions total value + all-time G/L) — zero horizontal scroll anywhere in the component. Rows render the same positions data as today.
8. **Position detail sheet.** Tapping a row presents a root-level ModalController bottom sheet (auto-height pattern from FRED-207) showing: Market Value, % of Account, Shares, Avg Cost → Current, Today (G/L + %), Total Return (G/L + %), and a Done button; backdrop tap dismisses. All fields sourced from the existing position object.
9. **Empty states.** "No positions yet" and "No performance data yet" restyle to the tab2 dashed-box empty-state pattern; loading and error states keep their existing structure and classes (see A/C 10) with at most cosmetic alignment.
10. **DATA-INTEGRITY / COVER-GATE REGRESSION GUARD (hard).** `loadPortfolioData`/`applyBundle` and all perf-sync money math are byte-unchanged; the `data-fresh` attribute, `.loading-container` class, snapshot-updating marker, and pull-to-refresh wiring are preserved exactly (the FRED-205 launch cover gate depends on them); `portfolio-chart`'s `[data]`/`[selectedPeriod]` contract is unchanged. For the same account, every dollar figure, percentage, and period value rendered pre/post refactor is identical.
11. **First-time tour compatibility.** If the FRED-197 tour anchors to tab1 selectors, those anchors still resolve after the restyle (adjust the tour's selector config if a targeted class was renamed — no tour regression).
12. **Scope guards.** No backend changes; no auth/tier logic touched; tab2 files untouched; chart library choice is the builder's (restyle Chart.js config or hand-rolled SVG) as long as the prototype visuals + scrub behavior are matched.
13. **Quality gates.** `ng build` AOT passes (plain or `--configuration dev`, NEVER "development"); lint clean on touched files; any pre-existing green targeted specs for touched components still pass (never run the full suite); Manrope/palette/force-light per style guide; `prefers-reduced-motion` degrades flip, bar, and expand animations; old table/segment/hero SCSS pruned (unrelated legacy dead styles may stay); no TODOs.

### Edge cases

- Scrub at chart edges (first/last point) — readout clamps, no NaN.
- Period with sparse/single-point history — chart renders flat line, scrub still safe.
- Negative-return periods — bars and pills go red (`change-negative` semantics preserved).
- Positions with very long names — ellipsis, row height stable.
- Zero positions / zero performance periods → new empty states.
- Flip mid-scroll, scrub during refresh, rapid tab switching — no stuck states.
- Sheet dismissal races (rapid open/close), double-tap row → one sheet.

### Open questions (non-blocking)

- Whether Daily needs an "as of" qualifier when markets are closed — builder may add the existing snapshot copy if trivially available.
