import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular/standalone'; 
import { SplashScreen } from '@capacitor/splash-screen';
import { register } from 'swiper/element/bundle';
import { AuthService, UserProgress } from './services/auth.service';
import { JwtTokenUtils } from './utils/jwt-token.utils';

register();

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet, CommonModule], // Added Platform to imports
})
export class AppComponent implements OnInit {
  constructor(
    private router: Router,
    private platform: Platform,
    private authService: AuthService
  ) {
    this.initializeApp();
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
    
    // 🧪 SIMULATE EXISTING USER - Login as any user from your database
    // First, check your database users by visiting: http://localhost:8080/api/dev/list-users
    // Then uncomment ONE of these to simulate logging in as that user:
    
    // this.simulateUserLogin('heywoah@msn.com');           // Login by email
    // this.simulateUserLogin('', 'user_handle_123');        // Login by user_handle  
    // this.simulateUserLogin('test@test.com');              // Login as different user
    
    // OR navigate directly to any page for testing (bypasses auth entirely):
    // this.router.navigate(['/confirm-investment'], { replaceUrl: true });
    // this.router.navigate(['/investment-schedule'], { replaceUrl: true });
    // this.router.navigate(['/manual-stock-selection'], { replaceUrl: true });
    // this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
    
    // 🚫 COMMENT OUT AUTH LOGIC WHEN TESTING SPECIFIC PAGES
    // Subscribe to authentication state changes
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        // User is logged in, wait for progress data
        this.authService.userProgress$.subscribe(progress => {
          if (progress) {
            this.navigateBasedOnProgress(progress);
          }
        });
      } else {
        // User is not logged in
        // Check if device supports passkeys and prompt for re-authentication
        if (this.authService.shouldPromptForPasskeyReauth() && this.authService.supportsPasskeys()) {
          console.log('[AppComponent] JWT expired, prompting for passkey re-authentication');
          // TODO: Implement actual passkey authentication call
          // For now, just navigate to get-started
          this.router.navigate(['/get-started'], { replaceUrl: true });
        } else {
          // No passkey support or other reason - go to get-started
          console.log('[AppComponent] User not logged in, redirecting to get-started');
          this.router.navigate(['/get-started'], { replaceUrl: true });
        }
      }
    });
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

  navigateBasedOnProgress(progress: UserProgress): void {
    console.log('🚀 [AppComponent] navigateBasedOnProgress called with actual user progress:', progress);
    
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
      targetRoute = '/surveyinitial';
      decisionReason = "Get started complete, initial survey NOT complete.";
    } else if (!fiPlanResultsCompleted) {
      targetRoute = '/fi-plan-results';
      decisionReason = "Initial survey complete, FI plan results NOT complete.";
    } else if (!authFinalizeCompleted) {
      targetRoute = '/authfinalize';
      decisionReason = "FI plan results complete, auth finalize NOT complete.";
    } else if (!kycVerificationCompleted) {
      targetRoute = '/kyc-verification';
      decisionReason = "Auth finalize complete, KYC verification NOT complete.";
    } else if (!linkPlaidCompleted) {
      targetRoute = '/linkplaid';
      decisionReason = "KYC verification complete, Plaid linking NOT complete.";
    } else if (!investmentScheduleCompleted) {
      targetRoute = '/investment-schedule';
      decisionReason = "Plaid linked, investment schedule NOT complete.";
    } else if (!investmentConfirmationCompleted) {
      targetRoute = '/investmentconfirmation';
      decisionReason = "Investment schedule complete, investment confirmation NOT complete.";
    } else {
      targetRoute = '/tabs/tab1';
      decisionReason = "All onboarding steps complete - directing to home page.";
    }

    const currentBaseUrl = this.router.url.split('?')[0].split('#')[0];
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
    const getStartedCompleted = localStorage.getItem('getStartedCompleted') === 'true';
    const initialSurveyCompleted = localStorage.getItem('initialSurveyCompleted') === 'true';
    const linkplaidCompleted = localStorage.getItem('linkplaidCompleted') === 'true';
    const investmentSurveyCompleted = localStorage.getItem('investmentSurveyCompleted') === 'true';
    const choseToPickStocks = localStorage.getItem('choseToPickStocks') === 'true';
    const stockSelectionActualCompletion = localStorage.getItem('stockSelectionCompleted') === 'true';
    const investmentConfirmationCompleted = localStorage.getItem('investmentConfirmationCompleted') === 'true';

    console.log("------------------------------------------");
    console.log("[AppComponent] checkSurveyStatusAndNavigate CALLED");
    console.log("  Current Router URL:", this.router.url);
    console.log("  FLAGS FROM LOCALSTORAGE:");
    console.log("    getStartedCompleted:", getStartedCompleted);
    console.log("    initialSurveyCompleted:", initialSurveyCompleted);
    console.log("    linkplaidCompleted:", linkplaidCompleted);
    console.log("    investmentSurveyCompleted:", investmentSurveyCompleted);
    console.log("    choseToPickStocks:", choseToPickStocks);
    console.log("    stockSelectionActualCompletion:", stockSelectionActualCompletion);
    console.log("    investmentConfirmationCompleted:", investmentConfirmationCompleted);
    console.log("------------------------------------------");

    let targetRoute: string | null = null;
    let decisionReason: string = "";

    if (!getStartedCompleted) {
      targetRoute = '/get-started';
      decisionReason = "Get Started NOT complete.";
    } else if (!initialSurveyCompleted) {
      targetRoute = '/initial-survey';
      decisionReason = "Initial survey NOT complete.";
    } else if (!linkplaidCompleted) {
      targetRoute = '/link-bank';
      decisionReason = "Initial survey complete, Plaid linking NOT complete.";
    } else if (!investmentSurveyCompleted) {
      targetRoute = '/confirm-investment';
      decisionReason = "Plaid linked, Investment setup survey NOT complete.";
    } else if (choseToPickStocks && !stockSelectionActualCompletion) {
      targetRoute = '/stock-selection';
      decisionReason = "User chose to pick stocks, but stock selection page NOT complete.";
    } else if (!investmentConfirmationCompleted) {
      targetRoute = '/confirm-investment';
      decisionReason = "Investment process (auto or custom picks defined) done, Investment confirmation NOT complete.";
    } else {
      targetRoute = '/tabs/tab1';
      decisionReason = "All onboarding steps complete.";
    }

    const currentBaseUrl = this.router.url.split('?')[0].split('#')[0];
    if (targetRoute && currentBaseUrl !== targetRoute) {
      console.log(`[AppComponent] DECISION: ${decisionReason} Navigating to ${targetRoute}.`);
      this.router.navigateByUrl(targetRoute, { replaceUrl: true });
    } else if (targetRoute && currentBaseUrl === targetRoute) {
      console.log(`[AppComponent] DECISION: ${decisionReason} Already on target route ${targetRoute}. No navigation needed.`);
    } else {
      console.log(`[AppComponent] No specific navigation target determined or already on target. Current URL: ${this.router.url}`);
    }
  }
}