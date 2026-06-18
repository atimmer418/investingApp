import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ModalController } from '@ionic/angular/standalone';
import { PinService } from './pin.service';
import { environment } from '../../environments/environment';

/**
 * Spec for PinService.hasPin() localStorage fallback (AC-7) and marker lifecycle.
 *
 * The HTTP layer is stubbed via HttpTestingController; ModalController is mocked
 * so no actual modal infrastructure is needed.
 */
describe('PinService — hasPin() localStorage fail-close + marker lifecycle', () => {
  let service: PinService;
  let httpMock: HttpTestingController;

  const PIN_STATUS_URL = `${environment.backendApiUrl}/user/pin/status`;

  // Simulate a logged-in user with a known userId in localStorage.
  const USER_ID = '42';
  const MARKER_KEY = `stepUpEnabled:${USER_ID}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PinService,
        {
          provide: ModalController,
          useValue: { create: jasmine.createSpy('create') }
        }
      ]
    });

    service = TestBed.inject(PinService);
    httpMock = TestBed.inject(HttpTestingController);

    // Set up a logged-in user context
    localStorage.setItem('userId', USER_ID);
    // Clean up any stale marker from a previous test
    localStorage.removeItem(MARKER_KEY);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('userId');
    localStorage.removeItem(MARKER_KEY);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns true and sets the marker when the backend returns true', async () => {
    const promise = service.hasPin();
    const req = httpMock.expectOne(PIN_STATUS_URL);
    req.flush(true);
    const result = await promise;

    expect(result).toBeTrue();
    expect(localStorage.getItem(MARKER_KEY)).toBe('true');
  });

  it('returns false and clears the marker when the backend returns false', async () => {
    // Pre-seed a stale marker to verify it is cleared
    localStorage.setItem(MARKER_KEY, 'true');

    const promise = service.hasPin();
    const req = httpMock.expectOne(PIN_STATUS_URL);
    req.flush(false);
    const result = await promise;

    expect(result).toBeFalse();
    expect(localStorage.getItem(MARKER_KEY)).toBeNull();
  });

  // ── Fail-close (AC-7 core requirement) ───────────────────────────────────

  it('returns true (fail-closed) when HTTP throws and the marker is set', async () => {
    // Seed the marker to simulate a previously confirmed step-up user
    localStorage.setItem(MARKER_KEY, 'true');

    const promise = service.hasPin();
    const req = httpMock.expectOne(PIN_STATUS_URL);
    // Simulate a network error
    req.error(new ProgressEvent('network error'));
    const result = await promise;

    expect(result).toBeTrue();
  });

  it('returns false when HTTP throws and the marker is NOT set', async () => {
    // No marker — genuine no-PIN user experiencing a transient network error
    localStorage.removeItem(MARKER_KEY);

    const promise = service.hasPin();
    const req = httpMock.expectOne(PIN_STATUS_URL);
    req.error(new ProgressEvent('network error'));
    const result = await promise;

    expect(result).toBeFalse();
  });

  // ── Marker helpers ────────────────────────────────────────────────────────

  it('markStepUpEnabled() sets the marker for the current user', () => {
    service.markStepUpEnabled();
    expect(localStorage.getItem(MARKER_KEY)).toBe('true');
  });

  it('clearStepUpMarker() removes the marker for the current user', () => {
    localStorage.setItem(MARKER_KEY, 'true');
    service.clearStepUpMarker();
    expect(localStorage.getItem(MARKER_KEY)).toBeNull();
  });

  it('marker helpers are no-ops when no userId is in localStorage', () => {
    localStorage.removeItem('userId');
    // Should not throw; nothing gets stored (no key can be derived)
    expect(() => service.markStepUpEnabled()).not.toThrow();
    expect(() => service.clearStepUpMarker()).not.toThrow();
  });

  // ── deletePin() clears the marker ────────────────────────────────────────

  it('deletePin() clears the step-up marker on success', async () => {
    localStorage.setItem(MARKER_KEY, 'true');

    const promise = service.deletePin();
    const req = httpMock.expectOne(`${environment.backendApiUrl}/user/pin/delete`);
    req.flush({ success: true, message: 'deleted', lockedOut: false, lockoutDurationSeconds: 0 });
    await promise;

    expect(localStorage.getItem(MARKER_KEY)).toBeNull();
  });
});
