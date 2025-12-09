import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';

export interface Position {
  symbol: string;
  qty: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  side: string;
  avg_entry_price: string;
}

export interface SellRequest {
  symbol: string;
  percentage: number;
}

export interface WithdrawRequest {
  amount: number;
}

export interface SellResponse {
  order_id: string;
  symbol: string;
  status: string;
  percentage: number;
  submitted_at: string;
  success: boolean;
  error?: string;
}

export interface WithdrawResponse {
  transfer_id: string;
  status: string;
  amount: number;
  initiated_at: string;
  success: boolean;
  message: string;
  error?: string;
}

export interface AccountBalance {
  cash: string;
  withdrawable_cash: string;
  buying_power: string;
  portfolio_value: string;
  equity: string;
  account_status: string;
}

export interface LiquidateResponse {
  order_id: string;
  status: string;
  submitted_at: string;
  success: boolean;
  message: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TradingService {
  private baseUrl = environment.backendApiUrl;
  private positionsSubject = new BehaviorSubject<Position[]>([]);
  private balanceSubject = new BehaviorSubject<AccountBalance | null>(null);

  public positions$ = this.positionsSubject.asObservable();
  public balance$ = this.balanceSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    const token = JwtTokenUtils.getValidJwtToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  /**
   * Get current stock positions
   */
  getPositions(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/trading/positions`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Refresh positions and update local state
   */
  refreshPositions(): void {
    this.getPositions().subscribe({
      next: (response) => {
        if (response && response.positions) {
          this.positionsSubject.next(response.positions);
        }
      },
      error: (error) => {
        console.error('Failed to refresh positions:', error);
        this.positionsSubject.next([]);
      }
    });
  }

  /**
   * Sell a percentage of a stock position
   */
  sellByPercentage(sellRequest: SellRequest): Observable<SellResponse> {
    return this.http.post<SellResponse>(
      `${this.baseUrl}/trading/sell/percentage`,
      sellRequest,
      { headers: this.getAuthHeaders() }
    );
  }



  /**
   * Withdraw cash to bank account
   */
  withdrawCash(withdrawRequest: WithdrawRequest): Observable<WithdrawResponse> {
    return this.http.post<WithdrawResponse>(
      `${this.baseUrl}/trading/withdraw`,
      withdrawRequest,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get account balance and buying power
   */
  getAccountBalance(): Observable<AccountBalance> {
    return this.http.get<AccountBalance>(
      `${this.baseUrl}/trading/account/balance`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Refresh account balance and update local state
   */
  refreshBalance(): void {
    this.getAccountBalance().subscribe({
      next: (balance) => {
        this.balanceSubject.next(balance);
      },
      error: (error) => {
        console.error('Failed to refresh balance:', error);
        this.balanceSubject.next(null);
      }
    });
  }

  /**
   * Get current positions from local state
   */
  getCurrentPositions(): Position[] {
    return this.positionsSubject.value;
  }

  /**
   * Get current balance from local state
   */
  getCurrentBalance(): AccountBalance | null {
    return this.balanceSubject.value;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  /**
   * Format percentage for display
   */
  formatPercentage(percentage: string | number): string {
    const num = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  }

  /**
   * Calculate retirement withdrawal amount using 4% rule
   */
  calculateRetirementWithdrawal(portfolioValue: number): number {
    return portfolioValue * 0.04 / 12; // 4% annually, divided by 12 months
  }

  /**
   * Calculate systematic withdrawal for retirement phase
   */
  calculateSystematicWithdrawal(portfolioValue: number, withdrawalRate: number, frequency: 'monthly' | 'quarterly' | 'annually'): number {
    const annualAmount = portfolioValue * (withdrawalRate / 100);
    
    switch (frequency) {
      case 'monthly':
        return annualAmount / 12;
      case 'quarterly':
        return annualAmount / 4;
      case 'annually':
        return annualAmount;
      default:
        return annualAmount / 12;
    }
  }
}