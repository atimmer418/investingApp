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
import { environment } from '../environments/environment';
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

    // Setup activity tracker with throttling to avoid performance issues
    this.userActivity$.pipe(
      throttleTime(60000) // limit to once every 60 seconds
    ).subscribe(() => {
      this.appLockService.updateLastActiveTime();
    });

    this.initializeApp();
  }

  @HostListener('window:touchstart')
  @HostListener('window:touchmove')
  @HostListener('window:scroll')
  @HostListener('window:click')
  @HostListener('window:keydown')
  onUserActivity() {
    this.userActivity$.next();
  }

  initializeApp() {
    this.platform.ready().then(async () => {
      if (this.platform.is('capacitor')) {
        try {
          await SplashScreen.hide();
        } catch (error) {
          console.error('[AppComponent] Error hiding splash screen:', error);
        }
      }
    });
  }

  ngOnInit(): void {
    // Skip navigation logic for testing (add ?testing=true to URL)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('testing') === 'true') {
      return;
    }

    // In dev mode, simulate login as an existing user BEFORE setting up navigation
    // This prevents the race condition where navigation fires before auth completes
    if (!environment.production) {
      this.simulateUserLogin('facebook@gmail.com');
      // this.simulateUserLogin('', 'user_handle_123');
      // this.simulateUserLogin('test@test.com');
    }

    // Set up the single navigation subscription
    this.setupNavigationLogic();
  }

  /**
   * DEV ONLY: Simulate logging in as an existing user.
   * Only calls handleSuccessfulAuthentication (which stores JWT once and loads progress once).
   */
  private simulateUserLogin(email?: string, userHandle?: string): void {
    this.authService.authenticateAsUser(email, userHandle).subscribe({
      next: (response) => {
        if (response?.success && response.jwtToken) {
          // Single call — stores JWT and loads progress in one flow
          this.authService.handleSuccessfulAuthentication(response.jwtToken, response.id!, response.email!);
        } else {
          console.error('[AppComponent] Dev auth failed:', response?.message);
          this.router.navigate(['/get-started'], { replaceUrl: true });
        }
      },
      error: () => {
        this.router.navigate(['/get-started'], { replaceUrl: true });
      }
    });
  }

  /**
   * Single unified navigation subscription.
   * Combines auth state + progress into one stream, navigates exactly once per state change.
   */
  private setupNavigationLogic(): void {
    combineLatest([
      this.authService.isLoggedIn$,
      this.authService.userProgress$
    ]).pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) => {
        return prev[0] === curr[0] &&
          JSON.stringify(prev[1]) === JSON.stringify(curr[1]);
      }),
      filter(([isLoggedIn, progress]) => {
        // Always process when not logged in
        if (!isLoggedIn) return true;
        // When logged in, only process if we have progress data
        return progress !== null;
      })
    ).subscribe(([isLoggedIn, progress]) => {
      if (isLoggedIn && progress) {
        this.navigateBasedOnProgress(progress);
      } else if (!isLoggedIn && !this.authService.isReAuthInProgress()) {
        const unifiedProgress = this.authService.getUnifiedProgress();
        const hasAnyProgress = unifiedProgress.getStartedCompleted ||
          unifiedProgress.surveyInitialCompleted ||
          unifiedProgress.fiPlanResultsCompleted;

        if (hasAnyProgress) {
          this.navigateBasedOnProgress(unifiedProgress);
        } else {
          this.router.navigate(['/get-started'], { replaceUrl: true });
        }
      }
    });
  }

  navigateBasedOnProgress(progress: UserProgress): void {
    let targetRoute: string;

    // Follow the exact user flow order
    if (!progress.getStartedCompleted) {
      targetRoute = '/get-started';
    } else if (!progress.surveyInitialCompleted) {
      targetRoute = '/survey-initial';
    } else if (!progress.fiPlanResultsCompleted) {
      targetRoute = '/fi-plan-results';
    } else if (!progress.authFinalizeCompleted) {
      targetRoute = '/auth-finalize';
    } else if (!progress.kycVerificationCompleted) {
      targetRoute = '/kyc-verification';
    } else if (!progress.linkPlaidCompleted) {
      targetRoute = '/link-bank';
    } else if (!progress.investmentScheduleCompleted) {
      targetRoute = '/investment-schedule';
    } else if (!progress.investmentConfirmationCompleted) {
      targetRoute = '/investment-confirmation';
    } else {
      targetRoute = '/tabs/tab1';
    }

    const currentBaseUrl = this.router.url.split('?')[0].split('#')[0];

    // Don't navigate if already on the target route
    if (currentBaseUrl === targetRoute) {
      return;
    }

    // If fully onboarded, only redirect away from onboarding pages (let user stay on /my-profile, /tabs/tab2, etc.)
    if (targetRoute === '/tabs/tab1') {
      const onboardingRoutes = [
        '/get-started', '/survey-initial', '/fi-plan-results',
        '/auth-finalize', '/kyc-verification', '/link-bank',
        '/investment-schedule', '/investment-confirmation', '/'
      ];
      if (!onboardingRoutes.includes(currentBaseUrl)) {
        return;
      }
    }

    this.router.navigateByUrl(targetRoute, { replaceUrl: true });
  }

  checkSurveyStatusAndNavigate(): void {
    const progress = this.authService.getUnifiedProgress();
    this.navigateBasedOnProgress(progress);
  }
}