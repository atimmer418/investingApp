import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService, PortfolioDashboardData, Position, PerformanceData } from '../../services/portfolio.service';
import { LoadingController, ToastController } from '@ionic/angular';
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
  selectedPeriod = '1M';
  
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

      // Load performance data
      const performanceData = await this.portfolioService.getPerformance().toPromise();
      this.performanceData = Array.isArray(performanceData) ? performanceData : [];
      
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
        // Chart will be updated when we implement it
      }
    } catch (error: any) {
      console.error('Error loading history:', error);
      this.showToast('Failed to load portfolio history', 'danger');
    }
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
