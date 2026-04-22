import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ViewWillEnter } from '@ionic/angular';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButtons, IonBackButton, IonNote, IonSpinner, IonCheckbox, IonFooter, NavController
} from '@ionic/angular/standalone';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { InvestmentService } from '../../services/investment.service';
import { environment } from '../../../environments/environment';
import { JwtTokenUtils } from '../../utils/jwt-token.utils';

// Investment schedule interfaces
interface InvestmentSchedule {
  payFrequency: string;
  investmentAmount: number;
  startDate: string;
  isEnabled: boolean;
  scheduleDescription?: string;
}

// Default portfolio interface
interface DefaultStock {
  symbol: string;
  name: string;
  allocation: number; // percentage
  description: string;
}

@Component({
  selector: 'app-investmentconfirmation',
  templateUrl: './investmentconfirmation.component.html',
  styleUrls: ['./investmentconfirmation.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButtons, IonBackButton, IonNote, IonSpinner, IonCheckbox, IonFooter
  ]
})

export class InvestmentConfirmationComponent implements OnInit, ViewWillEnter {
  agreedToTerms: boolean = false;

  // Investment schedule data
  investmentSchedule: InvestmentSchedule = {
    payFrequency: 'BIWEEKLY',
    investmentAmount: 0,
    startDate: '',
    isEnabled: true
  };

  // Financial projections
  monthlyGoal: number = 0;
  targetPortfolio: number = 0;
  timeToFI: number = 0;

  // Legacy fields (will be replaced)
  investmentPercentage: string | null = null;
  portfolioType: 'custom' | 'auto' = 'auto';

  // Component state
  isAuthorizing: boolean = false;
  isCreatingAccount: boolean = false;
  userEmail: string | null = null;

  // User's portfolio (fetched from backend)
  userPortfolio: DefaultStock[] = [];
  isLoadingPortfolio: boolean = false;
  portfolioError: string | null = null;

  // Frequency options for display
  frequencyOptions = [
    { value: 'WEEKLY', label: 'Weekly', paychecksPerMonth: 4.33 },
    { value: 'BIWEEKLY', label: 'Bi-weekly', paychecksPerMonth: 2.17 },
    { value: 'SEMI_MONTHLY', label: 'Semi-monthly', paychecksPerMonth: 2.0 },
    { value: 'MONTHLY', label: 'Monthly', paychecksPerMonth: 1.0 }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private investmentService: InvestmentService,
    private navCtrl: NavController,
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  goBack(): void {
    this.navCtrl.navigateBack('/investment-schedule', { replaceUrl: true });
  }

  ngOnInit() {
    console.log('[InvestmentConfirmationComponent] Initializing investment confirmation page');

    // Load user data and investment schedule
    this.loadUserFinancialData();
    this.loadInvestmentSchedule();
    this.loadUserPortfolio();

    // Get user email for display
    const userEmail = this.authService.getCurrentUserEmail();
    if (userEmail) {
      this.userEmail = userEmail;
      console.log('[InvestmentConfirmationComponent] User email:', userEmail);
    }
  }

  ionViewWillEnter() {
    console.log('[InvestmentConfirmationComponent] View will enter - reloading portfolio');
    this.loadUserPortfolio();
  }

  loadUserFinancialData(): void {
    console.log('[InvestmentConfirmationComponent] Loading user financial data...');

    const currentProgress = this.authService.getCurrentProgress();
    if (currentProgress && currentProgress.monthlyInvestment) {
      this.monthlyGoal = currentProgress.monthlyInvestment;
      const annualInvestment = this.monthlyGoal * 12;
      this.targetPortfolio = annualInvestment * 25; // 4% rule estimate
      this.timeToFI = 25; // Simplified estimate

      console.log('[InvestmentConfirmationComponent] Loaded financial data:', {
        monthlyGoal: this.monthlyGoal,
        targetPortfolio: this.targetPortfolio,
        timeToFI: this.timeToFI
      });
    } else {
      console.log('[InvestmentConfirmationComponent] No financial data found, fetching from API...');
      this.authService.getUserProgress().subscribe({
        next: (progress) => {
          if (progress && progress.monthlyInvestment) {
            this.monthlyGoal = progress.monthlyInvestment;
            const annualInvestment = this.monthlyGoal * 12;
            this.targetPortfolio = annualInvestment * 25;
            this.timeToFI = 25;
          }
        },
        error: (error) => {
          console.error('[InvestmentConfirmationComponent] Error loading user progress:', error);
        }
      });
    }
  }

  loadInvestmentSchedule(): void {
    console.log('[InvestmentConfirmationComponent] Loading investment schedule from backend...');

    this.authService.getCurrentInvestmentSchedule().subscribe({
      next: (scheduleData) => {
        console.log('[InvestmentConfirmationComponent] ✅ Retrieved investment schedule from backend:', scheduleData);

        if (scheduleData && scheduleData.frequency && scheduleData.monthlyAmount) {
          this.investmentSchedule = {
            payFrequency: scheduleData.frequency,
            investmentAmount: this.calculateInvestmentAmountByFrequency(scheduleData.monthlyAmount, scheduleData.frequency),
            startDate: scheduleData.startDate,
            isEnabled: !scheduleData.isPaused,
            scheduleDescription: scheduleData.scheduleDescription
          };

          if (scheduleData.targetPortfolio) {
            this.targetPortfolio = scheduleData.targetPortfolio;
          }
          if (scheduleData.timeToFI) {
            this.timeToFI = scheduleData.timeToFI;
          }

          console.log('[InvestmentConfirmationComponent] ✅ Investment schedule loaded:', this.investmentSchedule);
        } else {
          console.log('[InvestmentConfirmationComponent] No valid schedule data, using defaults');
          this.setDefaultInvestmentSchedule();
        }
      },
      error: (error) => {
        console.error('[InvestmentConfirmationComponent] ❌ Error loading investment schedule:', error);
        console.log('[InvestmentConfirmationComponent] Using default values...');
        this.setDefaultInvestmentSchedule();
      }
    });
  }

  private setDefaultInvestmentSchedule(): void {
    this.investmentSchedule = {
      payFrequency: 'BIWEEKLY',
      investmentAmount: Math.round(this.monthlyGoal / 2.17),
      startDate: this.getNextInvestmentDate('BIWEEKLY'),
      isEnabled: true
    };
  }

  private calculateInvestmentAmountByFrequency(monthlyAmount: number, frequency: string): number {
    const frequencyMap: { [key: string]: number } = {
      'WEEKLY': 4.33,
      'BIWEEKLY': 2.17,
      'SEMI_MONTHLY': 2.0,
      'MONTHLY': 1.0
    };

    const periodsPerMonth = frequencyMap[frequency] || 2.17;
    return Math.round(monthlyAmount / periodsPerMonth);
  }

  private getNextInvestmentDate(frequency: string): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadUserPortfolio(): void {
    console.log('[InvestmentConfirmationComponent] Loading user portfolio from backend...');
    this.isLoadingPortfolio = true;
    this.portfolioError = null;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${JwtTokenUtils.getValidJwtToken()}`
    });

    this.http.get<any>(`${environment.backendApiUrl}/portfolio/current`, { headers }).subscribe({
      next: (portfolioResponse) => {
        console.log('[InvestmentConfirmationComponent] ✅ Portfolio loaded:', portfolioResponse);

        if (portfolioResponse && portfolioResponse.portfolioItems) {
          this.userPortfolio = portfolioResponse.portfolioItems.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            allocation: item.percentage,
            description: `${item.assetType || 'Investment'}`
          }));

          this.portfolioType = portfolioResponse.isDefault ? 'auto' : 'custom';
        }

        this.isLoadingPortfolio = false;
      },
      error: (error) => {
        console.error('[InvestmentConfirmationComponent] ❌ Error loading portfolio:', error);
        this.portfolioError = 'Unable to load portfolio. Using default allocation.';
        this.isLoadingPortfolio = false;

        this.userPortfolio = [
          { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 75, description: 'U.S. Stock Market' },
          { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', allocation: 20, description: 'International Stocks' },
          { symbol: 'VBR', name: 'Vanguard Small-Cap Value ETF', allocation: 5, description: 'Small-Cap Value' }
        ];
      }
    });
  }

  // Helper methods for display
  getSelectedFrequencyDetails() {
    return this.frequencyOptions.find(f => f.value === this.investmentSchedule.payFrequency);
  }

  getInvestmentScheduleDescription(): string {
    if (this.investmentSchedule.scheduleDescription) {
      return this.investmentSchedule.scheduleDescription;
    }

    const frequency = this.getSelectedFrequencyDetails();
    if (!frequency || !this.investmentSchedule.startDate) return '';

    const dateString = this.investmentSchedule.startDate;
    const dateParts = dateString.split('-');
    const startDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));

    const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    switch (frequency.value) {
      case 'WEEKLY':
        return `${dayName}, ${monthDay} — recurring every week on ${dayName}`;
      case 'BIWEEKLY':
        return `${dayName}, ${monthDay} — recurring every 2 weeks on ${dayName}`;
      case 'SEMI_MONTHLY':
        return `${monthDay} — recurring every month on the 1st and 15th`;
      case 'MONTHLY':
        const monthlyDay = startDate.getDate();
        return `${dayName}, ${monthDay} — recurring every month on the ${monthlyDay}${this.getOrdinalSuffix(monthlyDay)}`;
      default:
        return '';
    }
  }

  private getOrdinalSuffix(day: number): string {
    const lastDigit = day % 10;
    const lastTwoDigits = day % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }

    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getMonthlyProjection(): number {
    const frequencyDetails = this.getSelectedFrequencyDetails();
    if (!frequencyDetails) return 0;
    return this.investmentSchedule.investmentAmount * frequencyDetails.paychecksPerMonth;
  }

  getAnnualProjection(): number {
    return this.getMonthlyProjection() * 12;
  }

  // Navigation methods
  editPortfolio(): void {
    console.log('[InvestmentConfirmationComponent] Navigating to portfolio customization');
    this.router.navigate(['/portfolio-customize'], { queryParams: { initial: 'true' } });
  }

  async authorizeRecurringInvestment() {
    if (!this.agreedToTerms) {
      this.toastService.showToast('Please agree to the Terms of Service and Privacy Policy to continue.', 'warning');
      return;
    }

    this.isAuthorizing = true;

    this.authService.completeStep('investmentConfirmation').subscribe({
      next: () => {
        console.log('InvestmentConfirmation step completed successfully');
        this.isAuthorizing = false;
        this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
      },
      error: (err) => {
        console.error('Failed to complete InvestmentConfirmation step:', err);
        this.isAuthorizing = false;
        this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
      }
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = JwtTokenUtils.getValidJwtToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}
