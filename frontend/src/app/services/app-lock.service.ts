import { Injectable } from '@angular/core';
import { App, AppState } from '@capacitor/app';
import { BehaviorSubject } from 'rxjs';
import { Platform, ModalController } from '@ionic/angular/standalone';
import { PasskeyPromptComponent } from '../components/passkey-prompt/passkey-prompt.component';
import { JwtTokenUtils } from '../utils/jwt-token.utils';

@Injectable({
  providedIn: 'root'
})
export class AppLockService {
  private isLockedSubject = new BehaviorSubject<boolean>(false);
  public isLocked$ = this.isLockedSubject.asObservable();
  
  private readonly LOCK_ENABLED_KEY = 'app_lock_enabled';
  private readonly INACTIVITY_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
  
  private lastActiveTime: number = Date.now();
  private isModalOpen = false;
  private inactivityCheckInterval: any;

  constructor(
    private platform: Platform,
    private modalController: ModalController
  ) {
    this.init();
  }

  private init() {
    this.platform.ready().then(() => {
      App.addListener('appStateChange', (state: AppState) => {
        this.handleAppStateChange(state);
      });

      // Start periodic check for inactivity while app is open
      this.startInactivityCheck();
    });
  }

  private startInactivityCheck() {
    // Check every minute
    this.inactivityCheckInterval = setInterval(() => {
      this.checkInactivityWhileForeground();
    }, 60 * 1000); 
  }

  private async checkInactivityWhileForeground() {
    // If already locked or app lock is enabled (which locks on resume anyway), skip
    // Actually, if App Lock is enabled, we might still want to lock if they leave the screen on for > 1 hour?
    // The requirement says: "if a user has been active on the frontend but not the backend... when the timer expires, the user should see the app lock screen"
    
    // Only check if logged in
    const token = JwtTokenUtils.getValidJwtToken();
    if (!token) return;

    const now = Date.now();
    if (now - this.lastActiveTime > this.INACTIVITY_THRESHOLD_MS) {
      console.log('Inactivity threshold exceeded while in foreground. Locking app.');
      await this.lockApp();
    }
  }

  public updateLastActiveTime() {
    this.lastActiveTime = Date.now();
  }

  private async handleAppStateChange(state: AppState) {
    if (!state.isActive) {
      // App went to background
      this.lastActiveTime = Date.now();
    } else {
      // App came to foreground
      await this.checkLockRequirement();
    }
  }

  private async checkLockRequirement() {
    // Only lock if user is logged in (has a token)
    const token = JwtTokenUtils.getValidJwtToken();
    if (!token) {
      return;
    }

    if (this.isEnabled()) {
      // App Lock Enabled: Always lock on resume
      await this.lockApp();
    } else {
      // App Lock Disabled: Check inactivity
      const now = Date.now();
      if (now - this.lastActiveTime > this.INACTIVITY_THRESHOLD_MS) {
        console.log('Inactivity threshold exceeded. Locking app.');
        await this.lockApp();
      }
    }
  }

  async lockApp() {
    if (this.isModalOpen) return;

    this.isLockedSubject.next(true);
    this.isModalOpen = true;

    const modal = await this.modalController.create({
      component: PasskeyPromptComponent,
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
