import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InvestmentExecution {
  id: number;
  scheduledDate: string;
  executionDate?: string;
  amount: number;
  status: string;
  alpacaTransferId?: string;
  errorMessage?: string;
  fundingCompletedAt?: string;
  tradingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentTrade {
  id: number;
  symbol: string;
  quantity?: number;
  notionalAmount: number;
  filledQuantity: number;
  filledAvgPrice?: number;
  alpacaOrderId?: string;
  status: string;
  errorMessage?: string;
  submittedAt?: string;
  filledAt?: string;
  createdAt: string;
}

export interface InvestmentHistory {
  success: boolean;
  executions: InvestmentExecution[];
  nextInvestmentDate: string;
  monthlyInvestment: number;
  payFrequency: string;
}

export interface InvestmentDashboard {
  success: boolean;
  totalInvested: number;
  pendingCount: number;
  failedCount: number;
  nextInvestmentDate: string;
  monthlyInvestment: number;
  payFrequency: string;
  recentExecutions: InvestmentExecution[];
}

export interface ExecutionDetails {
  success: boolean;
  execution: InvestmentExecution;
  trades: InvestmentTrade[];
}

@Injectable({
  providedIn: 'root'
})
export class InvestmentService {
  private apiUrl = `${environment.backendApiUrl}/investments`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get investment history for the current user
   */
  getInvestmentHistory(): Observable<InvestmentHistory> {
    return this.http.get<InvestmentHistory>(`${this.apiUrl}/history`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get details for a specific investment execution
   */
  getExecutionDetails(executionId: number): Observable<ExecutionDetails> {
    return this.http.get<ExecutionDetails>(`${this.apiUrl}/execution/${executionId}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Update investment schedule settings
   */
  updateInvestmentSchedule(settings: {
    monthlyInvestment?: number;
    payFrequency?: string;
    nextInvestmentDate?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/schedule`, settings, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Create a manual investment execution
   */
  createManualInvestment(amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/execute`, { amount }, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get investment dashboard data
   */
  getDashboard(): Observable<InvestmentDashboard> {
    return this.http.get<InvestmentDashboard>(`${this.apiUrl}/dashboard`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Helper method to get status display text
   */
  getStatusDisplayText(status: string): string {
    switch (status) {
      case 'SCHEDULED': return 'Scheduled';
      case 'FUNDING_INITIATED': return 'Funding...';
      case 'FUNDING_COMPLETED': return 'Funded';
      case 'FUNDING_FAILED': return 'Funding Failed';
      case 'TRADING_INITIATED': return 'Trading...';
      case 'TRADING_COMPLETED': return 'Trading Complete';
      case 'TRADING_FAILED': return 'Trading Failed';
      case 'COMPLETED': return 'Completed';
      case 'FAILED': return 'Failed';
      default: return status;
    }
  }

  /**
   * Helper method to get status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'SCHEDULED': return 'primary';
      case 'FUNDING_INITIATED':
      case 'TRADING_INITIATED': return 'warning';
      case 'FUNDING_COMPLETED':
      case 'TRADING_COMPLETED':
      case 'COMPLETED': return 'success';
      case 'FUNDING_FAILED':
      case 'TRADING_FAILED':
      case 'FAILED': return 'danger';
      default: return 'medium';
    }
  }

  /**
   * Helper method to check if status is in progress
   */
  isStatusInProgress(status: string): boolean {
    return ['FUNDING_INITIATED', 'TRADING_INITIATED'].includes(status);
  }

  /**
   * Helper method to check if status is failed
   */
  isStatusFailed(status: string): boolean {
    return ['FUNDING_FAILED', 'TRADING_FAILED', 'FAILED'].includes(status);
  }

  /**
   * Helper method to check if status is completed
   */
  isStatusCompleted(status: string): boolean {
    return status === 'COMPLETED';
  }
}
