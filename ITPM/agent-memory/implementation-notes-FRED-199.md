# Implementation Notes — FRED-199: Skip step-up auth section when not enabled

## Design decisions

- Added `checkingStepUp: boolean = true` as the dedicated third state flag. Set false only after `hasPin()` resolves. This is the sentinel that drives the three-state template logic: checking / verify / settings.
- `isAuthenticating` was dead code post-refactor (only used by the removed `authenticateUser()` button). Removed it entirely; no other callers.
- `fingerprint` icon import was only used in the removed "Verify Identity" button. Removed it.

## AC-7 localStorage fail-close approach

- Marker key format: `stepUpEnabled:<userId>` where userId comes from `localStorage.getItem('userId')`. This scopes the marker per user to prevent stale marker cross-contamination on user switch.
- Marker is written in two places in PinService: (1) when `hasPin()` HTTP call returns `true`, (2) inside `promptPin('create')` is not directly accessible, so instead we expose `markStepUpEnabled()` and call it from the component's `toggleSensitiveAuth()` on successful PIN create.
- Actually — `promptPin()` returns a bool. We can call `markStepUpEnabled()` from `PinService` itself after successful PIN create via wrapping `setPin()`. But `setPin()` is called inside `PinPromptComponent`, not directly from the component. So the cleanest approach: expose `markStepUpEnabled()` and `clearStepUpMarker()` as public methods on PinService, then call them from the security-settings component on PIN create success and deletePin success.
- `clearStepUpMarker()` is also called by `JwtTokenUtils.clearJwtData()` (logout/clear) and `AuthService.logout()`.
- On logout, `JwtTokenUtils.clearJwtData()` already clears userId, so the marker removal must happen BEFORE or simultaneous with userId clear. We add the clear call inside `clearJwtData()`.

## Tradeoffs

- Chose to add `markStepUpEnabled()` / `clearStepUpMarker()` as static helpers on `PinService` (instance methods, not static, since PinService is injectable). This keeps marker logic colocated with hasPin().
- The marker uses `localStorage.getItem('userId')` at call time — if userId is gone already (mid-logout), the marker key can't be derived. Accepted: `clearJwtData()` clears the marker with the CURRENT userId before removing userId.
- `AuthService.logout()` calls `JwtTokenUtils.clearJwtData()` already, so the marker gets cleared there automatically once we add clearStepUpMarker() inside clearJwtData(). No separate call needed in AuthService.

## Open questions

- None blocking implementation.
