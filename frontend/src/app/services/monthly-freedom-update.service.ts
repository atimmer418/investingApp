import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MilestoneDTO {
  type: string;
  label: string;
  subtitle: string;
}

export interface MonthlyFreedomUpdateData {
  shouldShow: boolean;

  // Period
  periodStart: string;
  periodEnd: string;
  periodLabel: string;

  // Header badges
  statusPercentile: number;
  currentStreak: number;

  // Milestones
  milestones: MilestoneDTO[];

  // Freedom calculation
  startEquityValue: number;
  endEquityValue: number;
  periodProgressDelta: number;
  positive: boolean;

  // Analytics
  periodContributions: number;
  equityValueChange: number;
  returnRate: number;
  daysBoughtBack: number;

  // Projection
  projectedFreedomYear: number;
  currentEquityValue: number;
  recurringInvestmentAmount: number;
  investmentFrequency: string;

  // Quarterly review
  showQuarterlyCompare: boolean;
  equity12MonthsAgo: number;
  netWorthChange: number;
  freedomYearsChange: number;
  yearlyContributions: number;

  // Best next action
  bestNextMoveYearsEarlier: number;
  bestNextMoveYear: number;
  frequencyLabel: string;
  currentInvestmentAmount: number;
  bestNextMoveBoostAmount: number;

  // User age
  age: number;

  // Reopen flag
  reopen: boolean;

  // MFU count (number of unique non-reopen MFUs the user has seen)
  mfuCount: number;

  // Whether the user has any MFU history available to reopen
  hasMfuHistory: boolean;

  // Pig level (1-6) based on end equity
  equityLevel: number;

  // Server-produced month (yyyy-MM) this update was generated for; echoed back on commitSeen so the
  // "seen" stamp is the month actually shown, never a post-rollover month.
  generatedForMonth: string;
}

@Injectable({
  providedIn: 'root'
})
export class MonthlyFreedomUpdateService {
  private apiUrl = `${environment.backendApiUrl}/monthly-freedom-update`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Check if the Monthly Freedom Update should be shown
   */
  checkShouldShow(): Observable<MonthlyFreedomUpdateData> {
    return this.http.get<MonthlyFreedomUpdateData>(`${this.apiUrl}/check`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Generate the full Monthly Freedom Update data
   */
  generateUpdate(reopen: boolean = false): Observable<MonthlyFreedomUpdateData> {
    return this.http.get<MonthlyFreedomUpdateData>(`${this.apiUrl}/generate`, {
      headers: this.getAuthHeaders(),
      params: { reopen: reopen.toString() }
    });
  }

  /**
   * Commit the update as "seen" for the shown month. Fired at data-ready (not on the dismiss button)
   * so the primary CTA / swipe paths can't skip it. seenMonth echoes the server-produced
   * generatedForMonth so the stamp is the month actually displayed.
   */
  commitSeen(seenMonth?: string): Observable<any> {
    const body = seenMonth ? { seenMonth } : {};
    return this.http.post(`${this.apiUrl}/dismiss`, body, {
      headers: this.getAuthHeaders()
    });
  }
}
