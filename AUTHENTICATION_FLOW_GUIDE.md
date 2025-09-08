# Complete Authentication Flow Explanation

## Overview: How JWT Authentication Works in Your App

### 1. **Authentication Methods**

Your app supports multiple ways to authenticate:

#### A) **Registration Flow (Passkey-based)**
```
Frontend → Backend
1. User enters email and creates passkey → POST /api/auth/register
2. Backend creates user account with passkey credentials
3. Backend returns success message (no JWT yet)
4. User must then login separately using their passkey
```

#### B) **Login Flow (Passkey-based)**
```
Frontend → Backend
1. User is prompted for passkey authentication → POST /api/auth/login
2. Backend validates passkey credentials using WebAuthn
3. Backend generates JWT token for authenticated user
4. Frontend stores JWT token
5. Frontend uses JWT for all subsequent requests
```

#### C) **Dev Authentication (Development/Testing)**
#### C) **Dev Authentication (Development/Testing)**
```typescript
// Frontend: AuthService.authenticateAsUser()
POST /api/dev/authenticate-as-user
Body: { "email": "lockedin@yahoo.com" }

// Backend: DevAuthController
1. Finds user by email in database
2. Generates JWT token for that user
3. Returns: { success: true, jwtToken: "eyJ...", id: 123, email: "lockedin@yahoo.com" }
```

#### D) **Regular Login (Legacy - if implemented)**
#### D) **Regular Login (Legacy - if implemented)**
```typescript
POST /api/auth/login
Body: { "email": "user@example.com", "password": "password123" }
```

Note: Your app primarily uses passkey authentication, not traditional passwords.

### 2. **JWT Token Flow Step-by-Step**

#### **Step 1: User Authentication**
```
Frontend                    Backend
   |                          |
   |-- POST /api/dev/auth ---->|
   |   { email: "lockedin@... }|
   |                          |
   |<-- { jwtToken: "eyJ..." }-|
   |                          |
```

#### **Step 2: Token Storage**
```typescript
// Frontend: JwtTokenUtils.storeJwtToken()
localStorage.setItem('jwtToken', 'eyJhbGciOiJIUzUxMiJ9...')
localStorage.setItem('jwtExpiration', '1694890847') // Unix timestamp
localStorage.setItem('userId', '123')
localStorage.setItem('userEmail', 'lockedin@yahoo.com')
```

#### **Step 3: Making Authenticated Requests**
```typescript
// Frontend: Every HTTP request includes JWT
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzUxMiJ9...',
  'Content-Type': 'application/json'
}
```

#### **Step 4: Backend Validation**
```java
// Backend: AuthTokenFilter intercepts every request
1. Extract JWT from Authorization header
2. Validate JWT signature and expiration
3. Extract user email from JWT payload
4. Load user from database
5. Set SecurityContext with user details
6. Continue to controller method
```

### 3. **The Problem You Had**

**Error:** "An Authentication object was not found in the SecurityContext"

**Root Cause:** AlpacaService was not sending JWT tokens with HTTP requests

**Before (Broken):**
```typescript
// AlpacaService making request WITHOUT authentication
this.http.post('/api/alpaca/create-account', accountData)
```

**After (Fixed):**
```typescript
// AlpacaService making request WITH authentication
this.http.post('/api/alpaca/create-account', accountData, { 
  headers: this.getAuthHeaders() // Includes JWT token
})
```

### 4. **Complete Authentication Architecture (Passkey-Based)**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend      │    │    Database     │
│                 │    │                  │    │                 │
│  ┌──────────┐   │    │  ┌─────────────┐ │    │  ┌─────────────┐│
│  │AuthService│  │    │  │PasskeyCtrl  │ │    │  │    Users    ││
│  │(Passkey)  │  │    │  │AuthCtrl     │ │    │  │  Passkey    ││
│  └──────────┘   │    │  │DevAuthCtrl  │ │    │  │Credentials  ││
│        │        │    │  └─────────────┘ │    │  └─────────────┘│
│  ┌──────────┐   │    │  ┌─────────────┐ │    │         ▲       │
│  │WebAuthn  │   │    │  │  JwtUtils   │ │    │         │       │
│  │Browser   │   │    │  │  Security   │ │    │  ┌─────────────┐│
│  │APIs      │   │    │  │  Filter     │ │    │  │ JWT Secret  ││
│  └──────────┘   │    │  └─────────────┘ │    │  └─────────────┘│
│        │        │    │         │        │    │                 │
│  ┌──────────┐   │    │  ┌─────────────┐ │    │                 │
│  │AlpacaServ│   │    │  │AlpacaCtrl   │ │    │                 │
│  └──────────┘   │    │  └─────────────┘ │    │                 │
│        │        │    │         │        │    │                 │
└────────┼────────┘    └─────────┼────────┘    └─────────────────┘
         │                       │                      
         └───────────────────────┘                      
         HTTP + JWT Authorization Header
```

**Passkey Registration Flow:**
1. User enters email on frontend
2. Browser generates WebAuthn credentials (biometric/device-based)
3. Frontend sends registration request with passkey data
4. Backend stores user + passkey credentials in database
5. User must then login with their passkey

**Passkey Login Flow:**
1. User initiates login (email or saved passkey)
2. Browser prompts for biometric/device authentication
3. Frontend sends authentication request with passkey assertion
4. Backend validates passkey against stored credentials
5. Backend generates JWT token for successful authentication
6. Frontend stores JWT and uses for subsequent requests

### 5. **Security Flow Details**

#### **JWT Token Structure:**
```
Header.Payload.Signature

Header: { "alg": "HS512", "typ": "JWT" }
Payload: { 
  "sub": "lockedin@yahoo.com",
  "iat": 1694890547,    // Issued at
  "exp": 1694890847     // Expires at
}
Signature: HMACSHA512(header.payload, SECRET_KEY)
```

#### **Backend Security Filter Chain:**
```java
1. AuthTokenFilter.doFilterInternal()
   ├── Extract JWT from Authorization header
   ├── Validate JWT signature with secret key
   ├── Check JWT expiration
   ├── Extract username from JWT payload
   ├── Load UserDetails from database
   └── Set SecurityContextHolder.getContext()

2. Controller Method Execution
   ├── @PreAuthorize checks (if any)
   ├── Access Authentication object
   └── Execute business logic
```

### 6. **Frontend Services Authentication**

#### **Services that need JWT tokens:**
- ✅ **AuthService**: Has getAuthHeaders() method
- ✅ **AlpacaService**: Now has getAuthHeaders() method (FIXED)
- ❓ **PlaidService**: Check if it needs authentication
- ❓ **Other services**: Any service calling protected endpoints

#### **How to add authentication to any service:**
```typescript
// 1. Import JWT utilities
import { JwtTokenUtils } from '../utils/jwt-token.utils';

// 2. Add authentication headers method
private getAuthHeaders(): HttpHeaders {
  let headers = new HttpHeaders().set('Content-Type', 'application/json');
  const token = JwtTokenUtils.getValidJwtToken();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

// 3. Use headers in HTTP requests
this.http.post(url, data, { headers: this.getAuthHeaders() })
```

### 7. **Common Authentication Issues & Solutions**

#### **Issue: "Authentication object not found"**
- **Cause**: HTTP request missing JWT token
- **Solution**: Add authentication headers to the service

#### **Issue: "JWT expired"**
- **Cause**: Token expired (default: 24 hours)
- **Solution**: Re-authenticate or implement token refresh

#### **Issue: "Invalid JWT signature"**
- **Cause**: Token corrupted or wrong secret key
- **Solution**: Clear localStorage and re-authenticate

#### **Issue: "User not found"**
- **Cause**: JWT valid but user deleted from database
- **Solution**: Clear session and redirect to login

### 8. **Testing Authentication**

#### **Check if user is authenticated:**
```typescript
// Frontend
const isAuth = this.authService.isAuthenticated();
const userEmail = this.authService.getCurrentUserEmail();

// Or check localStorage directly
const token = JwtTokenUtils.getValidJwtToken();
console.log('JWT Token:', token ? 'Present' : 'Missing');
```

#### **Debug authentication in browser:**
```javascript
// Open browser console and run:
console.log('JWT Token:', localStorage.getItem('jwtToken'));
console.log('User Email:', localStorage.getItem('userEmail'));
console.log('Token Expired:', JwtTokenUtils.isJwtExpired());
```

#### **Backend logs to watch:**
```
INFO  AuthTokenFilter: AuthTokenFilter START: Request Hash: 123456
INFO  AuthTokenFilter: JWT processed successfully for user: lockedin@yahoo.com
INFO  AlpacaController: Creating Alpaca account for email: lockedin@yahoo.com
```

### 9. **Your Specific Flow**

**What happens when you click the investment confirmation button:**

1. **Frontend**: InvestmentConfirmationComponent.authorizeRecurringInvestment()
2. **Frontend**: Calls this.alpacaService.createAccount() 
3. **Frontend**: AlpacaService adds JWT token to request headers (NOW FIXED)
4. **Backend**: AuthTokenFilter validates JWT token
5. **Backend**: Sets user in SecurityContext
6. **Backend**: AlpacaController.createAccount() executes with authenticated user
7. **Backend**: Returns account creation result

**Before the fix**: Step 3 was missing JWT token → Step 4 failed → Error
**After the fix**: Step 3 includes JWT token → Flow works correctly

### 10. **Authentication Modes in Your App**

#### **Production Mode: Passkey Authentication**
- ✅ **Secure**: Uses WebAuthn standard with biometrics/device authentication
- ✅ **Passwordless**: No passwords to remember or compromise
- ✅ **User-friendly**: Touch ID, Face ID, or device PIN
- ❌ **Setup required**: Users must register passkey on each device

#### **Development Mode: Email-based Authentication**
- ✅ **Quick testing**: Instant login with any user email
- ✅ **No setup**: Just provide email address
- ✅ **Multi-user testing**: Switch between users easily
- ❌ **Not secure**: Only for development/testing

**Current Setup:** You're using dev mode (`lockedin@yahoo.com`) for testing, which is perfect for development!

### 11. **Next Steps**

1. **Test the fix**: Try clicking the investment confirmation button again
2. **Check other services**: Make sure all services that call protected endpoints have authentication
3. **Monitor logs**: Watch backend logs to see successful JWT validation
4. **Add error handling**: Handle JWT expiration gracefully in frontend

The authentication should now work correctly! 🎉
