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
          if (!todayPerf) {
            todayPerf = { period: 'Today', startValue: 0, endValue: 0, totalReturn: 0, totalReturnPercent: 0 };
            this.performanceData.push(todayPerf);
          }

          if (this.dashboard) {
            todayPerf.endValue = this.dashboard.summary.portfolioValue;

            // Try to use History for accurate P/L (Dollar Change)
            // This pulls the actual Profit/Loss from Alpaca's history, which accounts for trades/transfers
            // significantly better than the snapshot comparison.
            let todayPL = null;
            if (this.dashboard.history && this.dashboard.history.profitLoss && this.dashboard.history.profitLoss.length >= 2) {
              const pl = this.dashboard.history.profitLoss;
              const last = pl.length - 1;
              // Today's P/L = Current Cumulative P/L - Yesterday's Cumulative P/L
              const currentPL = pl[last] || 0;
              const prevPL = pl[last - 1] || 0;
              todayPL = currentPL - prevPL;
            }

            if (todayPL !== null) {
              todayPerf.totalReturn = todayPL;
            } else {
              // Fallback to backend summary if history unavailable
              todayPerf.totalReturn = this.dashboard.summary.todayChange;
            }

            // Calculate Start Value derived from the Return
            // This creates a consistent "Apple to Apples" view of Portfolio Value Growth
            todayPerf.startValue = todayPerf.endValue - todayPerf.totalReturn;

            // Calculate Percent: Return / Start
            if (todayPerf.startValue !== 0) {
              todayPerf.totalReturnPercent = (todayPerf.totalReturn / todayPerf.startValue) * 100;
            } else {
              todayPerf.totalReturnPercent = 0;
            }
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

  getReturnForCurrentPeriod(): { value: number, percent: number } | null {
    let targetPeriod = this.selectedPeriod;
    if (this.selectedPeriod === 'ALL') targetPeriod = 'Total';


    // We only use the pre-fetched performance data for "Today".
    // For "Total"/"ALL", the pre-fetched data only includes Unrealized Gains (Open Positions).
    // The user prefers the return to be consistent with other periods (Realized + Unrealized),
    // so we force "Total" to fall through to the History-based calculation below.
    if (targetPeriod === 'Today') {
      const perf = this.performanceData.find(p => p.period === targetPeriod);
      console.log('perf:', perf);
      if (perf) {
        return {
          value: perf.totalReturn,
          percent: perf.totalReturnPercent
        };
      }
    }

    // Use history data (Alpaca provided P/L) if available

    // Priority 1: Manual Calculation using Modified Dietz / Cost Basis method
    // We compute the return based on the Change in Profit/Loss ($) relative to the Invested Capital.
    // This handles recurring deposits better than raw Equity changes, and avoids ambiguity 
    // in Alpaca's pre-calculated percentage.
    if (this.dashboard?.history?.profitLoss && this.dashboard.history.profitLoss.length > 0 &&
      this.dashboard.history.values && this.dashboard.history.values.length > 0) {

      const history = this.dashboard.history;
      const last = history.values.length - 1;

      // Note: We used to have special logic here for "Inception" checks to use Unrealized P/L,
      // but now we treat all periods the same (Realized + Unrealized) for consistency.
      if (last > 0 && history?.profitLoss && history.profitLoss.length > last) {
        // Find the first index with non-zero equity to avoid "Start=0" skewing the Dietz calculation
        // If we start at 0, the initial deposit is treated as a flow (weighted 0.5), which inflates return % artificially.
        let firstIndex = 0;
        while (firstIndex < last && history.values[firstIndex] === 0) {
          firstIndex++;
        }

        const plStart = history.profitLoss[firstIndex] || 0;
        const plEnd = history.profitLoss[last] || 0;
        const eqStart = history.values[firstIndex] || 0;
        const eqEnd = history.values[last] || 0;

        const gainPeriod = plEnd - plStart;
        const equityChange = eqEnd - eqStart;
        const netDeposits = equityChange - gainPeriod;

        // Formula: Return = (PL_End - PL_Start) / Current_Cost_Basis
        // Current_Cost_Basis = Equity_End - PLC_End
        // This calculates the contribution of this period's P/L to the Total Return on Investment.
        // This ensures consistency: if Period covers the whole lifespan (like 3M for a 1M old account),
        // it simplifies to Total_PL / Total_Basis, which matches the "All" view (1.8%).
        const currentCostBasis = eqEnd - plEnd;

        // Safety for zero basis
        let basis = currentCostBasis;
        if (basis <= 0) {
          // Fallback to average invested capital during period (Modified Dietz denominator)
          // Adjusted Capital = Start Capital + 0.5 * New Capital
          basis = eqStart + (netDeposits * 0.5);
          if (basis <= 0) basis = 1;
        }

        const percent = (gainPeriod / basis) * 100;

        return {
          value: gainPeriod,
          percent: percent
        };
      }
    }

    // Priority 2: Fallback (should be covered by Priority 1 usually)
    if (this.dashboard?.history?.profitLoss && this.dashboard.history.profitLoss.length > 0) {
      const history = this.dashboard.history;
      const profitLossArray = history.profitLoss; // Copy to local const for type safety
      const valuesArray = history.values;
      const lastIndex = history.values.length - 1;

      if (lastIndex >= 0 && profitLossArray && profitLossArray.length > lastIndex) {
        // Get P/L and Equity at start and end of the period
        // Index 0 is the start of the requested period (e.g., 1M ago)
        const plStart = profitLossArray[0] || 0;
        const plEnd = profitLossArray[lastIndex] || 0;

        const valStart = valuesArray[0] || 0;
        const valEnd = valuesArray[lastIndex] || 0;

        // Calculate performance for THIS period
        const plPeriod = plEnd - plStart;

        // Calculate Invested Capital (Net of P/L)
        // Invested = Equity - P/L
        const investedStart = valStart - plStart;
        const investedEnd = valEnd - plEnd;

        // Net New Cash introduced during the period
        const netNewCash = investedEnd - investedStart;

        // Modified Dietz Denominator: Start Capital + (Net New Cash / 2)
        // We assume cash flows happen roughly in the middle or evenly distributed
        const uniqueInvestedCapital = investedStart + (netNewCash / 2);

        if (uniqueInvestedCapital !== 0) {
          const percent = (plPeriod / uniqueInvestedCapital) * 100;
          return { value: plPeriod, percent };
        }
      }
    }

    // Fallback: Calculate from chartData (Only if absolutely no P/L data exists)
    // Warning: This includes deposits/withdrawals as "Performance"
    if (this.chartData && this.chartData.length > 0) {
      const startValue = this.chartData[0].value;
      const endValue = this.chartData[this.chartData.length - 1].value;

      if (startValue === 0) {
        return { value: endValue, percent: 0 };
      }

      const value = endValue - startValue;
      const percent = (value / startValue) * 100;

      return { value, percent };
    }

    return null;
  }

  getPeriodLabel(): string {
    const map: { [key: string]: string } = {
      '1M': '1-month',
      '3M': '3-month',
      '6M': '6-month',
      '1Y': '1-year',
      'ALL': 'total'
    };
    return map[this.selectedPeriod] || this.selectedPeriod;
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

  formatQuantity(value: number): string {
     if (value === undefined || value === null) return '0';
     return new Intl.NumberFormat('en-US', {
       minimumFractionDigits: 0,
       maximumFractionDigits: 3
     }).format(value);
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

  getPositionsTotalValue(): number {
    if (!this.dashboard?.positions) return 0;
    return this.dashboard.positions.reduce((sum, p) => sum + p.marketValue, 0);
  }

  getPositionsTotalCostBasis(): number {
    if (!this.dashboard?.positions) return 0;
    return this.dashboard.positions.reduce((sum, p) => sum + p.costBasis, 0);
  }

  getPositionsTotalGainLoss(): number {
    if (!this.dashboard?.positions) return 0;
    return this.dashboard.positions.reduce((sum, p) => sum + p.unrealizedPL, 0);
  }

  getPositionsTotalTodayGainLoss(): number {
    if (!this.dashboard?.positions) return 0;
    return this.dashboard.positions.reduce((sum, p) => sum + (p.todayGainLoss || 0), 0);
  }

  getPositionsTotalWeightedReturn(): number {
    const totalCost = this.getPositionsTotalCostBasis();
    if (totalCost === 0) return 0;

    // Weighted Return = (Total Gain / Total Cost) * 100
    // This is mathematically equivalent to the sum of weighted returns if weights are based on cost basis
    return (this.getPositionsTotalGainLoss() / totalCost) * 100;
  }

  getPositionsTotalWeightedTodayReturn(): number {
    // Current Market Value = Positions Total Value (Yesterday) + Total Today G/L
    // Yesterday Value = Current Market Value - Total Today G/L
    // Return % = (Total Today G/L / Yesterday Value) * 100
    // This gives the accurate portfolio-wide day performance
    const currentMarketValue = this.getPositionsTotalValue();
    const todayGL = this.getPositionsTotalTodayGainLoss();
    const yesterdayValue = currentMarketValue - todayGL;

    if (yesterdayValue === 0) return 0;
    return (todayGL / yesterdayValue) * 100;
  }
}
