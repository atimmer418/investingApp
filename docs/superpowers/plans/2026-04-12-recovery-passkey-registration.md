# Recovery Passkey Re-Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a successful OTP recovery, immediately prompt the user to register a new passkey (using the pre-known email) and navigate to settings once it's registered.

**Architecture:** A new backend endpoint (`POST /api/passkey/register/recovery/start`) generates WebAuthn challenge options for an existing user — skipping user creation and plan data. The existing `/passkey/register/finish` endpoint is reused unchanged. On the frontend, `verifyCode()` in `RecoveryPage` chains straight from OTP verification into passkey registration before navigating to settings.

**Tech Stack:** Spring Boot (WebAuthnService / WebAuthnController), Angular + Ionic (PasskeyService, RecoveryPage), `@github/webauthn-json` for WebAuthn credential creation.

---

## File Map

| File | Change |
|---|---|
| `backend/.../service/WebAuthnService.java` | Add `startRecoveryRegistrationFlow(String email)` |
| `backend/.../controller/WebAuthnController.java` | Add `POST /register/recovery/start` endpoint |
| `frontend/.../services/passkey.service.ts` | Add `startRecoveryRegistration()` method |
| `frontend/.../pages/recovery/recovery.page.ts` | Expand `verifyCode()`, add imports + inject PasskeyService |

---

## Task 1: Add `startRecoveryRegistrationFlow` to `WebAuthnService`

**Files:**
- Modify: `backend/src/main/java/com/investingapp/backend/service/WebAuthnService.java`

This method looks up the existing user, builds a `UserIdentity` from their existing `userHandle`, and returns `PublicKeyCredentialCreationOptions` — identical to the challenge generation block in `startRegistrationFlow` but without user creation or plan data.

- [ ] **Step 1: Add the method**

Open `WebAuthnService.java`. After the closing brace of `startRegistrationFlow` (around line 123), add:

```java
@Transactional
public PublicKeyCredentialCreationOptions startRecoveryRegistrationFlow(String email) {
    logger.info("Starting recovery passkey re-registration for existing user: {}", email);

    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

    UserIdentity userIdentity = UserIdentity.builder()
            .name(user.getEmail())
            .displayName(user.getEmail())
            .id(PasskeyCredential.base64UrlToByteArray(user.getUserHandle()))
            .build();

    StartRegistrationOptions optionsToPassToRp = StartRegistrationOptions.builder()
            .user(userIdentity)
            .authenticatorSelection(AuthenticatorSelectionCriteria.builder()
                .residentKey(ResidentKeyRequirement.PREFERRED)
                .userVerification(UserVerificationRequirement.PREFERRED)
                .build())
            .build();

    return relyingParty.startRegistration(optionsToPassToRp);
}
```

All imports (`UserIdentity`, `StartRegistrationOptions`, `AuthenticatorSelectionCriteria`, etc.) are already present in the file — no new imports needed.

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/service/WebAuthnService.java
git commit -m "feat(recovery): add startRecoveryRegistrationFlow for existing users"
```

---

## Task 2: Add `/register/recovery/start` endpoint to `WebAuthnController`

**Files:**
- Modify: `backend/src/main/java/com/investingapp/backend/controller/WebAuthnController.java`

The endpoint reads the JWT from the `Authorization` header (already issued by the recovery verify call), extracts the email, calls `startRecoveryRegistrationFlow`, caches the challenge, and returns `RegistrationStartResponse` — the same shape as the existing start endpoint.

Note: `/api/passkey/**` is already `permitAll()` in `SecurityConfig`, so no security config change is needed. The endpoint validates the JWT manually (consistent with the existing pattern in `finishAuthentication`).

- [ ] **Step 1: Add the endpoint**

In `WebAuthnController.java`, add the following method after `startRegistration` (around line 110):

```java
@PostMapping("/register/recovery/start")
public ResponseEntity<?> startRecoveryRegistration(HttpServletRequest request) {
    String authHeader = request.getHeader("Authorization");
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authorization required");
    }
    String token = authHeader.substring(7);
    if (!jwtUtils.validateJwtToken(token)) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid or expired token");
    }
    String email = jwtUtils.getUserNameFromJwtToken(token);
    logger.info("Received recovery passkey re-registration start for email: {}", email);

    try {
        PublicKeyCredentialCreationOptions options = webAuthnService.startRecoveryRegistrationFlow(email);
        challengeCache.put(email, options);
        logger.info("Recovery registration options cached for: {}", email);

        String optionsJson = options.toCredentialsCreateJson();
        JsonNode fullResponse = objectMapper.readTree(optionsJson);
        JsonNode publicKeyNode = fullResponse.get("publicKey");
        String publicKeyJson = objectMapper.writeValueAsString(publicKeyNode);

        return ResponseEntity.ok(new RegistrationStartResponse(publicKeyJson));
    } catch (IllegalArgumentException e) {
        logger.warn("Recovery registration failed — user not found: {}", email);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
    } catch (Exception e) {
        logger.error("Failed to generate recovery registration options for: {}", email, e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error generating registration options");
    }
}
```

All imports (`HttpServletRequest`, `HttpStatus`, `JsonNode`, `PublicKeyCredentialCreationOptions`, `RegistrationStartResponse`) are already present in the file.

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/controller/WebAuthnController.java
git commit -m "feat(recovery): add /passkey/register/recovery/start endpoint"
```

---

## Task 3: Add `startRecoveryRegistration()` to `PasskeyService`

**Files:**
- Modify: `frontend/src/app/services/passkey.service.ts`

No request body — the backend reads the email from the JWT. The JWT is attached automatically by `getHeadersAsync()` since `JwtTokenUtils.storeJwtToken` was called in `verifyCode` right before this.

- [ ] **Step 1: Add the method**

In `passkey.service.ts`, add the following after `startAuthenticationForUser` (around line 108):

```typescript
startRecoveryRegistration(): Observable<RegistrationStartResponse> {
  return new Observable(observer => {
    this.getHeadersAsync().then(headers => {
      this.http.post<RegistrationStartResponse>(
        `${BACKEND_API_URL}/passkey/register/recovery/start`,
        {},
        { headers }
      ).subscribe({
        next: res => { observer.next(res); observer.complete(); },
        error: err => observer.error(err)
      });
    });
  });
}
```

`RegistrationStartResponse` is already imported at the top of the file.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/services/passkey.service.ts
git commit -m "feat(recovery): add startRecoveryRegistration to PasskeyService"
```

---

## Task 4: Update `RecoveryPage` to chain passkey registration after OTP verification

**Files:**
- Modify: `frontend/src/app/pages/recovery/recovery.page.ts`

After a successful OTP response, keep `isLoading = true` and immediately start passkey registration. Only set `isLoading = false` on failure paths. On success, navigate to `/tabs/tab3`. The `finally` block is removed so `isLoading` stays true through the passkey OS prompt.

- [ ] **Step 1: Add imports**

At the top of `recovery.page.ts`, add these two imports:

```typescript
import { PasskeyService } from '../../services/passkey.service';
import { create } from '@github/webauthn-json';
```

(`@github/webauthn-json` is already installed — authfinalize uses it.)

- [ ] **Step 2: Inject `PasskeyService`**

Update the constructor to inject `PasskeyService`:

```typescript
constructor(
  private recoveryService: RecoveryService,
  private router: Router,
  private toastService: ToastService,
  private location: Location,
  private passkeyService: PasskeyService
) {
  addIcons({ shieldCheckmarkOutline, keyOutline, mailOutline });
}
```

- [ ] **Step 3: Replace `verifyCode()`**

Replace the entire existing `verifyCode()` method with:

```typescript
async verifyCode() {
  if (!this.otp) return;

  this.isLoading = true;
  try {
    const response = await this.recoveryService.verifyRecovery(this.email, this.otp);
    if (response.success && response.token) {
      JwtTokenUtils.storeJwtToken(response.token);

      // Kick off passkey registration — isLoading stays true through the OS prompt
      this.passkeyService.startRecoveryRegistration().subscribe({
        next: async (startResponse) => {
          try {
            const optionsAsObject = JSON.parse(startResponse.options);
            const credential = await create({ publicKey: optionsAsObject });

            this.passkeyService.finishRegistration({ email: this.email, credential }).subscribe({
              next: (finishResponse) => {
                if (finishResponse.success) {
                  this.router.navigate(['/tabs/tab3']);
                } else {
                  this.toastService.showToast(finishResponse.message || 'Passkey registration failed. Please try again.');
                  this.isLoading = false;
                }
              },
              error: () => {
                this.toastService.showToast('Passkey registration failed. Please try again.');
                this.isLoading = false;
              }
            });
          } catch {
            // User cancelled the OS passkey prompt or WebAuthn failed
            this.toastService.showToast('Passkey registration was cancelled. Please try again.');
            this.isLoading = false;
          }
        },
        error: () => {
          this.toastService.showToast('Could not start passkey registration. Try again.');
          this.isLoading = false;
        }
      });
    } else {
      this.toastService.showToast(response.message || 'Verification failed.');
      this.isLoading = false;
    }
  } catch {
    this.toastService.showToast('Invalid code or error occurred.', 'danger');
    this.isLoading = false;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/pages/recovery/recovery.page.ts
git commit -m "feat(recovery): register new passkey immediately after OTP verification"
```
