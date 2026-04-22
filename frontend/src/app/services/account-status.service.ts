import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { map } from 'rxjs/operators';
import { AlpacaService } from './alpaca.service';
import { JwtTokenUtils } from '../utils/jwt-token.utils';

@Injectable({
  providedIn: 'root'
})
export class AccountStatusService implements OnDestroy {
  private destroy$ = new Subject<void>();

  private accountStatusSubject = new BehaviorSubject<string | null>(null);
  accountStatus$ = this.accountStatusSubject.asObservable();

  private actionRequiredSubject = new BehaviorSubject<boolean>(false);
  actionRequired$ = this.actionRequiredSubject.asObservable();

  /** Emits "1" when action is required, null otherwise — used by the tab bar badge */
  settingsTabBadge$ = this.actionRequired$.pipe(
    map(required => required ? '1' : null)
  );

  constructor(private alpacaService: AlpacaService) {}

  /**
   * Fetch the current user's account status from the backend.
   * Safe to call at any time — silently skips if no valid token is present.
   */
  refreshStatus(): void {
    const token = JwtTokenUtils.getValidJwtToken();
    if (!token) return;

    this.alpacaService.getMyAccountStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.accountStatusSubject.next(response.accountStatus);
          this.actionRequiredSubject.next(response.hasActionRequired);
        },
        error: (err) => {
          // Non-fatal — account may not exist yet during onboarding
          console.warn('[AccountStatusService] Could not fetch account status:', err?.status);
        }
      });
  }

  /**
   * Returns true only when accountStatus is "ACTIVE".
   */
  isAccountActive(): boolean {
    return this.accountStatusSubject.value === 'ACTIVE';
  }

  /**
   * Clear the action-required flag after a successful document upload.
   */
  clearActionRequired(): void {
    this.actionRequiredSubject.next(false);
    // Re-fetch to stay in sync with backend
    this.refreshStatus();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
