# JWT Token System Documentation

## Overview
The JWT (JSON Web Token) system manages user authentication and session persistence in the investing app. Tokens have a 24-hour expiration and are stored in the browser's localStorage.

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
  
  // Check if should prompt for passkey re-auth
  shouldPromptForPasskeyReauth(): boolean
  
  // Get stored email for re-authentication
  getStoredEmailForReauth(): string | null
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
  if (this.shouldPromptForPasskeyReauth()) {
    // User had previous session - can prompt for passkey
    const email = this.getStoredEmailForReauth();
    // Trigger passkey authentication for this email
  } else {
    // No previous session - redirect to get-started
  }
}
```

### Re-authentication Flow
1. **Detection**: System detects expired token but finds stored user email
2. **Option**: Can prompt user for passkey re-authentication using stored email
3. **Benefit**: User doesn't need to re-enter email, just authenticate with passkey
4. **Implementation**: Framework exists, needs integration with PasskeyService

## Security Features

### IP Address Tracking
- **When**: User completes `authfinalize` step
- **Storage**: Recorded in user database
- **Purpose**: Security tracking and fraud prevention
- **Implementation**: Handles proxies and load balancers

### Token Buffer
- **5-minute buffer**: Tokens considered expired 5 minutes before actual expiration
- **Purpose**: Prevents edge cases where token expires during active use
- **Behavior**: Automatic refresh/re-authentication prompt

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