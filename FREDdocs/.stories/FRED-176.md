# FRED-176 — Connect email list opt-in checkbox to emailer (ONBOARDING)

## Before
```
## FRED-176 — Connect email list opt-in checkbox to emailer (ONBOARDING)
The "Keep me updated" marketing checkbox needs to be wired up to the FRED email list.
```

## Summary
Wire the "Keep me updated with FRED tips and news." checkbox in `investmentconfirmation` to an actual email list. Currently `agreedToMarketing` is a local boolean (`investmentconfirmation.component.ts:250`) that is never sent anywhere. This story sends that flag to the backend when the user completes onboarding, and the backend adds them to the marketing email list if true.

## Files
**Frontend:**
- `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.ts` — include `agreedToMarketing` in the completion payload when calling `completeStep('investmentConfirmation')`
- `frontend/src/app/services/auth.service.ts` — pass `agreedToMarketing` in the profile/progress update call

**Backend:**
- `backend/src/main/java/com/investingapp/backend/model/User.java` — add `agreedToMarketing: Boolean` field (nullable)
- New Flyway migration: `agreed_to_marketing TINYINT(1) DEFAULT 0` on users table
- `backend/src/main/java/com/investingapp/backend/service/EmailService.java` or new `MarketingEmailService.java` — add user to email list when `agreedToMarketing = true`
- Choose email list provider: Mailchimp, ConvertKit, Beehiiv, or Resend (Resend recommended for simplicity — can also handle transactional emails, replacing JavaMailSender eventually)

## Doc References
- None — new integration; choose email provider before starting

## Acceptance Criteria
1. `agreedToMarketing` flag is sent to the backend when the user completes onboarding.
2. Backend stores `agreed_to_marketing` on the user (Flyway migration).
3. If `agreedToMarketing = true`: backend has a `// TODO: call email provider API to add user to marketing list` comment stub in place — email provider not yet chosen; leave as pseudocode.
4. If `agreedToMarketing = false` (unchecked): no action, no error.
5. The data is captured and stored; actual list subscription wired in a future story once an email provider is selected.

## Edge Cases / Open Questions
- **Which email provider?** Recommend Resend (https://resend.com) — simple REST API, supports bulk/marketing lists and transactional email. Mailchimp is an alternative. Decide before implementing.
- If the user later unchecks a preference (post-onboarding), an unsubscribe mechanism is needed — out of scope here; add `agreed_to_marketing` to the profile update endpoint for a future story.
- GDPR/CAN-SPAM: the checkbox copy should clearly indicate what they're signing up for — current copy "FRED tips and news" is acceptable for US-only launch.

## Time Estimate
`1-3hr`

## Label
`[code]`
