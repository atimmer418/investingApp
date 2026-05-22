# FRED-178 — Research: Face ID-only app lock without passkey sheet

## Before
```
## FRED-178 — Rebrand passkey auth to Face ID variant
Change passkey to face-ID passkey variant
```

## Summary
Research whether FRED can achieve passkey-level security using Face ID directly — without the native iOS "Use this passkey" selection sheet that currently appears during app lock. The goal is a simpler UX: app resumes → Face ID biometric prompt → unlocked, with no intermediate native sheet.

**Current flow:**
App lock triggers → `PasskeyPromptComponent` → native iOS WebAuthn assertion sheet appears → user taps "Use this passkey" → Face ID → unlocked.

**Desired flow:**
App lock triggers → Face ID prompt appears immediately → unlocked. No intermediate sheet.

**Key question:** Can `LAContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)` (or the Capacitor `@capacitor-community/device-security` / native plugin equivalent) replace the full WebAuthn assertion while maintaining equivalent security for app lock — given that the passkey is already created at registration time?

**Note:** Any change to the passkey authentication mechanism (e.g. switching from WebAuthn assertion to `LAContext` biometric) will also affect the login/registration flow. The research must evaluate impact on all three auth touch points: (1) initial registration (`authfinalize`), (2) app lock (resume cover), and (3) step-up re-auth (sell/withdraw). Scope accordingly.

## Files
- `frontend/src/app/components/passkey-prompt/passkey-prompt.component.ts` — current app-lock implementation using WebAuthn assertion
- `frontend/src/app/services/app-lock.service.ts` — triggers passkey prompt on app resume
- `ios/App/App/` — Swift side; `NativePasskeyPlugin.swift` handles WebAuthn via `ASAuthorizationController`

## Doc References
- None — research deliverable

## Acceptance Criteria
1. Research the iOS security model for `LAContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)` vs WebAuthn assertion for app-lock purposes. Answer: are these security-equivalent for this use case?
2. Determine whether Apple's passkey credential can be auto-selected (bypassing the "Use this passkey" sheet) via `ASAuthorizationController` with `preferImmediatelyAvailableCredentials` or similar.
3. Prototype whichever approach is more feasible (biometric-direct or auto-select passkey) and document the result in this ticket.
4. If feasible: write a brief implementation plan (what to change in `PasskeyPromptComponent` and/or `AppLockService`) in this ticket before coding.
5. If not feasible without degrading security: document why and propose the best available alternative.

## Edge Cases / Open Questions
- WebAuthn assertion (passkey) provides phishing-resistant authentication — `LAContext` biometric does not by itself. For app lock it may be acceptable, but for login/registration this tradeoff has security implications. Research must address all three auth touch points.
- `ASAuthorizationController` has a `performAutoFillAssistedRequests()` and `performRequests(autoFill:)` API — these may pre-select the passkey without the user having to tap "Use this passkey."
- iOS 16+ supports passkey with Face ID auto-prompting in some contexts — worth testing.

## Time Estimate
`1-3hr`

## Label
`[research]`
