# FRED-109 — Change investment question to work-optional framing

## Before
```
## FRED-109 — Change investment question to work-optional framing
Instead of: "How much do you want to invest?", Ask: "When do you want work to be optional?"
```

## Summary
Reframe the onboarding investment question from an amount-first approach to a date-first approach. The hero question becomes "When do you want work to be optional?" — likely in `surveyinitial.component.html` (hero title). Assumption: this is a copy + framing change; the monthly investment slider stays as the input mechanism, but the question posed to the user shifts to the work-optional date/timeline.

## Files
- `frontend/src/app/components/surveyinitial/surveyinitial.component.html` — change hero title and/or slider label copy
- `frontend/src/app/components/surveyinitial/surveyinitial.component.scss` — minor layout tweaks if needed

## Acceptance Criteria
1. `surveyinitial` hero title changes from "Let's plan your future." to "When do you want work to be optional?" (or similar work-optional phrasing).
2. Slider label "Monthly Investment" → "Monthly investment to get there" (or equivalent framing that connects the amount to the goal).
3. Subtitle updated to reinforce the work-optional concept (e.g. "Adjust your inputs to see your path to freedom.").
4. Copy changes only — slider range, step, and binding (`monthlyInvestment`) unchanged.
5. Visual regression: layout/spacing unaffected on 430×932.

## Edge Cases / Open Questions
- Is this purely copy, or should the slider be replaced with a date/year input ("Target year: 2035") and FRED back-calculates the required monthly investment? If so, scope expands significantly.

## Time Estimate
`<1hr` (copy only) / `3hr+` (if slider → date input)

## Label
`[code]`
