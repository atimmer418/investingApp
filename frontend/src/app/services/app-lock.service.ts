import { Injectable, Injector } from '@angular/core';
import { App, AppState } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Platform, ModalController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { PasskeyPromptComponent } from '../components/passkey-prompt/passkey-prompt.component';
import { JwtTokenUtils } from '../utils/jwt-token.utils';
import { AuthService } from './auth.service';

const LoadingOverlay = registerPlugin<{ hide(): Promise<void> }>('LoadingOverlay');

@Injectable({
  providedIn: 'root'
})
export class AppLockService {
  private isLockedSubject = new BehaviorSubject<boolean>(false);
  public isLocked$ = this.isLockedSubject.asObservable();

  /** Emits when app resumes from background without needing a lock screen. */
  private resumeNoLockSubject = new Subject<void>();
  public resumeNoLock$ = this.resumeNoLockSubject.asObservable();

  /** Set inside lockApp() so handleAppStateChange can detect whether a lock was shown. */
  private lockWasShownThisResume = false;
  
  private readonly LOCK_ENABLED_KEY = 'app_lock_enabled';

  /**
   * How recently the user must have interacted to be considered "active"
   * for token refresh purposes. If user hasn't touched the app in 5 min,
   * we stop refreshing — letting the JWT expire naturally (which triggers the lock).
   */
  private readonly REFRESH_ACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  
  private lastActiveTime: number = Date.now();
  private lastUnlockTime: number = 0;
  private isModalOpen = false;
  private checkInterval: any;
  private failedLockRetries = 0;
  private readonly MAX_LOCK_RETRIES = 2;
  private initWatchdog: any;

  // Use Injector to break circular dependency (AppLockService ↔ AuthService)
  private _authService: any;

  constructor(
    private platform: Platform,
    private modalController: ModalController,
    private injector: Injector,
    private router: Router
  ) {
    this.init();
  }

  private getAuthService(): AuthService {
    if (!this._authService) {
      this._authService = this.injector.get(AuthService);
    }
    return this._authService;
  }

  private init() {
    // Watchdog: if platform.ready() is very slow or never resolves and reAuthInProgress
    // is blocking navigation, call lockApp directly so the cover gets hidden.
    this.initWatchdog = setTimeout(async () => {
      const auth = this.getAuthService();
      if (!this.isModalOpen && auth.isReAuthInProgress() && this.isUserLoggedIn()) {
        console.warn('[AppLockService] Init watchdog fired — lockApp was never reached');
        try {
          await this.lockApp(true);
        } catch (e) {
          console.error('[AppLockService] Watchdog lockApp failed, falling back to recovery', e);
          this.forceRecovery();
        }
      }
    }, 10_000);

    this.platform.ready().then(async () => {
      App.addListener('appStateChange', (state: AppState) => {
        this.handleAppStateChange(state);
      });
      this.startPeriodicCheck();
      // Cold start: appStateChange never fires on fresh launch, so check immediately.
      await this.checkLockOnResume();
    }).catch(async (err) => {
      console.error('[AppLockService] platform.ready() failed', err);
      clearTimeout(this.initWatchdog);
      try {
        await this.lockApp(true);
      } catch (e) {
        console.error('[AppLockService] lockApp after platform.ready() failure failed', e);
        this.forceRecovery();
      }
    });
  }

  private forceRecovery(): void {
    this.getAuthService().logout();
    this.hideAllCovers();
    this.router.navigateByUrl('/auth-finalize', { replaceUrl: true });
  }

  /**
   * Every 60 seconds:
   * 1. If user is active and token is expiring soon → refresh token
   * 2. If token has expired → lock app (passkey reauth will issue a new JWT)
   */
  private startPeriodicCheck() {
    this.checkInterval = setInterval(() => {
      this.checkTokenRefresh();
      this.checkTokenExpiry();
    }, 60 * 1000);
  }

  /**
   * Proactively refresh the JWT if user was active within the last 5 minutes
   * AND the token is within 15 minutes of expiry. This keeps the token alive
   * while the user is actively using the app.
   *
   * Once the user stops interacting, the token stops refreshing and will
   * eventually expire — which triggers the lock screen.
   */
  private checkTokenRefresh() {
    if (!JwtTokenUtils.getValidJwtToken()) return;

    const now = Date.now();
    const recentlyActive = (now - this.lastActiveTime) < this.REFRESH_ACTIVITY_THRESHOLD_MS;

    if (recentlyActive && JwtTokenUtils.shouldRefreshToken()) {
      this.getAuthService().refreshToken().subscribe();
    }
  }

  /**
   * If the JWT has expired and the user was previously logged in, lock the app.
   * This is the primary lock trigger — the JWT expiry IS the session timeout.
   * Passkey reauth endpoints are permitAll, so they work without a valid JWT.
   */
  private async checkTokenExpiry() {
    if (!this.isUserLoggedIn()) return;

    if (!JwtTokenUtils.getValidJwtToken()) {
      await this.lockApp(true);
    }
  }

  /** Check if the user has an active session (regardless of token validity) */
  private isUserLoggedIn(): boolean {
    return !!localStorage.getItem('userId');
  }

  public updateLastActiveTime() {
    this.lastActiveTime = Date.now();
  }

  private async handleAppStateChange(state: AppState) {
    if (!state.isActive) {
      // Skip the cover if the auth modal is already open — the passkey/FaceID system
      // sheet briefly resigns app-active state, and covering here would bury the modal.
      if (!this.isModalOpen) {
        this.showAppCover();
      }
      this.lastActiveTime = Date.now();
    } else {
      this.lockWasShownThisResume = false;
      await this.checkLockOnResume();
      if (!this.lockWasShownThisResume) {
        // No lock was needed — signal AppComponent to check the current route.
        // The cover will be hidden inside navigateBasedOnProgress() (same route
        // early-return or after navigateByUrl resolves).
        this.resumeNoLockSubject.next();
      }
      // If lock was shown: lockApp() already hid the cover, and auth +
      // handleSuccessfulAuthentication() will drive navigation which hides it.
    }
  }

  showAppCover() {
    if (!this.platform.is('capacitor')) return;
    (document.activeElement as HTMLElement)?.blur();
    let cover = document.getElementById('app-resume-cover');
    if (!cover) {
      cover = document.createElement('div');
      cover.id = 'app-resume-cover';
      cover.style.cssText = 'position:fixed;inset:0;background:#ffffff;z-index:99999;pointer-events:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none;-webkit-tap-highlight-color:transparent;display:flex;align-items:center;justify-content:center;';
      const img = document.createElement('img');
      img.src = 'assets/images/fred-logo.svg';
      img.draggable = false;
      img.style.cssText = 'width:200px;height:200px;object-fit:contain;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none;pointer-events:none;';
      cover.appendChild(img);
      document.body.appendChild(cover);
    }
    cover.style.display = 'flex';
  }

  hideAppCover() {
    const cover = document.getElementById('app-resume-cover');
    if (cover) cover.style.display = 'none';
  }

  /** Hides the native iOS loading overlay. No-op on non-iOS platforms. */
  hideNativeOverlay(): void {
    if (this.platform.is('capacitor') && this.platform.is('ios')) {
      LoadingOverlay.hide().catch(() => {});
    }
  }

  /** Hides both the JS cover div and the native iOS overlay. Use this instead of hideAppCover() when content is ready to show. */
  hideAllCovers(): void {
    this.hideAppCover();
    this.hideNativeOverlay();
  }

  /**
   * When app returns to foreground:
   * - If App Lock is enabled: always lock (security setting)
   * - Otherwise: lock if JWT expired while in background
   */
  private async checkLockOnResume() {
    if (!this.isUserLoggedIn()) return;

    // Face ID briefly backgrounds the app while the prompt is shown.
    // Ignore the foreground event if we just unlocked within the last 3 seconds.
    if (Date.now() - this.lastUnlockTime < 3000) return;

    const jwtExpired = !JwtTokenUtils.getValidJwtToken();

    if (this.isEnabled()) {
      // App Lock setting ON: always require reauth on resume.
      // If JWT also expired, run the full FIDO2 ceremony so a fresh token is issued.
      await this.lockApp(jwtExpired);
    } else if (jwtExpired) {
      // Token expired while backgrounded → full passkey reauth to issue a new JWT.
      await this.lockApp(true);
    }
  }

  /** Synchronous check for current lock state */
  isCurrentlyLocked(): boolean {
    return this.isLockedSubject.getValue();
  }

  async lockApp(jwtExpired = false) {
    if (this.isModalOpen) {
      this.lockWasShownThisResume = true;
      return;
    }

    // If lockApp is running, the init watchdog is no longer needed
    clearTimeout(this.initWatchdog);

    this.lockWasShownThisResume = true;
    this.hideAppCover(); // Always clear the cover so the modal isn't blocked
    this.isLockedSubject.next(true);
    this.isModalOpen = true;

    // Safety net: if the modal's Lottie never fires its ready callback (asset 404,
    // lottie-web unavailable), remove the native overlay after 1500ms so the
    // app isn't permanently blocked behind it.
    const overlayFallback = setTimeout(() => this.hideNativeOverlay(), 1500);

    const modal = await this.modalController.create({
      component: PasskeyPromptComponent,
      componentProps: {
        jwtExpired,
        userEmail: localStorage.getItem('userEmail') ?? undefined,
        onLottieReady: () => {
          clearTimeout(overlayFallback);
          this.hideNativeOverlay();
        }
      },
      backdropDismiss: false,
      keyboardClose: false,
      animated: false,
      cssClass: 'full-screen-modal'
    });

    await modal.present();
    // Native overlay is now hidden by the onLottieReady callback once the modal's
    // Lottie has visibly rendered, guaranteeing a seamless native → web handoff.

    const { data } = await modal.onDidDismiss();

    this.isModalOpen = false;

    if (data && data.authenticated) {
      this.failedLockRetries = 0;
      this.unlockApp();
    } else {
      // Modal closed without a successful auth (abnormal — PasskeyPromptComponent never
      // dismisses on failure; it leaves the modal open with a retry button). Retry the
      // lock flow to give the user another chance before we give up on their session.
      if (this.failedLockRetries < this.MAX_LOCK_RETRIES) {
        this.failedLockRetries++;
        await this.lockApp(jwtExpired);
      } else {
        // Retry budget exhausted — clear session so the cold-start trap doesn't re-arm
        this.failedLockRetries = 0;
        this.forceRecovery();
      }
    }
  }

  private unlockApp() {
    this.isLockedSubject.next(false);
    this.lastActiveTime = Date.now();
    this.lastUnlockTime = Date.now();
  }

  isEnabled(): boolean {
    // Default to false if not set — app lock is opt-in
    const val = localStorage.getItem(this.LOCK_ENABLED_KEY);
    return val === null ? false : val === 'true';
  }

  setEnabled(enabled: boolean) {
    localStorage.setItem(this.LOCK_ENABLED_KEY, String(enabled));
  }
}
