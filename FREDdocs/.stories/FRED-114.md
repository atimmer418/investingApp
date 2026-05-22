# FRED-114 — Referral reward for three uses, founders vs non-founders

## Before
```
## FRED-114 — Referral reward for three uses, founders vs non-founders
add referral code for users who have had 3 people use their code. for founders we want it to send them an email about asking them what kinda clothing piece they want the limited edition design on and then for non-founders, is it possible to update a user current apple subscription from being $8/mo to being $5/mo without them having to do anything special?
```

## Summary
Full referral counting and reward system. A referral is **only counted** once: (1) the referred user enters the referrer's code, (2) the referred user completes the 14-day free trial, AND (3) the referred user has been a paying subscriber for at least 30 days post-trial.

Reward thresholds by tier/status:
- **Founders** (`privateBeta === true`): 3 valid referrals → email asking what merch piece they want
- **Core** (`selectedTier === 'core'`): 3 valid referrals → lifetime price $5/mo
- **Plus** (`selectedTier === 'plus'`): 2 valid referrals → lifetime price $10/mo
- **Pro** (`selectedTier === 'pro'`): 1 valid referral → lifetime price $20/mo

## Files

### Backend
- `backend/src/main/java/com/investingapp/backend/model/User.java` — add `referralAppliedAt` timestamp (when they entered a referral code), `subscriptionStartedAt` timestamp, `referralRewardTriggered` boolean
- `backend/src/main/resources/db/migration/` — Flyway migration for new columns
- `backend/src/main/java/com/investingapp/backend/controller/UserController.java` — add `GET /user/referral/validate?code=XXX` (returns 200 if code exists, 404 if not) + update `/user/referral/apply` to handle UX states + save `referralAppliedAt`
- `backend/src/main/java/com/investingapp/backend/scheduler/ReferralValidationScheduler.java` — daily/hourly job: find referred users where `subscriptionStartedAt` is 30+ days ago → increment referrer's `referralCount` → check reward threshold
- `backend/src/main/java/com/investingapp/backend/service/ReferralService.java` (new) — `validateReferral()`, `triggerReward(User referrer)`, reward logic (email stub for founders, IAP stub for non-founders)

### Frontend
- Referral code entry UI (wherever it lives) — three response states based on user's subscription age
- My Profile referral section — show valid referral count and reward progress

## Doc References
- `FREDdocs/API_ENDPOINTS.md` — `/user/referral/apply` existing endpoint
- `FREDdocs/INVESTMENT_SCHEDULER.md` — scheduler patterns for the validation job

## Acceptance Criteria

### Referral Code Entry UX
1. **Real-time validation:** As the user types their referral code, use `distinctUntilChanged + switchMap` to call `/user/referral/validate?code=XXX`. If code doesn't match any real user → "Apply" button disabled. If code matches a real user → "Apply" button enabled.
2. **One referral per user:** `User.hasAppliedReferral` already exists — if already applied, block the entry entirely. Show "You've already applied a referral code."
3. When "Apply" is tapped, backend checks the referred user's subscription state:
   - **Founder user entering the code (`privateBeta === true`):** Referral takes effect immediately — increment referrer's `referralCount`. Respond: "Referral applied!"
   - **No active subscription / just signed up:** Accept code, respond: "Code saved! Complete the 14-day free trial and stay a paying subscriber for at least 1 month to apply this referral."
   - **Trial completed but < 30 days paid:** Accept code, respond: "Code saved! Stay a paying subscriber for 1 month after your trial ends to apply this referral."
   - **30+ days paying subscriber:** Apply referral immediately — increment referrer's `referralCount`. Respond: "Referral applied!"
4. `User.referralAppliedAt` is set when the code is entered.
5. `User.hasAppliedReferral` already exists — use it to prevent double-applying.

### Referral Validation Scheduler
4. `ReferralValidationScheduler` runs daily. For each user where `hasAppliedReferral === true` AND `referralAppliedAt` is set AND `subscriptionStartedAt + 30 days <= now` AND referral not yet counted: increment referrer's `referralCount`, mark referral as counted.
5. `User.subscriptionStartedAt` is set when the user's subscription becomes active (i.e., when `selectedTier` is first set).

### Reward Triggers
6. When `referralCount` reaches the threshold for the user's tier/status:
   - **Founders:** stub `EmailService.sendMerchSelectionEmail(referrer)` — pseudocode until FRED-101.
   - **Non-founders:** stub IAP Promotional Offer downgrade — pseudocode until FRED-174.
7. `User.referralRewardTriggered` = true once fired; prevent double-trigger.
8. Required thresholds: Core=3, Plus=2, Pro=1, Founder=3.

### Frontend Milestone
9. Referral section in My Profile shows: "X / Y referrals" progress toward reward (Y = threshold for their tier).
10. When threshold reached: "🎉 Reward unlocked!" banner.

### Build
11. `./gradlew build -x test` exits 0; `npx tsc --noEmit` exits 0.

## Edge Cases / Open Questions
- `subscriptionStartedAt` must be set reliably when the IAP subscription activates (connected to FRED-174 for full accuracy). For now, set it when `selectedTier` is first persisted.
- Trial period: 14 days — where is this tracked? Assumption: `subscriptionStartedAt` starts at trial beginning; 30-day pay requirement counts from trial end (day 14). So the total validation window is 44 days from `referralAppliedAt` if entered at signup.
- The referral code entry can happen pre-subscription (during onboarding). Make sure `hasAppliedReferral` doesn't block re-entry if it was entered during onboarding.

## Time Estimate
`3hr+`

## Label
`[code]`
