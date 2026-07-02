/**
 * portfolio-store.service.spec.ts — FRED-205 Phase 1
 *
 * Covers AC-1, AC-2, AC-3, AC-6:
 *  - Single-flight: two load$() subscriptions before flush → one request per endpoint
 *  - forkJoin parallel: all three URLs open simultaneously before any flush
 *  - Optional tolerance: erroring performance and history still yields a bundle
 *  - prime() gating: no jwtToken → no requests; with token → one fetch set
 *  - prime() + load$() before flush → single-flight join (one request set)
 *  - Fresh cache: completed load$() → new load$() issues no request
 *
 * Uses HttpClientTestingModule (no live network, no :8080 required).
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { PortfolioStoreService, PortfolioBundle } from './portfolio-store.service';
import { PortfolioService, PortfolioDashboardData } from './portfolio.service';
import { AuthService } from './auth.service';
import { JwtTokenUtils } from '../utils/jwt-token.utils';
import { environment } from '../../environments/environment';

// ---------------------------------------------------------------------------
// URL helpers — environment-agnostic path matching
// ---------------------------------------------------------------------------

const API = environment.backendApiUrl;
const DASHBOARD_URL = `${API}/portfolio/dashboard`;
const PERFORMANCE_URL = `${API}/portfolio/performance`;
const HISTORY_BASE = `${API}/portfolio/history`;

// ---------------------------------------------------------------------------
// Minimal mock data
// ---------------------------------------------------------------------------

const mockDashboard: PortfolioDashboardData = {
  summary: {
    portfolioValue: 1000,
    todayChange: 5,
    todayChangePercent: 0.5,
    buyingPower: 100,
    cash: 100,
    equity: 1000
  },
  positions: [],
  history: { timestamps: [], values: [] },
  recentTransactions: [],
  totalInvested: 900,
  totalGainLoss: 100,
  totalGainLossPercent: 11.11
};

const mockHistory = { timestamps: ['2025-01-01T00:00:00.000Z'], values: [1000] };
const mockPerformance = [{ period: 'Total', startValue: 900, endValue: 1000, totalReturn: 100, totalReturnPercent: 11.11 }];

// ---------------------------------------------------------------------------
// Auth service stub (only isLoggedIn$ is needed by PortfolioStoreService)
// ---------------------------------------------------------------------------

function makeAuthStub(loggedIn = false) {
  return {
    isLoggedIn$: new BehaviorSubject<boolean>(loggedIn).asObservable()
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flush all three portfolio requests successfully. */
function flushAll(httpMock: HttpTestingController): void {
  // dashboard
  const dashReqs = httpMock.match(req => req.url === DASHBOARD_URL);
  expect(dashReqs.length).withContext('expected exactly 1 dashboard request').toBe(1);
  dashReqs[0].flush(mockDashboard);

  // performance
  const perfReqs = httpMock.match(req => req.url === PERFORMANCE_URL);
  expect(perfReqs.length).withContext('expected exactly 1 performance request').toBe(1);
  perfReqs[0].flush(mockPerformance);

  // history (url without query params)
  const histReqs = httpMock.match(req => req.url === HISTORY_BASE);
  expect(histReqs.length).withContext('expected exactly 1 history request').toBe(1);
  histReqs[0].flush(mockHistory);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PortfolioStoreService — FRED-205', () => {
  let service: PortfolioStoreService;
  let httpMock: HttpTestingController;

  function setup(loggedIn = false): void {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PortfolioStoreService,
        PortfolioService,
        { provide: AuthService, useValue: makeAuthStub(loggedIn) }
      ]
    });
    service = TestBed.inject(PortfolioStoreService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  // =========================================================================
  // AC-2: forkJoin — all three URLs open simultaneously
  // =========================================================================

  describe('AC-2: forkJoin parallel requests', () => {
    it('all three portfolio URLs are open simultaneously before any flush', () => {
      setup();
      localStorage.setItem('jwtToken', 'x');
      localStorage.setItem('userId', '1');

      service.load$().subscribe();

      // Before flushing anything: all three requests should be open concurrently
      const dashReqs = httpMock.match(req => req.url === DASHBOARD_URL);
      const perfReqs = httpMock.match(req => req.url === PERFORMANCE_URL);
      const histReqs = httpMock.match(req => req.url === HISTORY_BASE);

      expect(dashReqs.length).withContext('dashboard request count').toBe(1);
      expect(perfReqs.length).withContext('performance request count').toBe(1);
      expect(histReqs.length).withContext('history request count').toBe(1);

      // Flush to satisfy httpMock.verify()
      dashReqs[0].flush(mockDashboard);
      perfReqs[0].flush(mockPerformance);
      histReqs[0].flush(mockHistory);
    });
  });

  // =========================================================================
  // AC-1 + AC-6: Single-flight
  // =========================================================================

  describe('AC-1: single-flight — two subscriptions before flush → one request set', () => {
    it('two load$() subscriptions yield exactly one HTTP request per endpoint', () => {
      setup();
      localStorage.setItem('jwtToken', 'x');
      localStorage.setItem('userId', '1');

      let bundle1: PortfolioBundle | undefined;
      let bundle2: PortfolioBundle | undefined;

      service.load$().subscribe(b => (bundle1 = b));
      service.load$().subscribe(b => (bundle2 = b));

      // Exactly one request per endpoint
      const dashReqs = httpMock.match(req => req.url === DASHBOARD_URL);
      const perfReqs = httpMock.match(req => req.url === PERFORMANCE_URL);
      const histReqs = httpMock.match(req => req.url === HISTORY_BASE);

      expect(dashReqs.length).withContext('dashboard count').toBe(1);
      expect(perfReqs.length).withContext('performance count').toBe(1);
      expect(histReqs.length).withContext('history count').toBe(1);

      dashReqs[0].flush(mockDashboard);
      perfReqs[0].flush(mockPerformance);
      histReqs[0].flush(mockHistory);

      // Both subscribers received the same bundle
      expect(bundle1).toBeDefined();
      expect(bundle2).toBeDefined();
      expect(bundle1!.dashboard.summary.equity).toBe(1000);
      expect(bundle2!.dashboard.summary.equity).toBe(1000);
    });

    it('fresh cache: completed load$() → second load$() issues no new HTTP request', () => {
      setup();
      localStorage.setItem('jwtToken', 'x');
      localStorage.setItem('userId', '1');

      let completed1 = false;
      service.load$().subscribe({ complete: () => (completed1 = true) });
      flushAll(httpMock);
      expect(completed1).toBeTrue();

      // Cache is now fresh — second load$() should return of(entry) with no HTTP
      let bundle2: PortfolioBundle | undefined;
      service.load$().subscribe(b => (bundle2 = b));

      // No new HTTP requests
      const openAfterFresh = httpMock.match(req => req.url.includes('/portfolio'));
      expect(openAfterFresh.length).withContext('expected no new HTTP requests when cache is fresh').toBe(0);
      expect(bundle2).toBeDefined();
      expect(bundle2!.dashboard.summary.equity).toBe(1000);
    });
  });

  // =========================================================================
  // AC-2: Optional tolerance — failed perf/history still yields bundle
  // =========================================================================

  describe('AC-2: optional tolerance — perf/history errors yield partial bundle', () => {
    it('erroring performance and history requests still yields dashboard + perf:[] + history:null', () => {
      setup();
      localStorage.setItem('jwtToken', 'x');
      localStorage.setItem('userId', '1');

      let bundle: PortfolioBundle | undefined;
      let errorFired = false;

      service.load$().subscribe({
        next: b => (bundle = b),
        error: () => (errorFired = true)
      });

      // Flush dashboard with success
      httpMock.expectOne(req => req.url === DASHBOARD_URL).flush(mockDashboard);

      // Error performance and history (optional → catchError)
      httpMock.expectOne(req => req.url === PERFORMANCE_URL)
        .error(new ErrorEvent('network error'), { status: 0, statusText: 'Network Error' });
      httpMock.expectOne(req => req.url === HISTORY_BASE)
        .error(new ErrorEvent('network error'), { status: 0, statusText: 'Network Error' });

      expect(errorFired).toBeFalse();
      expect(bundle).toBeDefined();
      expect(bundle!.dashboard.summary.equity).toBe(1000);
      expect(bundle!.performance).toEqual([]);
      expect(bundle!.history).toBeNull();
    });
  });

  // =========================================================================
  // AC-3: prime() gating
  // =========================================================================

  describe('AC-3: prime() gating', () => {
    it('prime() with no valid JWT → no HTTP requests', () => {
      setup();
      spyOn(JwtTokenUtils, 'getValidJwtToken').and.returnValue(null);

      service.prime();

      // prime() must be a no-op when no JWT is present — zero portfolio requests
      const openRequests = httpMock.match(req => req.url.includes('/portfolio'));
      expect(openRequests.length).withContext('expected no portfolio requests without a JWT').toBe(0);
    });

    it('prime() with a valid JWT → one fetch set', () => {
      setup();
      spyOn(JwtTokenUtils, 'getValidJwtToken').and.returnValue('valid-token');
      localStorage.setItem('userId', '1');

      service.prime();

      const dashReqs = httpMock.match(req => req.url === DASHBOARD_URL);
      const perfReqs = httpMock.match(req => req.url === PERFORMANCE_URL);
      const histReqs = httpMock.match(req => req.url === HISTORY_BASE);

      expect(dashReqs.length).withContext('dashboard count').toBe(1);
      expect(perfReqs.length).withContext('performance count').toBe(1);
      expect(histReqs.length).withContext('history count').toBe(1);

      dashReqs[0].flush(mockDashboard);
      perfReqs[0].flush(mockPerformance);
      histReqs[0].flush(mockHistory);
    });
  });

  // =========================================================================
  // AC-6: prime() + load$() before flush → single-flight join (one set)
  // =========================================================================

  describe('AC-6: prime() + load$() single-flight join', () => {
    it('prime() then load$() before flush → exactly one set of three GETs', () => {
      setup();
      spyOn(JwtTokenUtils, 'getValidJwtToken').and.returnValue('valid-token');
      localStorage.setItem('userId', '1');

      service.prime();   // fires forkJoin, sets inFlight$
      let bundle: PortfolioBundle | undefined;
      service.load$().subscribe(b => (bundle = b));  // should join inFlight$, not start new

      const dashReqs = httpMock.match(req => req.url === DASHBOARD_URL);
      const perfReqs = httpMock.match(req => req.url === PERFORMANCE_URL);
      const histReqs = httpMock.match(req => req.url === HISTORY_BASE);

      expect(dashReqs.length).withContext('dashboard count (should be 1, not 2)').toBe(1);
      expect(perfReqs.length).withContext('performance count (should be 1, not 2)').toBe(1);
      expect(histReqs.length).withContext('history count (should be 1, not 2)').toBe(1);

      dashReqs[0].flush(mockDashboard);
      perfReqs[0].flush(mockPerformance);
      histReqs[0].flush(mockHistory);

      // Component's subscriber got the bundle
      expect(bundle).toBeDefined();
      expect(bundle!.dashboard.summary.equity).toBe(1000);
    });
  });

  // =========================================================================
  // AC-3: prime() no-op when cache is fresh
  // =========================================================================

  describe('AC-3: prime() no-op when cache is fresh', () => {
    it('prime() after a completed load$() issues no new request (cache is fresh)', () => {
      setup();
      spyOn(JwtTokenUtils, 'getValidJwtToken').and.returnValue('valid-token');
      localStorage.setItem('userId', '1');

      service.load$().subscribe();
      flushAll(httpMock);

      // Cache is now fresh — prime() should be a no-op
      service.prime();

      const openRequests = httpMock.match(req => req.url.includes('/portfolio'));
      expect(openRequests.length).withContext('expected no new portfolio requests for fresh cache').toBe(0);
    });
  });

  // =========================================================================
  // Period guard (FRED-205 enhancement) — a different period must not join in-flight
  // =========================================================================

  describe('period guard: a different period does not join the in-flight fetch', () => {
    it('load$(differentPeriod) while a fetch is in-flight starts a separate fetch', () => {
      setup();
      localStorage.setItem('userId', '1');

      service.load$('ALL').subscribe();
      // Different period must NOT reuse the in-flight 'ALL' observable
      service.load$('1M').subscribe();

      const dashReqs = httpMock.match(req => req.url === DASHBOARD_URL);
      expect(dashReqs.length).withContext('different period should start a new fetch, not join').toBe(2);

      // Flush every open request to satisfy httpMock.verify()
      httpMock.match(req => req.url === DASHBOARD_URL).forEach(r => r.flush(mockDashboard));
      httpMock.match(req => req.url === PERFORMANCE_URL).forEach(r => r.flush(mockPerformance));
      httpMock.match(req => req.url === HISTORY_BASE).forEach(r => r.flush(mockHistory));
    });
  });

});
