/**
 * auth.service.progress-inflight.spec.ts — FRED-213
 *
 * Proves in-flight join behaviour for AuthService.getUserProgress():
 *  AC-5a) Two concurrent subscribers produce exactly ONE HTTP request; both receive the response.
 *  AC-5b) After the in-flight settles, the next subscriber triggers a FRESH HTTP request (no TTL cache).
 *  AC-5c) An errored in-flight propagates to ALL joined subscribers; the next call after error fetches fresh.
 *  AC-4)  Mutation safety: updateProgress() success → next getUserProgress() fires a fresh HTTP request.
 *
 * Uses HttpClientTestingModule — no live network, no :8080 required.
 * localStorage is cleared BEFORE TestBed.inject() so checkExistingSession() finds no token
 * and does not call loadUserProgress(). The token is set AFTER construction so
 * getAuthHeaders() has it when the test methods run.
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, UserProgress } from './auth.service';
import { DeviceIdService } from './device-id.service';
import { KeychainSyncService } from './keychain-sync.service';
import { NativePasskeyService } from './native-passkey.service';
import { environment } from '../../environments/environment';

const API = environment.backendApiUrl;
const PROGRESS_URL = `${API}/user/progress`;

const PROGRESS_STUB: UserProgress = {
  getStartedCompleted: true,
  surveyInitialCompleted: true,
  fiPlanResultsCompleted: true,
  authFinalizeCompleted: true,
  kycVerificationCompleted: true,
  linkPlaidCompleted: true,
  investmentScheduleCompleted: true,
  investmentConfirmationCompleted: true,
};

const deviceIdStub = { getDeviceId: () => 'test-device-id' };
const keychainSyncStub = {
  getAccountEmail: () => Promise.resolve(null),
  storeAccountEmail: () => Promise.resolve()
};
const nativePasskeyStub = { isPasskeyAvailable: () => Promise.resolve(false) };

describe('AuthService.getUserProgress() — FRED-213 in-flight join', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear(); // no token during construction → checkExistingSession is a no-op
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: DeviceIdService, useValue: deviceIdStub },
        { provide: KeychainSyncService, useValue: keychainSyncStub },
        { provide: NativePasskeyService, useValue: nativePasskeyStub },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    // Set token AFTER construction so getAuthHeaders() includes it in test calls
    localStorage.setItem('jwtToken', 'test-token');
    localStorage.setItem('userId', 'user-1');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('AC-5a: two concurrent subscribers produce exactly one HTTP request and both receive the response', () => {
    let result1: UserProgress | undefined;
    let result2: UserProgress | undefined;

    service.getUserProgress().subscribe(v => (result1 = v));
    service.getUserProgress().subscribe(v => (result2 = v));

    const reqs = httpMock.match(req => req.url === PROGRESS_URL && req.method === 'GET');
    expect(reqs.length)
      .withContext('exactly 1 GET /user/progress for 2 concurrent subscribers')
      .toBe(1);

    reqs[0].flush(PROGRESS_STUB);

    expect(result1).toEqual(PROGRESS_STUB);
    expect(result2).toEqual(PROGRESS_STUB);
  });

  it('AC-5b: after the in-flight settles, the next subscriber triggers a fresh HTTP request (no TTL cache)', () => {
    // First call — completes and clears the in-flight ref
    let result1: UserProgress | undefined;
    service.getUserProgress().subscribe(v => (result1 = v));
    httpMock.match(req => req.url === PROGRESS_URL && req.method === 'GET')[0].flush(PROGRESS_STUB);
    expect(result1).toEqual(PROGRESS_STUB);

    // Post-settle: must fire a NEW request — no post-settle TTL cache
    let result2: UserProgress | undefined;
    service.getUserProgress().subscribe(v => (result2 = v));
    const freshReqs = httpMock.match(req => req.url === PROGRESS_URL && req.method === 'GET');
    expect(freshReqs.length)
      .withContext('fresh HTTP after in-flight settles (no TTL cache)')
      .toBe(1);
    freshReqs[0].flush(PROGRESS_STUB);
    expect(result2).toEqual(PROGRESS_STUB);
  });

  it('AC-5c: errored in-flight propagates to all joined subscribers; next call fetches fresh', () => {
    let error1: any;
    let error2: any;

    service.getUserProgress().subscribe({ next: () => {}, error: e => (error1 = e) });
    service.getUserProgress().subscribe({ next: () => {}, error: e => (error2 = e) });

    const reqs = httpMock.match(req => req.url === PROGRESS_URL && req.method === 'GET');
    expect(reqs.length)
      .withContext('exactly 1 GET for 2 concurrent subscribers')
      .toBe(1);

    reqs[0].flush('Server Error', { status: 503, statusText: 'Service Unavailable' });

    expect(error1).toBeTruthy();
    expect(error2).toBeTruthy();

    // Next call after error — in-flight ref was cleared by finalize; must NOT replay the
    // cached error but must fire a fresh GET instead
    let freshResult: UserProgress | undefined;
    service.getUserProgress().subscribe({
      next: v => (freshResult = v),
      error: () => {},
    });
    const freshReqs = httpMock.match(req => req.url === PROGRESS_URL && req.method === 'GET');
    expect(freshReqs.length)
      .withContext('fresh GET after error (in-flight ref cleared by finalize)')
      .toBe(1);
    freshReqs[0].flush(PROGRESS_STUB);
    expect(freshResult).toEqual(PROGRESS_STUB);
  });

  it('AC-4: mutation (updateProgress) followed by getUserProgress fires a fresh HTTP request', () => {
    // Complete one in-flight round-trip
    service.getUserProgress().subscribe();
    httpMock.match(req => req.url === PROGRESS_URL && req.method === 'GET')[0].flush(PROGRESS_STUB);

    // Simulate a progress mutation via updateProgress (PUT /user/progress)
    service.updateProgress({ getStartedCompleted: true }).subscribe();
    httpMock.match(req => req.url === PROGRESS_URL && req.method === 'PUT')[0].flush({ success: true });

    // Next getUserProgress() must fire a fresh GET — no TTL cache means no stale replay possible
    let freshResult: UserProgress | undefined;
    service.getUserProgress().subscribe(v => (freshResult = v));
    const freshReqs = httpMock.match(req => req.url === PROGRESS_URL && req.method === 'GET');
    expect(freshReqs.length)
      .withContext('fresh GET after mutation (no TTL cache — always fresh post-settle)')
      .toBe(1);
    freshReqs[0].flush(PROGRESS_STUB);
    expect(freshResult).toEqual(PROGRESS_STUB);
  });
});

/**
 * AC-3 (go-back 1): loadUserProgress()'s retry chain must issue REAL fresh HTTP
 * requests per attempt — the defer() wrapper re-invokes getUserProgress() on each
 * retry resubscription. Without it, retry replays the shared shareReplay(1) error
 * instantly and the transient-failure self-heal (the guard against the all-false
 * localStorage fallback ejecting users) is silently dead.
 */
describe('AuthService.loadUserProgress() — FRED-213 retry issues fresh HTTP', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: DeviceIdService, useValue: deviceIdStub },
        { provide: KeychainSyncService, useValue: keychainSyncStub },
        { provide: NativePasskeyService, useValue: nativePasskeyStub },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.setItem('jwtToken', 'test-token');
    localStorage.setItem('userId', 'user-1');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('transient 500 on attempt 1 → retry makes a FRESH HTTP request that can succeed with real data', fakeAsync(() => {
    let emitted: (UserProgress & { _source?: string }) | null = null;
    const sub = service.userProgress$.subscribe(p => { if (p) emitted = p as any; });

    service.loadUserProgress();

    // Attempt 1: real request errors with a transient 500
    const first = httpMock.match(PROGRESS_URL);
    expect(first.length).withContext('attempt 1 issues one real request').toBe(1);
    first[0].flush('boom', { status: 500, statusText: 'Server Error' });

    // Retry backoff (400ms for attempt 1) — no request until the timer elapses
    expect(httpMock.match(PROGRESS_URL).length).withContext('no request during backoff').toBe(0);
    tick(400);

    // Attempt 2 must be a NEW HTTP request (defer re-invoked getUserProgress),
    // not an instant replay of the cached error.
    const second = httpMock.match(PROGRESS_URL);
    expect(second.length).withContext('retry issues a fresh HTTP request').toBe(1);
    second[0].flush(PROGRESS_STUB);
    tick();

    // Recovery lands real DB data — NOT the localStorage fallback.
    expect(emitted).withContext('progress emitted after retry').not.toBeNull();
    expect((emitted as any)._source).toBe('db');
    sub.unsubscribe();
  }));
});

