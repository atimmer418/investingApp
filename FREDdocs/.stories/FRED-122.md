# FRED-122 — My profile final polish and compliance language check

## Before
```
## FRED-122 — My profile final polish and compliance language check
my profile page ALMOST DONE needs badge of ahead of 85%, fred pfps, and fixing ui spacing. also, update my profile language to be complaint? maybe wait till after securities attorney review
```

## Summary
Three code tasks + one deferred: (1) Add "Ahead of X% of investors" percentile badge using `statusPercentile` from MFU data. (2) Replace the placeholder avatar (`ionicframework.com` demo SVG) with FRED pig art. (3) Fix UI spacing issues on My Profile. (4) Compliance language update — deferred until securities attorney review clears.

## Files
- `frontend/src/app/pages/my-profile/my-profile.page.html` — add percentile badge; replace avatar; fix spacing
- `frontend/src/app/pages/my-profile/my-profile.page.ts` — load `statusPercentile` from MFU service or user progress
- `frontend/src/app/pages/my-profile/my-profile.page.scss` — spacing corrections + badge styling

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — badge styles, spacing scale
- `backend/src/main/java/com/investingapp/backend/dto/MonthlyFreedomUpdateDTO.java` — `statusPercentile` field

## Acceptance Criteria
1. My Profile shows a badge/stat reading "Ahead of X% of investors" using the user's most recent `statusPercentile` from the MFU API. If no MFU exists yet, hide the badge.
2. Replace the placeholder `ionicframework.com` demo avatar with a FRED pig character image (use the existing pig art assets; fall back to a simple pig icon if FRED-131 art isn't shipped yet).
3. Audit and fix all obvious spacing/alignment issues on My Profile visible on 430×932 — tighten or increase spacing to match the FRED design system.
4. Compliance language update (deferred — do not implement until FRED-139 securities attorney review completes).
5. `npx tsc --noEmit` exits 0.

## Edge Cases / Open Questions
- `statusPercentile` comes from the MFU; does My Profile have a way to fetch the latest MFU data, or should it call a separate endpoint? Prefer reusing whatever the portfolio dashboard already loads.
- FRED pig art assets: check `src/assets/` for existing pig images before adding new ones.
- Compliance language: hold until FRED-139 clears.

## Time Estimate
`1-3hr`

## Label
`[code]`
