# JWT Token System Documentation

## Overview
The JWT (JSON Web Token) system manages user authentication and session persistence in the investing app. Tokens have a 24-hour expiration and are stored in the browser's localStorage.

## Token Structure

### JWT Claims (Payload)
Each JWT token contains the following claims:

```json
{
  "sub": "user@example.com",        // Subject: User's email
  "jti": "a1b2c3d4-e5f6-7890-1234", // JWT ID: Unique token identifier
  "iat": 1638360000,                // Issued At: When token was created
  "exp": 1638446400,                // Expiration: When token expires
  "iss": "investingapp"             // Issuer: Application identifier
}
```

### Uniqueness Guarantee
- **Each token is unique** due to the `jti` (JWT ID) claim containing a UUID
- **Even if generated for the same user simultaneously**, tokens will have different JTI values
- **Enables individual token tracking** for security and session management

## Token Flow

### 1. Token Generation & Storage
- **When**: User successfully authenticates via passkey
- **Storage Location**: Browser localStorage
- **Data Stored**:
  - `jwtToken`: The actual JWT token string
  - `jwtExpiration`: Unix timestamp of expiration (24 hours from creation)
  - `userId`: User's database ID
  - `userEmail`: User's email address

### 2. Token Validation
- **Auto-Check**: Every request validates token expiration
- **Buffer Time**: 5-minute buffer before actual expiration
- **Auto-Cleanup**: Expired tokens are automatically removed from localStorage

### 3. Session Restoration
On app startup, the system:
1. Checks for valid (non-expired) JWT token
2. If valid: Fetches user progress from backend and restores session
3. If invalid/expired: User needs to re-authenticate

## Code Implementation

### Frontend (TypeScript)
```typescript
// JWT Token Utilities - /frontend/src/app/utils/jwt-token.utils.ts
export class JwtTokenUtils {
  
  // Store JWT with user info
  static storeJwtToken(token: string, userId?: number, email?: string): void
  
  // Check if token is expired (with 5-min buffer) - USE THIS FOR AUTHENTICATION CHECKS
  static isJwtExpired(): boolean
  
  // Get valid token or null if expired - USE THIS FOR API REQUESTS
  static getValidJwtToken(): string | null
  
  // Clear all JWT data
  static clearJwtData(): void
  
  // Get minutes until expiration
  static getMinutesUntilExpiration(): number | null
}
```

### **Best Practices for JWT Utility Usage:**

#### ✅ **Use `isJwtExpired()` for:**
- Authentication state checks
- Deciding if user needs to re-authenticate
- Component initialization logic
- Progress flow decisions

```typescript
// ✅ CORRECT - Check authentication state
isAuthenticated(): boolean {
  return !JwtTokenUtils.isJwtExpired();
}

// ✅ CORRECT - Component authentication check
ngOnInit() {
  this.isUserAuthenticated = !JwtTokenUtils.isJwtExpired();
}

// ✅ CORRECT - Re-authentication logic
shouldPromptForPasskeyReauth(): boolean {
  return JwtTokenUtils.isJwtExpired();
}
```

#### ✅ **Use `getValidJwtToken()` for:**
- API request headers
- When you need the actual token value
- Backend authentication calls

```typescript
// ✅ CORRECT - API request headers
private getAuthHeaders(): HttpHeaders {
  const token = JwtTokenUtils.getValidJwtToken();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

// ✅ CORRECT - API call with token
makeAuthenticatedRequest() {
  const token = JwtTokenUtils.getValidJwtToken();
  if (token) {
    // Make API call
  } else {
    // Redirect to login
  }
}
```

#### ❌ **Avoid These Patterns:**
```typescript
// ❌ WRONG - Don't check localStorage directly
const token = localStorage.getItem('jwtToken');
const isAuth = !!token; // Doesn't check expiration!

// ❌ WRONG - Don't duplicate expiration logic
const expiration = localStorage.getItem('jwtExpiration');
const isExpired = Date.now() > parseInt(expiration) * 1000;

// ❌ WRONG - Don't use getValidJwtToken() for boolean checks
const isAuth = !!JwtTokenUtils.getValidJwtToken(); // Less clear intent
```

### Authentication Service
```typescript
// /frontend/src/app/services/auth.service.ts
export class AuthService {
  
  // Check existing session on app startup
  private checkExistingSession(): void
  
  // Handle successful authentication
  handleSuccessfulAuthentication(jwtToken: string, userId: number, email: string): void
  
  // Check if should prompt for passkey re-auth (IP-based + passkey support)
  shouldPromptForPasskeyReauth(): Promise<boolean>
  
  // Prompt user for usernameless passkey authentication
  promptForPasskeyReauth(): Promise<boolean>
  
  // Check if device supports WebAuthn passkeys
  supportsPasskeys(): boolean
}
```

## App State Persistence

### Scenario 1: User Switches Apps (Token Still Valid)
- **Behavior**: User returns to the same page they left
- **Example**: User leaves app on "portfolio customize" page, returns to same page
- **Condition**: JWT token hasn't expired and app wasn't terminated

### Scenario 2: User Returns After Token Expiration
- **Behavior**: User is redirected based on their progress in the onboarding flow
- **Flow**: get-started → surveyinitial → fi-plan-results → authfinalize → kyc-verification → linkplaid → investment-schedule → investmentconfirmation → home
- **Condition**: JWT token expired (after 24 hours)

### Scenario 3: App Backgrounding
- **Behavior**: User typically stays on current page when returning
- **Condition**: App backgrounded but not terminated by OS

## Token Expiration Handling

### Automatic Detection
```typescript
// System automatically detects expired tokens
const token = JwtTokenUtils.getValidJwtToken();
if (!token) {
  // Token expired - check for re-authentication options
  if (await this.shouldPromptForPasskeyReauth()) {
    // User's IP is in database AND device supports passkeys - can prompt for usernameless auth
    await this.promptForPasskeyReauth();
  } else {
    // New IP or no passkey support - redirect to get-started
    this.router.navigate(['/get-started']);
  }
}
```

### Re-authentication Flow
1. **Detection**: System detects expired token
2. **Passkey Check**: Uses WebAuthn discoverable credentials (usernameless authentication)
3. **Smart Prompt**: Only prompts for re-auth if user's IP address is in database (indicating previous registration)
4. **Benefit**: User doesn't need to provide any information - passkeys identify the user automatically
5. **Implementation**: Fully integrated with WebAuthnService usernameless authentication methods

## Usernameless Passkey Authentication

### How It Works
- **No Email Required**: WebAuthn discoverable credentials allow authentication without username/email
- **Device Recognition**: Passkeys are stored on the user's device and automatically identify the user
- **Smart Re-auth**: System only prompts for passkey if user's IP address exists in database
- **Seamless Flow**: User just needs to authenticate with their passkey (fingerprint, face, etc.)

### Implementation Details
```typescript
// Backend - WebAuthnService usernameless authentication
startAuthenticationFlow(): AssertionRequest
finishAuthenticationFlow(assertionResponse: AuthenticatorAssertionResponse): AuthenticationResult

// Frontend - AuthService integration
async shouldPromptForPasskeyReauth(): Promise<boolean> {
  if (!this.supportsPasskeys()) return false;
  
  try {
    const response = await this.http.get<{shouldPrompt: boolean}>('/api/user/should-prompt-reauth').toPromise();
    return response?.shouldPrompt || false;
  } catch {
    return false;
  }
}
```

### Smart IP-Based Prompting
- **Purpose**: Only show passkey prompt to users who have previously registered
- **Logic**: Check if current IP address exists in database from previous authfinalize step
- **Fallback**: If IP not found or passkeys not supported, redirect to normal flow
- **Security**: Prevents prompting random users for passkey authentication

## Security Features

### Token Uniqueness
- **JWT ID (JTI)**: Each token has a unique UUID identifier
- **Prevents token confusion**: No two tokens are identical, even for the same user
- **Enables token revocation**: Individual tokens can be blacklisted by JTI

### IP Address Tracking
- **When**: User completes `authfinalize` step
- **Storage**: Recorded in user database
- **Purpose**: Security tracking and fraud prevention
- **Implementation**: Handles proxies and load balancers

### Token Buffer
- **5-minute buffer**: Tokens considered expired 5 minutes before actual expiration
- **Purpose**: Prevents edge cases where token expires during active use
- **Behavior**: Automatic refresh/re-authentication prompt

### Enhanced Security Benefits
1. **Session Tracking**: Each login creates a unique token that can be individually monitored
2. **Token Revocation**: Specific tokens can be invalidated without affecting other user sessions
3. **Audit Trail**: JWT ID provides clear tracking of which token was used for each action
4. **Replay Attack Prevention**: Unique tokens prevent reuse even within expiration window
5. **Multi-Device Support**: Users can have multiple active sessions with unique tokens

## Development Notes

### Testing
- **Mock Tokens**: Test users get mock JWT tokens for development
- **Identifier**: Test tokens contain `mock_signature_for_testing`
- **Behavior**: Different handling for test vs. production tokens

### Error Handling
- **Server Validation**: Backend validates all JWT tokens
- **Graceful Degradation**: Invalid tokens result in clean logout and re-auth prompt
- **Logging**: Comprehensive logging for debugging authentication issues

## Future Enhancements

### Potential Improvements
1. **Refresh Tokens**: Implement refresh tokens for seamless session extension
2. **Biometric Quick Auth**: Use device biometrics for quick re-authentication
3. **Session Analytics**: Track session patterns for security insights
4. **Multi-Device Management**: Handle multiple active sessions across devices