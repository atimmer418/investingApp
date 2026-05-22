# FRED-115 — Add eye-catching referral progress bar

## Before
```
## FRED-115 — Add eye-catching referral progress bar
add referral progress bar, make it eye catching
```

## Summary
Replace the plain "X / 3 Redeemed" text in the My Profile referral card with a visually distinct progress bar (segmented steps or animated fill). The bar uses the tier-based threshold from FRED-114 (Core=3, Plus=2, Pro=1, Founder=3).

## Files
- `frontend/src/app/pages/my-profile/my-profile.page.html` — replace text counter with visual progress component inside the referral card
- `frontend/src/app/pages/my-profile/my-profile.page.scss` — styling for the progress bar

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — color palette, motion rules (purposeful, iOS-native)

## Acceptance Criteria
1. Referral card section gets a segmented progress bar with `N` segments (N = tier threshold from FRED-114: Core=3, Plus=2, Pro=1, Founder/privateBeta=3). Each segment lights up (filled, colored) when a referral is redeemed.
2. Progress bar uses FRED primary blue (`#2563EB`) for filled segments, a subdued gray for empty segments.
3. At milestone (all segments filled): bar animates to a completion state with a celebratory micro-animation (color pulse or shimmer — keep it subtle and iOS-native).
4. "X / N Redeemed" label moves to below or beside the progress bar.
5. If FRED-114's dynamic threshold is not yet shipped, default `N = 3`.
6. `npx tsc --noEmit` exits 0.

## Edge Cases / Open Questions
- Segmented circles vs. a fluid fill bar: either is fine — builder's choice based on what looks best in the FRED design language.
- Ensure bar doesn't overflow card on narrow screens.

## Time Estimate
`<1hr`

## Label
`[code]`
