# Smart Passkey Re-Authentication Implementation

## ✅ **Solution: IP-Based Smart Re-Authentication**

Instead of tracking every IP address, I've implemented a **smart approach** that only prompts for passkey re-authentication when it makes sense.

## 🧠 **The Logic**

### **Who Gets Prompted for Passkey Re-Auth:**
- Users on devices/IPs where **someone has previously completed `auth-finalize`**
- Only existing users who have **reached the security-sensitive part** of onboarding

### **Who Goes Straight to Normal Flow:**
- **New users** (no one from this IP has completed auth-finalize)
- **Early-stage users** (haven't reached auth-finalize yet)
- **Devices without passkey support**

## 🔧 **Implementation Details**

### **Backend Changes**

#### 1. New Endpoint: `/user/should-prompt-reauth`
```java
@GetMapping("/should-prompt-reauth")
public ResponseEntity<?> shouldPromptForReauth(HttpServletRequest request) {
    String currentIp = getClientIpAddress(request);
    
    // Find users from this IP who completed auth-finalize
    List<User> usersFromThisIp = userRepository.findByRegistrationIpAddressAndAuthFinalizeCompleted(currentIp, true);
    
    boolean shouldPrompt = !usersFromThisIp.isEmpty();
    
    return ResponseEntity.ok(Map.of(
        "shouldPromptReauth", shouldPrompt,
        "message", shouldPrompt ? "Device has previous users" : "New device"
    ));
}
```

#### 2. Enhanced UserRepository Query
```java
@Query("SELECT u FROM User u JOIN u.userProgress up WHERE u.registrationIpAddress = :ipAddress AND up.authFinalizeCompleted = :completed")
List<User> findByRegistrationIpAddressAndAuthFinalizeCompleted(@Param("ipAddress") String ipAddress, @Param("completed") boolean completed);
```

### **Frontend Changes**

#### 1. Enhanced AuthService
```typescript
// Check with backend if should prompt for re-auth
shouldPromptForReauth(): Observable<{shouldPromptReauth: boolean, message: string}> {
  return this.http.get(`/user/should-prompt-reauth`);
}

// Complete passkey re-authentication flow
async promptForPasskeyReauth(): Promise<boolean> {
  // 1. Start authentication (no email needed)
  const startResponse = await this.http.post('/passkey/authenticate/start', {});
  
  // 2. Show browser passkey prompt
  const credential = await navigator.credentials.get({
    publicKey: JSON.parse(startResponse.requestOptions)
  });
  
  // 3. Finish authentication and get fresh JWT
  const authResponse = await this.http.post('/passkey/authenticate/finish', {
    credential, sessionId: startResponse.sessionId
  });
  
  if (authResponse.success) {
    this.handleSuccessfulAuthentication(authResponse.jwtToken, authResponse.userId, authResponse.email);
    return true;
  }
  return false;
}
```

#### 2. Automatic Smart Re-Auth
```typescript
private checkExistingSession(): void {
  const token = JwtTokenUtils.getValidJwtToken();
  
  if (!token && this.supportsPasskeys()) {
    // Check if this device should be prompted for passkey re-auth
    this.shouldPromptForReauth().subscribe(async (response) => {
      if (response.shouldPromptReauth) {
        await this.promptForPasskeyReauth();
      }
      // If re-auth fails/cancelled, user goes to normal flow
    });
  }
}
```

## 🎯 **User Experience Flows**

### **Scenario 1: New User on Fresh Device**
1. Opens app → No JWT token
2. Backend checks IP → No previous users completed auth-finalize
3. **No passkey prompt** → Goes directly to `/get-started`
4. **Smooth onboarding experience**

### **Scenario 2: Returning User (JWT Expired)**
1. Opens app → JWT token expired
2. Backend checks IP → Previous user completed auth-finalize  
3. **Passkey prompt appears** → User authenticates with biometric/PIN
4. **Instant access** → Continues from exact progress point

### **Scenario 3: New User on Shared Device**
1. Opens app → No JWT token
2. Backend checks IP → Someone else previously completed auth-finalize
3. **Passkey prompt appears** → New user cancels/fails authentication
4. **Falls back to normal flow** → Goes to `/get-started`

### **Scenario 4: Early-Stage User Returns**
1. User who only reached `survey-initial` returns
2. JWT expired → Backend checks IP → No completed auth-finalize yet
3. **No passkey prompt** → Goes to their progress point (`/surveyinitial`)

## 🔒 **Security Benefits**

1. **Only established users** get passkey prompts
2. **No friction for new users** - they get smooth onboarding
3. **IP-based intelligence** - recognizes returning devices
4. **Graceful degradation** - falls back to normal auth if passkey fails

## 🚀 **Technical Benefits**

1. **No massive IP tracking** - only stores IPs for users who reach auth-finalize
2. **Smart prompting** - context-aware re-authentication
3. **WebAuthn best practices** - usernameless discoverable credentials
4. **Progress preservation** - users continue exactly where they left off

## 📱 **Example User Journey**

```
Day 1: Sarah uses her laptop
├─ Creates account → Gets to auth-finalize → IP recorded
├─ Continues → Completes onboarding → IP has "completed user"

Day 2: Sarah opens app on same laptop  
├─ JWT expired → Backend: "This IP has completed user"
├─ Passkey prompt → Sarah authenticates → Instant access

Day 3: Mike uses Sarah's laptop
├─ No JWT → Backend: "This IP has completed user" 
├─ Passkey prompt → Mike cancels → Normal signup flow

Day 4: Mike uses his phone
├─ No JWT → Backend: "This IP has no completed users"
├─ No passkey prompt → Direct to get-started → Smooth onboarding
```

This approach provides **maximum security for returning users** while maintaining **zero friction for new users**! 🎉