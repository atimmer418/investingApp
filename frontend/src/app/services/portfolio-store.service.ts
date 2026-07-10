import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, shareReplay } from 'rxjs';
import { catchError, finalize, tap, timeout } from 'rxjs/operators';
import {
  PortfolioService,
  PortfolioDashboardData,
  PerformanceData,
  PortfolioHistory
} from './portfolio.service';
import { AuthService } from './auth.service';
import { JwtTokenUtils } from '../utils/jwt-token.utils';

export interface PortfolioBundle {
  dashboard: PortfolioDashboardData;
  performance: PerformanceData[];
  history: PortfolioHistory | null;
}

/** Persisted last-known view-model for instant cold-launch paint (Phase 2, FRED-206). */
export interface PortfolioSnapshot {
  userId: string;
  savedAt: number;
  period: string;
  dashboard: PortfolioDashboardData;
  performance: PerformanceData[];
  history: PortfolioHistory | null;
  freedomLabel: string;
}

/**
 * In-memory single-flight cache for the three portfolio GETs.
 *
 * - `prime(period?)` — fire-and-forget prefetch; token-gated, no-op when cache is fresh.
 * - `load$(period?, force?)` — returns cached bundle (when fresh, same period), the in-flight
 *   observable (when a fetch for the SAME period is already running), or starts a new fetch.
 *   `force:true` always starts fresh.
 * - `clearMemory()` — wipes entry and in-flight; called automatically on logout.
 *
 * Dashboard fetch is FATAL (error propagates). Performance and history are OPTIONAL
 * (catchError → [] / null). The whole bundle is bounded by timeout(10_000).
 *
 * The cache and in-flight join are keyed by `period` so a caller requesting a different period
 * than the one in flight never receives the wrong-period bundle (Phase 1 only ever uses 'ALL',
 * but the guard keeps future multi-period callers correct).
 *
 * Phase 1 only. No localStorage snapshot, no whenSettled — those are Phase 2 (FRED-206).
 */
@Injectable({ providedIn: 'root' })
export class PortfolioStoreService {
  private static readonly TTL_MS = 60_000;
  // localStorage key prefix for the persisted snapshot. Bump the version (v1 → v2) whenever the
  // persisted shape (PortfolioDashboardData / PortfolioHistory) changes, so an old snapshot can
  // never hydrate a mismatched shape.
  private static readonly SNAP_PREFIX = 'fred.portfolioDash.v1.';

  private entry: { bundle: PortfolioBundle; fetchedAt: number; userId: string; period: string } | null = null;
  private inFlight$: Observable<PortfolioBundle> | null = null;
  private inFlightPeriod: string | null = null;

  constructor(
    private portfolioService: PortfolioService,
    private authService: AuthService
  ) {
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      if (!loggedIn) {
        this.clearMemory();
      }
    });
  }

  private uid(): string {
    return localStorage.getItem('userId') ?? '';
  }

  /** True when the in-memory entry exists, belongs to the current user, matches the period, and is within TTL. */
  isFresh(period = 'ALL'): boolean {
    if (!this.entry) return false;
    if (this.entry.userId !== this.uid()) return false;
    if (this.entry.period !== period) return false;
    return Date.now() - this.entry.fetchedAt < PortfolioStoreService.TTL_MS;
  }

  /**
   * Returns an observable that emits a PortfolioBundle.
   *
   * Resolution order (when force=false):
   *  1. Fresh in-memory cache for this period → of(entry.bundle) — no HTTP
   *  2. In-flight fetch for this period → same shared observable — no new HTTP
   *  3. New fetch via fetchBundle$
   *
   * When force=true, always starts a new fetch (bypasses cache and in-flight).
   */
  load$(period = 'ALL', force = false): Observable<PortfolioBundle> {
    if (!force) {
      if (this.isFresh(period)) {
        return of(this.entry!.bundle);
      }
      if (this.inFlight$ && this.inFlightPeriod === period) {
        return this.inFlight$;
      }
    }

    const obs: Observable<PortfolioBundle> = this.fetchBundle$(period).pipe(
      tap(b => {
        this.entry = { bundle: b, fetchedAt: Date.now(), userId: this.uid(), period };
      }),
      finalize(() => {
        if (this.inFlight$ === obs) {
          this.inFlight$ = null;
          this.inFlightPeriod = null;
        }
      }),
      shareReplay(1)
    );
    this.inFlight$ = obs;
    this.inFlightPeriod = period;
    return obs;
  }

  private fetchBundle$(period: string): Observable<PortfolioBundle> {
    return forkJoin({
      dashboard: this.portfolioService.getPortfolioDashboard(),
      performance: this.portfolioService.getPerformance().pipe(catchError(() => of([]))),
      history: this.portfolioService.getPortfolioHistory(period).pipe(catchError(() => of(null)))
    }).pipe(
      timeout(10_000)
    );
  }

  /**
   * Fire-and-forget prefetch. No-op when:
   *  - there is no valid JWT (user not authenticated / token expired)
   *  - the cache is already fresh (TTL not expired, same user, same period)
   */
  prime(period = 'ALL'): void {
    if (!JwtTokenUtils.getValidJwtToken()) return;
    if (this.isFresh(period)) return;
    this.load$(period).subscribe({ error: () => {} });
  }

  /**
   * Synchronously read the persisted last-known snapshot for the CURRENT user, or null.
   * Validated: same userId + a present dashboard summary. Corrupt/foreign snapshots → null.
   * Synchronous so the component can hydrate it in ngOnInit before the first change-detection.
   */
  peekSnapshot(): PortfolioSnapshot | null {
    const userId = this.uid();
    if (!userId) return null;
    try {
      const raw = localStorage.getItem(PortfolioStoreService.SNAP_PREFIX + userId);
      if (!raw) return null;
      const snap = JSON.parse(raw) as PortfolioSnapshot;
      return (snap && snap.userId === userId && snap.dashboard?.summary) ? snap : null;
    } catch {
      return null;
    }
  }

  /**
   * Persist the last-known view-model for instant paint on the next cold launch. Strips
   * recentTransactions (large, not needed for first paint). Best-effort — swallows quota /
   * private-mode write errors.
   */
  persistSnapshot(vm: {
    dashboard: PortfolioDashboardData;
    performance: PerformanceData[];
    history: PortfolioHistory | null;
    freedomLabel: string;
    period: string;
  }): void {
    const userId = this.uid();
    if (!userId || !vm.dashboard) return;
    // Strip recentTransactions (large, unused at first paint) AND dashboard.history — the history
    // used for the chart is stored once at the top level (snapshot.history) and read from there on
    // hydrate, so keeping dashboard.history too would double-store the largest array (quota risk).
    const { recentTransactions, history, ...leanDashboard } = vm.dashboard as any;
    const snapshot: PortfolioSnapshot = {
      userId,
      savedAt: Date.now(),
      period: vm.period,
      dashboard: { ...leanDashboard, recentTransactions: [], history: { timestamps: [], values: [] } },
      performance: vm.performance,
      history: vm.history,
      freedomLabel: vm.freedomLabel,
    };
    try {
      localStorage.setItem(PortfolioStoreService.SNAP_PREFIX + userId, JSON.stringify(snapshot));
    } catch {
      /* quota / private mode — persistence is best-effort */
    }
  }

  /** Wipe the in-memory entry and any in-flight reference. Called on logout. */
  clearMemory(): void {
    this.entry = null;
    this.inFlight$ = null;
    this.inFlightPeriod = null;
  }
}
