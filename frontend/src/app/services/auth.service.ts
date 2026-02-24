import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';
import { DeviceIdService } from './device-id.service';
import { KeychainSyncService } from './keychain-sync.service';

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
  firstName?: string;
  lastName?: string;
  referralCode?: string;
  referralCount?: number;
  hasAppliedReferral?: boolean;
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
  private tokenRefreshInProgress = false;

  constructor(
    private http: HttpClient,
    private deviceIdService: DeviceIdService,
    private keychainSyncService: KeychainSyncService
  ) {
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

    return headers;
  }

  private checkExistingSession(): void {
    const token = JwtTokenUtils.getValidJwtToken();
    
    if (token) {
      // Valid token exists — restore session and load progress from backend
      this.isLoggedInSubject.next(true);
      this.loadUserProgress();
    } else {
      // No valid token — set up localStorage progress for unauthenticated state
      // Clear any stale JWT data since token is expired/missing
      JwtTokenUtils.clearJwtData();
      const localStorageProgress = this.buildProgressFromLocalStorage();
      this.userProgressSubject.next(localStorageProgress);

      // In production, check if we should auto-prompt for passkey re-auth.
      // Priority: iCloud Keychain (survives device upgrades) → device ID fallback
      if (environment.production && this.supportsPasskeys()) {
        this.checkKeychainThenDevice();
      }
    }
  }

  /**
   * Called after successful authentication (passkey, dev login, etc.).
   * Stores JWT once, syncs localStorage progress if needed, then loads backend progress.
   * Also persists the user's email to iCloud Keychain for cross-device recognition.
   */
  handleSuccessfulAuthentication(jwtToken: string, userId: number, email: string): void {
    JwtTokenUtils.storeJwtToken(jwtToken, userId, email);
    this.isLoggedInSubject.next(true);

    // Persist email to iCloud Keychain so new devices can auto-prompt reauth
    // Only write if not already stored (avoids redundant Keychain writes)
    this.keychainSyncService.getAccountEmail().then(existing => {
      if (existing !== email) {
        this.keychainSyncService.storeAccountEmail(email);
      }
    });

    // Check if there's pre-auth localStorage progress to sync
    const hasLocalProgress = localStorage.getItem('getStartedCompleted') === 'true' ||
      localStorage.getItem('surveyInitialCompleted') === 'true' ||
      localStorage.getItem('fiPlanResultsCompleted') === 'true';

    if (hasLocalProgress) {
      this.syncLocalStorageProgressToDatabase().subscribe({
        next: () => this.loadUserProgress(),
        error: () => this.loadUserProgress()
      });
    } else {
      this.loadUserProgress();
    }
  }

  /**
   * Check iCloud Keychain first (survives device upgrades), then fall back to
   * device ID. If either indicates a returning user, auto-trigger passkey reauth.
   */
  private async checkKeychainThenDevice(): Promise<void> {
    try {
      // 1. Check iCloud Keychain — works across devices on the same Apple ID
      const keychainEmail = await this.keychainSyncService.getAccountEmail();
      if (keychainEmail) {
        console.log('[AuthService] Found account in iCloud Keychain — prompting reauth');
        await this.promptForPasskeyReauth();
        return;
      }

      // 2. Fall back to device ID check (original behavior)
      this.shouldPromptForReauth().subscribe({
        next: async (response) => {
          if (response.shouldPromptReauth) {
            await this.promptForPasskeyReauth();
          }
        },
        error: () => { /* Continue with normal flow */ }
      });
    } catch {
      // Keychain read failed — fall back to device ID
      this.shouldPromptForReauth().subscribe({
        next: async (response) => {
          if (response.shouldPromptReauth) {
            await this.promptForPasskeyReauth();
          }
        },
        error: () => { /* Continue with normal flow */ }
      });
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

    const localProgress: Partial<UserProgress> = {
      getStartedCompleted: localStorage.getItem('getStartedCompleted') === 'true',
      surveyInitialCompleted: localStorage.getItem('surveyInitialCompleted') === 'true',
      fiPlanResultsCompleted: localStorage.getItem('fiPlanResultsCompleted') === 'true',
      monthlyInvestment: monthlyInvestment ? parseInt(monthlyInvestment, 10) : undefined,
      retirementIncome: retirementIncome ? parseInt(retirementIncome, 10) : undefined
      // authFinalizeCompleted is set to true by the backend when this sync happens
      // Don't sync post-auth flags from localStorage (they should come from database)
    };

    return this.updateProgress(localProgress).pipe(
      tap(() => {
        // Don't clear localStorage flags immediately - wait until after authFinalize is complete
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
  }

  loadUserProgress(): void {
    this.getUserProgress().subscribe({
      next: (progress) => {
        this.userProgressSubject.next(progress);
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
   * Update user profile data directly (User object), bypassing UserProgress logic.
   * Use this for profile page updates like name, retirement income, etc.
   */
  updateUserProfile(profileUpdate: { monthlyInvestment?: number, retirementIncome?: number, firstName?: string, lastName?: string }): Observable<any> {
    return this.http.put(`${BACKEND_API_URL}/user/profile`, profileUpdate,
      { headers: this.getAuthHeaders() });
  }

  /**
   * Comprehensive method to update both localStorage and backend progress
   * Use this method whenever a user completes or revisits a step
   */
  updateStepProgress(step: string, completed: boolean): Observable<any> {
    // Always update localStorage first
    localStorage.setItem(`${step}Completed`, completed.toString());

    // Check if user is authenticated before trying to update backend
    if (!this.isAuthenticated()) {
      // Update the userProgressSubject with the latest localStorage data
      const updatedProgress = this.buildProgressFromLocalStorage();
      this.userProgressSubject.next(updatedProgress);
      return of({ success: true, message: 'localStorage updated' });
    }

    // Create the progress update object
    const progressUpdate: any = {};
    progressUpdate[`${step}Completed`] = completed;

    // Update backend only if authenticated
    return this.updateProgress(progressUpdate).pipe(
      tap(() => {
        // Reload user progress to keep it in sync
        this.loadUserProgress();
      }),
      catchError((err: any) => {
        console.error(`[AuthService] Failed to update backend ${step} progress:`, err);
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

    if (isLikelyDirectNavigation) {
      return of({ success: true, message: 'Direct navigation detected, skipping mark as incomplete' });
    }

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
   * Proactively refresh the JWT token before it expires.
   * Called by AppLockService when user is active and token is within 10 min of expiry.
   * Returns true if refresh succeeded.
   */
  refreshToken(): Observable<boolean> {
    if (this.tokenRefreshInProgress || !this.isAuthenticated()) {
      return of(false);
    }

    this.tokenRefreshInProgress = true;

    return this.http.post<any>(`${BACKEND_API_URL}/auth/refresh`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        if (response?.success && response.jwtToken) {
          JwtTokenUtils.storeJwtToken(response.jwtToken, response.id, response.email);
        }
        this.tokenRefreshInProgress = false;
      }),
      catchError(err => {
        console.error('[AuthService] Token refresh failed:', err);
        this.tokenRefreshInProgress = false;
        return of(false);
      })
    ) as Observable<boolean>;
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
  shouldPromptForReauth(): Observable<{ shouldPromptReauth: boolean, message: string }> {
    return this.http.get<{ shouldPromptReauth: boolean, message: string }>(`${BACKEND_API_URL}/user/should-prompt-reauth`,
      { headers: this.getAuthHeaders() });
  }

  /**
   * Prompt user for passkey re-authentication
   */
  async promptForPasskeyReauth(): Promise<boolean> {
    try {
      this.reAuthInProgress = true;
      console.log('[AuthService] Starting passkey re-authentication');

      // 1. Start authentication — use account-specific flow if we know the user
      const userEmail = localStorage.getItem('userEmail');
      const requestBody = userEmail ? { email: userEmail } : {};
      const startResponse = await this.http.post<{ requestOptions: string, sessionId: string }>(`${BACKEND_API_URL}/passkey/authenticate/start`, requestBody,
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
   * DEVELOPMENT ONLY: Authenticate as an existing user from the database
   */
  authenticateAsUser(email?: string, userHandle?: string): Observable<AuthResponse> {
    const payload = {
      email: email || null,
      userHandle: userHandle || null
    };

    return this.http.post<AuthResponse>(`${BACKEND_API_URL}/dev/authenticate-as-user`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('[AuthService] Dev auth failed:', error?.status, error?.message);
        throw error;
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

  applyReferralCode(code: string): Observable<any> {
    const url = `${BACKEND_API_URL}/user/referral/apply`;
    return this.http.post(url, { code }, { headers: this.getAuthHeaders() });
  }
}
