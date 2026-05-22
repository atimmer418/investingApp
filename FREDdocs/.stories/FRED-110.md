# FRED-110 — Overhaul tab 2 education with four strategies

## Before
```
## FRED-110 — Overhaul tab 2 education with four strategies
go fix and clean up tab 2 and its content so that it matches the 4 strategies we are educating on (yield-based income, dynamic guardrails, annuity, sbloc 4% borrowing in downturn combined with traditional 4% selling when market is up), also make the cards on the education page smaller so that all 4 can appear on one page (2 on top half, 2 on bottom half). add a slide on brief instructions for how to do each strategy
```

## Summary
Replace the education section of `retirement-planning.component` with a 2×2 card grid showing all 4 strategies at once. Each card taps to open a detail slide (bottom sheet or modal) with brief how-to instructions for that strategy. The Monte Carlo / config sections remain untouched.

## Files
- `frontend/src/app/components/retirement-planning/retirement-planning.component.html` — replace education section with 2×2 card grid
- `frontend/src/app/components/retirement-planning/retirement-planning.component.ts` — add `selectedStrategy` for detail slide state
- `frontend/src/app/components/retirement-planning/retirement-planning.component.scss` — card sizing + grid layout
- `frontend/src/app/pages/strategy-detail/strategy-detail.page.html` — update or repurpose for instruction slides (or inline as modal)

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — card sizing, spacing, color conventions

## Acceptance Criteria
1. Education section shows a 2×2 grid of 4 strategy cards, all visible without scrolling on a 430×932 display.
2. The 4 strategies: **Yield-Based Income**, **Dynamic Guardrails**, **Annuity**, **SBLOC + 4% Rule** (borrow in downturns, sell when market is up).
3. Each card has: strategy name, one-line tagline, a representative icon (material-symbols-outlined).
4. Tapping a card opens a bottom-sheet slide with 3–5 bullet how-to instructions for that strategy.
5. The SBLOC card copy clearly explains the hybrid: borrow against portfolio in down years, sell at 4% in up years.
6. Yield-Based Income card is new content (not currently in the dropdown) — copy must be written.
7. Monte Carlo section and strategy-selector dropdown are untouched.
8. `npx tsc --noEmit` exits 0. Layout verified on 430×932.

> **Builder note:** Before writing any new UI, study the onboarding component series (surveyinitial, investment-schedule, kyc-verification, investmentconfirmation) to understand the established card patterns, spacing, and visual language. New components must feel native to that system.

## Edge Cases / Open Questions
- "Slide" could mean a swipe on the card or a tapped modal — assuming bottom-sheet modal (consistent with other FRED patterns).
- Yield-Based Income strategy content needs to be written — no existing copy for it.
- FRED-111 adds a $250k lock over this education section — coordinate so FRED-111 wraps FRED-110's output.

## Time Estimate
`3hr+`

## Label
`[code]`
