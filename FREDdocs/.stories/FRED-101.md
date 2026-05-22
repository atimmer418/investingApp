# FRED-101 — Set up emailer for all transactional notifications

## Before
```
## FRED-101 — Set up emailer for all transactional notifications
set up emailer for ach deposit/withdraw notifications of confirmation it went thru, placing trades (and sending the trade confirmation document to their email?) and acquiring the positions confirmation email and account verification email. the only notifications from the app will come thru email (account statements? trade confirmations? tax forms available? and implement the pseudocode for the acats transfer emails, the one email should be sent to two recipients: alpaca and help@fredvested.com) and recovery email otp for if you already had an account. we should send a successful transfer completion notification email to the user; add in my profile somewhere that will show a warning that your email has not been verified yet; check if updating email works too
```

## Summary
`EmailService.java` is a logging stub — no provider is wired and `app.email.enabled=false` by default. Integration points already exist in `InvestmentExecutionService` (trade confirmation at lines 952/967), `AlpacaService` (ACATS pseudocode at lines 990–1008), `AccountStatusService` (ACH events at lines 129/270), and `RecoveryController` (OTP just prints to stdout at line 55). This story implements the email provider, wires it up, and ensures every transactional event actually sends. Also adds email verification status to user profile.

## Files
- `backend/build.gradle` — add Spring Boot Mail starter dependency
- `backend/src/main/resources/application.properties` — add `spring.mail.*` config keys (SMTP)
- `backend/.../service/EmailService.java` — implement real sending via JavaMailSender with HTML templates for each email type
- `backend/.../controller/RecoveryController.java` — replace `System.out.println` OTP with `emailService.sendEmail()` call
- `backend/.../model/User.java` — add `emailVerified` (boolean, default false) field
- `backend/.../controller/UserController.java` — expose `emailVerified` in user profile GET response; add email verification flow (optional in this story — see edge cases)
- `frontend/.../pages/my-profile/` (or equivalent profile component) — show "Email not verified" warning banner if `emailVerified === false`

## Doc References
- Existing email integration points: `backend/src/main/java/com/investingapp/backend/service/InvestmentExecutionService.java` (lines 952, 967)
- ACATS pseudocode: `backend/src/main/java/com/investingapp/backend/service/AlpacaService.java` (lines 990–1008)
- Recovery OTP: `backend/src/main/java/com/investingapp/backend/controller/RecoveryController.java` (line 55)
- API endpoints: `FREDdocs/API_ENDPOINTS.md`

## Acceptance Criteria
1. **[founder unblocks]** Email provider chosen (recommended: Resend or SendGrid), SMTP credentials (host, port, username, password / API key) added to Railway environment variables and local `.env`
2. `backend/build.gradle` includes `implementation 'org.springframework.boot:spring-boot-starter-mail'`
3. `application.properties` has `spring.mail.host`, `spring.mail.port`, `spring.mail.username`, `spring.mail.password` reading from env vars; `app.email.enabled=true` in production profile
4. `EmailService.sendEmail()` uses `JavaMailSender` to send plain-text emails with an HTML alternative; when `app.email.enabled=false` (local/test), it logs only — existing behavior preserved for dev
5. `RecoveryController` sends the OTP to the user's email via `emailService` instead of printing to stdout
6. All existing `emailService.sendEmail()` call sites in `InvestmentExecutionService` and `AccountStatusService` continue to work — no change to call sites needed, only `EmailService` implementation changes
7. `AlpacaService` ACATS pseudocode (lines 990–1008) is uncommented/activated so transfer emails are sent to both `support@alpaca.markets` and `help@fredvested.com`
8. `User.java` has `@Column(name = "email_verified", nullable = false) private boolean emailVerified = false`
9. My Profile screen shows a dismissible "Email not verified" warning if the API response includes `emailVerified: false`
10. `cd backend && ./gradlew build -x test` exits 0; `cd frontend && npx tsc --noEmit -p tsconfig.app.json` exits 0
11. **Manual smoke (requires provider credentials):** trigger an account recovery flow → OTP arrives in inbox

## Edge Cases / Open Questions
- **Email verification flow** (AC 9 adds the warning, but the actual "send verification email" + "click link to verify" flow is complex): AC 9 only adds the UI warning. The verify-email flow (send link, token, mark verified) can be a separate story.
- **ACATS email recipients**: `AlpacaService` pseudocode sends to `support@alpaca.markets` — confirm this is the correct Alpaca support address before activating.
- **From address**: `EMAIL_FROM` env var should be set to `noreply@fredvested.com` (or `help@fredvested.com`). Needs domain DNS verification with the chosen email provider.
- **Trade confirmation document**: The backlog asks about "sending the trade confirmation document" — Alpaca generates 1099s, not per-trade PDFs. This is deferred; the existing plain-text trade confirmation email is sufficient for now.
- **Update email**: The `change-email` route exists in the frontend. Verify that the backend's update-email flow correctly sets `emailVerified = false` after an email change (so the warning re-appears until the new address is verified).

## Time Estimate
`3hr+`

## Label
`[code]` (blocked by founder: email provider setup + credentials)
