import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NavController } from '@ionic/angular';
import { SecuritySettingsPage } from './security-settings.page';
import { AppLockService } from '../../services/app-lock.service';
import { PinService } from '../../services/pin.service';
import { ToastService } from '../../services/toast.service';

/**
 * Spec for SecuritySettingsPage three-state gating logic.
 *
 * AC-3: checking / verify / settings state machine — no content leak either direction.
 * AC-4: loadSessions() + syncAlpacaAccountNumber() still called after gate passes.
 * AC-5: authenticateUser() is gone; no dead code.
 */
describe('SecuritySettingsPage — three-state gating (AC-3, AC-4, AC-5)', () => {
  let component: SecuritySettingsPage;
  let fixture: ComponentFixture<SecuritySettingsPage>;

  let pinServiceSpy: jasmine.SpyObj<PinService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let loadSessionsSpy: jasmine.Spy;
  let syncAlpacaSpy: jasmine.Spy;

  function createComponent(hasPinResult: boolean, promptResult: boolean = true) {
    pinServiceSpy.hasPin.and.returnValue(Promise.resolve(hasPinResult));
    pinServiceSpy.promptPin.and.returnValue(Promise.resolve(promptResult));

    TestBed.configureTestingModule({
      imports: [
        SecuritySettingsPage,
        HttpClientTestingModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: NavController, useValue: { navigateBack: jasmine.createSpy() } },
        {
          provide: AppLockService,
          useValue: { isEnabled: () => false, setEnabled: jasmine.createSpy() }
        },
        { provide: PinService, useValue: pinServiceSpy },
        { provide: ToastService, useValue: { showToast: jasmine.createSpy() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SecuritySettingsPage);
    component = fixture.componentInstance;

    // Spy on the data-loading methods so we can assert they're called without
    // making real HTTP requests.
    loadSessionsSpy = spyOn(component, 'loadSessions');
    syncAlpacaSpy = spyOn(component, 'syncAlpacaAccountNumber');
  }

  beforeEach(() => {
    pinServiceSpy = jasmine.createSpyObj<PinService>(
      'PinService',
      ['hasPin', 'promptPin', 'deletePin', 'markStepUpEnabled', 'clearStepUpMarker']
    );
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
  });

  // ── AC-3: Distinct checking state ────────────────────────────────────────

  it('starts with checkingStepUp=true, isAuthenticated=false (neutral loading state)', () => {
    // Construct component but do NOT call ngOnInit — inspect the initial state.
    pinServiceSpy.hasPin.and.returnValue(new Promise(() => {})); // never resolves
    pinServiceSpy.promptPin.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      imports: [SecuritySettingsPage, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: NavController, useValue: { navigateBack: jasmine.createSpy() } },
        { provide: AppLockService, useValue: { isEnabled: () => false } },
        { provide: PinService, useValue: pinServiceSpy },
        { provide: ToastService, useValue: { showToast: jasmine.createSpy() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SecuritySettingsPage);
    component = fixture.componentInstance;

    // Before ngOnInit runs, checkingStepUp should be true and isAuthenticated false.
    expect(component.checkingStepUp).toBeTrue();
    expect(component.isAuthenticated).toBeFalse();
  });

  // ── AC-3: No-PIN path — never sees verify overlay ────────────────────────

  it('no-PIN user: checkingStepUp goes false, isAuthenticated goes true, promptPin never called', fakeAsync(() => {
    createComponent(false); // hasPin → false
    fixture.detectChanges(); // triggers ngOnInit

    tick(); // flush all microtasks / promises

    expect(component.checkingStepUp).toBeFalse();
    expect(component.isAuthenticated).toBeTrue();
    expect(pinServiceSpy.promptPin).not.toHaveBeenCalled();
    // Verify overlay must NOT show (sensitiveAuthEnabled=false, isAuthenticated=true)
    expect(component.sensitiveAuthEnabled).toBeFalse();
  }));

  // ── AC-3: PIN path — verify overlay shown, settings NOT shown until verified ─

  it('step-up user: checkingStepUp goes false, promptPin called, isAuthenticated true after success', fakeAsync(() => {
    createComponent(true, true); // hasPin → true, promptPin → success
    fixture.detectChanges();

    tick();

    expect(component.checkingStepUp).toBeFalse();
    expect(pinServiceSpy.promptPin).toHaveBeenCalledWith('verify');
    expect(component.isAuthenticated).toBeTrue();
  }));

  it('step-up user: PIN cancel → router navigates back, isAuthenticated stays false', fakeAsync(() => {
    createComponent(true, false); // hasPin → true, promptPin → cancelled
    fixture.detectChanges();

    tick();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tabs/tab3']);
    expect(component.isAuthenticated).toBeFalse();
  }));

  // ── AC-3: content leak prevention — template *ngIf gating ────────────────

  it('while checkingStepUp=true, neither the overlay card nor settings content is rendered', () => {
    pinServiceSpy.hasPin.and.returnValue(new Promise(() => {})); // never resolves
    pinServiceSpy.promptPin.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      imports: [SecuritySettingsPage, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: NavController, useValue: { navigateBack: jasmine.createSpy() } },
        { provide: AppLockService, useValue: { isEnabled: () => false } },
        { provide: PinService, useValue: pinServiceSpy },
        { provide: ToastService, useValue: { showToast: jasmine.createSpy() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SecuritySettingsPage);
    component = fixture.componentInstance;
    spyOn(component, 'loadSessions');
    spyOn(component, 'syncAlpacaAccountNumber');

    // Manually freeze in checking state
    component.checkingStepUp = true;
    component.isAuthenticated = false;
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    // auth-overlay must NOT be visible (gated by !checkingStepUp && !isAuthenticated)
    expect(el.querySelector('.auth-overlay')).toBeNull();
    // settings content must NOT be visible (gated by isAuthenticated)
    expect(el.querySelector('.content-inner')).toBeNull();
    // neutral checking-overlay should be present
    expect(el.querySelector('.checking-overlay')).not.toBeNull();
  });

  it('after no-PIN resolution, auth-overlay is absent and content-inner is present', fakeAsync(() => {
    createComponent(false);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.auth-overlay')).toBeNull();
    expect(el.querySelector('.checking-overlay')).toBeNull();
    expect(el.querySelector('.content-inner')).not.toBeNull();
  }));

  // ── AC-4: Post-gate data loading ─────────────────────────────────────────

  it('no-PIN user: loadSessions() and syncAlpacaAccountNumber() are called after gate passes', fakeAsync(() => {
    createComponent(false);
    fixture.detectChanges();
    tick();

    expect(loadSessionsSpy).toHaveBeenCalledTimes(1);
    expect(syncAlpacaSpy).toHaveBeenCalledTimes(1);
  }));

  it('step-up user after successful PIN: loadSessions() and syncAlpacaAccountNumber() are called', fakeAsync(() => {
    createComponent(true, true);
    fixture.detectChanges();
    tick();

    expect(loadSessionsSpy).toHaveBeenCalledTimes(1);
    expect(syncAlpacaSpy).toHaveBeenCalledTimes(1);
  }));

  it('step-up user after PIN cancel: loadSessions() and syncAlpacaAccountNumber() are NOT called', fakeAsync(() => {
    createComponent(true, false);
    fixture.detectChanges();
    tick();

    expect(loadSessionsSpy).not.toHaveBeenCalled();
    expect(syncAlpacaSpy).not.toHaveBeenCalled();
  }));

  // ── AC-5: No dead code ────────────────────────────────────────────────────

  it('authenticateUser() method does NOT exist on the component', () => {
    createComponent(false);
    fixture.detectChanges();
    expect((component as any).authenticateUser).toBeUndefined();
  });

  it('isAuthenticating property does NOT exist on the component', () => {
    createComponent(false);
    fixture.detectChanges();
    expect((component as any).isAuthenticating).toBeUndefined();
  });
});
