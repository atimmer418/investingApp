# JWT Next-Step Hint — spec

**Date:** 2026-06-29
**Branch:** feat/cold-start-loading-optimization
**Goal:** Cut cold-start and post-reauth loading latency for fully-onboarded users.

---

## Design

A signed `"ns"` claim is embedded in every JWT at issuance time. The value is the
user's current `getNextStep()` slug (e.g. `"complete"`, `"kyc-verification"`).

The frontend reads this claim from the already-present token — zero extra HTTP calls —
and, when the hint says `"complete"`, navigates to `/tabs/tab1` immediately instead of
waiting for `GET /user/progress` to resolve (~400 ms – 1.5 s on a cold tunnel).

`GET /user/progress` still runs on every authenticated boot and remains the sole
routing authority (`_source:'db'`). The hint only paints faster.

---

## Backend changes

### `JwtUtils.java`
- Added private `buildToken(subject, sessionId, nextStep)` — all `generate*` methods
  funnel through it so the `ns` claim is applied consistently.
- Added overloads: `generateJwtToken(auth, ns)`, `generateJwtToken(auth, sessionId, ns)`,
  `generateTokenFromUsername(username, ns)`, `generateJwtTokenFromUsername(username, ns)`.
- Added `getNextStepFromJwtToken(token)` — reads the `ns` claim; used by tests and the
  refresh endpoint.
- JwtUtils remains a pure signer — no repository autowired.

### Issuance sites
| File | Method | Change |
|---|---|---|
| `WebAuthnService` | `finishAuthenticationFlow` | Pass `user.getUserProgress().getNextStep()` as `ns` (login + reauth — highest value) |
| `WebAuthnService` | `finishRegistrationFlow` | Pass `ns` on registration finish JWT |
| `WebAuthnController` | `finishRegistration` (simulated) | Pass `ns` |
| `AuthController` | `login` (2FA-disabled path) | Pass `ns` from user.getUserProgress() |
| `AuthController` | `refresh` | Carry forward old token's `ns` via `getNextStepFromJwtToken` — zero DB cost |
| `RecoveryController` | `verifyRecovery` | Pass `ns` |
| `DevAuthController` | `authenticateAsUser` | Pass `ns` |
| `UserController` | `updateEmail` | Pass `ns` |

Callers that lack the user object (or have no UserProgress loaded) default to `"get-started"`.

### Safe-degrading rollout
Old tokens without `ns` simply return `null` from `getNextStepHint()` — frontend no-ops
to the current behavior (waits for `GET /user/progress`). No migration or flag needed.

---

## Frontend changes

### `jwt-token.utils.ts`
- `getNextStepHint(): string | null` — reads `payload.ns` from the valid stored JWT.
- `NEXT_STEP_ROUTE_MAP` — full slug→route const for all 9 onboarding steps (v2 ready).

### `auth.service.ts`
- Added `authSucceeded$: Observable<void>` Subject — emitted at the end of
  `handleSuccessfulAuthentication`, after the load chain is kicked off.

### `app.component.ts`
- `tryOptimisticNav()` — gated helper: valid JWT + lock off + not locked + on entry route
  → if `ns === 'complete'` navigate to `/tabs/tab1` and hide covers.
- Called from `ngOnInit` (cold start) and from `authSucceeded$` subscribe (post-reauth).
- Preservation rule: if current route is NOT an onboarding/entry route, do nothing (user
  stays on `/my-profile`, `/tabs/tab2`, etc.).

### Hard constraints preserved
- `reAuthInProgress` logic untouched.
- `userProgressSubject.next(null)` in `handleSuccessfulAuthentication` untouched.
- `filter`/`distinctUntilChanged` guards in `setupNavigationLogic` untouched.
- `loadUserProgress` timeout/retry/`_source`/`localStorageFallback` untouched.
- `holdAuthenticatedUserOnFallback` untouched.
- Cover backstops (40 s seatbelt, 45 s index.html, `waitForRoutePainted`) untouched.
- Hint never sets `isLoggedIn`, calls `completeStep`, or gates KYC/bank/money.

---

## Test coverage

### `jwt-token.utils.spec.ts`
- `getNextStepHint` returns the ns value, null when absent, null when no token.
- `NEXT_STEP_ROUTE_MAP` spot-checks + full slug coverage.

### `app.component.spec.ts`
Six targeted cases from the spec:
1. Authed + lock off + `ns='complete'` from `/` → navigates to `/tabs/tab1`.
2. `ns='complete'` already on `/my-profile` → no nav (preservation).
3. `ns='kyc-verification'` → no early nav (v1 acts only on complete).
4. `isEnabled()===true` → no early nav.
5. `ns=null` → nothing.
6. Post-reauth `authSucceeded$` + `ns='complete'` from entry route → optimistic nav.
