import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of, lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';
import { DeviceIdService } from './device-id.service';
import { KeychainSyncService } from './keychain-sync.service';
import { NativePasskeyService } from './native-passkey.service';

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
  selectedTier?: string;
  billingPeriod?: string;
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

  private reAuthInProgressSubject = new BehaviorSubject<boolean>(false);
  public reAuthInProgress$ = this.reAuthInProgressSubject.asObservable();
  private tokenRefreshInProgress = false;

  constructor(
    private http: HttpClient,
    private deviceIdService: DeviceIdService,
    private keychainSyncService: KeychainSyncService,
    private nativePasskeyService: NativePasskeyService
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
      // No valid token — check if there's a known user whose session expired
      const existingUserId = localStorage.getItem('userId');
      const willPromptReauth = !!(existingUserId && this.supportsPasskeys());

      if (willPromptReauth) {
        // Returning user with expired session: preserve userId/userEmail so reauth
        // can use them, and so AppLockService.isUserLoggedIn() stays accurate.
        // Only remove the expired token data itself.
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('jwtExpiration');
      } else {
        JwtTokenUtils.clearJwtData();
      }

      const localStorageProgress = this.buildProgressFromLocalStorage();
      this.userProgressSubject.next(localStorageProgress);

      if (this.supportsPasskeys()) {
        if (existingUserId) {
          // Returning user — set reAuthInProgress synchronously so navigation defers
          // until AppLockService shows the passkey modal via the appStateChange event.
          // PasskeyPromptComponent calls handleSuccessfulAuthentication() on success,
          // which resets this flag and triggers correct navigation.
          this.reAuthInProgressSubject.next(true);
        } else if (!localStorage.getItem('userEmail')) {
          // Fresh install or phone upgrade: no known user on this device.
          // Attempt discoverable passkey auth — iOS will find any passkeys for this
          // app's RP in iCloud Keychain and show the picker. Silently fails if none.
          this.promptForPasskeyReauth();
        }
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
    this.reAuthInProgressSubject.next(false); // Clear any pending reauth gate
    // Reset progress to null so the navigation logic waits for fresh DB data
    // rather than briefly routing based on stale localStorage values.
    this.userProgressSubject.next(null);

    // Persist email to iCloud Keychain so new devices can auto-prompt reauth
    // Only write if not already stored (avoids redundant Keychain writes)
    this.keychainSyncService.getAccountEmail().then(existing => {
      if (existing !== email) {
        this.keychainSyncService.storeAccountEmail(email);
      }
    });

    // Check if there's pre-auth localStorage progress to sync
    const hasLocalProgress = parseInt(localStorage.getItem('onboardingStep') || '0', 10) >= 1;

    if (hasLocalProgress) {
      this.syncLocalStorageProgressToDatabase().subscribe({
        next: () => this.loadUserProgress(),
        error: () => this.loadUserProgress()
      });
    } else {
      this.loadUserProgress();
    }
  }

  logout(): void {
    JwtTokenUtils.clearJwtData();
    this.isLoggedInSubject.next(false);
    this.reAuthInProgressSubject.next(false);
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
    const ordinal = parseInt(localStorage.getItem('onboardingStep') || '0', 10);
    const monthlyInvestment = localStorage.getItem('surveyMonthlyInvestment');
    const retirementIncome = localStorage.getItem('surveyRetirementIncome');

    const localProgress: Partial<UserProgress> = {
      getStartedCompleted: ordinal >= 1,
      surveyInitialCompleted: ordinal >= 2,
      fiPlanResultsCompleted: ordinal >= 3,
      monthlyInvestment: monthlyInvestment ? parseInt(monthlyInvestment, 10) : undefined,
      retirementIncome: retirementIncome ? parseInt(retirementIncome, 10) : undefined
      // authFinalizeCompleted is set to true by the backend when this sync happens
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
    const ordinal = parseInt(localStorage.getItem('onboardingStep') || '0', 10);
    const monthlyInvestment = localStorage.getItem('surveyMonthlyInvestment');
    const retirementIncome = localStorage.getItem('surveyRetirementIncome');
    return {
      getStartedCompleted: ordinal >= 1,
      surveyInitialCompleted: ordinal >= 2,
      fiPlanResultsCompleted: ordinal >= 3,
      authFinalizeCompleted: ordinal >= 4,
      kycVerificationCompleted: ordinal >= 5,
      linkPlaidCompleted: ordinal >= 6,
      investmentScheduleCompleted: ordinal >= 7,
      investmentConfirmationCompleted: ordinal >= 8,
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
    localStorage.removeItem('onboardingStep');
    localStorage.removeItem('surveyMonthlyInvestment');
    localStorage.removeItem('surveyRetirementIncome');
  }

  loadUserProgress(): void {
    this.getUserProgress().subscribe({
      next: (progress) => {
        this.userProgressSubject.next(progress);
      },
      error: (err) => {
        console.error('[AuthService] Failed to load user progress:', err);
        // Emit localStorage fallback so userProgress$ is never permanently null.
        // Without this, the navigation filter blocks forever and the cover never hides.
        this.userProgressSubject.next(this.buildProgressFromLocalStorage());
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
  updateUserProfile(profileUpdate: { monthlyInvestment?: number, retirementIncome?: number, firstName?: string, lastName?: string, selectedTier?: string, billingPeriod?: string }): Observable<any> {
    return this.http.put(`${BACKEND_API_URL}/user/profile`, profileUpdate,
      { headers: this.getAuthHeaders() });
  }

  private stepToOrdinal(step: string): number {
    const map: Record<string, number> = {
      getStarted: 1, surveyInitial: 2, fiPlanResults: 3, authFinalize: 4,
      kycVerification: 5, linkPlaid: 6, investmentSchedule: 7, investmentConfirmation: 8
    };
    return map[step] ?? 0;
  }

  /**
   * Comprehensive method to update both localStorage and backend progress
   * Use this method whenever a user completes or revisits a step
   */
  updateStepProgress(step: string, completed: boolean): Observable<any> {
    // Always update localStorage first
    if (completed) {
      const newOrdinal = this.stepToOrdinal(step);
      const current = parseInt(localStorage.getItem('onboardingStep') || '0', 10);
      if (newOrdinal > current) {
        localStorage.setItem('onboardingStep', String(newOrdinal));
      }
    }

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
    return this.reAuthInProgressSubject.value;
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
   * Prompt user for passkey re-authentication.
   * Only runs on fresh install / phone upgrade (no localStorage email).
   * Uses iCloud Keychain to identify the account, then checks the backend for
   * registered passkeys before invoking iOS — so iOS is never called if the
   * list is empty, preventing the "Scan QR Code" sheet from appearing.
   */
  async promptForPasskeyReauth(): Promise<boolean> {
    if (localStorage.getItem('userEmail')) return false;

    // Identify the account via iCloud Keychain (survives reinstalls/upgrades).
    // If nothing is in the Keychain this is a genuinely first-time user — skip.
    const keychainEmail = await this.keychainSyncService.getAccountEmail();
    if (!keychainEmail) {
      return false;
    }

    try {
      this.reAuthInProgressSubject.next(true);

      // Ask the backend for this account's passkeys.
      let startResponse: { requestOptions: string, sessionId: string };
      try {
        startResponse = await lastValueFrom(
          this.http.post<{ requestOptions: string, sessionId: string }>(
            `${BACKEND_API_URL}/passkey/authenticate/start`,
            { email: keychainEmail },
            { headers: this.getAuthHeaders() }
          )
        );
      } catch {
        // Account deleted or backend error — clear the stale Keychain entry.
        this.keychainSyncService.clearAccountEmail();
        this.reAuthInProgressSubject.next(false);
        return false;
      }

      const credentialRequestOptions = JSON.parse(startResponse.requestOptions);
      const publicKey = credentialRequestOptions.publicKey ?? credentialRequestOptions;
      const allowedCreds = publicKey.allowCredentials ?? [];

      // Only invoke iOS if there is at least one passkey to offer.
      // An empty list means no passkeys are registered — go straight to onboarding.
      if (allowedCreds.length === 0) {
        this.reAuthInProgressSubject.next(false);
        return false;
      }

      const challenge = credentialRequestOptions.challenge || publicKey.challenge;
      const rpId = publicKey.rpId ?? publicKey.rp?.id;
      const userVerification = publicKey.userVerification;
      const allowedCredentials = allowedCreds.map((c: any) => ({ id: c.id }));

      let credentialForFinish: any;

      if (this.nativePasskeyService.isAvailable) {
        credentialForFinish = await this.nativePasskeyService.authenticate({
          challenge,
          rpId,
          userVerification,
          allowedCredentials
        });
      } else {
        if (publicKey.challenge) {
          publicKey.challenge = this.base64urlToArrayBuffer(publicKey.challenge);
        }
        allowedCreds.forEach((cred: any) => {
          if (cred.id) cred.id = this.base64urlToArrayBuffer(cred.id);
        });
        const credential = await navigator.credentials.get(
          credentialRequestOptions.publicKey ? credentialRequestOptions : { publicKey: credentialRequestOptions }
        );
        if (!credential) throw new Error('User cancelled passkey authentication');
        credentialForFinish = this.credentialToJson(credential as PublicKeyCredential);
      }

      const authResponse = await lastValueFrom(
        this.http.post<any>(`${BACKEND_API_URL}/passkey/authenticate/finish`, {
          credential: credentialForFinish,
          sessionId: startResponse.sessionId
        }, { headers: this.getAuthHeaders() })
      );

      if (authResponse?.success) {
        this.handleSuccessfulAuthentication(authResponse.jwtToken, authResponse.userId, authResponse.email);
        this.reAuthInProgressSubject.next(false);
        return true;
      } else {
        this.reAuthInProgressSubject.next(false);
        return false;
      }

    } catch (error) {
      this.reAuthInProgressSubject.next(false);
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
