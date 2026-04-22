import { Injectable, Injector } from '@angular/core';
import { App, AppState } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Platform, ModalController } from '@ionic/angular/standalone';
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

  // Use Injector to break circular dependency (AppLockService ↔ AuthService)
  private _authService: any;

  constructor(
    private platform: Platform,
    private modalController: ModalController,
    private injector: Injector
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
    this.platform.ready().then(async () => {
      App.addListener('appStateChange', (state: AppState) => {
        this.handleAppStateChange(state);
      });
      this.startPeriodicCheck();
      // Cold start: appStateChange never fires on fresh launch, so check immediately.
      await this.checkLockOnResume();
    });
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
      // App went to background — cover the view so iOS snapshot is white
      // and WKWebView's repaint cycle is hidden on resume.
      this.showAppCover();
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
    let cover = document.getElementById('app-resume-cover');
    if (!cover) {
      cover = document.createElement('div');
      cover.id = 'app-resume-cover';
      cover.style.cssText = 'position:fixed;inset:0;background:#ffffff;z-index:99999;pointer-events:none;display:flex;align-items:center;justify-content:center;';
      cover.innerHTML = '<span style="font-family:Manrope,sans-serif;font-size:16px;color:#6b7280;">this will be the loading screen</span>';
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

    this.lockWasShownThisResume = true;
    this.hideAppCover(); // Always clear the cover so the modal isn't blocked
    this.isLockedSubject.next(true);
    this.isModalOpen = true;

    const modal = await this.modalController.create({
      component: PasskeyPromptComponent,
      componentProps: {
        jwtExpired,
        userEmail: localStorage.getItem('userEmail') ?? undefined
      },
      backdropDismiss: false,
      keyboardClose: false,
      cssClass: 'full-screen-modal'
    });

    await modal.present();
    this.hideNativeOverlay(); // Native overlay removed once lock modal is fully visible

    const { data } = await modal.onDidDismiss();
    
    this.isModalOpen = false;
    
    if (data && data.authenticated) {
      this.unlockApp();
    } else {
      // Should not happen if backdropDismiss is false, but just in case
      // Maybe force logout?
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
