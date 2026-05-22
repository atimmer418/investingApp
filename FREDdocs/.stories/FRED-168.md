# FRED-168 — Referral-discounted tier upgrade on profile page

## Before
```
## FRED-168 — Referral-discounted tier upgrade on profile page
Add ability to upgrade tiers in my profile page. if they already have had 1 referral, they can go to $20/mo instead of $40/mo. if they already have had 2 referrals, they can go to $10/mo instead of $15/mo
```

## Summary
Surface a referral-discounted tier upgrade UI in the My Profile page. Users who have successfully referred 1+ friends unlock a discounted upgrade to a higher pricing tier. The discount is applied based on `referralCount` (already stored on the user in both backend and frontend).

**Discount rules:**
- 1 referral → can upgrade to Premium (top tier) at **$20/mo** instead of $40/mo
- 2 referrals → can upgrade to Standard (middle tier) at **$10/mo** instead of $15/mo

**Depends on:** FRED-114 (referral reward wiring must be live so `referralCount` increments correctly).

## Files
- `frontend/src/app/pages/my-profile/my-profile.page.html` — add "Upgrade your plan" section with discounted CTA
- `frontend/src/app/pages/my-profile/my-profile.page.ts` — getter to compute available discount based on `referralCount`; call `updateUserProfile({ selectedTier })` on confirm
- `frontend/src/app/services/auth.service.ts:263` — existing `updateUserProfile()` with `selectedTier` and `billingPeriod` params; reuse as-is
- `backend/src/main/java/com/investingapp/backend/controller/UserController.java:473` — existing PATCH profile endpoint already handles `selectedTier`; no backend changes needed unless discounted billing needs a separate flag

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — card and CTA patterns for the upgrade section

## Acceptance Criteria
1. In My Profile, show an "Upgrade your plan" section only when `referralCount >= 1` and the user is not already on the discounted tier they qualify for.
2. Section shows the unlocked discount:
   - `referralCount === 1`: "1 referral unlocked — upgrade to Premium for $20/mo (normally $40/mo)"
   - `referralCount >= 2`: "2 referrals unlocked — upgrade to Standard for $10/mo (normally $15/mo)" (or Premium at $20 if applicable)
3. Tapping the CTA presents an `AlertController` confirmation: "Upgrade to [Tier] for $[discounted price]/mo?" with Confirm and Cancel.
4. On confirm, call `updateUserProfile({ selectedTier: '<tier>', billingPeriod: 'monthly' })` and show a success toast.
5. Section hides after upgrade is applied (user is already on that tier).
6. No backend changes needed beyond the existing PATCH `/api/users/profile` endpoint.

## Edge Cases / Open Questions
- The actual Apple IAP billing hookup is out of scope here (tracked in FRED-174) — for now, this updates the stored `selectedTier` only; billing enforcement is separate.
- If the user is already on a higher tier, do not show the downgrade option (e.g. PREMIUM user should not see the $20 offer as a downgrade).
- What happens if `referralCount` is 0 — section is simply hidden, no empty state needed.
- Determine the exact tier name strings stored in `selectedTier` (e.g. `"PREMIUM"`, `"STANDARD"`) by checking `UserController.java:474` before implementing.

## Time Estimate
`1-3hr`

## Label
`[code]`
