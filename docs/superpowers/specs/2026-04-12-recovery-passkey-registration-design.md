# Recovery — Passkey Re-Registration Design

**Date:** 2026-04-12  
**Status:** Approved

## Problem

After a successful OTP recovery, the backend clears all existing passkeys for the user. The current flow stores the JWT and navigates straight to settings with a toast message telling the user to register a new passkey — but never actually prompts them to do so. The user lands on settings with no passkey registered.

## Goal

When a user successfully verifies their OTP during account recovery, immediately prompt them to register a new passkey (via the native OS/browser WebAuthn UI) before navigating to the settings page.

## Flow

1. User enters email → clicks "Send Recovery Code"
2. User enters OTP → clicks "Verify & Recover"
3. OTP verified → JWT stored
4. Passkey registration starts immediately (OS/browser prompt fires)
5. Passkey registered successfully → navigate to `/tabs/tab3` (settings)
6. If user cancels or passkey fails → show error toast, stay on OTP step so they can retry

## Backend Changes

### New service method: `WebAuthnService.startRecoveryRegistrationFlow(email)`

Looks up the existing user by email (throws if not found). Generates a `PublicKeyCredentialCreationOptions` using the user's existing identity — no user creation, no plan data, no email conflict check. Otherwise identical to the challenge generation in `startRegistrationFlow`.

### New endpoint: `POST /api/passkey/register/recovery/start`

- Requires a valid JWT in the `Authorization` header (issued by the recovery verify call)
- Reads the authenticated user's email from the JWT principal
- Calls `startRecoveryRegistrationFlow(email)`, caches the challenge, returns `RegistrationStartResponse` (same shape as existing start endpoint)
- Returns 401 if no valid JWT; 404 if user not found

### Reused endpoint: `POST /api/passkey/register/finish`

No changes. It already looks up the user by email and saves the credential — works for both new and existing users.

## Frontend Changes

### PasskeyService — new method `startRecoveryRegistration()`

Calls `POST /api/passkey/register/recovery/start` with no request body — the backend derives the user's email from the JWT principal. Uses the same `getHeadersAsync()` helper (which attaches the JWT that was just stored by `verifyCode`). Returns `Observable<RegistrationStartResponse>`.

### RecoveryPage — expand `verifyCode()`

After `response.success && response.token`:
1. Store JWT (`JwtTokenUtils.storeJwtToken`)
2. Call `passkeyService.startRecoveryRegistration()` to get options (email is derived server-side from JWT)
3. Parse options JSON, call `create()` (WebAuthn native prompt)
4. Call `passkeyService.finishRegistration({ email, credential })` to register
5. On success: navigate to `/tabs/tab3`
6. On any error (user cancels, network, etc.): show error toast, set `isLoading = false`, stay on OTP step

The button stays in its loading state (`isLoading = true`) through the entire sequence. No new `step` value is needed.

### No authService.completeStep() call

This is a recovery flow for an existing user, not a new onboarding registration. `completeStep('authFinalize')` is not called.

## Error Handling

| Scenario | Behaviour |
|---|---|
| OTP invalid / expired | Existing toast, stay on OTP step |
| Passkey start fails (network) | Toast "Could not start passkey registration. Try again.", stay on OTP step |
| User cancels WebAuthn prompt | Toast "Passkey registration was cancelled. Please try again.", stay on OTP step |
| Passkey finish fails | Toast "Passkey registration failed. Please try again.", stay on OTP step |
| All good | Navigate to `/tabs/tab3` |

## Out of Scope

- Re-registration retry limit / lockout
- Allowing the user to skip passkey registration after recovery
