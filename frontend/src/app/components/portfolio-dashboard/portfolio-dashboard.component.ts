import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService, PortfolioDashboardData, Position, PerformanceData, PortfolioHistory } from '../../services/portfolio.service';
import { LoadingController, ToastController } from '@ionic/angular';
import { PortfolioChartComponent, PortfolioDataPoint } from '../portfolio-chart/portfolio-chart.component';
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
  IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonCardHeader,
  IonCardTitle, IonSpinner, IonItem, IonLabel, IonBadge, IonSegment,
  IonSegmentButton, IonGrid, IonRow, IonCol, IonList, IonChip,
  IonTabs, IonTabBar, IonTab, IonTabButton
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
    IonSegmentButton, IonGrid, IonRow, IonCol, IonList, IonChip
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
    private toastController: ToastController
  ) {}

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
      this.showToast('Failed to load portfolio data', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async onRefresh(event: any) {
    await this.loadPortfolioData();
    event.target.complete();
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
