# FRED-181 — Share Monte Carlo simulation results

## Before
```
## FRED-181 — Share Monte Carlo simulation results
Allow sharing of monte carlo results
```

## Summary
Add a share button to the Monte Carlo simulation results section in `retirement-planning.component`. Tapping it captures the results card (success probability, median end value, trajectory chart) as a PNG and opens the native iOS share sheet. Pairs with FRED-182 (3 piggy bank visual states based on results).

**`SimulationResult` shape (from `monte-carlo.service.ts`):**
- `successProbability: number` — percentage (e.g. 87%)
- `medianEndValue: number`
- `minimumEndValue: number`
- `failureRate: number`

**Existing:** `retirement-planning.component.ts:554` already has `exportToCSV()` — this story adds a native image share alongside it.

## Files
- `frontend/src/app/components/retirement-planning/retirement-planning.component.ts` — add `shareMonteCarlo()` method using `html2canvas` to capture the results section + `@capacitor/share`
- `frontend/src/app/components/retirement-planning/retirement-planning.component.html` — add share icon button near the results area
- `frontend/package.json` — confirm `html2canvas` and `@capacitor/share` are installed (also needed by FRED-179/147)

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — icon and button patterns

## Acceptance Criteria
1. A share icon button (`ios_share`) appears in the Monte Carlo results section.
2. Tapping it: hide UI chrome → `html2canvas` captures the results card as PNG → iOS share sheet opens with the image.
3. Shared image clearly shows success probability, median end value, and the trajectory chart.
4. Error toast if capture or share fails.
5. Works on real iPhone.

## Edge Cases / Open Questions
- The trajectory chart is likely a Canvas-based chart (e.g. Chart.js) — `html2canvas` can render canvas elements natively. Confirm the chart library in use.
- Coordinate with FRED-182: if piggy bank visual states are added to the results card (FRED-182), they should appear in the shared image too.
- Should the CSV export button also be preserved, or replaced by the share button?

## Time Estimate
`1-3hr`

## Label
`[code]`
