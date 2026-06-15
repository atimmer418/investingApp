/**
 * tab3.page.spec.ts — FRED-196
 *
 * Covers the KYC retry logic added to loadStatStrip() per FRED-196.
 * All three service calls are mocked; UserProgress + Portfolio always resolve
 * synchronously (via of()) so tests can isolate KYC behaviour.
 *
 * Note on fakeAsync + RxJS timers:
 *   The retry delay uses timer() which in zone-patched Jasmine fakeAsync is
 *   advanced by tick(). We tick past both possible delays (400ms + 800ms = 1200ms)
 *   plus the 10 000ms timeout guard to ensure all timers drain.
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError, Observable, BehaviorSubject } from 'rxjs';
import { Tab3Page } from './tab3.page';
import { ModalController } from '@ionic/angular/standalone';
import { SettingsService } from '../services/settings.service';
import { PlaidService } from '../services/plaid.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { MonthlyFreedomUpdateService } from '../services/monthly-freedom-update.service';
import { AppLockService } from '../services/app-lock.service';
import { AccountStatusService } from '../services/account-status.service';
import { PortfolioService } from '../services/portfolio.service';
import { AlpacaService } from '../services/alpaca.service';

// ---------------------------------------------------------------------------
// Shared stub data
// ---------------------------------------------------------------------------

const userProgressStub = {
  getStartedCompleted: true,
  surveyInitialCompleted: true,
  fiPlanResultsCompleted: true,
  authFinalizeCompleted: true,
  kycVerificationCompleted: true,
  linkPlaidCompleted: true,
  investmentScheduleCompleted: true,
  investmentConfirmationCompleted: true,
  monthlyInvestment: 500,
  retirementIncome: 60000
};

const portfolioDashboardStub = {
  summary: { equity: 50000, portfolioValue: 50000, todayChange: 0, todayChangePercent: 0, buyingPower: 0, cash: 0 },
  positions: []
};

// ---------------------------------------------------------------------------
// Factory helpers (called once in each beforeEach via TestBed.overrideProvider)
// ---------------------------------------------------------------------------

function makeSettingsServiceMock() {
  return {
    getPreferences: jasmine.createSpy('getPreferences').and.returnValue(
      new BehaviorSubject({ theme: 'light', notifications: {} }).asObservable()
    ),
    getRecurringInvestment: jasmine.createSpy('getRecurringInvestment').and.returnValue(
      new BehaviorSubject(null).asObservable()
    ),
    updateRecurringInvestment: jasmine.createSpy('updateRecurringInvestment'),
    getNextInvestmentDate: jasmine.createSpy('getNextInvestmentDate').and.returnValue('2026-07-01'),
    applyTheme: jasmine.createSpy('applyTheme')
  };
}

function makePlaidServiceMock() {
  return {
    refreshBankAccountData: jasmine.createSpy('refreshBankAccountData'),
    getCurrentAccount: jasmine.createSpy('getCurrentAccount').and.returnValue(of(null)),
    formatLinkDate: jasmine.createSpy('formatLinkDate').and.returnValue(''),
    getStatusText: jasmine.createSpy('getStatusText').and.returnValue('')
  };
}

function makeAuthServiceMock() {
  return {
    getUserProgress: jasmine.createSpy('getUserProgress').and.returnValue(of(userProgressStub)),
    userProgress$: new BehaviorSubject(userProgressStub).asObservable(),
    isLoggedIn$: new BehaviorSubject(true).asObservable(),
    reAuthInProgress$: new BehaviorSubject(false).asObservable()
  };
}

function makeToastServiceMock() {
  return { showToast: jasmine.createSpy('showToast') };
}

function makeMfuServiceMock() {
  return {
    checkShouldShow: jasmine.createSpy('checkShouldShow').and.returnValue(
      of({ shouldShow: false, hasMfuHistory: false })
    )
  };
}

function makeAppLockServiceMock() {
  return {
    isCurrentlyLocked: jasmine.createSpy('isCurrentlyLocked').and.returnValue(false),
    isLocked$: new BehaviorSubject(false).asObservable()
  };
}

function makeAccountStatusServiceMock() {
  return {
    actionRequired$: new BehaviorSubject(false).asObservable()
  };
}

function makePortfolioServiceMock() {
  return {
    getPortfolioDashboard: jasmine.createSpy('getPortfolioDashboard').and.returnValue(
      of(portfolioDashboardStub)
    )
  };
}

function makeModalControllerMock() {
  return {
    create: jasmine.createSpy('create').and.returnValue(
      Promise.resolve({
        present: () => Promise.resolve(),
        onDidDismiss: () => Promise.resolve({ data: null })
      })
    )
  };
}

// ---------------------------------------------------------------------------
// Helper: configure a fresh TestBed for each test, supplying a specific
// kycObservable to the AlpacaService mock.
// ---------------------------------------------------------------------------

function configureTestBed(kycObservable: Observable<any>): void {
  const alpacaServiceMock = {
    getKycData: jasmine.createSpy('getKycData').and.returnValue(kycObservable),
    getAccountStatus: jasmine.createSpy('getAccountStatus').and.returnValue(
      of({ accountStatus: 'ACTIVE', hasActionRequired: false })
    )
  };

  TestBed.configureTestingModule({
    imports: [Tab3Page, RouterTestingModule],
    providers: [
      { provide: ModalController, useValue: makeModalControllerMock() }
    ]
  })
    .overrideProvider(SettingsService, { useValue: makeSettingsServiceMock() })
    .overrideProvider(PlaidService, { useValue: makePlaidServiceMock() })
    .overrideProvider(AuthService, { useValue: makeAuthServiceMock() })
    .overrideProvider(ToastService, { useValue: makeToastServiceMock() })
    .overrideProvider(MonthlyFreedomUpdateService, { useValue: makeMfuServiceMock() })
    .overrideProvider(AppLockService, { useValue: makeAppLockServiceMock() })
    .overrideProvider(AccountStatusService, { useValue: makeAccountStatusServiceMock() })
    .overrideProvider(PortfolioService, { useValue: makePortfolioServiceMock() })
    .overrideProvider(AlpacaService, { useValue: alpacaServiceMock });
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('Tab3Page — FRED-196 KYC retry in loadStatStrip()', () => {

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // -------------------------------------------------------------------------
  // AC-1a: 503 twice then 200 — success value is used (birthYear set)
  // -------------------------------------------------------------------------
  it('AC-1a: retries a transient 503 twice and uses the success value on the third attempt',
    fakeAsync(() => {
      let callCount = 0;
      const kycObservable = new Observable((observer) => {
        callCount++;
        if (callCount <= 2) {
          observer.error({ status: 503, name: 'HttpErrorResponse' });
        } else {
          observer.next({ identity: { date_of_birth: '1990-05-15' } });
          observer.complete();
        }
      });

      configureTestBed(kycObservable);
      const fixture: ComponentFixture<Tab3Page> = TestBed.createComponent(Tab3Page);
      const component = fixture.componentInstance;

      fixture.detectChanges(); // triggers ngOnInit -> loadStatStrip()

      // Advance past both retry back-off delays (400ms + 800ms)
      tick(1200);
      fixture.detectChanges();

      // birthYear = 1990; with retirementIncome=60000 and equity=50000
      // the freedom year will be a future year, so age > 0
      const age = parseInt(component.freedomAge, 10);
      expect(age).toBeGreaterThan(0);
      expect(component.statStripLoading).toBeFalse();

      tick(10000); // drain timeout(10_000) guard timer
    })
  );

  // -------------------------------------------------------------------------
  // AC-1b: 401 is NOT retried — fails fast on first attempt
  // -------------------------------------------------------------------------
  it('AC-1b: does NOT retry a 401 — fails fast and sets freedomAge to —',
    fakeAsync(() => {
      let callCount = 0;
      const kycObservable = new Observable((observer) => {
        callCount++;
        observer.error({ status: 401, name: 'HttpErrorResponse' });
      });

      configureTestBed(kycObservable);
      const fixture: ComponentFixture<Tab3Page> = TestBed.createComponent(Tab3Page);
      const component = fixture.componentInstance;

      fixture.detectChanges();
      tick(0); // 401 is non-transient, no retry delay
      fixture.detectChanges();

      // Should fail after exactly 1 call (no retries for 401)
      expect(callCount).toBe(1);
      expect(component.freedomAge).toBe('—');
      expect(component.statStripLoading).toBeFalse();

      tick(10000);
    })
  );

  // -------------------------------------------------------------------------
  // AC-2 / AC-5: Permanently failing (503 x3 exhausts retries) — no hang
  // -------------------------------------------------------------------------
  it('AC-2/AC-5: permanently-failing KYC (503 exhausts retries) → freedomAge "—" and statStripLoading false',
    fakeAsync(() => {
      const kycObservable = new Observable((observer) => {
        observer.error({ status: 503, name: 'HttpErrorResponse' });
      });

      configureTestBed(kycObservable);
      const fixture: ComponentFixture<Tab3Page> = TestBed.createComponent(Tab3Page);
      const component = fixture.componentInstance;

      fixture.detectChanges();

      // Advance past both retry delays (400ms + 800ms)
      tick(1200);
      fixture.detectChanges();

      expect(component.freedomAge).toBe('—');
      expect(component.statStripLoading).toBeFalse();

      tick(10000);
    })
  );

  // -------------------------------------------------------------------------
  // AC-3: 200 with no identity.date_of_birth → freedomAge = '—' (no error)
  // -------------------------------------------------------------------------
  it('AC-3: 200 KYC with missing date_of_birth → freedomAge stays —',
    fakeAsync(() => {
      const kycObservable = of({ identity: {} }); // no date_of_birth

      configureTestBed(kycObservable);
      const fixture: ComponentFixture<Tab3Page> = TestBed.createComponent(Tab3Page);
      const component = fixture.componentInstance;

      fixture.detectChanges();
      tick(0);
      fixture.detectChanges();

      expect(component.freedomAge).toBe('—');
      expect(component.statStripLoading).toBeFalse();

      tick(10000);
    })
  );

  // -------------------------------------------------------------------------
  // AC-4: Freedom date and To go unaffected by permanent KYC failure
  // -------------------------------------------------------------------------
  it('AC-4: freedomYear and dollarsAway are populated even when KYC permanently fails',
    fakeAsync(() => {
      const kycObservable = new Observable((observer) => {
        observer.error({ status: 503 });
      });

      configureTestBed(kycObservable);
      const fixture: ComponentFixture<Tab3Page> = TestBed.createComponent(Tab3Page);
      const component = fixture.componentInstance;

      fixture.detectChanges();
      tick(1200);
      fixture.detectChanges();

      // freedomYear should be a 4-digit year (UserProgress: monthlyInvestment=500,
      // Portfolio equity=50000, retirementIncome=60000 → target=$1.5M)
      expect(component.freedomYear).not.toBe('—');
      expect(parseInt(component.freedomYear, 10)).toBeGreaterThan(2026);

      // dollarsAway should be a compact currency string
      expect(component.dollarsAway).not.toBe('—');
      expect(component.dollarsAway).toMatch(/^\$/);

      tick(10000);
    })
  );

  // -------------------------------------------------------------------------
  // AC-5 (gate): statStripLoading starts true and ends false
  // -------------------------------------------------------------------------
  it('AC-5 (gate): statStripLoading starts true and becomes false once all three calls settle',
    fakeAsync(() => {
      const kycObservable = of({ identity: { date_of_birth: '1985-01-01' } });

      configureTestBed(kycObservable);
      const fixture: ComponentFixture<Tab3Page> = TestBed.createComponent(Tab3Page);
      const component = fixture.componentInstance;

      // Before detectChanges ngOnInit has not run — statStripLoading defaults true
      expect(component.statStripLoading).toBeTrue();

      fixture.detectChanges();
      tick(0);
      fixture.detectChanges();

      expect(component.statStripLoading).toBeFalse();

      tick(10000);
    })
  );

  // -------------------------------------------------------------------------
  // AC-6: Valid DOB + live inputs → freedomAge = resolvedFreedomYear - birthYear
  // -------------------------------------------------------------------------
  it('AC-6: valid DOB → freedomAge equals resolvedFreedomYear minus birthYear',
    fakeAsync(() => {
      const birthYear = 1990;
      const kycObservable = of({ identity: { date_of_birth: `${birthYear}-03-22` } });

      configureTestBed(kycObservable);
      const fixture: ComponentFixture<Tab3Page> = TestBed.createComponent(Tab3Page);
      const component = fixture.componentInstance;

      fixture.detectChanges();
      tick(0);
      fixture.detectChanges();

      const resolvedFreedomYear = parseInt(component.freedomYear, 10);
      const expectedAge = resolvedFreedomYear - birthYear;

      expect(component.freedomAge).toBe(String(expectedAge));
      expect(parseInt(component.freedomAge, 10)).toBeGreaterThan(0);

      tick(10000);
    })
  );

});
