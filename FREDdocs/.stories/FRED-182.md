# FRED-182 — Add 3 Monte Carlo piggy bank visual states

## Before
```
## FRED-182 — Add 3 Monte Carlo piggy bank visual states
add 3 forms of piggy banks based on monte carlo simulation results (mint condition, cracked condition, exploded into pieces condition)
```

## Summary
Replace the success-rate icon in the Monte Carlo `result-metric` card with a pig illustration that reflects the simulation outcome. Three states: mint condition (great), cracked (OK), exploded into pieces (poor). The icon is at `retirement-planning.component.html:287`.

**Thresholds (suggested):**
- ≥ 90%: mint condition pig
- 75–89%: cracked pig
- < 75%: exploded pig

**Deliverables are split:**
1. **Art (founder):** Create 3 pig SVG/PNG assets: `pig-mint.svg`, `pig-cracked.svg`, `pig-exploded.svg` in `frontend/src/assets/images/`
2. **Code:** Wire the asset swap based on `simulationResult.successProbability`

## Files
**Frontend:**
- `frontend/src/app/components/retirement-planning/retirement-planning.component.html:286-288` — replace `<ion-icon [name]="getSuccessIcon()">` with `<img [src]="getSimulationPigSrc()">` (or add the img alongside the icon)
- `frontend/src/app/components/retirement-planning/retirement-planning.component.ts` — add `getSimulationPigSrc(): string` getter returning the correct asset path based on `simulationResult.successProbability`
- `frontend/src/assets/images/` — drop in `pig-mint.svg` (or PNG), `pig-cracked.svg`, `pig-exploded.svg` once designed

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — image sizing and brand guidelines

## Acceptance Criteria
1. Create 3 pig art assets (mint, cracked, exploded) and place in `frontend/src/assets/images/`.
2. The `result-metric` card shows the appropriate pig image instead of (or alongside) the success icon.
3. Thresholds: successProbability ≥ 90 → mint; ≥ 75 → cracked; < 75 → exploded.
4. Pig renders at appropriate size (e.g. 80×80px) in the card without layout shift.
5. If `simulationResult` is null, no pig is shown.

## Edge Cases / Open Questions
- Should the pig replace the icon entirely, or appear as a second visual element? Replacing is cleaner.
- Art style: should the pig match the MFU pig level art (FRED-131) or be its own stylized illustration? Coordinate with FRED-131 art direction.
- The exploded pig might be the most fun/memorable — could be a marketing asset too.

## Time Estimate
`1-3hr` (code) + art time

## Label
`[founder]` (art creation) + `[code]` (wiring)
