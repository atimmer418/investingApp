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

  // Projection
  projectedFreedomYear: number;
  currentEquityValue: number;
  recurringInvestmentAmount: number;
  investmentFrequency: string;

  // Quarterly compare
  showQuarterlyCompare: boolean;
  equity12MonthsAgo: number;
  netWorthChange: number;
  freedomYearsChange: number;

  // Best next action
  bestNextMoveYearsEarlier: number;
  bestNextMoveYear: number;
  frequencyLabel: string;
  currentInvestmentAmount: number;

  // Reopen flag
  reopen: boolean;
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
   * Dismiss the update (mark as seen for this month)
   */
  dismissUpdate(): Observable<any> {
    return this.http.post(`${this.apiUrl}/dismiss`, {}, {
      headers: this.getAuthHeaders()
    });
  }
}
