import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Portfolio Dashboard Types
export interface AccountSummary {
  portfolioValue: number;
  todayChange: number;
  todayChangePercent: number;
  buyingPower: number;
  equity: number;
}

export interface Position {
  symbol: string;
  name: string;
  quantity: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  currentPrice: number;
}

export interface PortfolioHistory {
  timestamps: string[];
  values: number[];
}

export interface Transaction {
  id: string;
  type: string;
  symbol: string;
  quantity: number;
  price: number;
  amount: number;
  date: string;
  status: string;
}

export interface PortfolioDashboardData {
  summary: AccountSummary;
  positions: Position[];
  history: PortfolioHistory;
  recentTransactions: Transaction[];
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export interface PerformanceData {
  period: string;
  startValue: number;
  endValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  bestDay?: number;
  worstDay?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private apiUrl = `${environment.backendApiUrl}/portfolio`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get comprehensive portfolio dashboard data
   */
  getPortfolioDashboard(): Observable<PortfolioDashboardData> {
    return this.http.get<PortfolioDashboardData>(`${this.apiUrl}/dashboard`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get portfolio history for a specific time period
   */
  getPortfolioHistory(period: string): Observable<PortfolioHistory> {
    return this.http.get<PortfolioHistory>(`${this.apiUrl}/history`, {
      headers: this.getAuthHeaders(),
      params: { period }
    });
  }

  /**
   * Get current portfolio positions
   */
  getPositions(): Observable<Position[]> {
    return this.http.get<Position[]>(`${this.apiUrl}/positions`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get portfolio performance analytics
   */
  getPerformance(): Observable<PerformanceData[]> {
    return this.http.get<PerformanceData[]>(`${this.apiUrl}/performance`, {
      headers: this.getAuthHeaders()
    });
  }
}
