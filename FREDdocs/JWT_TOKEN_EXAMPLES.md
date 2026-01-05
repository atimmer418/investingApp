# JWT Token Frontend Examples

## Scenario 1: Initial Authentication (First Login)

### Frontend Request:
```typescript
// User completes passkey registration/authentication
const response = await this.passkeyService.finishRegistration(registrationData);
```

### Backend Process:
```java
// WebAuthnService.finishRegistrationFlow() or finishAuthenticationFlow()
Authentication authentication = new UsernamePasswordAuthenticationToken(...);
String jwt = jwtUtils.generateJwtToken(authentication);

// JWT generation creates:
String jwtId = UUID.randomUUID().toString(); // e.g., "a1b2c3d4-e5f6-7890-abcd-1234567890ef"
Date issuedAt = new Date(); // e.g., 2025-09-30T10:00:00Z
Date expiration = new Date(issuedAt.getTime() + 86400000); // 24 hours later
```

### What Frontend Receives:
```json
{
  "success": true,
  "message": "Authentication successful",
  "jwtToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwianRpIjoiYTFiMmMzZDQtZTVmNi03ODkwLWFiY2QtMTIzNDU2Nzg5MGVmIiwiaWF0IjoxNzI3Njg0NDAwLCJleHAiOjE3Mjc3NzA4MDAsImlzcyI6ImludmVzdGluZ2FwcCJ9.signature_here",
  "userId": 123,
  "email": "user@example.com"
}
```

### JWT Token Decoded (Header + Payload):
```json
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "user@example.com",                    // Subject: User's email
  "jti": "a1b2c3d4-e5f6-7890-abcd-1234567890ef", // JWT ID: UNIQUE identifier
  "iat": 1727684400,                            // Issued At: Sept 30, 2025 10:00 AM
  "exp": 1727770800,                            // Expires: Oct 1, 2025 10:00 AM (24hrs later)
  "iss": "investingapp"                         // Issuer: Application name
}
```

---

## Scenario 2: Re-authentication After Token Expiry

### Frontend Detects Expiry:
```typescript
// 24+ hours later, user opens app
const token = JwtTokenUtils.getValidJwtToken(); // Returns null (expired)
const isExpired = JwtTokenUtils.isJwtExpired(); // Returns true

// AuthService automatically triggers passkey re-auth
const reauthSuccess = await this.authService.promptForPasskeyReauth();
```

### Backend Process (Same User, New Token):
```java
// WebAuthnService.finishAuthenticationFlow() 
// SAME user authenticates again, but generates COMPLETELY NEW token
String jwtId = UUID.randomUUID().toString(); // e.g., "f9e8d7c6-b5a4-3210-9876-fedcba098765"
Date issuedAt = new Date(); // e.g., 2025-10-02T14:30:00Z  
Date expiration = new Date(issuedAt.getTime() + 86400000); // 24 hours from NEW time
```

### What Frontend Receives (New Token):
```json
{
  "success": true,
  "message": "Re-authentication successful", 
  "jwtToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwianRpIjoiZjllOGQ3YzYtYjVhNC0zMjEwLTk4NzYtZmVkY2JhMDk4NzY1IiwiaWF0IjoxNzI3ODc2NjAwLCJleHAiOjE3Mjc5NjMwMDAsImlzcyI6ImludmVzdGluZ2FwcCJ9.different_signature_here",
  "userId": 123,
  "email": "user@example.com"
}
```

### New JWT Token Decoded:
```json
// Header (same)
{
  "alg": "HS256", 
  "typ": "JWT"
}

// Payload (DIFFERENT from first token)
{
  "sub": "user@example.com",                    // Subject: SAME user email
  "jti": "f9e8d7c6-b5a4-3210-9876-fedcba098765", // JWT ID: COMPLETELY NEW UUID
  "iat": 1727876600,                            // Issued At: Oct 2, 2025 2:30 PM  
  "exp": 1727963000,                            // Expires: Oct 3, 2025 2:30 PM
  "iss": "investingapp"                         // Issuer: Same
}
```

---

## Key Differences Between Tokens

### Token 1 (Initial Auth):
```
JWT ID: a1b2c3d4-e5f6-7890-abcd-1234567890ef
Issued: Sept 30, 2025 10:00 AM  
Expires: Oct 1, 2025 10:00 AM
Signature: Based on first token's content
```

### Token 2 (Re-auth):
```
JWT ID: f9e8d7c6-b5a4-3210-9876-fedcba098765  ← DIFFERENT
Issued: Oct 2, 2025 2:30 PM                   ← DIFFERENT  
Expires: Oct 3, 2025 2:30 PM                  ← DIFFERENT
Signature: Based on second token's content    ← DIFFERENT
```

## What Makes Each Token Unique

### 1. **JWT ID (jti)**
- **Always different** - UUID generates cryptographically random IDs
- **Never repeated** - Even for same user, same millisecond

### 2. **Timestamps** 
- **iat (issued at)** - Exact moment token was created
- **exp (expires)** - 24 hours from issue time
- **Different each time** - Unless generated at exact same millisecond (which UUID prevents collision)

### 3. **Signature**
- **Based on content** - Header + Payload + Secret Key
- **Changes with content** - Different jti/timestamps = different signature
- **Tamper-proof** - Any change invalidates signature

## Frontend Token Storage

### First Login:
```typescript
localStorage.setItem('jwtToken', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwianRpIjoiYTFiMmMzZDQtZTVmNi03ODkwLWFiY2QtMTIzNDU2Nzg5MGVmIiwiaWF0IjoxNzI3Njg0NDAwLCJleHAiOjE3Mjc3NzA4MDAsImlzcyI6ImludmVzdGluZ2FwcCJ9.signature_here');
localStorage.setItem('jwtExpiration', '1727770800'); // Oct 1, 2025 10:00 AM
```

### After Re-auth:
```typescript
// OLD token automatically cleared by JwtTokenUtils.clearJwtData()
localStorage.setItem('jwtToken', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwianRpIjoiZjllOGQ3YzYtYjVhNC0zMjEwLTk4NzYtZmVkY2JhMDk4NzY1IiwiaWF0IjoxNzI3ODc2NjAwLCJleHAiOjE3Mjc5NjMwMDAsImlzcyI6ImludmVzdGluZ2FwcCJ9.different_signature_here');
localStorage.setItem('jwtExpiration', '1727963000'); // Oct 3, 2025 2:30 PM
```

## Summary

✅ **Every token is completely unique** due to:
- Random UUID for JWT ID
- Different timestamps
- Unique signatures

✅ **Same user gets fresh tokens** each time they authenticate

✅ **No token reuse** - impossible to generate identical tokens

✅ **Enhanced security** - each session has distinct tracking identifier