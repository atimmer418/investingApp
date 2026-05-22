# FRED-117 — First-time tour ending with what's your story

## Before
```
## FRED-117 — First-time tour ending with what's your story fred
make a first time tour that ends with what's your story fred
```

## Summary
A step-by-step first-time walkthrough overlay that triggers once after the user navigates from `investmentconfirmation` to Tab 1. The tour highlights: (1) the portfolio page, (2) the My Profile tab (Tab 3 / person icon), (3) the AI chat page — where the user taps the existing "What's your story FRED?" suggestion chip to complete the tour.

## Files
- `frontend/src/app/components/` — new `first-time-tour` component (overlay with step counter, highlight box, dismiss/next controls)
- `frontend/src/app/tab1/tab1.page.ts` (or `portfolio-dashboard.component.ts`) — trigger tour on first visit post-onboarding; check `localStorage.getItem('hasSeenFirstTimeTour')`
- `frontend/src/app/pages/ai-chat/ai-chat.page.ts` — on tour step 3, auto-navigate to AI chat and highlight the `FRED_STORY_TRIGGER` suggestion chip

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — overlay styling, motion rules
- `frontend/src/app/pages/ai-chat/ai-chat.page.ts` line 57: `readonly FRED_STORY_TRIGGER = "What's your story FRED?"` — use this constant for the final step

## Acceptance Criteria
1. Tour fires once, immediately after first navigation to Tab 1 post-onboarding. Gated by `localStorage.getItem('hasSeenFirstTimeTour')` — if set, skip entirely.
2. **Step 1 — Portfolio:** Overlay highlights the portfolio section on Tab 1. Short label: "Your portfolio lives here." Next button advances.
3. **Step 2 — Education / Monte Carlo:** Overlay navigates to Tab 2. Highlights the retirement/education section. Label: "Explore retirement strategies and run simulations here." Next button advances.
4. **Step 3 — My Profile:** Overlay highlights the Tab 3 (person icon) tab button. Label: "Your settings and referral code are here." Next button navigates to Tab 3.
5. **Step 4 — Ask Fred:** Overlay navigates to the AI chat page. Highlights the `FRED_STORY_TRIGGER` suggestion chip. Label: "Tap to start your first conversation with Fred."
6. When the user taps the "What's your story FRED?" chip: tour marks itself complete (`localStorage.setItem('hasSeenFirstTimeTour', 'true')`), chip triggers normally (chat message sent).
7. A skip/dismiss control (small "Skip" text) is present on every step — sets `hasSeenFirstTimeTour` and exits without navigating.
8. Overlay uses a dark semi-transparent backdrop with a cutout/highlight around the target element. iOS-native motion (fade in/out).
9. `npx tsc --noEmit` exits 0.

## Edge Cases / Open Questions
- Tour should not fire if the user was already using the app before this feature ships (i.e., `hasSeenFirstTimeTour` not set + `investmentConfirmationCompleted === true` from DB). May want to backfill the flag for existing users or accept a one-time tour for them.
- The AI chat page's `dailySuggestions` must include `FRED_STORY_TRIGGER` on the tour step — confirm it always appears in the initial suggestions list or pin it for tour context.

## Time Estimate
`3hr+`

## Label
`[code]`
