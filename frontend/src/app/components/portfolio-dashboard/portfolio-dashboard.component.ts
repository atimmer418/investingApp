import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService, PortfolioDashboardData, Position, PerformanceData, PortfolioHistory } from '../../services/portfolio.service';
import { LoadingController } from '@ionic/angular';
import { ToastService } from '../../services/toast.service';
import { PortfolioChartComponent, PortfolioDataPoint } from '../portfolio-chart/portfolio-chart.component';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
  IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonCardHeader,
  IonCardTitle, IonSpinner, IonItem, IonLabel, IonBadge, IonSegment,
  IonSegmentButton, IonGrid, IonRow, IonCol, IonList, IonChip,
  IonTabs, IonTabBar, IonTab, IonTabButton, IonRippleEffect
} from "@ionic/angular/standalone";

@Component({
  selector: 'app-portfolio-dashboard',
  templateUrl: './portfolio-dashboard.component.html',
  styleUrls: ['./portfolio-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PortfolioChartComponent,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
    IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonCardHeader,
    IonCardTitle, IonSpinner, IonItem, IonLabel, IonBadge, IonSegment,
    IonSegmentButton, IonGrid, IonRow, IonCol, IonList, IonChip, IonRippleEffect
  ]
})
export class PortfolioDashboardComponent implements OnInit {

  dashboard: PortfolioDashboardData | null = null;
  performanceData: PerformanceData[] = [];
  loading = true;
  error: string | null = null;
  selectedTab = 'overview';
  selectedPeriod = 'ALL';
  chartData: PortfolioDataPoint[] = [];
  isFlipped = false;

  // Time period options for chart
  periodOptions = [
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1Y', label: '1Y' },
    { value: 'ALL', label: 'All' }
  ];

  constructor(
    private portfolioService: PortfolioService,
    private loadingController: LoadingController,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.loadPortfolioData();
  }

  async loadPortfolioData() {
    this.loading = true;
    this.error = null;

    try {
      // Load dashboard data
      const dashboardData = await this.portfolioService.getPortfolioDashboard().toPromise();
      this.dashboard = dashboardData || null;

      // Load performance data - handle gracefully if endpoint doesn't exist
      try {
        const performanceData = await this.portfolioService.getPerformance().toPromise();
        this.performanceData = Array.isArray(performanceData) ? performanceData : [];

        // Sync performance data with dashboard summary for consistency
        if (this.dashboard) {
          // Sync 'Total' performance
          let totalPerf = this.performanceData.find(p => p.period === 'Total');
          if (!totalPerf) {
            totalPerf = { period: 'Total', startValue: 0, endValue: 0, totalReturn: 0, totalReturnPercent: 0 };
            this.performanceData.push(totalPerf);
          }
          // Use dashboard values as source of truth
          totalPerf.startValue = this.dashboard.totalInvested;
          totalPerf.endValue = this.dashboard.summary.portfolioValue;
          totalPerf.totalReturn = this.dashboard.totalGainLoss;
          totalPerf.totalReturnPercent = this.dashboard.totalGainLossPercent;

          // Sync 'Today' performance
          let todayPerf = this.performanceData.find(p => p.period === 'Today');
          if (todayPerf) {
            todayPerf.endValue = this.dashboard.summary.portfolioValue;
            todayPerf.totalReturn = this.dashboard.summary.todayChange;
            todayPerf.totalReturnPercent = this.dashboard.summary.todayChangePercent;
            todayPerf.startValue = this.dashboard.summary.portfolioValue - this.dashboard.summary.todayChange;
          }
        }
      } catch (perfError) {
        console.warn('Performance endpoint not available:', perfError);
        this.performanceData = [];
      }

      // Load initial chart data for the default period
      if (this.dashboard) {
        await this.loadHistoryForPeriod(this.selectedPeriod);
      }

    } catch (error: any) {
      console.error('Error loading portfolio data:', error);
      this.error = error.error?.message || 'Failed to load portfolio data';
      this.toastService.showToast('Failed to load portfolio data', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async onRefresh(event: any) {
    await this.loadPortfolioData();
    event.target.complete();
  }

  toggleFlip() {
    this.isFlipped = !this.isFlipped;
    console.log('Card flipped:', this.isFlipped);
  }

  onPeriodChange(period: string | number | undefined): void {
    if (period) {
      this.selectedPeriod = period.toString();
      this.loadHistoryForPeriod(this.selectedPeriod);
    }
  }

  async loadHistoryForPeriod(period: string) {
    if (!this.dashboard) return;

    try {
      const history = await this.portfolioService.getPortfolioHistory(period).toPromise();
      if (history) {
        this.dashboard.history = history;
        this.chartData = this.processChartData(history);
      }
    } catch (error: any) {
      console.error('Error loading portfolio history:', error);
      this.chartData = [];
    }
  }

  private processChartData(history: PortfolioHistory): PortfolioDataPoint[] {
    if (!history.timestamps || !history.values || history.timestamps.length !== history.values.length) {
      return [];
    }

    // Check if ALL values are 0 (completely empty portfolio)
    // Allow for some zeros at the beginning (before first investment)
    const hasAnyNonZeroValues = history.values.some(value => value > 0);
    if (!hasAnyNonZeroValues) {
      return []; // Return empty array only if ALL values are 0
    }

    const chartData = history.timestamps.map((timestamp: string, index: number) => ({
      date: timestamp,
      value: history.values[index]
    }));

    return chartData;
  }



  formatCurrency(amount: number): string {
    // Handle edge case where value is very small negative (rounds to 0) 
    // to avoid displaying "-$0.00"
    const roundedAmount = Math.round(amount * 100) / 100;
    const displayAmount = roundedAmount === 0 ? 0 : amount;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(displayAmount);
  }

  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getGainLossColor(value: number): string {
    return value >= 0 ? 'success' : 'danger';
  }

  getGainLossIcon(value: number): string {
    return value >= 0 ? 'trending-up' : 'trending-down';
  }

  onTabChange(event: any) {
    this.selectedTab = event.detail.value;
    // Flip card based on tab selection
    // Overview (default) -> Front side (isFlipped = false)
    // Analytics -> Back side (isFlipped = true)
    this.isFlipped = this.selectedTab === 'analytics';
  }
}
