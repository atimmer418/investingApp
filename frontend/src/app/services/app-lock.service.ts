import { Injectable } from '@angular/core';
import { App, AppState } from '@capacitor/app';
import { BehaviorSubject } from 'rxjs';
import { Platform } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root'
})
export class AppLockService {
  private isLockedSubject = new BehaviorSubject<boolean>(false);
  public isLocked$ = this.isLockedSubject.asObservable();
  
  private readonly LOCK_ENABLED_KEY = 'app_lock_enabled';

  constructor(private platform: Platform) {
    this.init();
  }

  private init() {
    this.platform.ready().then(() => {
      App.addListener('appStateChange', (state: AppState) => {
        if (state.isActive) {
          // App came to foreground
          this.checkLock();
        }
      });
    });
  }

  private checkLock() {
    const enabled = this.isEnabled();
    if (enabled) {
      this.lock();
    }
  }

  lock() {
    this.isLockedSubject.next(true);
  }

  unlock() {
    this.isLockedSubject.next(false);
  }

  isEnabled(): boolean {
    return localStorage.getItem(this.LOCK_ENABLED_KEY) === 'true';
  }

  setEnabled(enabled: boolean) {
    localStorage.setItem(this.LOCK_ENABLED_KEY, String(enabled));
  }
}
