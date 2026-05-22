# FRED-112 — Subscription prompt, risk reversal, expired sub handling

## Before
```
## FRED-112 — Subscription prompt, risk reversal, expired sub handling
we want to prompt our apple subscription on the selection of the user's tier aka when they click the "Join The Pig Leagues" button. there should be a placeholder already for this function. we need to find out how we can prompt for the apple subscription. also, make it so that a user with an expired apple subscription can only access the tab 3 and provide a way for them to be able to reactivate their subscription.
```

## Summary
Two sub-tasks building on FRED-99's `selectedTier` field: (1) Wire Apple IAP purchase sheet into `selectTier()` — the function already persists the tier to the backend (FRED-99), but the native Apple subscription purchase hasn't been wired yet. (2) Expired subscription gate — use existing `selectedTier` as the signal; if `null` after onboarding is complete, treat as no active subscription and restrict to Tab 3 (My Profile) only.

**FRED-99 already added:**
- `User.selectedTier` + `User.billingPeriod` (model + Flyway)
- `UserController` returns them in the user progress response
- `selectTier()` persists tier to backend via `updateUserProfile()`
- `UserProgress.selectedTier` / `billingPeriod` in the TypeScript interface

## Files

### Frontend
- `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.ts` — add Apple IAP call inside `selectTier()` before `updateUserProfile()`. On IAP success → proceed as now. On IAP cancel/fail → abort.
- `frontend/src/app/tabs/tabs.page.html` / `tabs.page.ts` — disable Tab 1, Tab 2, Chat when `selectedTier` is null and user is fully onboarded
- `frontend/src/app/pages/my-profile/` — show reactivation CTA when `selectedTier === null` (post-onboarding)

### Backend
- No new backend fields needed — `selectedTier` from FRED-99 is the subscription signal. If Apple IAP expires, the backend can be updated to set `selectedTier = null` by a future webhook/receipt check (FRED-174).

## Doc References
- `FREDdocs/API_ENDPOINTS.md` — user profile endpoint (already updated by FRED-99)
- `FREDdocs/PROGRESS_TRACKING_SYSTEM.md` — understand when a user is "fully onboarded" (to distinguish null-tier for new users vs expired)

## Acceptance Criteria
1. **Research first:** Identify the correct Capacitor IAP plugin for Apple subscriptions (RevenueCat's `@revenuecat/purchases-capacitor` is recommended — document final choice in code comment before implementing).
2. `selectTier()` triggers Apple IAP native purchase sheet for the matching product ID before calling `updateUserProfile()`. On IAP purchase success → proceed: call `updateUserProfile({ selectedTier, billingPeriod })` (FRED-99 variables) then `authorizeRecurringInvestment()` and navigate forward. On IAP cancel/fail → abort, stay on screen, do nothing.
3. Frontend expired gate: if user is fully onboarded (`investmentConfirmationCompleted === true`) but `selectedTier === null`, treat as expired. Tab 1, Tab 2, and Chat are visually disabled (grayed, non-tappable). Tab 3 (My Profile) remains fully accessible.
4. My Profile shows a "Reactivate" section when in expired state. Tapping it triggers Apple IAP resubscription (leave as `// TODO: trigger Apple IAP resubscription` pseudocode until FRED-174).
5. Private beta users (FRED-113: `privateBeta === 1`) bypass the expired gate entirely.
6. `npx tsc --noEmit` exits 0.

## Edge Cases / Open Questions
- Apple IAP requires App Store Connect product IDs configured — may be blocked until FRED-174. If so, leave `selectTier()` IAP call as pseudocode and focus only on the expired-gate (items 3–5).
- New users mid-onboarding have `selectedTier === null` naturally — the expired gate must only fire if `investmentConfirmationCompleted === true` (fully onboarded).
- Distinguishing "never subscribed" from "subscription lapsed": both result in `selectedTier === null`; treat identically for now.

## Time Estimate
`1-3hr` (expired gate only, IAP pseudocode) / `3hr+` (full IAP wiring)

## Label
`[code]`
