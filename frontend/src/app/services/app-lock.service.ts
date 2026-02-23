import { Injectable, Injector } from '@angular/core';
import { App, AppState } from '@capacitor/app';
import { BehaviorSubject } from 'rxjs';
import { Platform, ModalController } from '@ionic/angular/standalone';
import { PasskeyPromptComponent } from '../components/passkey-prompt/passkey-prompt.component';
import { JwtTokenUtils } from '../utils/jwt-token.utils';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AppLockService {
  private isLockedSubject = new BehaviorSubject<boolean>(false);
  public isLocked$ = this.isLockedSubject.asObservable();
  
  private readonly LOCK_ENABLED_KEY = 'app_lock_enabled';

  /**
   * How recently the user must have interacted to be considered "active"
   * for token refresh purposes. If user hasn't touched the app in 5 min,
   * we stop refreshing — letting the JWT expire naturally (which triggers the lock).
   */
  private readonly REFRESH_ACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  
  private lastActiveTime: number = Date.now();
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
    this.platform.ready().then(() => {
      App.addListener('appStateChange', (state: AppState) => {
        this.handleAppStateChange(state);
      });
      this.startPeriodicCheck();
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
      await this.lockApp();
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
      // App went to background — record when they left
      this.lastActiveTime = Date.now();
    } else {
      // App came back to foreground
      await this.checkLockOnResume();
    }
  }

  /**
   * When app returns to foreground:
   * - If App Lock is enabled: always lock (security setting)
   * - Otherwise: lock if JWT expired while in background
   */
  private async checkLockOnResume() {
    if (!this.isUserLoggedIn()) return;

    if (this.isEnabled()) {
      // App Lock setting ON: always require reauth on resume
      await this.lockApp();
    } else if (!JwtTokenUtils.getValidJwtToken()) {
      // Token expired while backgrounded → lock
      await this.lockApp();
    }
  }

  async lockApp() {
    if (this.isModalOpen) return;

    this.isLockedSubject.next(true);
    this.isModalOpen = true;

    const modal = await this.modalController.create({
      component: PasskeyPromptComponent,
      componentProps: {
        userEmail: localStorage.getItem('userEmail') || undefined
      },
      backdropDismiss: false,
      keyboardClose: false,
      cssClass: 'full-screen-modal'
    });

    await modal.present();

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
  }

  isEnabled(): boolean {
    // Default to true if not set
    const val = localStorage.getItem(this.LOCK_ENABLED_KEY);
    return val === null ? true : val === 'true';
  }

  setEnabled(enabled: boolean) {
    localStorage.setItem(this.LOCK_ENABLED_KEY, String(enabled));
  }
}
