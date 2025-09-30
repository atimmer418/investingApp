import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';

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

  constructor(private http: HttpClient) {
    // Check if user is already logged in on app start
    this.checkExistingSession();
  }

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    const token = JwtTokenUtils.getValidJwtToken(); // Use utility to get valid token
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
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
                            localStorage.getItem('initialSurveyCompleted') === 'true' ||
                            localStorage.getItem('fiPlanResultsCompleted') === 'true';

    if (hasLocalProgress) {
      console.log('[AuthService] First-time authentication detected, syncing localStorage progress to database');
      this.syncLocalStorageProgressToDatabase().subscribe({
        next: () => {
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
    const localProgress: Partial<UserProgress> = {
      getStartedCompleted: localStorage.getItem('getStartedCompleted') === 'true',
      surveyInitialCompleted: localStorage.getItem('initialSurveyCompleted') === 'true',
      fiPlanResultsCompleted: localStorage.getItem('fiPlanResultsCompleted') === 'true',
      // authFinalizeCompleted is set to true by the backend when this sync happens
      // Don't sync post-auth flags from localStorage (they should come from database)
    };

    console.log('[AuthService] Syncing localStorage progress to database:', localProgress);
    
    return this.updateProgress(localProgress).pipe(
      tap(() => {
        console.log('[AuthService] Successfully synced localStorage progress to database');
        // Optionally clear localStorage flags after successful sync
        this.clearLocalStorageProgressFlags();
      })
    );
  }

  /**
   * Build UserProgress object from localStorage (for non-authenticated users)
   */
  private buildProgressFromLocalStorage(): UserProgress {
    return {
      getStartedCompleted: localStorage.getItem('getStartedCompleted') === 'true',
      surveyInitialCompleted: localStorage.getItem('initialSurveyCompleted') === 'true',
      fiPlanResultsCompleted: localStorage.getItem('fiPlanResultsCompleted') === 'true',
      authFinalizeCompleted: false, // Can't be true if no JWT token
      kycVerificationCompleted: false,
      linkPlaidCompleted: false,
      investmentScheduleCompleted: false,
      investmentConfirmationCompleted: false
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
  private clearLocalStorageProgressFlags(): void {
    const flagsToRemove = [
      'getStartedCompleted',
      'initialSurveyCompleted', 
      'fiPlanResultsCompleted',
      'linkplaidCompleted',
      'investmentSurveyCompleted',
      'stockSelectionCompleted',
      'investmentConfirmationCompleted'
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
   * Check if we should prompt user for passkey re-authentication
   * Now we don't need stored email - passkeys work without it!
   */
  shouldPromptForPasskeyReauth(): boolean {
    // Use the utility method to check if JWT is expired
    return JwtTokenUtils.isJwtExpired();
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
      console.log('[AuthService] Starting passkey re-authentication');
      
      // 1. Start authentication
      const startResponse = await this.http.post<{requestOptions: string, sessionId: string}>(`${BACKEND_API_URL}/passkey/authenticate/start`, {}).toPromise();
      
      if (!startResponse) {
        throw new Error('Failed to start authentication');
      }
      
      // 2. Show browser passkey prompt
      const credential = await navigator.credentials.get({
        publicKey: JSON.parse(startResponse.requestOptions)
      });
      
      if (!credential) {
        throw new Error('User cancelled passkey authentication');
      }
      
      // 3. Finish authentication 
      const authResponse = await this.http.post<any>(`${BACKEND_API_URL}/passkey/authenticate/finish`, {
        credential: credential,
        sessionId: startResponse.sessionId
      }).toPromise();
      
      if (authResponse?.success) {
        // User re-authenticated! Update auth state
        this.handleSuccessfulAuthentication(
          authResponse.jwtToken, 
          authResponse.userId, 
          authResponse.email
        );
        console.log('[AuthService] Passkey re-authentication successful');
        return true;
      } else {
        throw new Error(authResponse?.message || 'Authentication failed');
      }
      
    } catch (error) {
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

  // You could add automatic token refresh logic here in the future
  // refreshTokenIfNeeded(): void { ... }
}
