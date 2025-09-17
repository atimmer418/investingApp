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
    
    // this.simulateUserLogin('andrew3@msn.com');           // Login by email
    // this.simulateUserLogin('', 'user_handle_123');        // Login by user_handle  
    // this.simulateUserLogin('test@test.com');              // Login as different user
    
    // OR navigate directly to any page for testing (bypasses auth entirely):
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
        // User is not logged in, redirect to login
        console.log('[AppComponent] User not logged in, redirecting to get-started');
        this.router.navigate(['/get-started'], { replaceUrl: true });
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
    
    // Use the ACTUAL progress data from the backend, not localStorage
    const getStartedCompleted = true; // If we have progress data, get-started is done
    const initialSurveyCompleted = progress.initialSurveyCompleted;
    const linkplaidCompleted = progress.linkplaidCompleted;
    const investmentSurveyCompleted = progress.investmentSurveyCompleted;
    const choseToPickStocks = progress.choseToPickStocks;
    const stockSelectionCompleted = progress.stockSelectionCompleted;
    const investmentConfirmationCompleted = progress.investmentConfirmationCompleted;

    let targetRoute: string | null = null;
    let decisionReason: string = "";

    if (!initialSurveyCompleted) {
      targetRoute = '/survey';
      decisionReason = "Initial survey NOT complete.";
    } else if (!linkplaidCompleted) {
      targetRoute = '/link-bank';
      decisionReason = "Initial survey complete, Plaid linking NOT complete.";
    } else if (!investmentSurveyCompleted) {
      targetRoute = '/survey';
      decisionReason = "Plaid linked, Investment setup survey NOT complete.";
    } else if (choseToPickStocks && !stockSelectionCompleted) {
      targetRoute = '/manual-stock-selection';
      decisionReason = "User chose to pick stocks, but stock selection page NOT complete.";
    } else if (!investmentConfirmationCompleted) {
      targetRoute = '/confirm-investment';
      decisionReason = "Investment process done, Investment confirmation NOT complete.";
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
    }

    // Log the current user state for debugging
    console.log('📊 [AppComponent] Current user state (FROM BACKEND):', {
      getStartedCompleted,
      initialSurveyCompleted, 
      linkplaidCompleted,
      investmentSurveyCompleted,
      choseToPickStocks,
      stockSelectionCompleted,
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
      targetRoute = '/survey';
      decisionReason = "Initial survey NOT complete.";
    } else if (!linkplaidCompleted) {
      targetRoute = '/link-bank';
      decisionReason = "Initial survey complete, Plaid linking NOT complete.";
    } else if (!investmentSurveyCompleted) {
      targetRoute = '/survey';
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