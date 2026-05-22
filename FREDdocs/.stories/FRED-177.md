# FRED-177 — Remove back button from two onboarding pages (ONBOARDING)

## Before
```
## FRED-177 — Remove back button from two onboarding pages (ONBOARDING)
Remove the back button from 2 pages in the onboarding flow.
```

## Summary
Remove the back button from 2 specific onboarding pages to prevent users from navigating back at points where going back would be disruptive or confusing.

**Onboarding pages that currently have a back button:**
- `document-upload.component.html:4` — `<button class="back-btn" (click)="goBack()">`
- `stockselection.component.html:4` — `<ion-button (click)="goBack()">`
- `fi-plan-results.component.html:4` — `<button class="back-btn" (click)="goBack()">`
- `surveyinitial.component.html:4` — `<button class="back-btn" (click)="goBack()">`
- `investmentconfirmation.component.html:4` — `<button class="back-btn" (click)="goBack()">`

**Best guess:** `investmentconfirmation` (final step — going back after tier/subscription selection causes confusion) and `fi-plan-results` (showing results; going back re-runs the survey unnecessarily). **Open for Andy to confirm which 2.**

## Files
- Most likely: `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.html:4` — remove `<button class="back-btn">` block
- Most likely: `frontend/src/app/components/fi-plan-results/fi-plan-results.component.html:4` — remove `<button class="back-btn">` block

## Doc References
- None — HTML-only change

## Acceptance Criteria
1. Confirm with Andy which 2 onboarding pages should have their back button removed.
2. Remove the back button HTML element from those 2 pages.
3. Verify the page renders correctly with no layout gap where the back button was.
4. Confirm users cannot swipe-back (iOS gesture) on these pages — if swipe-back is still possible via the iOS navigation stack, add swipe-back prevention as well.

## Edge Cases / Open Questions
- **Which 2 pages?** Candidates: `investmentconfirmation`, `fi-plan-results`, `surveyinitial`, `stockselection`, `document-upload`. Need confirmation before implementing.
- iOS swipe-back gesture may need to be disabled separately from removing the button (handled in the component's `ionViewWillEnter` using `NavController` if needed).

## Time Estimate
`<1hr`

## Label
`[code]`
