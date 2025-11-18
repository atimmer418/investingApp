import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonInput,
  IonRange,
  IonToast,
  IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  pieChartOutline,
  checkmarkCircle,
  radioButtonOff,
  cashOutline,
  trendingUpOutline,
  trendingDownOutline,
  walletOutline,
  timeOutline
} from 'ionicons/icons';

import { TradingService, Position, AccountBalance } from '../services/trading.service';

@Component({
  selector: 'app-sell-withdraw',
  templateUrl: './sell-withdraw.page.html',
  styleUrls: ['./sell-withdraw.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonInput,
    IonRange,
    IonToast,
    IonModal
  ]
})
export class SellWithdrawPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // State
  public isLoading = true;
  public positions: Position[] = [];
  public balance: AccountBalance | null = null;
  public selectedPosition: Position | null = null;
  public sellPercentage = 25;
  public withdrawAmount: number | null = null;
  public retirementRate = 4.0;
  
  // UI state
  public isSelling = false;
  public isLiquidating = false;
  public isWithdrawing = false;
  public isToastOpen = false;
  public toastMessage = '';
  public toastColor = 'primary';
  public showRetirementModal = false;
  
  // Quick select options
  public quickPercentages = [25, 50, 75, 100];
  public quickWithdrawAmounts = [100, 500, 1000, 2500];
  
  constructor(
    private router: Router,
    private tradingService: TradingService
  ) {
    addIcons({
      pieChartOutline,
      checkmarkCircle,
      radioButtonOff,
      cashOutline,
      trendingUpOutline,
      trendingDownOutline,
      walletOutline,
      timeOutline
    });
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadData() {
    try {
      this.isLoading = true;
      
      // Load positions and balance in parallel
      const [positionsResponse, balance] = await Promise.all([
        this.tradingService.getPositions().toPromise(),
        this.tradingService.getAccountBalance().toPromise()
      ]);
      
      if (positionsResponse?.positions) {
        this.positions = positionsResponse.positions;
      }
      
      this.balance = balance || null;
      
    } catch (error) {
      console.error('Error loading trading data:', error);
      this.showToast('Failed to load portfolio data', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  selectPosition(position: Position) {
    this.selectedPosition = position;
    this.sellPercentage = 25; // Reset to default
  }

  setSellPercentage(percentage: number) {
    this.sellPercentage = percentage;
  }

  setWithdrawAmount(amount: number) {
    this.withdrawAmount = amount;
  }

  calculateSellAmount(): number {
    if (!this.selectedPosition) return 0;
    const marketValue = parseFloat(this.selectedPosition.market_value);
    return (marketValue * this.sellPercentage) / 100;
  }

  calculateRetirementWithdrawal(): number {
    if (!this.balance?.portfolio_value) return 0;
    const portfolioValue = parseFloat(this.balance.portfolio_value);
    return this.tradingService.calculateRetirementWithdrawal(portfolioValue);
  }

  calculateCustomRetirementWithdrawal(): number {
    if (!this.balance?.portfolio_value) return 0;
    const portfolioValue = parseFloat(this.balance.portfolio_value);
    return this.tradingService.calculateSystematicWithdrawal(portfolioValue, this.retirementRate, 'monthly');
  }

  getPortfolioValue(): number {
    if (!this.balance?.portfolio_value) return 0;
    return parseFloat(this.balance.portfolio_value);
  }

  get maxWithdrawAmount(): number {
    if (!this.balance?.cash) return 0;
    return parseFloat(this.balance.cash);
  }

  async sellPosition() {
    if (!this.selectedPosition || this.isSelling) return;
    
    try {
      this.isSelling = true;
      
      const sellRequest = {
        symbol: this.selectedPosition.symbol,
        percentage: this.sellPercentage
      };
      
      const response = await this.tradingService.sellByPercentage(sellRequest).toPromise();
      
      if (response?.success) {
        this.showToast(`Successfully placed sell order for ${this.sellPercentage}% of ${this.selectedPosition.symbol}`, 'success');
        this.selectedPosition = null; // Clear selection
        await this.loadData(); // Refresh data
      } else {
        this.showToast(response?.error || 'Failed to place sell order', 'danger');
      }
      
    } catch (error) {
      console.error('Error selling position:', error);
      this.showToast('Failed to place sell order', 'danger');
    } finally {
      this.isSelling = false;
    }
  }

  async liquidatePortfolio() {
    if (this.isLiquidating || this.positions.length === 0) return;
    
    // Show confirmation
    const confirmed = await this.showConfirmation('Liquidate Portfolio', 'Are you sure you want to sell all your holdings? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      this.isLiquidating = true;
      
      const response = await this.tradingService.liquidatePortfolio().toPromise();
      
      if (response?.success) {
        this.showToast('Portfolio liquidation initiated successfully', 'success');
        await this.loadData(); // Refresh data
      } else {
        this.showToast(response?.error || 'Failed to liquidate portfolio', 'danger');
      }
      
    } catch (error) {
      console.error('Error liquidating portfolio:', error);
      this.showToast('Failed to liquidate portfolio', 'danger');
    } finally {
      this.isLiquidating = false;
    }
  }

  async withdrawCash() {
    if (!this.withdrawAmount || this.isWithdrawing || this.withdrawAmount > this.maxWithdrawAmount) return;
    
    try {
      this.isWithdrawing = true;
      
      const withdrawRequest = {
        amount: this.withdrawAmount
      };
      
      const response = await this.tradingService.withdrawCash(withdrawRequest).toPromise();
      
      if (response?.success) {
        this.showToast(response.message || `Withdrawal of ${this.formatCurrency(this.withdrawAmount)} initiated`, 'success');
        this.withdrawAmount = null; // Clear input
        await this.loadData(); // Refresh data
      } else {
        this.showToast(response?.error || 'Failed to initiate withdrawal', 'danger');
      }
      
    } catch (error) {
      console.error('Error withdrawing cash:', error);
      this.showToast('Failed to initiate withdrawal', 'danger');
    } finally {
      this.isWithdrawing = false;
    }
  }

  formatCurrency(amount: string | number | null | undefined): string {
    if (!amount) return '$0.00';
    return this.tradingService.formatCurrency(amount);
  }

  formatPercentage(percentage: string | number): string {
    return this.tradingService.formatPercentage(percentage);
  }

  isPositiveGain(percentage: string | number): boolean {
    const num = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
    return num >= 0;
  }

  private showToast(message: string, color: string = 'primary') {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
  }

  private async showConfirmation(header: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      // For now, use a simple confirm dialog
      // In a real app, you'd use an Ionic alert controller
      const confirmed = confirm(`${header}\n\n${message}`);
      resolve(confirmed);
    });
  }
}