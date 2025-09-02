import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';

const BACKEND_API_URL = environment.backendApiUrl;

export interface UserProgress {
  getStartedCompleted: boolean;
  initialSurveyCompleted: boolean;
  linkplaidCompleted: boolean;
  investmentSurveyCompleted: boolean;
  choseToPickStocks: boolean;
  stockSelectionCompleted: boolean;
  investmentConfirmationCompleted: boolean;
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
    if (token) {
      // Check if this is a test user (mock JWT)
      const isTestUser = token.includes('mock_signature_for_testing');
      
      if (isTestUser) {
        console.log('[AuthService] Test user detected, using simulated session');
        this.isLoggedInSubject.next(true);
        // For test users, create mock progress (the app will read from localStorage)
        const mockProgress = {
          getStartedCompleted: true,
          initialSurveyCompleted: true,
          linkplaidCompleted: true,
          investmentSurveyCompleted: false,
          choseToPickStocks: false,
          stockSelectionCompleted: false,
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
      console.log('[AuthService] No valid token found, user needs to authenticate');
    }
  }

  // This method should be called after successful passkey registration/authentication
  // Your existing PasskeyService already handles the JWT storage, so this just updates the auth state
  handleSuccessfulAuthentication(jwtToken: string, userId: number, email: string): void {
    JwtTokenUtils.storeJwtToken(jwtToken, userId, email);
    this.isLoggedInSubject.next(true);
    
    // Load user progress after successful authentication
    this.loadUserProgress();
  }

  logout(): void {
    JwtTokenUtils.clearJwtData(); // Clear all JWT-related data
    this.isLoggedInSubject.next(false);
    this.userProgressSubject.next(null);
  }

  isAuthenticated(): boolean {
    return JwtTokenUtils.getValidJwtToken() !== null;
  }

  getUserProgress(): Observable<UserProgress> {
    return this.http.get<UserProgress>(`${BACKEND_API_URL}/user/progress`, 
      { headers: this.getAuthHeaders() });
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

  // Helper method to get current progress synchronously
  getCurrentProgress(): UserProgress | null {
    return this.userProgressSubject.value;
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
   * 🧪 DEVELOPMENT: Authenticate as an existing user from the database
   * This is for development/testing to simulate logging in as any user
   */
  authenticateAsUser(email?: string, userHandle?: string): Observable<AuthResponse> {
    console.log('[AuthService] 🧪 Authenticating as existing user:', { email, userHandle });
    
    const payload = {
      email: email || null,
      userHandle: userHandle || null
    };
    
    return this.http.post<AuthResponse>(`${BACKEND_API_URL}/api/dev/authenticate-as-user`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        if (response.success) {
          console.log('[AuthService] ✅ Successfully authenticated as user:', response.email);
        }
      })
    );
  }

  // You could add automatic token refresh logic here in the future
  // refreshTokenIfNeeded(): void { ... }
}
