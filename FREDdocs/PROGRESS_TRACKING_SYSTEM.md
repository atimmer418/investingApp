# Progress Tracking System Documentation

## Overview
The app uses a **hybrid progress tracking system** that handles both pre-authentication (anonymous) and post-authentication (database) progress storage.

## The Problem We Solved 🚨

### **Original Issue:**
- JWT tokens are only generated **after** `authfinalize` step
- Early progress (get-started → survey-initial → fi-plan-results) had **no database storage**
- Users returning after browser restart **lost their early progress**

### **Solution: Hybrid System**
- **Pre-Auth Progress**: Stored in localStorage (no JWT token required)
- **Post-Auth Progress**: Stored in database (requires JWT token)
- **Migration Point**: authfinalize completion automatically syncs localStorage → database

## How It Works

### **Phase 1: Pre-Authentication (No JWT Token)**
```typescript
// User completes early steps
localStorage.setItem('getStartedCompleted', 'true');        // get-started
localStorage.setItem('initialSurveyCompleted', 'true');     // survey-initial  
localStorage.setItem('fiPlanResultsCompleted', 'true');     // fi-plan-results

// Progress is checked from localStorage
const progress = authService.getUnifiedProgress(); // Reads from localStorage
```

### **Phase 2: Authentication Transition (JWT Token Created)**
```typescript
// User completes authfinalize → gets JWT token
authService.handleSuccessfulAuthentication(jwtToken, userId, email);

// System automatically detects localStorage progress and syncs it
authService.syncLocalStorageProgressToDatabase().subscribe(() => {
  // Progress now lives in database
  // localStorage flags are cleared to prevent confusion
});
```

### **Phase 3: Post-Authentication (Has JWT Token)**
```typescript
// All progress is now stored in database
const progress = await authService.getUserProgress(); // Database call
const currentProgress = authService.getCurrentProgress(); // From memory

// Updates go to database
authService.updateProgress({ kycVerificationCompleted: true });
```

## Implementation Details

### **AuthService Methods**

#### `getUnifiedProgress(): UserProgress`
- **Purpose**: Single method to get progress regardless of auth state
- **Logic**: If authenticated → database, if not → localStorage
- **Usage**: Perfect for routing logic and component initialization

#### `syncLocalStorageProgressToDatabase(): Observable<any>`
- **Purpose**: Migrate localStorage progress to database
- **Triggered**: Automatically when `handleSuccessfulAuthentication()` detects localStorage progress
- **Result**: localStorage cleared, database becomes source of truth

#### `clearLocalStorageProgressFlags(): void`
- **Purpose**: Remove localStorage flags after successful database sync
- **Prevents**: Confusion between localStorage and database as source of truth

### **Component Usage Examples**

#### ✅ **Correct: Use Unified Progress**
```typescript
// In any component - works pre-auth AND post-auth
ngOnInit() {
  const progress = this.authService.getUnifiedProgress();
  this.canProceed = progress.surveyInitialCompleted;
}
```

#### ✅ **Correct: Update Progress (Pre-Auth)**
```typescript
// Before authfinalize - updates localStorage
completeStep() {
  localStorage.setItem('getStartedCompleted', 'true');
  // Will be synced to database when user authenticates
}
```

#### ✅ **Correct: Update Progress (Post-Auth)**
```typescript
// After authfinalize - updates database
completeStep() {
  this.authService.updateProgress({ kycVerificationCompleted: true }).subscribe();
}
```

#### ❌ **Avoid: Direct localStorage Checks (Post-Auth)**
```typescript
// Don't do this after user has JWT token
const completed = localStorage.getItem('surveyCompleted') === 'true';
// Use database instead: this.authService.getCurrentProgress()
```

## User Journey Examples

### **Scenario 1: Happy Path (No Interruption)**
1. User: get-started → survey-initial → fi-plan-results → authfinalize
2. Progress: localStorage → localStorage → localStorage → **SYNC TO DATABASE**
3. User: kyc-verification → linkplaid → investment-schedule → confirmation
4. Progress: database → database → database → database

### **Scenario 2: Early Return (Pre-Auth)**
1. User: get-started → survey-initial → **closes app**
2. Progress: localStorage (saved)
3. User returns 1 week later
4. System: Reads localStorage, continues from fi-plan-results ✅

### **Scenario 3: Late Return (Post-Auth)**
1. User: Complete through authfinalize → kyc-verification → **closes app**
2. Progress: Database (saved), localStorage cleared
3. User returns 1 week later, JWT expired
4. System: Prompts for passkey re-auth → Reads database, continues from linkplaid ✅

### **Scenario 4: Cross-Device (Post-Auth Only)**
1. User: Completes authfinalize on Phone
2. Progress: Synced to database, localStorage cleared
3. User: Opens app on Tablet
4. System: Passkey authentication → Database progress loads ✅
5. **Note**: Pre-auth localStorage progress is device-specific and won't transfer

## Technical Benefits

### **✅ Reliability**
- No progress loss during browser restarts
- Clean migration from anonymous to authenticated state
- Consistent behavior across authentication states

### **✅ Performance** 
- localStorage is instant (no API calls for early progress)
- Database caching via BehaviorSubject for authenticated progress
- Automatic sync only happens once per user

### **✅ Simplicity**
- Components use single `getUnifiedProgress()` method
- No need to check authentication state before getting progress
- Clear separation: localStorage before auth, database after auth

### **✅ Security**
- localStorage progress is cleared after database sync
- Database progress requires valid JWT token
- No sensitive data stored in localStorage

## Migration Strategy

### **For Existing Users**
- Users who already have JWT tokens: Continue using database progress
- Users with existing localStorage flags: Will be synced on next authentication
- No data loss during transition

### **For New Users**
- Seamless experience from get-started to investment-confirmation
- No awareness of localStorage → database transition
- Progress persists across browser restarts and device switches (post-auth)

## Debugging Guide

### **Check Progress Source**
```typescript
// In browser console
const isAuth = !JwtTokenUtils.isJwtExpired();
console.log('Authenticated:', isAuth);

if (isAuth) {
  console.log('Progress source: Database');
  console.log('Progress:', authService.getCurrentProgress());
} else {
  console.log('Progress source: localStorage');
  console.log('getStarted:', localStorage.getItem('getStartedCompleted'));
  console.log('survey:', localStorage.getItem('initialSurveyCompleted'));
  console.log('fiPlan:', localStorage.getItem('fiPlanResultsCompleted'));
}
```

### **Common Issues**

#### "Progress Lost After Authentication"
- **Cause**: localStorage flags not being synced to database
- **Check**: Look for sync logs in `handleSuccessfulAuthentication()`
- **Fix**: Ensure `syncLocalStorageProgressToDatabase()` is called

#### "Duplicate Progress Sources"
- **Cause**: localStorage flags not cleared after database sync
- **Check**: Look for localStorage flags when user has JWT token
- **Fix**: Ensure `clearLocalStorageProgressFlags()` completes successfully

#### "Progress Not Updating"
- **Cause**: Using localStorage updates after authentication
- **Check**: Ensure post-auth components use `updateProgress()` not localStorage
- **Fix**: Switch to database updates via AuthService

## Summary

This hybrid system provides the best of both worlds:
- **Fast, reliable localStorage** for anonymous early progress
- **Secure, cross-device database storage** for authenticated progress  
- **Seamless transition** between the two systems
- **No progress loss** regardless of when users return to the app

The key insight is that `authfinalize` is the perfect migration point - it's where users transition from anonymous to authenticated, so it's natural for their progress storage to transition too.