import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonItem,
  IonLabel,
  IonIcon,
  IonList,
  IonToggle,
  IonBadge,
  IonRange
} from '@ionic/angular/standalone';
import { MonteCarloService, SimulationParams, SimulationResult, StrategyType } from '../../services/monte-carlo.service';
import { PortfolioService } from '../../services/portfolio.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import Chart from 'chart.js/auto';
import { addIcons } from 'ionicons';
import { diceOutline, schoolOutline, calculatorOutline } from 'ionicons/icons';
import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';




@Component({
  selector: 'app-retirement-planning',
  templateUrl: './retirement-planning.component.html',
  styleUrls: ['./retirement-planning.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonItem,
    IonLabel,
    IonIcon,
    IonList,
    IonToggle,
    IonBadge,
    IonRange,
    KeyboardAvoidDirective
  ]
})
export class RetirementPlanningComponent implements OnInit {
  @ViewChild('monteCarloResults') monteCarloResultsRef!: ElementRef<HTMLElement>;
  selectedSection: 'simulator' | 'education' = 'simulator';

  // Tier gate
  private currentTier: string | null = null;

  get isMonteCarloLocked(): boolean {
    return this.currentTier !== 'plus' && this.currentTier !== 'pro';
  }

  // Helper method for template type checking
  isEducationSection(): boolean {
    return this.selectedSection === 'education';
  }

  isSimulatorSection(): boolean {
    return this.selectedSection === 'simulator';
  }

  setSelectedSection(section: 'simulator' | 'education'): void {
    this.selectedSection = section;
  }

  // Education section state
  openedStrategy: string | null = null;
  openedStrategyTitle: string = '';
  openedStrategyBullets: string[] = [];

  private readonly strategyData: Record<string, { title: string; bullets: string[] }> = {
    yield: {
      title: 'Yield-Based Income',
      bullets: [
        'Build a portfolio of high-yield dividend stocks and bonds (target 4–5% yield).',
        'Spend only the natural income — dividends, interest, REITs — never selling principal.',
        'Reinvest excess income in good years to compound the base.',
        'Rebalance annually to maintain target yield mix.',
        'Keep a 6-month cash buffer to avoid selling during dividend cuts.'
      ]
    },
    guardrails: {
      title: 'Dynamic Guardrails',
      bullets: [
        'Set a base withdrawal rate of 5% at retirement.',
        'If withdrawals exceed 6% of current portfolio, cut spending by 10%.',
        'If withdrawals drop below 4% of current portfolio, increase spending by 10%.',
        'Review and adjust once per year after rebalancing.',
        'Keep 2 years of spending in cash to avoid forced sales in down markets.'
      ]
    },
    annuity: {
      title: 'Annuity',
      bullets: [
        'Use 40–60% of your portfolio to purchase a fixed immediate annuity at retirement.',
        'The annuity covers all essential expenses — housing, food, healthcare.',
        'Invest the remaining portfolio in stocks for growth and discretionary spending.',
        'Never touch the annuity principal — treat it as a pension.',
        'Review the growth portfolio annually and adjust spending for lifestyle goals.'
      ]
    },
    sbloc: {
      title: 'SBLOC + 4% Rule',
      bullets: [
        'In up-market years: sell 4% of portfolio for living expenses as usual.',
        'In down-market years (portfolio drops >10%): borrow from a Securities-Based Line of Credit instead of selling.',
        'When the market recovers, sell enough to repay the SBLOC loan first, then resume normal 4% withdrawals.',
        'Keep SBLOC balance below 20% of portfolio value to avoid margin calls.',
        'Set up the SBLOC before retirement — approval requires a qualifying portfolio.'
      ]
    }
  };

  openStrategy(id: string): void {
    const data = this.strategyData[id];
    if (!data) return;
    this.openedStrategy = id;
    this.openedStrategyTitle = data.title;
    this.openedStrategyBullets = data.bullets;
  }

  closeStrategy(): void {
    this.openedStrategy = null;
  }

  // Monte Carlo simulation inputs
  portfolioValue: number = 1000000;
  annualWithdrawal: number = 40000;
  yearsToLast: number = 30;

  // Strategy-specific properties
  selectedStrategy: string = 'traditional';
  useNTSX: boolean = false;
  essentialExpenses: number = 40000;
  sblocInterestRate: number = 0.055; // 5.5% SBLOC interest
  sblocLtvLimit: number = 0.70; // 70% LTV limit
  guardrailLower: number = 0.04; // 4% lower guardrail
  guardrailUpper: number = 0.06; // 6% upper guardrail

  // Simulation state
  isSimulating: boolean = false;
  simulationResult: SimulationResult | null = null;

  // Comparison state
  isComparisonMode: boolean = false;
  comparisonResults: Record<string, SimulationResult> | null = null;
  chart: Chart | null = null;

  // UI state for collapsible sections
  guideExpanded: boolean = false;
  showAdvancedOptions: boolean = false;


  constructor(
    private monteCarloService: MonteCarloService,
    private portfolioService: PortfolioService,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    addIcons({ diceOutline, schoolOutline, calculatorOutline });
  }

  ngOnInit(): void {
    this.authService.userProgress$.subscribe(progress => {
      this.currentTier = progress?.selectedTier ?? null;
    });
  }

  upgradeToPlusClicked(): void {
    // TODO: trigger Plus subscription IAP
    console.log('[RetirementPlanning] Plus upgrade requested');
  }

  // Fetch real portfolio value from Tab 1
  fetchPortfolioValue(): void {
    this.portfolioService.getPortfolioDashboard().subscribe({
      next: (data) => {
        if (data && data.summary) {
          this.portfolioValue = Math.round(data.summary.portfolioValue);
        }
      },
      error: (err) => {
        console.error('Failed to fetch portfolio', err);
      }
    });
  }

  runSimulation() {
    this.isSimulating = true;

    // Simulate processing delay
    setTimeout(() => {
      this.simulationResult = this.runMonteCarloSimulation();
      this.isSimulating = false;
    }, 2000);
  }

  private runMonteCarloSimulation(): SimulationResult {
    const params: SimulationParams = {
      strategy: this.selectedStrategy as StrategyType,
      portfolioValue: this.portfolioValue,
      annualWithdrawal: this.annualWithdrawal,
      yearsToLast: this.yearsToLast,
      useNTSX: this.useNTSX,
      sblocInterestRate: this.sblocInterestRate,
      sblocLtvLimit: this.sblocLtvLimit,
      annuityPercentage: this.getRecommendedAnnuityPercentage(), // Use dynamic calculation
      guardrailLower: this.guardrailLower,
      guardrailUpper: this.guardrailUpper
    };

    return this.monteCarloService.runSimulation(params);
  }

  runComparison() {
    this.isSimulating = true;
    this.isComparisonMode = true;
    this.simulationResult = null; // Clear single result

    setTimeout(() => {
      const params: Omit<SimulationParams, 'strategy'> = {
        portfolioValue: this.portfolioValue,
        annualWithdrawal: this.annualWithdrawal,
        yearsToLast: this.yearsToLast,
        useNTSX: this.useNTSX,
        sblocInterestRate: this.sblocInterestRate,
        sblocLtvLimit: this.sblocLtvLimit,
        annuityPercentage: this.getRecommendedAnnuityPercentage(),
        guardrailLower: this.guardrailLower,
        guardrailUpper: this.guardrailUpper
      };

      this.comparisonResults = this.monteCarloService.runComparison(params);
      this.isSimulating = false;

      // Give DOM time to update then create chart
      setTimeout(() => this.createComparisonChart(), 100);
    }, 1000);
  }

  createComparisonChart() {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = document.getElementById('comparisonChart') as HTMLCanvasElement;
    if (!ctx || !this.comparisonResults) return;

    const labels = Array.from({ length: this.yearsToLast + 1 }, (_, i) => `Year ${i}`);

    // Define colors for strategies
    const colors: Record<string, string> = {
      'traditional': '#3880ff', // Primary Blue
      'sbloc': '#2dd36f',      // Success Green
      'annuity-growth': '#ffc409', // Warning Yellow
      'dynamic-guardrails': '#eb445a', // Danger Red
      'full-annuity': '#92949c' // Medium Gray
    };

    const datasets = Object.entries(this.comparisonResults).map(([strategy, result]) => {
      return {
        label: this.formatStrategyName(strategy),
        data: result.medianTrajectory,
        borderColor: colors[strategy] || '#000000',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0
      };
    });

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          title: {
            display: true,
            text: 'Median Portfolio Value Over Time'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return '$' + (value as number / 1000) + 'k';
              }
            }
          }
        }
      }
    });
  }

  formatStrategyName(key: string): string {
    const names: Record<string, string> = {
      'traditional': 'Traditional 4%',
      'sbloc': 'SBLOC Growth',
      'annuity-growth': 'Annuity + Growth',
      'dynamic-guardrails': 'Dynamic Guardrails',
      'full-annuity': 'Full Annuity'
    };
    return names[key] || key;
  }

  exportToCSV() {
    if (!this.comparisonResults) return;

    // Header
    let csv = 'Strategy,Success Rate,Median End Value,Worst Case Value\n';

    // Rows
    Object.entries(this.comparisonResults).forEach(([strategy, result]) => {
      csv += `${this.formatStrategyName(strategy)},${result.successProbability.toFixed(1)}%,${result.medianEndValue},${result.minimumEndValue}\n`;
    });

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monte-carlo-comparison.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async shareMonteCarlo() {
    if (!this.simulationResult || !this.monteCarloResultsRef) return;
    try {
      // @ts-ignore
      const html2canvasModule = await import('html2canvas') as any;
      const html2canvas = html2canvasModule.default ?? html2canvasModule;
      const canvas = await html2canvas(this.monteCarloResultsRef.nativeElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });
      const dataUrl: string = canvas.toDataURL('image/png');

      // @ts-ignore
      const { Share } = await import('@capacitor/share') as any;
      await Share.share({
        title: 'My FRED Monte Carlo Results',
        text: `My retirement plan has a ${this.simulationResult.successProbability.toFixed(0)}% success rate.`,
        url: dataUrl,
        dialogTitle: 'Share your results'
      });
    } catch (err: any) {
      console.error('[MonteCarlo] Share failed:', err);
      this.toastService.showToast('Unable to share results. Please try again.', 'danger');
    }
  }

  printReport() {
    window.print();
  }



  getSuccessIcon(): string {
    if (!this.simulationResult) return 'help-outline';

    if (this.simulationResult.successProbability >= 90) return 'checkmark-circle-outline';
    if (this.simulationResult.successProbability >= 75) return 'warning-outline';
    return 'close-circle-outline';
  }

  getSuccessColor(): string {
    if (!this.simulationResult) return 'medium';

    if (this.simulationResult.successProbability >= 90) return 'success';
    if (this.simulationResult.successProbability >= 75) return 'warning';
    return 'danger';
  }

  getSuccessMessage(): string {
    if (!this.simulationResult) return 'No simulation run yet';

    if (this.simulationResult.successProbability >= 90) return 'Excellent Strategy';
    if (this.simulationResult.successProbability >= 75) return 'Good Strategy';
    if (this.simulationResult.successProbability >= 50) return 'Moderate Risk';
    return 'High Risk Strategy';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercent(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }

  getTotalWithdrawal(): number {
    // Calculate total withdrawal over retirement period with inflation
    let total = 0;
    let currentWithdrawal = this.annualWithdrawal;

    for (let year = 0; year < this.yearsToLast; year++) {
      total += currentWithdrawal;
      currentWithdrawal *= 1.025; // 2.5% inflation
    }

    return total;
  }

  getFinalYearWithdrawal(): number {
    // Calculate what the withdrawal will be in the final year
    return this.annualWithdrawal * Math.pow(1.025, this.yearsToLast - 1);
  }

  getSuccessfulScenarios(): number {
    // Calculate number of successful scenarios out of 1,000
    if (!this.simulationResult) return 0;
    return Math.round(this.simulationResult.successProbability * 10);
  }

  // Expose Math for template use
  get mathPow() {
    return Math.pow;
  }

  // Strategy selector helper methods
  getStrategyHint(): string {
    const hints: { [key: string]: string } = {
      'traditional': 'Withdraw a fixed 4% of your initial portfolio annually, adjusted for inflation. Simple and historically safe.',
      'sbloc': 'Borrow during market downturns instead of selling. Maintains full portfolio exposure, mathematically optimal.',
      'annuity-growth': 'Guarantee essential expenses with an annuity, invest the rest for growth. Best of both worlds.',
      'dynamic-guardrails': 'Adjust spending based on portfolio performance. Spend more in good years, less in bad years.',
      'full-annuity': 'Convert entire portfolio to guaranteed lifetime income. Maximum security, zero market risk.'
    };
    return hints[this.selectedStrategy] || '';
  }

  getStrategyHintCompact(): string {
    const hints: { [key: string]: string } = {
      'traditional': 'Withdraw 4% annually, adjusted for inflation',
      'sbloc': 'Borrow in bad years, sell in good years',
      'annuity-growth': 'Guarantee essentials, grow the rest',
      'dynamic-guardrails': 'Spend more/less based on performance',
      'full-annuity': 'Guaranteed income for life'
    };
    return hints[this.selectedStrategy] || '';
  }

  toggleGuideExpanded(): void {
    this.guideExpanded = !this.guideExpanded;
  }

  toggleAdvancedOptions(): void {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  onStrategyChange(): void {
    // Reset simulation results when strategy changes
    this.simulationResult = null;
  }

  onNTSXChange(): void {
    // Reset simulation results when NTSX toggle changes
    this.simulationResult = null;
  }

  // Annuity calculation helpers
  getRecommendedAnnuityAmount(): number {
    if (!this.essentialExpenses || !this.portfolioValue) return 0;
    // Annuity pays ~6% annually, so divide essential expenses by 0.06
    const annuityNeeded = this.essentialExpenses / 0.06;
    // Cap at portfolio value
    return Math.min(annuityNeeded, this.portfolioValue);
  }

  getRecommendedAnnuityPercentage(): number {
    if (!this.portfolioValue) return 0;
    return (this.getRecommendedAnnuityAmount() / this.portfolioValue) * 100;
  }

  getAnnuityIncome(): number {
    return this.getRecommendedAnnuityAmount() * 0.06; // 6% payout rate
  }
}
