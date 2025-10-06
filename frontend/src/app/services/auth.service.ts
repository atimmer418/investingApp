import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';
import { DeviceIdService } from './device-id.service';

const BACKEND_API_URL = environment.backendApiUrl;

export interface UserProgress {
  getStartedCompleted: boolean;
  surveyInitialCompleted: boolean;
  fiPlanResultsCompleted: boolean;
  authFinalizeCompleted: boolean;
  kycVerificationCompleted: boolean;
  linkPlaidCompleted: boolean;
  investmentScheduleCompleted: boolean;
  investmentConfirmationCompleted: boolean;
  monthlyInvestment?: number; // User's monthly investment capacity
  retirementIncome?: number; // User's desired retirement income
}

export interface PasskeyAuthRequest {
  email: string;
  // No password needed - passkey handles authentication
}

export interface AuthResponse {
  success: boolean;
  message: string;
  jwtToken: string;
  id: number;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  
  private userProgressSubject = new BehaviorSubject<UserProgress | null>(null);
  public userProgress$ = this.userProgressSubject.asObservable();

  private reAuthInProgress = false;

  constructor(private http: HttpClient, private deviceIdService: DeviceIdService) {
    // Check if user is already logged in on app start
    this.checkExistingSession();
  }

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    const token = JwtTokenUtils.getValidJwtToken(); // Use utility to get valid token
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Add device ID to all requests for better device tracking
    const deviceId = this.deviceIdService.getDeviceId();
    headers = headers.set('X-Device-ID', deviceId);
    
    if (BACKEND_API_URL.includes("ngrok")) {
      headers = headers.set('ngrok-skip-browser-warning', 'true');
    }
    return headers;
  }

  private checkExistingSession(): void {
    const token = JwtTokenUtils.getValidJwtToken(); // This checks expiration automatically
    if (token && !JwtTokenUtils.isJwtExpired()) {
      // Check if this is a test user (mock JWT)
      const isTestUser = token.includes('mock_signature_for_testing');
      
      if (isTestUser) {
        console.log('[AuthService] Test user detected, using simulated session');
        this.isLoggedInSubject.next(true);
        // For test users, create mock progress (the app will read from localStorage)
        const mockProgress = {
          getStartedCompleted: true,
          surveyInitialCompleted: true,
          fiPlanResultsCompleted: true,
          authFinalizeCompleted: true,
          kycVerificationCompleted: true,
          linkPlaidCompleted: true,
          investmentScheduleCompleted: false,
          investmentConfirmationCompleted: false
        };
        this.userProgressSubject.next(mockProgress);
        return;
      }
      
      // Real user - validate with server and get user progress
      this.getUserProgress().subscribe({
        next: (progress) => {
          this.isLoggedInSubject.next(true);
          this.userProgressSubject.next(progress);
          console.log('[AuthService] Existing session restored with progress:', progress);
        },
        error: (err) => {
          console.error('[AuthService] Invalid token or server error, clearing session:', err);
          this.logout();
        }
      });
    } else {
      console.log('[AuthService] JWT token expired or missing, checking if should prompt for passkey re-auth');
      
      // For non-authenticated users, load their localStorage progress into the subject
      // This ensures getUnifiedProgress() and components have consistent access to progress
      const localStorageProgress = this.buildProgressFromLocalStorage();
      this.userProgressSubject.next(localStorageProgress);
      console.log('[AuthService] Loaded localStorage progress for non-authenticated user:', localStorageProgress);
      
      // Check if this device should be prompted for passkey re-authentication
      if (this.supportsPasskeys()) {
        this.shouldPromptForReauth().subscribe({
          next: async (response) => {
            if (response.shouldPromptReauth) {
              console.log('[AuthService] Device has previous users, prompting for passkey re-auth');
              const reauthSuccess = await this.promptForPasskeyReauth();
              
              if (!reauthSuccess) {
                console.log('[AuthService] Passkey re-auth failed or cancelled, user needs to authenticate normally');
                // User will be directed by app.component.ts routing logic
              }
            } else {
              console.log('[AuthService] New device or no completed registrations, no passkey prompt needed');
              // User will be directed by app.component.ts routing logic
            }
          },
          error: (err) => {
            console.error('[AuthService] Error checking reauth prompt status, skipping passkey prompt:', err);
            // Continue with normal flow
          }
        });
      } else {
        console.log('[AuthService] Device does not support passkeys');
        // User will be directed by app.component.ts routing logic
      }
    }
  }

  // This method should be called after successful passkey registration/authentication
  // Your existing PasskeyService already handles the JWT storage, so this just updates the auth state
  handleSuccessfulAuthentication(jwtToken: string, userId: number, email: string): void {
    JwtTokenUtils.storeJwtToken(jwtToken, userId, email);
    this.isLoggedInSubject.next(true);
    
    // Check if this is a first-time authentication (user just completed authfinalize)
    // If so, sync their localStorage progress to the database
    const hasLocalProgress = localStorage.getItem('getStartedCompleted') === 'true' || 
                            localStorage.getItem('surveyInitialCompleted') === 'true' ||
                            localStorage.getItem('fiPlanResultsCompleted') === 'true';

    console.log('[AuthService] Checking for localStorage progress to sync:', {
      getStartedCompleted: localStorage.getItem('getStartedCompleted'),
      surveyInitialCompleted: localStorage.getItem('surveyInitialCompleted'),
      fiPlanResultsCompleted: localStorage.getItem('fiPlanResultsCompleted'),
      hasLocalProgress: hasLocalProgress
    });

    if (hasLocalProgress) {
      console.log('[AuthService] First-time authentication detected, syncing localStorage progress to database');
      this.syncLocalStorageProgressToDatabase().subscribe({
        next: () => {
          console.log('[AuthService] Sync completed successfully, loading user progress');
          // After successful sync, load the updated progress from database
          this.loadUserProgress();
        },
        error: (err) => {
          console.error('[AuthService] Failed to sync localStorage progress:', err);
          // Still load progress from database even if sync failed
          this.loadUserProgress();
        }
      });
    } else {
      console.log('[AuthService] No localStorage progress to sync, loading user progress from database');
      // No localStorage progress to sync, just load from database
      this.loadUserProgress();
    }
  }

  logout(): void {
    JwtTokenUtils.clearJwtData(); // Clear all JWT-related data
    this.isLoggedInSubject.next(false);
    this.userProgressSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !JwtTokenUtils.isJwtExpired();
  }

  getUserProgress(): Observable<UserProgress> {
    return this.http.get<UserProgress>(`${BACKEND_API_URL}/user/progress`, 
      { headers: this.getAuthHeaders() });
  }

  /**
   * Sync localStorage progress to database (called after authfinalize completion)
   * This migrates anonymous pre-auth progress to the authenticated user's database record
   */
  syncLocalStorageProgressToDatabase(): Observable<any> {
    const monthlyInvestment = localStorage.getItem('surveyMonthlyInvestment');
    const retirementIncome = localStorage.getItem('surveyRetirementIncome');
    
    // Debug: Log all relevant localStorage values
    console.log('[AuthService] Current localStorage values during sync:', {
      getStartedCompleted: localStorage.getItem('getStartedCompleted'),
      surveyInitialCompleted: localStorage.getItem('surveyInitialCompleted'),
      fiPlanResultsCompleted: localStorage.getItem('fiPlanResultsCompleted'),
      monthlyInvestment: monthlyInvestment,
      retirementIncome: retirementIncome
    });
    
    const localProgress: Partial<UserProgress> = {
      getStartedCompleted: localStorage.getItem('getStartedCompleted') === 'true',
      surveyInitialCompleted: localStorage.getItem('surveyInitialCompleted') === 'true',
      fiPlanResultsCompleted: localStorage.getItem('fiPlanResultsCompleted') === 'true',
      monthlyInvestment: monthlyInvestment ? parseInt(monthlyInvestment, 10) : undefined,
      retirementIncome: retirementIncome ? parseInt(retirementIncome, 10) : undefined
      // authFinalizeCompleted is set to true by the backend when this sync happens
      // Don't sync post-auth flags from localStorage (they should come from database)
    };

    console.log('[AuthService] Syncing localStorage progress to database:', localProgress);
    
    return this.updateProgress(localProgress).pipe(
      tap(() => {
        console.log('[AuthService] Successfully synced localStorage progress to database');
        // Don't clear localStorage flags immediately - wait until after authFinalize is complete
        // this.clearLocalStorageProgressFlags();
      })
    );
  }

  /**
   * Build UserProgress object from localStorage (for non-authenticated users)
   */
  private buildProgressFromLocalStorage(): UserProgress {
    const monthlyInvestment = localStorage.getItem('surveyMonthlyInvestment');
    const retirementIncome = localStorage.getItem('surveyRetirementIncome');
    
    return {
      getStartedCompleted: localStorage.getItem('getStartedCompleted') === 'true',
      surveyInitialCompleted: localStorage.getItem('surveyInitialCompleted') === 'true',
      fiPlanResultsCompleted: localStorage.getItem('fiPlanResultsCompleted') === 'true',
      authFinalizeCompleted: localStorage.getItem('authFinalizeCompleted') === 'true',
      kycVerificationCompleted: localStorage.getItem('kycVerificationCompleted') === 'true',
      linkPlaidCompleted: localStorage.getItem('linkPlaidCompleted') === 'true',
      investmentScheduleCompleted: localStorage.getItem('investmentScheduleCompleted') === 'true',
      investmentConfirmationCompleted: localStorage.getItem('investmentConfirmationCompleted') === 'true',
      monthlyInvestment: monthlyInvestment ? parseInt(monthlyInvestment, 10) : undefined,
      retirementIncome: retirementIncome ? parseInt(retirementIncome, 10) : undefined
    };
  }

  /**
   * Refresh localStorage progress in the subject (for non-authenticated users)
   * Call this when localStorage progress is updated before authentication
   */
  refreshLocalStorageProgress(): void {
    if (!this.isAuthenticated()) {
      const updatedProgress = this.buildProgressFromLocalStorage();
      this.userProgressSubject.next(updatedProgress);
      console.log('[AuthService] Refreshed localStorage progress:', updatedProgress);
    }
  }

  /**
   * Clear localStorage progress flags after successful sync to database
   * This prevents confusion between localStorage and database as source of truth
   */
  clearLocalStorageProgressFlags(): void {
    const flagsToRemove = [
      'getStartedCompleted',
      'surveyInitialCompleted', 
      'fiPlanResultsCompleted',
      'authFinalizeCompleted',
      'kycVerificationCompleted',
      'linkPlaidCompleted',
      'investmentScheduleCompleted',
      'investmentConfirmationCompleted',
      'surveyMonthlyInvestment',
      'surveyRetirementIncome'
    ];

    flagsToRemove.forEach(flag => {
      localStorage.removeItem(flag);
    });

    console.log('[AuthService] Cleared localStorage progress flags - database is now source of truth');
  }

  loadUserProgress(): void {
    this.getUserProgress().subscribe({
      next: (progress) => {
        this.userProgressSubject.next(progress);
        console.log('[AuthService] User progress loaded:', progress);
      },
      error: (err) => {
        console.error('[AuthService] Failed to load user progress:', err);
      }
    });
  }

  updateProgress(progressUpdate: Partial<UserProgress>): Observable<any> {
    return this.http.put(`${BACKEND_API_URL}/user/progress`, progressUpdate, 
      { headers: this.getAuthHeaders() });
  }

  /**
   * Comprehensive method to update both localStorage and backend progress
   * Use this method whenever a user completes or revisits a step
   */
  updateStepProgress(step: string, completed: boolean): Observable<any> {
    // Always update localStorage first
    localStorage.setItem(`${step}Completed`, completed.toString());
    console.log(`[AuthService] Updated localStorage ${step} progress: ${completed}`);
    
    // Check if user is authenticated before trying to update backend
    if (!this.isAuthenticated()) {
      console.log(`[AuthService] User not authenticated, skipping backend update for ${step}`);
      
      // Update the userProgressSubject with the latest localStorage data
      const updatedProgress = this.buildProgressFromLocalStorage();
      this.userProgressSubject.next(updatedProgress);
      console.log(`[AuthService] Updated userProgressSubject with localStorage data:`, updatedProgress);
      
      // Return a completed observable since localStorage update succeeded
      return of({ success: true, message: 'localStorage updated, user not authenticated for backend update' });
    }
    
    // Create the progress update object using bracket notation
    const progressUpdate: any = {};
    progressUpdate[`${step}Completed`] = completed;
    
    console.log(`[AuthService] Sending progress update to backend:`, progressUpdate);
    
    // Update backend only if authenticated
    return this.updateProgress(progressUpdate).pipe(
      tap((response) => {
        console.log(`[AuthService] Backend response for ${step} progress:`, response);
        console.log(`[AuthService] Updated backend ${step} progress: ${completed}`);
        // Reload user progress to keep it in sync
        this.loadUserProgress();
      }),
      catchError((err: any) => {
        console.error(`[AuthService] Failed to update backend ${step} progress:`, err);
        // Don't throw error - localStorage update still succeeded
        console.log(`[AuthService] localStorage update for ${step} was successful despite backend error`);
        return of({ success: true, message: 'localStorage updated, backend update failed' });
      })
    );
  }

  /**
   * Mark a step as completed (user finished the step)
   */
  completeStep(step: string): Observable<any> {
    return this.updateStepProgress(step, true);
  }

  /**
   * Mark a step as incomplete (user returned to the step)
   * Only call this when user is actually going backwards in the flow
   */
  markStepIncomplete(step: string): Observable<any> {
    // Check if this is likely a direct navigation (testing) vs backwards navigation
    const currentProgress = this.getUnifiedProgress();
    const isLikelyDirectNavigation = this.isDirectNavigation(step, currentProgress);
    
    console.log(`[AuthService] markStepIncomplete('${step}') called`);
    console.log(`[AuthService] Current progress:`, currentProgress);
    console.log(`[AuthService] Is likely direct navigation:`, isLikelyDirectNavigation);
    
    if (isLikelyDirectNavigation) {
      console.log(`[AuthService] Detected direct navigation to ${step}, skipping mark as incomplete`);
      return of({ success: true, message: 'Direct navigation detected, skipping mark as incomplete' });
    }
    
    console.log(`[AuthService] Proceeding to mark ${step} as incomplete`);
    return this.updateStepProgress(step, false);
  }

  /**
   * Detect if this is likely a direct navigation (for testing) vs normal flow navigation
   */
  private isDirectNavigation(step: string, progress: UserProgress): boolean {
    const stepOrder = [
      'getStarted',
      'surveyInitial', 
      'fiPlanResults',
      'authFinalize',
      'kycVerification',
      'linkPlaid',
      'investmentSchedule',
      'investmentConfirmation'
    ];
    
    const currentStepIndex = stepOrder.indexOf(step);
    if (currentStepIndex === -1) return false;
    
    // Check if previous steps are completed
    for (let i = 0; i < currentStepIndex; i++) {
      const prevStep = stepOrder[i];
      const isCompleted = (progress as any)[`${prevStep}Completed`];
      if (!isCompleted) {
        // Previous step is not completed, this looks like direct navigation
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if we should prompt user for passkey re-authentication
   * Now we don't need stored email - passkeys work without it!
   */
  shouldPromptForPasskeyReauth(): boolean {
    // Use the utility method to check if JWT is expired
    return JwtTokenUtils.isJwtExpired();
  }

  /**
   * Check if re-authentication is currently in progress
   */
  isReAuthInProgress(): boolean {
    return this.reAuthInProgress;
  }

  /**
   * Check if browser supports passkeys/WebAuthn
   */
  supportsPasskeys(): boolean {
    return !!(navigator.credentials && window.PublicKeyCredential && typeof window.PublicKeyCredential === 'function');
  }

  /**
   * Check with backend if current device/IP should be prompted for passkey re-authentication
   * Only devices that have previous users who completed auth-finalize will be prompted
   */
  shouldPromptForReauth(): Observable<{shouldPromptReauth: boolean, message: string}> {
    return this.http.get<{shouldPromptReauth: boolean, message: string}>(`${BACKEND_API_URL}/user/should-prompt-reauth`, 
      { headers: this.getAuthHeaders() });
  }

  /**
   * Prompt user for passkey re-authentication
   */
  async promptForPasskeyReauth(): Promise<boolean> {
    try {
      this.reAuthInProgress = true;
      console.log('[AuthService] Starting passkey re-authentication');
      
      // 1. Start authentication
      const startResponse = await this.http.post<{requestOptions: string, sessionId: string}>(`${BACKEND_API_URL}/passkey/authenticate/start`, {}, 
        { headers: this.getAuthHeaders() }).toPromise();
      
      if (!startResponse) {
        throw new Error('Failed to start authentication');
      }
      
      // 2. Show browser passkey prompt
      const credentialRequestOptions = JSON.parse(startResponse.requestOptions);
      
      // Convert base64url strings to ArrayBuffers for WebAuthn API
      if (credentialRequestOptions.publicKey) {
        if (credentialRequestOptions.publicKey.challenge) {
          credentialRequestOptions.publicKey.challenge = this.base64urlToArrayBuffer(credentialRequestOptions.publicKey.challenge);
        }
        if (credentialRequestOptions.publicKey.allowCredentials) {
          credentialRequestOptions.publicKey.allowCredentials.forEach((cred: any) => {
            if (cred.id) {
              cred.id = this.base64urlToArrayBuffer(cred.id);
            }
          });
        }
      }
      
      const credential = await navigator.credentials.get(credentialRequestOptions);
      
      if (!credential) {
        throw new Error('User cancelled passkey authentication');
      }
      
      // Convert credential to JSON-serializable format
      const credentialJson = this.credentialToJson(credential as PublicKeyCredential);
      
      // 3. Finish authentication 
      const authResponse = await this.http.post<any>(`${BACKEND_API_URL}/passkey/authenticate/finish`, {
        credential: credentialJson,
        sessionId: startResponse.sessionId
      }, { headers: this.getAuthHeaders() }).toPromise();
      
      if (authResponse?.success) {
        // User re-authenticated! Update auth state
        this.handleSuccessfulAuthentication(
          authResponse.jwtToken, 
          authResponse.userId, 
          authResponse.email
        );
        console.log('[AuthService] Passkey re-authentication successful');
        this.reAuthInProgress = false;
        return true;
      } else {
        this.reAuthInProgress = false;
        throw new Error(authResponse?.message || 'Authentication failed');
      }
      
    } catch (error) {
      this.reAuthInProgress = false;
      console.error('[AuthService] Passkey re-authentication failed:', error);
      return false;
    }
  }

  // Investment Schedule methods (one-to-one mapping per user)
  createOrUpdateInvestmentSchedule(schedule: any): Observable<any> {
    console.log('[AuthService] Creating/updating investment schedule (upsert):', schedule);
    // Use POST to create new or update existing investment schedule
    return this.http.post(`${BACKEND_API_URL}/investment-schedule/create`, schedule, 
      { headers: this.getAuthHeaders() });
  }

  // Backward compatibility method - delegates to createOrUpdateInvestmentSchedule
  createInvestmentSchedule(schedule: any): Observable<any> {
    console.log('[AuthService] Creating investment schedule (delegates to upsert method):', schedule);
    return this.createOrUpdateInvestmentSchedule(schedule);
  }

  getCurrentInvestmentSchedule(): Observable<any> {
    console.log('[AuthService] Retrieving current user investment schedule...');
    // GET the user's current investment schedule
    return this.http.get(`${BACKEND_API_URL}/investment-schedule/current`, 
      { headers: this.getAuthHeaders() });
  }

  getAllInvestmentSchedules(): Observable<any> {
    console.log('[AuthService] Retrieving all user investment schedules...');
    // GET all user's investment schedules
    return this.http.get(`${BACKEND_API_URL}/investment-schedule/all`, 
      { headers: this.getAuthHeaders() });
  }

  updateAchRequestId(achRequestId: string, userEmail: string): Observable<any> {
    console.log('[AuthService] Updating ACH request ID for schedule...');
    // Update ACH request ID for investment schedule
    return this.http.post(`${BACKEND_API_URL}/investment-schedule/update-ach-request-id`, {
      achRequestId,
      userEmail
    }, { headers: this.getAuthHeaders() });
  }

  pauseInvestmentSchedule(scheduleId: number): Observable<any> {
    console.log('[AuthService] Pausing investment schedule:', scheduleId);
    // Pause investment schedule
    return this.http.post(`${BACKEND_API_URL}/investment-schedule/${scheduleId}/pause`, {}, 
      { headers: this.getAuthHeaders() });
  }

  resumeInvestmentSchedule(scheduleId: number): Observable<any> {
    console.log('[AuthService] Resuming investment schedule:', scheduleId);
    // Resume investment schedule  
    return this.http.post(`${BACKEND_API_URL}/investment-schedule/${scheduleId}/resume`, {}, 
      { headers: this.getAuthHeaders() });
  }

  // Helper method to get current progress synchronously
  getCurrentProgress(): UserProgress | null {
    return this.userProgressSubject.value;
  }

  /**
   * Get progress for current user, checking both database (if authenticated) and localStorage (if not)
   * This provides a unified way to check progress regardless of authentication state
   */
  getUnifiedProgress(): UserProgress {
    const databaseProgress = this.getCurrentProgress();
    
    if (databaseProgress) {
      // User is authenticated - use database progress
      return databaseProgress;
    } else {
      // User not authenticated - check if we have localStorage progress loaded in subject
      const subjectProgress = this.userProgressSubject.value;
      if (subjectProgress) {
        // We already loaded localStorage progress into the subject
        return subjectProgress;
      } else {
        // Fallback: build progress from localStorage directly
        return this.buildProgressFromLocalStorage();
      }
    }
  }

  // Session management methods
  getMinutesUntilExpiration(): number | null {
    return JwtTokenUtils.getMinutesUntilExpiration();
  }

  isSessionExpiringSoon(): boolean {
    const minutesLeft = this.getMinutesUntilExpiration();
    return minutesLeft !== null && minutesLeft <= 10; // Warn when 10 minutes left
  }

  /**
   * Get current user's email from stored JWT data
   */
  getCurrentUserEmail(): string | null {
    return localStorage.getItem('userEmail');
  }

  /**
   * Get current user's ID from stored JWT data
   */
  getCurrentUserId(): number | null {
    const userId = localStorage.getItem('userId');
    return userId ? parseInt(userId) : null;
  }

  /**
   * Get current user information
   */
  getCurrentUser(): { id: number | null; email: string | null } | null {
    const email = this.getCurrentUserEmail();
    const id = this.getCurrentUserId();
    
    if (!email && !id) {
      return null;
    }
    
    return { id, email };
  }

  /**
   * 🧪 DEVELOPMENT: Authenticate as an existing user from the database
   * This is for development/testing to simulate logging in as any user
   */
  authenticateAsUser(email?: string, userHandle?: string): Observable<AuthResponse> {
    console.log('[AuthService] 🧪 Authenticating as existing user:', { email, userHandle });
    
    const payload = {
      email: email || null,
      userHandle: userHandle || null
    };
    
    const url = `${BACKEND_API_URL}/dev/authenticate-as-user`;
    console.log('[AuthService] Making HTTP POST to:', url);
    console.log('[AuthService] Payload:', payload);
    
    return this.http.post<AuthResponse>(url, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('[AuthService] 🔍 Raw HTTP response:', response);
        if (response.success) {
          console.log('[AuthService] ✅ Successfully authenticated as user:', response.email);
        } else {
          console.log('[AuthService] ❌ Authentication failed:', response.message);
        }
      }),
      tap({
        error: (error) => {
          console.error('[AuthService] ❌ HTTP Error during authentication:', error);
          console.error('[AuthService] Error status:', error?.status);
          console.error('[AuthService] Error message:', error?.message);
        }
      })
    );
  }

  /**
   * Convert base64url string to ArrayBuffer for WebAuthn API
   */
  private base64urlToArrayBuffer(base64url: string): ArrayBuffer {
    // Add padding if needed
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }

  private arrayBufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private credentialToJson(credential: PublicKeyCredential): any {
    const response = credential.response as AuthenticatorAssertionResponse;
    
    return {
      id: credential.id,
      rawId: this.arrayBufferToBase64url(credential.rawId),
      response: {
        authenticatorData: this.arrayBufferToBase64url(response.authenticatorData),
        clientDataJSON: this.arrayBufferToBase64url(response.clientDataJSON),
        signature: this.arrayBufferToBase64url(response.signature),
        userHandle: response.userHandle ? this.arrayBufferToBase64url(response.userHandle) : null
      },
      clientExtensionResults: credential.getClientExtensionResults(),
      type: credential.type
    };
  }

  // You could add automatic token refresh logic here in the future
  // refreshTokenIfNeeded(): void { ... }
}
