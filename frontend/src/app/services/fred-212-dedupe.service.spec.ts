/**
 * fred-212-dedupe.service.spec.ts — FRED-212
 *
 * Proves single-flight behaviour for the two new caches:
 *  - AlpacaService.getKycData() — AC-5 / AC-7
 *  - AuthService.getCurrentInvestmentSchedule() — AC-5 / AC-7
 *
 * For each:
 *  a) Two concurrent subscribers produce exactly ONE HTTP call.
 *  b) A completed (cached) call: the second subscriber gets the cached value,
 *     no new HTTP call is made.
 *  c) An error is NOT cached: a subsequent subscriber triggers a fresh HTTP call.
 *
 * Uses HttpClientTestingModule (no live network).
 * httpMock.match(pred).length assertions per findings note (expectNone is a no-assertion trap).
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AlpacaService } from './alpaca.service';
import { AuthService } from './auth.service';
import { InvestmentService, CreateInvestmentScheduleRequest } from './investment.service';
import { DeviceIdService } from './device-id.service';
import { KeychainSyncService } from './keychain-sync.service';
import { NativePasskeyService } from './native-passkey.service';
import { environment } from '../../environments/environment';

const API = environment.backendApiUrl;
const KYC_URL = `${API}/alpaca/account/kyc`;
const SCHEDULE_URL = `${API}/investment-schedule/current`;

// Minimal valid response shapes
const KYC_STUB = { identity: { date_of_birth: '1990-01-01' } };
const SCHEDULE_STUB = { investmentAmount: 500, frequency: 'MONTHLY', isPaused: false };

// Stubs for AuthService's injected services (only the methods actually called)
const deviceIdStub = { getDeviceId: () => 'test-device-id' };
const keychainSyncStub = { getAccountEmail: () => Promise.resolve(null), storeAccountEmail: () => Promise.resolve() };
const nativePasskeyStub = { isPasskeyAvailable: () => Promise.resolve(false) };

// ---------------------------------------------------------------------------
// AlpacaService.getKycData() — single-flight tests
// ---------------------------------------------------------------------------

describe('AlpacaService.getKycData() — FRED-212 single-flight', () => {
  let service: AlpacaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AlpacaService]
    });
    service = TestBed.inject(AlpacaService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.setItem('userId', 'user-1');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('AC-7a: two concurrent subscribers produce exactly one HTTP request', () => {
    let result1: any;
    let result2: any;

    service.getKycData().subscribe(v => (result1 = v));
    service.getKycData().subscribe(v => (result2 = v));

    const kycReqs = httpMock.match(req => req.url === KYC_URL);
    expect(kycReqs.length).withContext('exactly 1 KYC HTTP call for 2 concurrent subscribers').toBe(1);

    kycReqs[0].flush(KYC_STUB);

    expect(result1).toEqual(KYC_STUB);
    expect(result2).toEqual(KYC_STUB);
  });

  it('AC-7a: after cache is warm, a second subscriber produces no new HTTP call', () => {
    // First call — completes and populates cache
    let result1: any;
    service.getKycData().subscribe(v => (result1 = v));
    httpMock.match(req => req.url === KYC_URL)[0].flush(KYC_STUB);
    expect(result1).toEqual(KYC_STUB);

    // Second call — cache hit, no new request
    let result2: any;
    service.getKycData().subscribe(v => (result2 = v));

    const afterRequests = httpMock.match(req => req.url === KYC_URL);
    expect(afterRequests.length).withContext('no new HTTP request when cache is warm').toBe(0);
    expect(result2).toEqual(KYC_STUB);
  });

  it('AC-5: an errored KYC response is not cached — next subscriber triggers a fresh request', () => {
    let errorReceived = false;

    // First subscriber — will error
    service.getKycData().subscribe({
      next: () => {},
      error: () => { errorReceived = true; }
    });

    // Flush first request with error
    const firstReqs = httpMock.match(req => req.url === KYC_URL);
    expect(firstReqs.length).toBe(1);
    firstReqs[0].flush('error', { status: 503, statusText: 'Service Unavailable' });

    expect(errorReceived).toBeTrue();

    // Second subscriber after error — must NOT get the error replayed,
    // instead triggers a fresh HTTP call
    let result2: any;
    service.getKycData().subscribe({
      next: v => (result2 = v),
      error: () => {}
    });

    const secondReqs = httpMock.match(req => req.url === KYC_URL);
    expect(secondReqs.length).withContext('fresh HTTP call after error (error not cached)').toBe(1);
    secondReqs[0].flush(KYC_STUB);

    expect(result2).toEqual(KYC_STUB);
  });
});

// ---------------------------------------------------------------------------
// AuthService.getCurrentInvestmentSchedule() — single-flight tests
// ---------------------------------------------------------------------------

// AuthService.getCurrentInvestmentSchedule() single-flight tests.
// AuthService injects DeviceIdService, KeychainSyncService, NativePasskeyService —
// all are stubbed so the constructor doesn't fire real network calls.
// localStorage is cleared BEFORE TestBed.inject() so checkExistingSession()
// finds no token and doesn't call loadUserProgress(). The token is set AFTER
// construction so getAuthHeaders() has it when getCurrentInvestmentSchedule() runs.

describe('AuthService.getCurrentInvestmentSchedule() — FRED-212 single-flight', () => {
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
        { provide: NativePasskeyService, useValue: nativePasskeyStub }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Set token AFTER construction so getAuthHeaders() works in the tests
    localStorage.setItem('jwtToken', 'test-token');
    localStorage.setItem('userId', 'user-1');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('AC-7a: two concurrent subscribers produce exactly one HTTP request', () => {
    let result1: any;
    let result2: any;

    service.getCurrentInvestmentSchedule().subscribe(v => (result1 = v));
    service.getCurrentInvestmentSchedule().subscribe(v => (result2 = v));

    const schedReqs = httpMock.match(req => req.url === SCHEDULE_URL);
    expect(schedReqs.length).withContext('exactly 1 schedule HTTP call for 2 concurrent subscribers').toBe(1);

    schedReqs[0].flush(SCHEDULE_STUB);

    expect(result1).toEqual(SCHEDULE_STUB);
    expect(result2).toEqual(SCHEDULE_STUB);
  });

  it('AC-7a: after cache is warm, a second subscriber produces no new HTTP call', () => {
    let result1: any;
    service.getCurrentInvestmentSchedule().subscribe(v => (result1 = v));
    httpMock.match(req => req.url === SCHEDULE_URL)[0].flush(SCHEDULE_STUB);
    expect(result1).toEqual(SCHEDULE_STUB);

    let result2: any;
    service.getCurrentInvestmentSchedule().subscribe(v => (result2 = v));

    const afterRequests = httpMock.match(req => req.url === SCHEDULE_URL);
    expect(afterRequests.length).withContext('no new HTTP request when cache is warm').toBe(0);
    expect(result2).toEqual(SCHEDULE_STUB);
  });

  it('AC-5: an errored schedule response is not cached — next subscriber triggers a fresh request', () => {
    let errorReceived = false;

    service.getCurrentInvestmentSchedule().subscribe({
      next: () => {},
      error: () => { errorReceived = true; }
    });

    const firstReqs = httpMock.match(req => req.url === SCHEDULE_URL);
    expect(firstReqs.length).toBe(1);
    firstReqs[0].flush('error', { status: 503, statusText: 'Service Unavailable' });

    expect(errorReceived).toBeTrue();

    let result2: any;
    service.getCurrentInvestmentSchedule().subscribe({
      next: v => (result2 = v),
      error: () => {}
    });

    const secondReqs = httpMock.match(req => req.url === SCHEDULE_URL);
    expect(secondReqs.length).withContext('fresh HTTP call after error (error not cached)').toBe(1);
    secondReqs[0].flush(SCHEDULE_STUB);

    expect(result2).toEqual(SCHEDULE_STUB);
  });
});

// ---------------------------------------------------------------------------
// AC-4: Mutation invalidation — AlpacaService
//
// updateKyc() success → clearKycCache() → next getKycData() fires fresh HTTP.
// updateKyc() error  → cache NOT cleared → next getKycData() returns cached value.
// ---------------------------------------------------------------------------

describe('AlpacaService mutation invalidation — FRED-212 AC-4', () => {
  let service: AlpacaService;
  let httpMock: HttpTestingController;

  const UPDATE_KYC_URL = `${API}/alpaca/account/kyc`;  // PATCH and GET share the same URL

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AlpacaService]
    });
    service = TestBed.inject(AlpacaService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.setItem('userId', 'user-1');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('updateKyc success invalidates the cache — next getKycData fires a fresh HTTP call', () => {
    // Warm the cache
    service.getKycData().subscribe();
    httpMock.match(req => req.url === KYC_URL && req.method === 'GET')[0].flush(KYC_STUB);

    // Confirm cache is warm (second read returns no GET)
    service.getKycData().subscribe();
    expect(httpMock.match(req => req.url === KYC_URL && req.method === 'GET').length)
      .withContext('cache warm before mutation').toBe(0);

    // Mutate via updateKyc — success
    service.updateKyc({}).subscribe();
    httpMock.match(req => req.url === UPDATE_KYC_URL && req.method === 'PATCH')[0].flush({ success: true });

    // Next read after successful mutation must fire a fresh GET
    service.getKycData().subscribe();
    const freshReqs = httpMock.match(req => req.url === KYC_URL && req.method === 'GET');
    expect(freshReqs.length).withContext('fresh GET after successful updateKyc').toBe(1);
    freshReqs[0].flush(KYC_STUB);
  });

  it('updateKyc failure does NOT invalidate the cache — next getKycData returns cached value', () => {
    // Warm the cache
    service.getKycData().subscribe();
    httpMock.match(req => req.url === KYC_URL && req.method === 'GET')[0].flush(KYC_STUB);

    // Mutate via updateKyc — error
    service.updateKyc({}).subscribe({ next: () => {}, error: () => {} });
    httpMock.match(req => req.url === UPDATE_KYC_URL && req.method === 'PATCH')[0]
      .flush('error', { status: 422, statusText: 'Unprocessable Entity' });

    // Cache must still be warm — no new GET
    let cachedResult: any;
    service.getKycData().subscribe(v => (cachedResult = v));
    const noRequests = httpMock.match(req => req.url === KYC_URL && req.method === 'GET');
    expect(noRequests.length).withContext('no fresh GET after failed updateKyc').toBe(0);
    expect(cachedResult).toEqual(KYC_STUB);
  });
});

// ---------------------------------------------------------------------------
// AC-4: Mutation invalidation — AuthService
//
// createOrUpdateInvestmentSchedule / pauseInvestmentSchedule /
// resumeInvestmentSchedule success → clearScheduleCache() → next
// getCurrentInvestmentSchedule() fires fresh HTTP.
// A failed mutation does NOT clear the cache.
// ---------------------------------------------------------------------------

describe('AuthService mutation invalidation — FRED-212 AC-4', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const CREATE_URL = `${API}/investment-schedule/create`;
  const PAUSE_URL = `${API}/investment-schedule/42/pause`;
  const RESUME_URL = `${API}/investment-schedule/42/resume`;

  function warmCache(): void {
    service.getCurrentInvestmentSchedule().subscribe();
    httpMock.match(req => req.url === SCHEDULE_URL)[0].flush(SCHEDULE_STUB);
    // Confirm warm
    service.getCurrentInvestmentSchedule().subscribe();
    expect(httpMock.match(req => req.url === SCHEDULE_URL).length)
      .withContext('cache warm before mutation').toBe(0);
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: DeviceIdService, useValue: deviceIdStub },
        { provide: KeychainSyncService, useValue: keychainSyncStub },
        { provide: NativePasskeyService, useValue: nativePasskeyStub }
      ]
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

  it('createOrUpdateInvestmentSchedule success invalidates the cache — next read fires fresh HTTP', () => {
    warmCache();

    service.createOrUpdateInvestmentSchedule({ investmentAmount: 600 }).subscribe();
    httpMock.match(req => req.url === CREATE_URL)[0].flush({ success: true });

    service.getCurrentInvestmentSchedule().subscribe();
    const freshReqs = httpMock.match(req => req.url === SCHEDULE_URL);
    expect(freshReqs.length).withContext('fresh GET after successful create/update').toBe(1);
    freshReqs[0].flush(SCHEDULE_STUB);
  });

  it('pauseInvestmentSchedule success invalidates the cache — next read fires fresh HTTP', () => {
    warmCache();

    service.pauseInvestmentSchedule(42).subscribe();
    httpMock.match(req => req.url === PAUSE_URL)[0].flush({ isPaused: true });

    service.getCurrentInvestmentSchedule().subscribe();
    const freshReqs = httpMock.match(req => req.url === SCHEDULE_URL);
    expect(freshReqs.length).withContext('fresh GET after pause').toBe(1);
    freshReqs[0].flush(SCHEDULE_STUB);
  });

  it('resumeInvestmentSchedule success invalidates the cache — next read fires fresh HTTP', () => {
    warmCache();

    service.resumeInvestmentSchedule(42).subscribe();
    httpMock.match(req => req.url === RESUME_URL)[0].flush({ isPaused: false });

    service.getCurrentInvestmentSchedule().subscribe();
    const freshReqs = httpMock.match(req => req.url === SCHEDULE_URL);
    expect(freshReqs.length).withContext('fresh GET after resume').toBe(1);
    freshReqs[0].flush(SCHEDULE_STUB);
  });

  it('createOrUpdateInvestmentSchedule failure does NOT clear the cache', () => {
    warmCache();

    service.createOrUpdateInvestmentSchedule({ investmentAmount: 600 }).subscribe({ next: () => {}, error: () => {} });
    httpMock.match(req => req.url === CREATE_URL)[0].flush('error', { status: 500, statusText: 'Server Error' });

    let cachedResult: any;
    service.getCurrentInvestmentSchedule().subscribe(v => (cachedResult = v));
    const noRequests = httpMock.match(req => req.url === SCHEDULE_URL);
    expect(noRequests.length).withContext('no fresh GET after failed mutation').toBe(0);
    expect(cachedResult).toEqual(SCHEDULE_STUB);
  });
});

// ---------------------------------------------------------------------------
// AC-4: InvestmentService schedule mutators → AuthService cache invalidation
//
// Proves the recurring-investments.page.ts write path: InvestmentService.createSchedule()
// (which hits POST /investment-schedule/create) clears the AuthService schedule cache,
// so goBack() → tab3 freedom-stats.refresh() → AuthService.getCurrentInvestmentSchedule()
// fires a fresh GET rather than returning the pre-edit stale amount.
// ---------------------------------------------------------------------------

describe('InvestmentService schedule mutators clear AuthService cache — FRED-212 AC-4', () => {
  let investmentService: InvestmentService;
  let authService: AuthService;
  let httpMock: HttpTestingController;

  const INV_CREATE_URL = `${API}/investment-schedule/create`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        InvestmentService,
        { provide: DeviceIdService, useValue: deviceIdStub },
        { provide: KeychainSyncService, useValue: keychainSyncStub },
        { provide: NativePasskeyService, useValue: nativePasskeyStub }
      ]
    });
    authService = TestBed.inject(AuthService);
    investmentService = TestBed.inject(InvestmentService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.setItem('jwtToken', 'test-token');
    localStorage.setItem('userId', 'user-1');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('InvestmentService.createSchedule() success clears AuthService cache — next read fires fresh HTTP', () => {
    // Warm the AuthService schedule cache
    authService.getCurrentInvestmentSchedule().subscribe();
    httpMock.match(req => req.url === SCHEDULE_URL)[0].flush(SCHEDULE_STUB);
    // Confirm warm — second read returns cached value, no HTTP
    authService.getCurrentInvestmentSchedule().subscribe();
    expect(httpMock.match(req => req.url === SCHEDULE_URL).length)
      .withContext('cache warm before mutation').toBe(0);

    // Mutate via InvestmentService (the recurring-investments.page.ts write path)
    const createReq: CreateInvestmentScheduleRequest = { investmentAmount: 750, frequency: 'MONTHLY', startDate: '2026-07-01' };
    investmentService.createSchedule(createReq).subscribe();
    httpMock.match(req => req.url === INV_CREATE_URL)[0].flush({ id: 1, investmentAmount: 750 });

    // After the mutation the AuthService cache must be cleared — next read fires a fresh GET
    authService.getCurrentInvestmentSchedule().subscribe();
    const freshReqs = httpMock.match(req => req.url === SCHEDULE_URL);
    expect(freshReqs.length)
      .withContext('fresh GET after InvestmentService.createSchedule() success (cache cleared)').toBe(1);
    freshReqs[0].flush(SCHEDULE_STUB);
  });
});
