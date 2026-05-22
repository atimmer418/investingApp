# FRED-113 — Private beta code, founder status, app store reauth

## Before
```
## FRED-113 — Private beta code, founder status, app store reauth
we want different code if the user is from the private beta. such as not prompting them for the subscription and also changing the referral reward text to say that you can claim a limited edition FRED outfit by having 3 people use your code (beta or non beta users). also showing FOUNDER STATUS somewhere such as like the loading screen in gold color. we also want to make sure their deviceId/iCloudKeychain is used to prompt them to login when they have downloaded the non-private beta version. i was thinking something along the lines of adding a privateBeta variable to the user model and setting it to value 1 for all people that sign up during that build but how will the prompting for reauth work if they are downloading the app off the app store for the first time?
```

## Summary
Add `privateBeta` boolean to the User model. Private beta users get: (1) subscription gate bypassed (FRED-112), (2) referral reward text changed to "limited edition FRED outfit," (3) gold "FOUNDER STATUS" badge on the loading screen. App Store reauth for private beta users is already handled by the existing iCloud Keychain email sync (`keychainSyncService.getAccountEmail()`) — no new code needed there.

## Files

### Backend
- `backend/src/main/java/com/investingapp/backend/model/User.java` — add `privateBeta` boolean (default false)
- `backend/src/main/resources/db/migration/` — Flyway migration for `private_beta` column
- `backend/src/main/java/com/investingapp/backend/controller/UserController.java` — expose `privateBeta` in user progress response

### Frontend
- `frontend/src/app/services/auth.service.ts` — add `privateBeta?: boolean` to `UserProgress`
- `frontend/src/app/tabs/tabs.page.ts` (or subscription gate component) — bypass expired gate if `privateBeta === true`
- Loading screen component — show "FOUNDER STATUS" in gold color when `privateBeta === true`
- Referral section (wherever referral reward copy lives) — change reward text to "claim a limited edition FRED outfit" for all users with beta link

## Doc References
- `FREDdocs/AUTHENTICATION_AND_JWT.md` — iCloud Keychain email sync (already implemented)

## Acceptance Criteria
1. `User.java` gains `privateBeta` boolean (default false). Flyway migration adds `private_beta` column. User progress response returns `privateBeta`.
2. `UserProgress` interface gains `privateBeta?: boolean`.
3. Subscription gate (FRED-112 item 3): if `privateBeta === true`, bypass — all tabs accessible regardless of `selectedTier`.
4. Referral reward copy: if user taps "share referral code" or views the referral reward UI, the prize text reads "Claim limited edition FRED merch" for all users (beta and non-beta — per original note).
5. Loading screen: if `privateBeta === true`, display "FOUNDER STATUS" text in gold color (`#FBC926`) alongside or below the FRED logo.
6. App Store reauth for private beta users: **already handled** — `keychainSyncService.getAccountEmail()` reads the iCloud-synced email on first launch and prompts passkey reauth. No new code needed; verify the flow works end-to-end in testing.
7. `privateBeta` is set to `true` manually (via admin/database) for all users who signed up during the private beta build — no automated detection needed.
8. `npx tsc --noEmit` exits 0; `./gradlew build -x test` exits 0.

## Edge Cases / Open Questions
- iCloud Keychain reauth only works if the user installs the App Store version using the same Apple ID as the private beta — this is the expected case. If they switch Apple IDs, they'll need to enter their email manually for recovery (existing recovery flow handles this).
- "FOUNDER STATUS" placement: loading screen is one option; also consider the My Profile tab header for persistent visibility. Decide during implementation.
- Setting `privateBeta = true` in bulk: run a SQL update after the private beta period to mark all existing users. Add a note in the admin runbook.

## Time Estimate
`1-3hr`

## Label
`[code]`
