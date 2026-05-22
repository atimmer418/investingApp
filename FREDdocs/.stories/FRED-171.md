# FRED-171 — Payday lifecycle emails and push notifications

## Before
```
## FRED-171 — Payday lifecycle emails and push notifications
lifecycle emails regarding investing in FRED. Then time your lifecycle emails and push notifications around it:

Day before payday: "Your paycheck hits tomorrow. FRED will auto-invest $X — your Freedom Date moves up 6 days."
Day of payday: "💰 $X invested. New Freedom Date: [date]."
Day after payday: "You just got 6 days closer to freedom without lifting a finger."
```

## Summary
Send three time-boxed communications per pay cycle keyed to each user's investment date: a "tomorrow" email/push the day before, a "did it" message on payday, and a "look back" message the day after. The investment date is known from `InvestmentSchedule.calculateNextInvestmentDate()` and the frequency (`WEEKLY`/`BIWEEKLY`/`SEMI_MONTHLY`/`MONTHLY`). Email infrastructure (`EmailService`) exists; push notification infrastructure does not — this story builds both.

## Files
**Backend:**
- `backend/src/main/java/com/investingapp/backend/service/EmailService.java` — existing `sendEmail(to, subject, text)` method; extend or reuse for lifecycle emails
- `backend/src/main/java/com/investingapp/backend/model/InvestmentSchedule.java` — `frequency`, `nextInvestmentDate`, `calculateNextInvestmentDate()` — source of truth for payday timing
- `backend/src/main/java/com/investingapp/backend/scheduler/InvestmentScheduler.java` — add or extend a daily cron job to fire D-1, D+0, D+1 notifications
- `backend/src/main/java/com/investingapp/backend/service/` — new `PaydayNotificationService.java` for sending email + push per user
- `backend/src/main/java/com/investingapp/backend/model/User.java` — add `devicePushToken` field (nullable) for FCM/APNs token storage
- New Flyway migration: add `device_push_token` column to `users` table

**Frontend:**
- `frontend/src/app/services/` — new or updated service to register device push token with backend on app start (via `@capacitor/push-notifications`)
- `frontend/capacitor.config.ts` — ensure push notifications plugin is configured

## Doc References
- None — new push notification infrastructure

## Acceptance Criteria
1. **Email (D-1):** At midnight or first-thing-AM the day before each user's `nextInvestmentDate`, send an email: subject "Your investment hits tomorrow", body matching the backlog copy (with $X from `calculateInvestmentAmount()` and the freedom date gain).
2. **Email (D+0):** On the investment day (after the investment runs), send: "💰 $X invested. New Freedom Date: [date]."
3. **Email (D+1):** Day after investment: "You just got N days closer to freedom without lifting a finger."
4. **Push notifications:** Same three messages sent as push notifications to the user's device token (if one is registered). Use `@capacitor/push-notifications` on the frontend to register device token; store token on backend via a new `PATCH /api/users/push-token` endpoint.
5. New backend `device_push_token` column in users table via Flyway migration.
6. Users without a push token registered still receive emails — push is additive, not a replacement.
7. Users with notifications disabled (no token, or push permission denied) receive emails only — no error thrown.

## Edge Cases / Open Questions
- **Push service**: Use Firebase Cloud Messaging (FCM) — best/easiest for Capacitor iOS apps. Set up Firebase project, add `GoogleService-Info.plist` to the iOS target, and install `@capacitor-firebase/messaging` or `@capacitor/push-notifications` with FCM backend.
- **Freedom date delta**: The "moved up N days" copy requires computing the delta between the current freedom date and the post-investment freedom date — this is a backend calculation. Confirm whether `MonthlyFreedomUpdateService` or `InvestmentSchedule` has this already.
- **D+0 timing**: Email on payday day should send after the investment actually executes (i.e. after `InvestmentScheduler` runs). Sequence carefully to avoid sending "invested $X" before the investment completes.
- **Opt-out**: Should users be able to opt out of these notifications? If yes, add a notification preferences field (out of scope for this story unless Andy wants it).

## Time Estimate
`3hr+`

## Label
`[code]`
