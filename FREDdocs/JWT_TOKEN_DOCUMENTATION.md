# JWT Token System Documentation

## Overview
The JWT (JSON Web Token) system manages user authentication and session persistence. Tokens have a **1-hour expiration** and are stored in the browser's localStorage. Active users get their tokens refreshed automatically — the JWT expiry effectively acts as the inactivity timeout. When a token expires (because the user was inactive), the app lock screen appears and the user re-authenticates with their passkey to get a fresh token.

## Token Structure

### JWT Claims (Payload)
```json
{
  "sub": "user@example.com",        // Subject: User's email
  "jti": "a1b2c3d4-e5f6-7890-1234", // JWT ID: Unique token identifier (UUID)
  "iat": 1638360000,                // Issued At: When token was created
  "exp": 1638363600,                // Expiration: 1 hour after creation
  "iss": "investingapp"             // Issuer: Application identifier
}
```

### localStorage Keys
| Key | Value | Purpose |
|-----|-------|---------|
| `jwtToken` | JWT string | Auth header for API requests |
| `jwtExpiration` | Unix timestamp (seconds) | Client-side expiry check |
| `userId` | Database ID | Identify logged-in user |
| `userEmail` | Email string | Display / identify user |

## Token Lifecycle

### 1. Token Creation
Tokens are created in three scenarios:
- **Passkey login**: `POST /api/passkey/authenticate/finish` → new JWT
- **Passkey re-auth (lock screen)**: Same endpoint → new JWT
- **Dev login** (non-production): `POST /api/dev/authenticate-as-user` → new JWT
- **Token refresh**: `POST /api/auth/refresh` → new JWT (replaces current)

### 2. Token Storage
```typescript
// JwtTokenUtils.storeJwtToken(token, userId, email)
// Decodes the JWT payload to extract `exp`, stores all four localStorage keys
```

### 3. Token Refresh (Proactive)
The `AppLockService` runs a check every 60 seconds:
- If user was **active within the last 5 minutes** AND token **expires within 30 minutes** → call `POST /api/auth/refresh`
- The 30-minute window (half the token lifetime) ensures any user active past the halfway point of a token's life gets a refresh
- The refresh endpoint validates the current JWT, then issues a brand new 1-hour token
- **Net effect**: Token never expires while the user is actively using the app

### 4. Token Expiry → App Lock
When the token expires (user stopped interacting and refresh stopped):
- `checkTokenExpiry()` runs every 60 seconds, calls `JwtTokenUtils.getValidJwtToken()`
- If it returns `null` and user was previously logged in (`userId` in localStorage) → **lock screen**
- Lock screen uses passkey re-auth (`/api/passkey/**` — `permitAll` endpoints, no JWT needed)
- Successful passkey auth issues a fresh JWT → app unlocks

## Inactivity & App Lock Flow

### Single-Clock Design
There is **no separate inactivity timer**. The JWT expiry IS the inactivity timeout:

```
User active → activity tracked (touch/click/keydown/scroll/HTTP requests)
           → token refreshed proactively when nearing expiry
           → token never expires

User inactive → no activity events
             → after 5 min of no interaction, token stops being refreshed
             → token expires naturally (30-60 min from last refresh)
             → lock screen appears
             → passkey re-auth → new JWT → unlock
```

### Effective Timeout
- **Minimum**: ~30 min of inactivity (if user stopped right after a refresh at the 30-min mark)
- **Maximum**: ~60 min of inactivity (if user stopped right after getting a fresh token)

### App Backgrounding
- No code runs while the app is in background — no refresh happens
- On resume:
  - If **App Lock setting is ON** → always lock (security preference)
  - If **App Lock setting is OFF** → lock only if JWT expired while backgrounded
- Passkey re-auth works regardless of token state (endpoints are `permitAll`)

### Activity Tracking
Activity is captured from two sources:
1. **DOM events** in `AppComponent`: `touchstart`, `touchmove`, `scroll`, `click`, `keydown` — throttled to 1 update per 60 seconds via RxJS `throttleTime`
2. **HTTP requests** via functional interceptor in `main.ts`: every API call updates `lastActiveTime`

Both call `AppLockService.updateLastActiveTime()`.

## Code Reference

### Frontend

#### JwtTokenUtils (`/frontend/src/app/utils/jwt-token.utils.ts`)
```typescript
export class JwtTokenUtils {
  static storeJwtToken(token: string, userId?: number, email?: string): void
  static isJwtExpired(): boolean                    // Pure check, no side effects
  static getValidJwtToken(): string | null          // Returns token or null if expired (non-destructive)
  static shouldRefreshToken(): boolean              // True if valid but ≤30 min until expiry
  static getMinutesUntilExpiration(): number | null // Minutes remaining
  static clearJwtData(): void                       // Remove all 4 localStorage keys
}
```

Key behaviors:
- `isJwtExpired()` — no buffer, no side effects. Returns `true` if `Date.now() >= exp * 1000`
- `getValidJwtToken()` — **non-destructive**: returns `null` if expired but does NOT clear data
- `shouldRefreshToken()` — returns `true` when token is valid AND ≤30 min until expiry

#### AuthService (`/frontend/src/app/services/auth.service.ts`)
```typescript
// Token refresh — called by AppLockService
refreshToken(): Observable<boolean>
  // POST /api/auth/refresh with current JWT in Authorization header
  // On success: stores new JWT via JwtTokenUtils.storeJwtToken()
  // On failure: returns false, does not clear session

// Session check on app startup
checkExistingSession(): void
  // Valid token → isLoggedIn = true, load progress from API
  // Expired/missing → clearJwtData(), load progress from localStorage
  // Production + passkey support → may prompt passkey re-auth
```

#### AppLockService (`/frontend/src/app/services/app-lock.service.ts`)
```typescript
// Runs every 60 seconds:
checkTokenRefresh()   // Refresh if active (last 5 min) AND token expiring (≤30 min)
checkTokenExpiry()    // Lock if token expired AND user was logged in

// On app resume from background:
checkLockOnResume()   // App Lock ON → always lock; OFF → lock if token expired

// Activity tracking:
updateLastActiveTime()  // Called by AppComponent (DOM events) and HTTP interceptor
```

### Backend

#### Token Refresh Endpoint (`AuthController.java`)
```
POST /api/auth/refresh
Authorization: Bearer <current-valid-jwt>

Response: { success: true, jwtToken: "<new-jwt>", id: 123, email: "user@example.com" }
```
- Requires a valid (non-expired) JWT — uses `SecurityContextHolder` to get current auth
- Issues a fresh 1-hour token for the same user

#### AuthTokenFilter (`/backend/.../security/jwt/AuthTokenFilter.java`)
- Intercepts every request, extracts JWT from `Authorization` header
- Validates signature and expiration using JJWT library
- Sets `SecurityContext` with authenticated user for downstream controllers
- All log statements are `logger.debug()` level (not info)

#### SecurityConfig — Endpoint Authorization
```
permitAll (no JWT needed):
  /api/auth/**          — login, register, refresh
  /api/passkey/**       — passkey start/finish (used by lock screen)
  /api/dev/**           — dev-only auth endpoints
  /api/user/should-prompt-reauth
  /api/plaid/create_link_token_anonymous
  /api/plaid/exchange_public_token_anonymous

authenticated (JWT required):
  /api/user/progress    — user progress data
  Everything else       — all other /api/** endpoints
```

## Security Notes

- **Token uniqueness**: Each token has a UUID `jti` claim — no two tokens are identical
- **Signing**: HS512 (HMAC-SHA512) with a secret key configured in `application.properties`
- **Passkey re-auth is JWT-independent**: Lock screen works even with an expired token because passkey endpoints are `permitAll` and issue a new JWT on success
- **CORS**: Explicit allowed headers (`Authorization`, `Content-Type`, `X-Device-ID`, `Accept`, `Origin`) — no wildcard
- **Dev endpoints**: `/api/dev/**` is `permitAll` — should be behind `@Profile("dev")` or removed in production