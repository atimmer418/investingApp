# FRED-116 — Prompt users for review after first MFU

## Before
```
## FRED-116 — Prompt users for review after first MFU
prompt users to leave a review after first monthly freedom update
```

## Summary
After the user dismisses their first Monthly Freedom Update modal, trigger the native Apple App Store review prompt (`SKStoreReviewController.requestReview()`). Only fires once — tracked by a `hasSeenFirstMFU` localStorage flag (or backend boolean).

## Files
- `frontend/src/app/components/monthly-freedom-update/monthly-freedom-update.component.ts` — after `dismiss()` resolves, check if this is the first MFU; if so, call review API
- `frontend/src/app/services/review.service.ts` (new, small) — wraps `@capacitor/rate-app` or `App.requestReview()` call

## Doc References
- Capacitor `@capacitor/rate-app` plugin (or `App` plugin from `@capacitor/app`) for `requestReview()`

## Acceptance Criteria
1. After user dismisses the MFU modal (`modalController.dismiss()`), check if `localStorage.getItem('hasSeenFirstMFU')` is falsy.
2. If first MFU: call `App.requestReview()` (or equivalent Capacitor review API). Then set `localStorage.setItem('hasSeenFirstMFU', 'true')`.
3. Review prompt fires at most once — `hasSeenFirstMFU` flag prevents repeat calls.
4. Use the native iOS in-app rating prompt: `SKStoreReviewController.requestReview()` via `@capacitor/rate-app` (install if not present). This renders the native Apple star-rating sheet that users see in every iOS app — do NOT build a custom UI.
5. `npx tsc --noEmit` exits 0.

## Edge Cases / Open Questions
- Apple's `SKStoreReviewController` silently does nothing if the user has already been prompted 3 times in a 365-day window — this is Apple-enforced, no action needed on our end.
- The prompt should appear after dismiss, not during the MFU — don't block the modal close.

## Time Estimate
`<1hr`

## Label
`[code]`
