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
  IonModal,
  AlertController
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
  timeOutline,
  warningOutline,
  informationCircleOutline
} from 'ionicons/icons';

import { TradingService, SellRequest, WithdrawRequest } from '../services/trading.service';
import { PortfolioService, PortfolioDashboardData, Position, AccountSummary } from '../services/portfolio.service';
import { ToastService } from '../services/toast.service';

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
    IonModal
  ]
})
export class SellWithdrawPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  public isLoading = true;
  public positions: Position[] = [];
  public balance: AccountSummary | null = null;
  public dashboardData: PortfolioDashboardData | null = null;
  public selectedPosition: Position | null = null;
  public sellPercentage = 25;
  public withdrawAmount: number | null = null;
  public retirementRate = 4.0;

  // UI state
  public isSelling = false;
  public isLiquidating = false;
  public isWithdrawing = false;
  public showRetirementModal = false;

  // Quick select options
  public quickPercentages = [25, 50, 75, 100];
  public quickWithdrawAmounts = [100, 500, 1000, 2500];

  public maxSellPercentage = 100;

  constructor(
    private router: Router,
    private tradingService: TradingService,
    private portfolioService: PortfolioService,
    private alertController: AlertController,
    private toastService: ToastService
  ) {
    addIcons({
      pieChartOutline,
      checkmarkCircle,
      radioButtonOff,
      cashOutline,
      trendingUpOutline,
      trendingDownOutline,
      walletOutline,
      timeOutline,
      warningOutline,
      informationCircleOutline
    });
  }

  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadData() {
    try {
      this.isLoading = true;

      // Load dashboard data from PortfolioService
      const dashboardData = await this.portfolioService.getPortfolioDashboard().toPromise();

      if (dashboardData) {
        this.dashboardData = dashboardData;
        // Filter out dust positions (negligible value or quantity)
        this.positions = (dashboardData.positions || []).filter(p => {
          const hasValue = p.marketValue >= 0.01;
          const hasQty = p.quantity >= 0.0001;
          return hasValue && hasQty;
        });
        this.balance = dashboardData.summary || null;
      }

    } catch (error) {
      console.error('Error loading trading data:', error);
      this.showToast('Failed to load portfolio data', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  selectPosition(position: Position) {
    // Calculate pending percentage first to check for 100% pending (rounding issues)
    let pendingPercent = 0;
    if (position.quantityAvailable !== undefined && position.quantity > 0) {
      pendingPercent = Math.round(((position.quantity - position.quantityAvailable) / position.quantity) * 100);
    }

    // Check if position has available quantity or is effectively 100% pending
    if ((position.quantityAvailable !== undefined && position.quantityAvailable <= 0 && position.quantity > 0) || pendingPercent === 100) {
      this.showToast('This full position is pending sale.', 'warning');
      return;
    }

    this.selectedPosition = position;

    // Calculate max sell percentage based on available quantity
    if (position.quantityAvailable !== undefined && position.quantity > 0) {
      this.maxSellPercentage = Math.floor((position.quantityAvailable / position.quantity) * 100);
    } else {
      this.maxSellPercentage = 100;
    }

    // Reset to default (25%) or max if max is lower than 25%
    this.sellPercentage = Math.min(25, this.maxSellPercentage);

    // If partially pending, warn the user but allow selection
    if (position.quantityAvailable !== undefined && position.quantityAvailable < position.quantity) {
      this.showToast(`Note: ${pendingPercent}% of your position is currently pending sale.`, 'warning');
    }
  }

  setSellPercentage(percentage: number) {
    this.sellPercentage = percentage;
  }

  setWithdrawAmount(amount: number) {
    this.withdrawAmount = amount;
  }

  calculateSellAmount(): number {
    if (!this.selectedPosition) return 0;
    const marketValue = this.selectedPosition.marketValue;
    return (marketValue * this.sellPercentage) / 100;
  }

  calculateRetirementWithdrawal(): number {
    if (!this.balance?.portfolioValue) return 0;
    const portfolioValue = this.balance.portfolioValue;
    return this.tradingService.calculateRetirementWithdrawal(portfolioValue);
  }

  calculateCustomRetirementWithdrawal(): number {
    if (!this.balance?.portfolioValue) return 0;
    const portfolioValue = this.balance.portfolioValue;
    return this.tradingService.calculateSystematicWithdrawal(portfolioValue, this.retirementRate, 'monthly');
  }

  getPortfolioValue(): number {
    if (!this.balance?.portfolioValue) return 0;
    return this.balance.portfolioValue;
  }

  get maxWithdrawAmount(): number {
    if (this.balance && typeof this.balance.cash !== 'undefined') {
      return this.balance.cash;
    }
    // Fallback to buyingPower if cash is not available (though it should be)
    if (this.balance?.buyingPower) return this.balance.buyingPower;
    return 0;
  }

  async sellPosition() {
    if (!this.selectedPosition || this.isSelling) return;

    try {
      this.isSelling = true;
      const symbolToSell = this.selectedPosition.symbol;
      const isFullSell = this.sellPercentage === 100;
      const estimatedProceeds = this.calculateSellAmount();

      const sellRequest = {
        symbol: symbolToSell,
        percentage: this.sellPercentage
      };

      const response = await this.tradingService.sellByPercentage(sellRequest).toPromise();

      if (response?.success) {
        this.showToast(`Successfully placed sell order for ${this.sellPercentage}% of ${symbolToSell}`, 'success');
        this.selectedPosition = null; // Clear selection

        // Optimistic update: if 100% sell, remove from list immediately
        if (isFullSell) {
          this.positions = this.positions.filter(p => p.symbol !== symbolToSell);
        }

        // Optimistic update: update buying power immediately
        if (this.balance) {
          this.balance.buyingPower += estimatedProceeds;
        }

        // Add a delay before reloading to allow order to fill
        setTimeout(async () => {
          await this.loadData();
        }, 2000);

      } else {
        // Gentle error message instead of raw backend error
        console.error('Sell error:', response?.error);
        this.showToast('Unable to process sale. You may have pending orders for this position.', 'danger');
      }

    } catch (error) {
      console.error('Error selling position:', error);
      this.showToast('Unable to process sale. Please try again later.', 'danger');
    } finally {
      this.isSelling = false;
    }
  }

  async liquidatePortfolio() {
    if (this.isLiquidating || this.positions.length === 0) return;

    const alert = await this.alertController.create({
      header: 'Liquidate Portfolio',
      subHeader: 'Are you sure?',
      message: 'This will sell ALL your current holdings and convert them to cash. This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Liquidate All',
          role: 'destructive',
          cssClass: 'alert-button-danger',
          handler: () => {
            this.processLiquidation();
          }
        }
      ]
    });

    await alert.present();
  }

  private async processLiquidation() {
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

  isFullyPending(position: Position): boolean {
    if (position.quantityAvailable === undefined) return false;
    if (position.quantityAvailable <= 0) return true;
    if (position.quantity <= 0) return false;

    const pendingPercent = Math.round(((position.quantity - position.quantityAvailable) / position.quantity) * 100);
    return pendingPercent === 100;
  }

  private showToast(message: string, color: string = 'primary') {
    this.toastService.showToast(message, color);
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