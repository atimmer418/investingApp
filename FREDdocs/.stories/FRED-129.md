# FRED-129 — Add pig art to MFU equity milestones

## Before
```
## FRED-129 — Add pig art to MFU equity milestones
add pig for certain equity milestones on MFU and also unlocking of monte carlo at $100k and unlocking of retirement strategies at $250k
```

## Summary
Display a FRED pig icon in the MFU milestone card that reflects the user's current equity level. There are 6 pig levels tied to equity ranges. Andy is creating 6 pig icon assets. The backend exposes the current `equityLevel` (1–6) in the MFU DTO so the frontend can always show the right pig regardless of whether an equity milestone was crossed this month.

**Equity level ranges:**
- Level 1: $0 – $1k
- Level 2: $1k – $10k
- Level 3: $10k – $100k
- Level 4: $100k – $1M
- Level 5: $1M – $5M
- Level 6: $5M+

**Note:** The "$100k unlocks Monte Carlo / $250k unlocks retirement strategies" in the original backlog note is stale — Monte Carlo is subscription-gated (FRED-111), not equity-gated. No unlock messaging needed.

## Files
- `backend/src/main/java/com/investingapp/backend/dto/MonthlyFreedomUpdateDTO.java` — add `equityLevel: int` field (1–6)
- `backend/src/main/java/com/investingapp/backend/service/MonthlyFreedomUpdateService.java` — calculate `equityLevel` from `endEquity` and set it on the DTO
- `frontend/src/app/services/monthly-freedom-update.service.ts` — add `equityLevel: number` to `MonthlyFreedomUpdateData` interface
- `frontend/src/app/components/monthly-freedom-update/monthly-freedom-update.component.ts` — add `milestoneEquityPigSrc` getter that maps `data.equityLevel` → asset path
- `frontend/src/app/components/monthly-freedom-update/monthly-freedom-update.component.html` — replace milestone icon with pig image when milestone is not DEFAULT
- `frontend/src/app/components/monthly-freedom-update/monthly-freedom-update.component.scss` — pig image sizing within icon wrapper
- `frontend/src/assets/images/` — Andy adds: `pig-level-1.png` through `pig-level-6.png`

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — image sizing and card layout

## Acceptance Criteria
1. **Asset prerequisite**: Andy creates and drops `pig-level-1` through `pig-level-6` assets (`.svg` or `.png`) into `frontend/src/assets/images/` before the builder runs this story. Use whatever extension is present — check the directory and use the actual filenames found.
2. Backend: Add `equityLevel` getter/setter to `MonthlyFreedomUpdateDTO`. Calculate in `generateUpdate()` using `endEquity`:
   - < $1,000 → 1; $1k–$9,999 → 2; $10k–$99,999 → 3; $100k–$999,999 → 4; $1M–$4,999,999 → 5; ≥ $5M → 6.
3. Frontend: Add `equityLevel: number` to `MonthlyFreedomUpdateData` interface in the service.
4. Add `milestoneEquityPigSrc` getter to the component: returns the path to the pig asset for the current level (e.g. `assets/images/pig-level-2.svg` or `.png` — use whichever extension was dropped into the assets folder).
5. In the milestone card `mfu-milestone__icon-wrapper`:
   - When `data.milestones[0].type !== 'DEFAULT'`: show `<img [src]="milestoneEquityPigSrc" class="mfu-milestone__pig-img" alt="">` instead of the icon.
   - When `type === 'DEFAULT'`: keep the existing `sentiment_satisfied` icon (no pig for the default/empty state).
6. `.mfu-milestone__pig-img`: `width: 56px; height: 56px; object-fit: contain;`
7. `npx tsc --noEmit` exits 0; `./gradlew build -x test` exits 0.

## Edge Cases / Open Questions
- If `equityLevel` comes back as `null` or 0 (e.g., edge case in data), default to Level 1 pig so there's always a valid image shown.
- The Level 5/6 pigs won't be triggered by any existing backend milestone threshold ($1M is the highest EQUITY_VALUE_MILESTONE). Consider adding a $5M milestone to `EQUITY_VALUE_MILESTONES` if you want Level 6 to fire as a crossing event. For now, the pig will still correctly reflect the user's level even without the milestone crossing.

## Time Estimate
`1-3hr`

## Label
`[code]`
