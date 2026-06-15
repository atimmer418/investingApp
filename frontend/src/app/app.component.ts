import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular/standalone';
import { SplashScreen } from '@capacitor/splash-screen';
import { register } from 'swiper/element/bundle';
import { AuthService, UserProgress } from './services/auth.service';
import { AppLockService } from './services/app-lock.service';
import { PasskeyService } from './services/passkey.service';
import { PushNotificationService } from './services/push-notification.service';
import { environment } from '../environments/environment';
import { combineLatest, debounceTime, distinctUntilChanged, filter, Subject, throttleTime } from 'rxjs';
import { addIcons } from 'ionicons';
import { lockClosedOutline, fingerPrintOutline } from 'ionicons/icons';

register();

const ROUTE_IMAGE_PRELOADS: Record<string, string[]> = {
  '/survey-initial': ['/assets/images/whenPiggybanksFly-3.jpg'],
};

const CRITICAL_FONT_SPECS = [
  '700 16px "Manrope"',
  '400 24px "Material Symbols Outlined"',
];

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet, CommonModule],
})
export class AppComponent implements OnInit {

  private userActivity$ = new Subject<void>();

  constructor(
    private router: Router,
    private platform: Platform,
    private authService: AuthService,
    private appLockService: AppLockService,
    private passkeyService: PasskeyService,
    private pushNotificationService: PushNotificationService
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
          await this.waitForCoverImageReady();
          await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
          await SplashScreen.hide({ fadeOutDuration: 0 });
        } catch (error) {
          console.error('[AppComponent] Error hiding splash screen:', error);
        }
      }
      this.pushNotificationService.registerDeviceToken().catch(() => {});
    });
  }

  private waitForCoverImageReady(): Promise<void> {
    return new Promise(resolve => {
      const cover = document.getElementById('app-resume-cover');
      const img = cover?.querySelector('img') as HTMLImageElement | null;
      if (!img) { resolve(); return; }
      if (img.complete && img.naturalWidth > 0) { resolve(); return; }

      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };

      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
      setTimeout(finish, 300);
    });
  }

  ngOnInit(): void {
    document.addEventListener('focusin', (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
      }
    });

    // Skip navigation logic for testing (add ?testing=true to URL)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('testing') === 'true') {
      return;
    }

    // In dev mode, simulate login as an existing user BEFORE setting up navigation
    // This prevents the race condition where navigation fires before auth completes
    if (!environment.production) {
      // this.simulateUserLogin('facebook@gmail.com');
      // this.simulateUserLogin('', 'user_handle_123');
      // this.simulateUserLogin('test@test.com');
    }

    // DEV ONLY: ?devPage=/some-route logs in as the default dev user and then navigates
    // directly to the specified page (bypasses navigateBasedOnProgress).
    // e.g. http://localhost:8100?devPage=/survey-initial
    const devPage = !environment.production ? urlParams.get('devPage') : null;
    if (devPage) {
      this.simulateUserLoginToPage('facebook@gmail.com', devPage);
      return;
    }

    // On background resume with no lock needed: re-check current route so
    // navigateBasedOnProgress() can hide the cover (same-route early return or navigation).
    this.appLockService.resumeNoLock$.subscribe(() => {
      requestAnimationFrame(() => this.checkSurveyStatusAndNavigate());
    });

    // Emergency safety net: if the cover is still visible after 12 s (e.g. the dev
    // server restarted and loadUserProgress() timed out before the timeout operator was
    // introduced, or any other stuck-cover edge case) force-hide it so the user is
    // never permanently trapped behind a white screen. Skip if the app is locked
    // (passkey modal is up) — that modal owns the screen intentionally.
    setTimeout(() => {
      if (!this.appLockService.isCurrentlyLocked()) {
        this.appLockService.hideAllCovers();
      }
    }, 12_000);

    // Set up the single navigation subscription
    this.setupNavigationLogic();
  }

  /**
   * DEV ONLY: Simulate logging in as an existing user.
   * Only calls handleSuccessfulAuthentication (which stores JWT once and loads progress once).
   */
  /** DEV ONLY: Log in as a dev user and navigate directly to a specific page. */
  private simulateUserLoginToPage(email: string, page: string): void {
    this.authService.logout();
    this.authService.authenticateAsUser(email).subscribe({
      next: (response) => {
        if (response?.success && response.jwtToken) {
          this.authService.handleSuccessfulAuthentication(response.jwtToken, response.id!, response.email!);
          this.router.navigateByUrl(page, { replaceUrl: true }).finally(() => {
            this.appLockService.hideAllCovers();
          });
        }
      },
      error: () => this.router.navigate(['/get-started'], { replaceUrl: true })
    });
  }

  private simulateUserLogin(email?: string, userHandle?: string): void {
    // Clear any stale session so AppLockService doesn't race ahead and show the passkey modal
    // while the HTTP request is in-flight.
    this.authService.logout();
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
      this.authService.userProgress$,
      this.authService.reAuthInProgress$
    ]).pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) => {
        return prev[0] === curr[0] &&
          JSON.stringify(prev[1]) === JSON.stringify(curr[1]) &&
          prev[2] === curr[2];
      }),
      filter(([isLoggedIn, progress, reAuthInProgress]) => {
        // Defer while a reauth ceremony is in flight
        if (!isLoggedIn && reAuthInProgress) return false;
        // Always process when not logged in (and no reauth pending)
        if (!isLoggedIn) return true;
        // When logged in, only process if we have progress data
        return progress !== null;
      })
    ).subscribe(([isLoggedIn, progress]) => {
      if (isLoggedIn && progress) {
        // A logged-in user has passed auth-finalize; their real progress lives in the DB.
        // If we only have the localStorage FALLBACK (DB load failed after retries), do NOT
        // route by it — an all-false fallback would eject a real user to /get-started.
        if (progress._source === 'localStorageFallback') {
          this.holdAuthenticatedUserOnFallback();
        } else {
          this.navigateBasedOnProgress(progress);
        }
      } else if (!isLoggedIn) {
        const unifiedProgress = this.authService.getUnifiedProgress();
        const hasAnyProgress = unifiedProgress.getStartedCompleted ||
          unifiedProgress.surveyInitialCompleted ||
          unifiedProgress.fiPlanResultsCompleted;

        if (hasAnyProgress) {
          this.navigateBasedOnProgress(unifiedProgress);
        } else {
          this.router.navigate(['/get-started'], { replaceUrl: true }).finally(() => {
            this.hideCoversWhenReady('/get-started');
          });
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
      this.hideCoversWhenReady(targetRoute);
      return;
    }

    // Don't interrupt mid-recovery — user is unauthenticated by design on this route
    if (currentBaseUrl === '/recovery') {
      this.hideCoversWhenReady('/recovery');
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
        this.hideCoversWhenReady(currentBaseUrl);
        return;
      }
    }

    this.router.navigateByUrl(targetRoute, { replaceUrl: true }).finally(() => {
      this.hideCoversWhenReady(targetRoute);
    });
  }

  private hideCoversWhenReady(targetRoute?: string): void {
    const route = (targetRoute ?? this.router.url).split('?')[0].split('#')[0];
    this.preloadAssetsForRoute(route).then(() => {
      requestAnimationFrame(() => this.appLockService.hideAllCovers());
    });
  }

  private preloadAssetsForRoute(route: string): Promise<void> {
    const fontPromises = CRITICAL_FONT_SPECS.map(spec =>
      document.fonts.load(spec).catch(() => undefined)
    );

    const imagePromises = (ROUTE_IMAGE_PRELOADS[route] ?? []).map(src =>
      new Promise<void>(resolve => {
        const img = new Image();
        img.src = src;
        const finish = () => resolve();
        if (typeof img.decode === 'function') {
          img.decode().then(finish, finish);
        } else {
          img.addEventListener('load', finish, { once: true });
          img.addEventListener('error', finish, { once: true });
        }
      })
    );

    const allReady = Promise.all([...fontPromises, ...imagePromises]).then(() => {});
    const safetyTimeout = new Promise<void>(r => setTimeout(r, 1500));
    return Promise.race([allReady, safetyTimeout]);
  }

  checkSurveyStatusAndNavigate(): void {
    const progress = this.authService.getCurrentProgress();
    if (!progress) {
      // Progress is still loading from backend (userProgress$ was reset to null by
      // handleSuccessfulAuthentication). resumeNoLock$ already confirmed no lock is
      // needed, so hide the cover now rather than waiting for setupNavigationLogic.
      this.hideCoversWhenReady();
      return;
    }
    this.navigateBasedOnProgress(progress);
  }

  /**
   * An authenticated user whose progress could only be resolved from the all-false
   * localStorage FALLBACK (DB load failed after retries) must never be routed by it.
   * A valid token means they are past auth-finalize, so they belong in the app — keep
   * them where they are if already on a real route, else default to the app home.
   */
  private holdAuthenticatedUserOnFallback(): void {
    const currentBaseUrl = this.router.url.split('?')[0].split('#')[0];
    const onboardingRoutes = [
      '/get-started', '/survey-initial', '/fi-plan-results',
      '/auth-finalize', '/kyc-verification', '/link-bank',
      '/investment-schedule', '/investment-confirmation', '/', ''
    ];
    if (onboardingRoutes.includes(currentBaseUrl)) {
      this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true })
        .finally(() => this.hideCoversWhenReady('/tabs/tab1'));
    } else {
      this.hideCoversWhenReady(currentBaseUrl);
    }
  }
}