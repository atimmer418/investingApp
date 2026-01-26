import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular/standalone'; 
import { SplashScreen } from '@capacitor/splash-screen';
import { register } from 'swiper/element/bundle';
import { AuthService, UserProgress } from './services/auth.service';
import { AppLockService } from './services/app-lock.service';
import { PasskeyService } from './services/passkey.service';
import { JwtTokenUtils } from './utils/jwt-token.utils';
import { combineLatest, debounceTime, distinctUntilChanged, filter, Subject, throttleTime } from 'rxjs';
import { addIcons } from 'ionicons';
import { lockClosedOutline, fingerPrintOutline } from 'ionicons/icons';

register();

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet, CommonModule, IonContent, IonButton, IonIcon, IonSpinner],
})
export class AppComponent implements OnInit {

  private userActivity$ = new Subject<void>();

  constructor(
    private router: Router,
    private platform: Platform,
    private authService: AuthService,
    private appLockService: AppLockService,
    private passkeyService: PasskeyService
  ) {
    addIcons({ lockClosedOutline, fingerPrintOutline });
    
    // Setup activity tracker with throtting to avoid performance issues
    // This ensures we don't call updateLastActiveTime on every single touch event
    this.userActivity$.pipe(
      throttleTime(60000) // limit to once every 60 seconds
    ).subscribe(() => {
      this.appLockService.updateLastActiveTime();
    });

    this.initializeApp();
  }

  // Listen for global user interactions to keep the session alive (optimized for mobile/iPhone)
  @HostListener('window:touchstart')
  @HostListener('window:touchmove') // Catches continuous interaction (dragging/swiping)
  @HostListener('window:scroll', ['$event']) // Catches Voice Control or assistive scrolling
  @HostListener('window:click')
  @HostListener('window:keydown')
  onUserActivity() {
    this.userActivity$.next();
  }

  initializeApp() {
    this.platform.ready().then(async () => {
      console.log('[AppComponent] Platform ready.');
      // Hide the native splash screen once the platform is ready and Angular is bootstrapping
      if (this.platform.is('capacitor')) {
        try {
          await SplashScreen.hide();
          console.log('[AppComponent] Splash screen hidden.');
        } catch (error) {
          console.error('[AppComponent] Error hiding splash screen:', error);
        }
      }
    });
  }

  ngOnInit(): void {
    // localStorage.clear();
    console.log('[AppComponent] ngOnInit - Setting up authentication and progress tracking.');
    
    // Check if this is a testing scenario (add ?testing=true to URL)
    const urlParams = new URLSearchParams(window.location.search);
    const isTesting = urlParams.get('testing') === 'true';
    
    if (isTesting) {
      console.log('[AppComponent] Testing mode enabled - skipping navigation logic');
      return; // Skip all navigation logic for testing
    }
    
    // 🧪 SIMULATE EXISTING USER - Login as any user from your database
    // First, check your database users by visiting: http://localhost:8080/api/dev/list-users
    // Then uncomment ONE of these to simulate logging in as that user:
    
    this.simulateUserLogin('facebook@gmail.com');           // Login by email
    // this.simulateUserLogin('', 'user_handle_123');        // Login by user_handle  
    // this.simulateUserLogin('test@test.com');              // Login as different user

    // OR navigate directly to any page for testing (bypasses auth entirely):
    // this.router.navigate(['/investment-confirmation'], { replaceUrl: true });
    // this.router.navigate(['/investment-schedule'], { replaceUrl: true });
    // this.router.navigate(['/stock-selection'], { replaceUrl: true });
    // this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
    
    // ✅ ENABLE AUTH LOGIC FOR PROPER NAVIGATION
    // Use a single combined subscription to avoid race conditions between auth state and progress
    this.setupUnifiedNavigationLogic();
  }

  /**
   * Simulate logging in as an existing user from your database
   * Call your backend to authenticate and get their progress state
   */
  private simulateUserLogin(email?: string, userHandle?: string): void {
    console.log(`[AppComponent] 🧪 Simulating login for user:`, { email, userHandle });
    
    // Call backend to authenticate as this user and get their JWT + progress
    this.authService.authenticateAsUser(email, userHandle).subscribe({
      next: (response) => {
        console.log('🔍 [AppComponent] Raw response from authenticateAsUser:', response);
        
        if (response && response.success && response.jwtToken) {
          console.log('✅ [AppComponent] Successfully authenticated as user:', response);
          
          // Store JWT and trigger auth state update
          JwtTokenUtils.storeJwtToken(response.jwtToken, response.id!, response.email!);
          this.authService.handleSuccessfulAuthentication(response.jwtToken, response.id!, response.email!);
          
        } else {
          console.error('❌ [AppComponent] Failed to authenticate as user. Response:', response);
          console.error('❌ [AppComponent] Response details:', {
            hasResponse: !!response,
            success: response?.success,
            hasJwtToken: !!response?.jwtToken,
            message: response?.message
          });
          // Go to login page if simulation fails
          this.router.navigate(['/get-started'], { replaceUrl: true });
        }
      },
      error: (err) => {
        console.error('❌ [AppComponent] Error simulating user login:', err);
        console.error('❌ [AppComponent] Error details:', {
          status: err?.status,
          message: err?.message,
          url: err?.url
        });
        this.router.navigate(['/get-started'], { replaceUrl: true });
      }
    });
  }

  /**
   * Set up unified navigation logic that coordinates authentication state and user progress
   * This prevents race conditions between isLoggedIn$ and userProgress$ observables
   */
  private setupUnifiedNavigationLogic(): void {
    console.log('[AppComponent] Setting up unified navigation logic with RxJS combineLatest');
    
    // Combine authentication state and user progress into a single stream
    // This ensures we only navigate when both pieces of data are consistent
    combineLatest([
      this.authService.isLoggedIn$,
      this.authService.userProgress$
    ]).pipe(
      // Debounce to prevent rapid successive calls
      debounceTime(300),
      // Only process when the combination actually changes
      distinctUntilChanged((prev, curr) => {
        return prev[0] === curr[0] && 
               JSON.stringify(prev[1]) === JSON.stringify(curr[1]);
      }),
      // Filter out cases where we have partial data
      filter(([isLoggedIn, progress]) => {
        // Always process when not logged in
        if (!isLoggedIn) return true;
        // When logged in, only process if we have progress data
        return isLoggedIn && progress !== null;
      })
    ).subscribe(([isLoggedIn, progress]) => {
      console.log(`[AppComponent] 🔄 Unified navigation trigger: isLoggedIn=${isLoggedIn}, hasProgress=${!!progress}`);
      
      if (isLoggedIn && progress) {
        // User is authenticated and we have backend progress data
        console.log('[AppComponent] User authenticated with progress:', progress);
        this.navigateBasedOnProgress(progress);
        
      } else if (!isLoggedIn) {
        // User is not logged in - use localStorage progress if available
        if (!this.authService.isReAuthInProgress()) {
          const unifiedProgress = this.authService.getUnifiedProgress();
          const hasAnyProgress = unifiedProgress.getStartedCompleted || 
                               unifiedProgress.surveyInitialCompleted || 
                               unifiedProgress.fiPlanResultsCompleted;
          
          if (hasAnyProgress) {
            console.log('[AppComponent] User not authenticated but has localStorage progress:', unifiedProgress);
            this.navigateBasedOnProgress(unifiedProgress);
          } else {
            console.log('[AppComponent] User not authenticated and no progress, redirecting to get-started');
            this.router.navigate(['/get-started'], { replaceUrl: true });
          }
        } else {
          console.log('[AppComponent] Re-authentication in progress, waiting for completion');
        }
      }
    });

    // Separate handler for when user first logs in - trigger fresh data load
    this.authService.isLoggedIn$.pipe(
      distinctUntilChanged(),
      filter(isLoggedIn => isLoggedIn === true) // Only when transitioning to logged in
    ).subscribe(() => {
      console.log('[AppComponent] User just logged in, triggering fresh progress load in 1 second...');
      setTimeout(() => {
        console.log('[AppComponent] Loading fresh progress after login');
        this.authService.loadUserProgress();
      }, 1000); // Wait for backend sync to complete
    });
  }

  navigateBasedOnProgress(progress: UserProgress): void {
    const currentTimeStamp = new Date().toISOString();
    console.log(`🚀 [AppComponent] navigateBasedOnProgress called at ${currentTimeStamp} with progress:`, progress);
    
    // Use the ACTUAL progress data from the backend to determine the user's current step
    const getStartedCompleted = progress.getStartedCompleted;
    const surveyInitialCompleted = progress.surveyInitialCompleted;
    const fiPlanResultsCompleted = progress.fiPlanResultsCompleted;
    const authFinalizeCompleted = progress.authFinalizeCompleted;
    const kycVerificationCompleted = progress.kycVerificationCompleted;
    const linkPlaidCompleted = progress.linkPlaidCompleted;
    const investmentScheduleCompleted = progress.investmentScheduleCompleted;
    const investmentConfirmationCompleted = progress.investmentConfirmationCompleted;

    let targetRoute: string | null = null;
    let decisionReason: string = "";

    // Follow the exact user flow: get-started → surveyinitial → fi-plan-results → authfinalize → kyc-verification → linkplaid → investment-schedule → investmentconfirmation
    if (!getStartedCompleted) {
      targetRoute = '/get-started';
      decisionReason = "Get started NOT complete.";
    } else if (!surveyInitialCompleted) {
      targetRoute = '/survey-initial';
      decisionReason = "Get started complete, initial survey NOT complete.";
    } else if (!fiPlanResultsCompleted) {
      targetRoute = '/fi-plan-results';
      decisionReason = "Initial survey complete, FI plan results NOT complete.";
    } else if (!authFinalizeCompleted) {
      targetRoute = '/auth-finalize';
      decisionReason = "FI plan results complete, auth finalize NOT complete.";
    } else if (!kycVerificationCompleted) {
      targetRoute = '/kyc-verification';
      decisionReason = "Auth finalize complete, KYC verification NOT complete.";
    } else if (!linkPlaidCompleted) {
      targetRoute = '/link-bank';
      decisionReason = "KYC verification complete, Plaid linking NOT complete.";
    } else if (!investmentScheduleCompleted) {
      targetRoute = '/investment-schedule';
      decisionReason = "Plaid linked, investment schedule NOT complete.";
    } else if (!investmentConfirmationCompleted) {
      targetRoute = '/investment-confirmation';
      decisionReason = "Investment schedule complete, investment confirmation NOT complete.";
    } else {
      targetRoute = '/tabs/tab1';
      decisionReason = "All onboarding steps complete - directing to home page.";
    }

    const currentBaseUrl = this.router.url.split('?')[0].split('#')[0];
    
    // Navigate if we're not already on the target route
    if (targetRoute && currentBaseUrl !== targetRoute) {
      console.log(`[AppComponent] DECISION: ${decisionReason} Navigating to ${targetRoute}.`);
      this.router.navigateByUrl(targetRoute, { replaceUrl: true });
    } else if (targetRoute && currentBaseUrl === targetRoute) {
      console.log(`[AppComponent] DECISION: ${decisionReason} Already on target route ${targetRoute}. No navigation needed.`);
    }

    // Log the current user state for debugging
    console.log('📊 [AppComponent] Current user state (FROM BACKEND):', {
      getStartedCompleted,
      surveyInitialCompleted,
      fiPlanResultsCompleted,
      authFinalizeCompleted,
      kycVerificationCompleted,
      linkPlaidCompleted,
      investmentScheduleCompleted,
      investmentConfirmationCompleted,
      targetRoute,
      currentUrl: this.router.url
    });
  }

  checkSurveyStatusAndNavigate(): void {
    // Use unified progress that works both pre-auth (localStorage) and post-auth (database)
    const progress = this.authService.getUnifiedProgress();
    
    console.log("------------------------------------------");
    console.log("[AppComponent] checkSurveyStatusAndNavigate CALLED (UNIFIED)");
    console.log("  Current Router URL:", this.router.url);
    console.log("  UNIFIED PROGRESS:", progress);
    console.log("  Is Authenticated:", this.authService.isAuthenticated());
    console.log("------------------------------------------");

    // Use the same navigation logic as navigateBasedOnProgress
    this.navigateBasedOnProgress(progress);
  }
}