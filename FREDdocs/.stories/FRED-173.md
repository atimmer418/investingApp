# FRED-173 — Lock referral entry until 30 days post-trial

## Before
```
## FRED-173 — Lock referral entry until 30 days post-trial
A new subscriber must be a subscriber for at least 30 days after their 14-day free trial ends before they can access the referral entry point. Lock the referral UI until that condition is met.
```

## Summary
Hide the referral card in My Profile until the user has been a paying subscriber for at least 30 days (i.e. 44+ days since they first paid/subscribed). A new `subscription_start_date` field is needed on the user — set when the subscription is confirmed via Apple IAP (part of FRED-174). Until then, replace the referral card with a locked state showing when it unlocks.

**Depends on:** FRED-174 (Apple IAP wiring) — `subscriptionStartDate` is populated when IAP subscription is confirmed.

## Files
**Backend:**
- `backend/src/main/java/com/investingapp/backend/model/User.java` — add `subscriptionStartDate: LocalDate` field
- New Flyway migration: `subscription_start_date DATE NULL` on users table
- `backend/src/main/java/com/investingapp/backend/controller/UserController.java` or a new endpoint — expose `referralUnlocksAt` (computed as `subscriptionStartDate + 44 days`) in the user progress/profile response

**Frontend:**
- `frontend/src/app/pages/my-profile/my-profile.page.html:94` — wrap `referral-card` in an `*ngIf`; show a locked state with "Referral access unlocks on [date]" until condition is met
- `frontend/src/app/pages/my-profile/my-profile.page.ts` — add `referralUnlockedAt: Date` from user progress; getter `isReferralLocked: boolean`

## Doc References
- None

## Acceptance Criteria
1. Add `subscription_start_date DATE NULL` column to users table via Flyway migration.
2. Backend: expose `referralUnlocksAt` date (= `subscriptionStartDate + 44 days`) in the user profile/progress API response.
3. In My Profile, hide the full referral card when `referralUnlocksAt` is in the future; show a locked placeholder instead: "🔒 Referral access unlocks [Month Day, Year]."
4. Once `referralUnlocksAt` has passed, show the referral card as normal.
5. If `subscriptionStartDate` is null (Apple IAP not yet confirmed — depends on FRED-174), treat as locked.

## Edge Cases / Open Questions
- `subscriptionStartDate` is only set after Apple IAP confirms the subscription (FRED-174 dependency). Until then all users are locked.
- Should this also hide the referral code redemption field (entering someone else's code), or only the "share your code" section? The backlog says "access the referral entry point" — assume both directions are locked.
- If a user upgrades partway through their trial, does the 30-day clock start from trial-end or from subscription confirmation? Assume subscription confirmation date for simplicity.

## Time Estimate
`1-3hr`

## Label
`[code]`
