import { Injectable } from '@angular/core';
import { ScenarioType, ShowdownResult } from './monte-carlo.service';

// ─── Schema version ──────────────────────────────────────────────────────────
// Bump SCHEMA_VERSION whenever the entry shape changes to silently discard
// entries written by a prior version (no crash, just empty-state shown).
const SCHEMA_VERSION = 2;
const KEY_PREFIX = `fred.mcHistory.v${SCHEMA_VERSION}.`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SimulationHistoryEntry {
  /** Unix timestamp (ms) when the simulation completed. */
  timestamp: number;
  /** Scenario used for this run. */
  scenario: ScenarioType;
  /** Combined starting portfolio value (incl. outside accounts if toggled). */
  totalPortfolioValue: number;
  /** Monthly retirement spend entered by the user. */
  monthlySpend: number;
  /** Duration (withdrawal years). */
  yearsToLast: number;
  /** Whether outside accounts were included. */
  includeOutside: boolean;
  /** 401k balance at time of run (0 if outside not included). */
  k401Balance: number;
  /** Roth IRA balance at time of run (0 if outside not included). */
  rothBalance: number;
  /** Monthly contribution at time of run. */
  monthlyContribution: number;
  /** Years until retirement at time of run. */
  yearsToRetirement: number;
  /** Per-strategy success rates from the completed run. */
  results: ShowdownResult;
}

@Injectable({
  providedIn: 'root'
})
export class SimulationHistoryService {

  private readonly MAX_ENTRIES = 3;

  /**
   * Load history for the given userId.
   * Returns an empty array if there is no history, the JSON is corrupt, or
   * the stored schema version does not match the current one.
   */
  getHistory(userId: string): SimulationHistoryEntry[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(KEY_PREFIX + userId);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Filter out any entries that are missing required fields
      return parsed.filter(e => this._isValidEntry(e));
    } catch {
      return [];
    }
  }

  /**
   * Prepend a new entry for the given userId and keep only the most recent
   * MAX_ENTRIES entries. Silently swallows write failures (private browsing,
   * storage quota).
   */
  saveEntry(userId: string, entry: SimulationHistoryEntry): void {
    if (!userId) return;
    const existing = this.getHistory(userId);
    const updated = [entry, ...existing].slice(0, this.MAX_ENTRIES);
    try {
      localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(updated));
    } catch {
      // Storage unavailable — entry is not persisted but the sim result is
      // still shown; the user will just see the history reset on next launch.
    }
  }

  /**
   * Remove all history entries for the given userId.
   */
  clearHistory(userId: string): void {
    if (!userId) return;
    try {
      localStorage.removeItem(KEY_PREFIX + userId);
    } catch {
      // No-op if removal fails
    }
  }

  /** Quick structural validation — not exhaustive, just enough to catch schema mismatches. */
  private _isValidEntry(e: any): e is SimulationHistoryEntry {
    return (
      e != null &&
      typeof e === 'object' &&
      typeof e.timestamp === 'number' &&
      typeof e.scenario === 'string' &&
      typeof e.totalPortfolioValue === 'number' &&
      typeof e.monthlySpend === 'number' &&
      typeof e.yearsToLast === 'number' &&
      e.results != null &&
      typeof e.results === 'object' &&
      typeof e.results.traditional === 'number'
    );
  }
}
