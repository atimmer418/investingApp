import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonItem, IonLabel,
  IonSelect, IonSelectOption, IonInput, IonNote, IonIcon, IonCard, IonCardContent,
  IonCardHeader, IonCardTitle, IonButtons, IonBackButton, IonProgressBar, IonSpinner
} from '@ionic/angular/standalone';

import { AuthService } from '../../services/auth.service';

export interface InvestmentSchedule {
  payFrequency: string;
  investmentAmount: number;
  startDate: string;
  isEnabled: boolean;
}

@Component({
  selector: 'app-investment-schedule',
  templateUrl: './investment-schedule.component.html',
  styleUrls: ['./investment-schedule.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonItem, IonLabel,
    IonSelect, IonSelectOption, IonInput, IonNote, IonIcon, IonCard, IonCardContent,
    IonCardHeader, IonCardTitle, IonButtons, IonBackButton, IonProgressBar, IonSpinner
  ]
})
export class InvestmentScheduleComponent implements OnInit {
  // User's financial data from initial survey
  monthlyGoal: number = 0;
  targetPortfolio: number = 0;
  timeToFI: number = 0;

  isSubmitting: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  // Investment schedule configuration
  schedule: InvestmentSchedule = {
    payFrequency: 'BIWEEKLY',
    investmentAmount: 0,
    startDate: '',
    isEnabled: true
  };

  // Frequency options with descriptions
  frequencyOptions = [
    {
      value: 'WEEKLY',
      label: 'Weekly',
      description: 'Every 7 days',
      paychecksPerMonth: 4.33
    },
    {
      value: 'BIWEEKLY',
      label: 'Bi-weekly',
      description: 'Every 2 weeks (26 times per year)',
      paychecksPerMonth: 2.17
    },
    {
      value: 'SEMI_MONTHLY',
      label: 'Twice per month',
      description: '1st and 15th of each month',
      paychecksPerMonth: 2.0
    },
    {
      value: 'MONTHLY',
      label: 'Monthly',
      description: 'Once per month',
      paychecksPerMonth: 1.0
    }
  ];

  ngOnInit() {
    console.log('[InvestmentScheduleComponent] ngOnInit - Initializing Investment Schedule Page.');
    this.loadUserFinancialData();
    // Set default start date to next Monday
    this.schedule.startDate = this.getNextMonday();
  }

  loadUserFinancialData(): void {
    console.log('[InvestmentScheduleComponent] Loading user financial data...');
    
    // First try to get current progress
    const currentProgress = this.authService.getCurrentProgress();
    console.log('[InvestmentScheduleComponent] Current progress from cache:', currentProgress);
    
    if (currentProgress && currentProgress.monthlyInvestment) {
      console.log('[InvestmentScheduleComponent] ✅ Found monthlyInvestment in cached progress:', currentProgress.monthlyInvestment);
      this.setFinancialData(currentProgress);
    } else {
      console.log('[InvestmentScheduleComponent] ⚠️ No current progress or no monthlyInvestment found, fetching fresh data...');
      console.log('[InvestmentScheduleComponent] Details - hasProgress:', !!currentProgress, 'hasMonthlyInvestment:', currentProgress?.monthlyInvestment);
      
      // If no current progress, fetch fresh data from backend
      this.authService.getUserProgress().subscribe({
        next: (progress) => {
          console.log('[InvestmentScheduleComponent] ✅ Fresh progress data received from API:', progress);
          this.setFinancialData(progress);
        },
        error: (error) => {
          console.error('[InvestmentScheduleComponent] ❌ Error loading user progress:', error);
          // Set defaults if API fails
          this.monthlyGoal = 500; // Default fallback
          this.calculateRecommendedAmount();
        }
      });
    }

    // Also subscribe to ongoing changes
    this.authService.userProgress$.subscribe(progress => {
      if (progress && progress.monthlyInvestment) {
        console.log('[InvestmentScheduleComponent] Progress updated via subscription:', progress);
        this.setFinancialData(progress);
      }
    });
  }

  private setFinancialData(progress: any): void {
    console.log('[InvestmentScheduleComponent] 🔥 setFinancialData called with data:', progress);
    console.log('[InvestmentScheduleComponent] 🔥 monthlyInvestment value:', progress?.monthlyInvestment);
    console.log('[InvestmentScheduleComponent] 🔥 Full progress object:', JSON.stringify(progress, null, 2));
    
    if (progress && progress.monthlyInvestment) {
      this.monthlyGoal = progress.monthlyInvestment;
      console.log('[InvestmentScheduleComponent] ✅ Loaded user monthly investment amount:', this.monthlyGoal);
    } else {
      console.log('[InvestmentScheduleComponent] ⚠️ No monthlyInvestment found in progress data.');
      console.log('[InvestmentScheduleComponent] Progress exists:', !!progress);
      console.log('[InvestmentScheduleComponent] Progress keys:', progress ? Object.keys(progress) : 'N/A');
      // Set a default for testing
      this.monthlyGoal = 0;
    }

    // For now, we'll calculate these from the monthly investment
    // In a real app, these might be stored separately or calculated server-side
    if (this.monthlyGoal > 0) {
      // Estimate target portfolio using 4% rule and monthly investment
      // This is a simplified calculation - actual FI calculations are more complex
      const annualInvestment = this.monthlyGoal * 12;
      this.targetPortfolio = annualInvestment * 25; // Rough 4% rule estimate
      this.timeToFI = 25; // Simplified estimate
      console.log('[InvestmentScheduleComponent] ✅ Calculated financial goals:', {
        monthlyGoal: this.monthlyGoal,
        targetPortfolio: this.targetPortfolio,
        timeToFI: this.timeToFI
      });
    }

    this.calculateRecommendedAmount();
  }

  // Method to manually refresh user data (useful for debugging)
  refreshUserData(): void {
    console.log('[InvestmentScheduleComponent] 🔄 Manually refreshing user data...');
    this.authService.loadUserProgress();
  }

  onFrequencyChange(frequency: string) {
    this.schedule.payFrequency = frequency;
    this.calculateRecommendedAmount();
  }

  onAmountChange() {
    // No need to emit changes since this is now a standalone page
  }

  onStartDateChange(date: string) {
    this.schedule.startDate = date;
    // No need to emit changes since this is now a standalone page
  }

  calculateRecommendedAmount() {
    if (this.monthlyGoal <= 0) return;

    const selectedFrequency = this.getSelectedFrequencyDetails();

    if (selectedFrequency) {
      this.schedule.investmentAmount = Math.round(
        this.monthlyGoal / selectedFrequency.paychecksPerMonth
      );
    }
  }

  getSelectedFrequencyDetails() {
    return this.frequencyOptions.find(f => f.value === this.schedule.payFrequency);
  }

  getMonthlyProjection(): number {
    const frequencyDetails = this.getSelectedFrequencyDetails();
    if (!frequencyDetails) return 0;
    return this.schedule.investmentAmount * frequencyDetails.paychecksPerMonth;
  }

  getAnnualProjection(): number {
    return this.getMonthlyProjection() * 12;
  }

  private getNextMonday(): string {
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  }

  canProceed(): boolean {
    return this.schedule.investmentAmount > 0 && this.schedule.startDate !== '';
  }

  goToStockPreferences(): void {
    console.log('[InvestmentScheduleComponent] Proceeding to stock preferences with schedule:', this.schedule);
    this.isSubmitting = true;

    // TODO: Save investment schedule to backend API
    // For now, simulate API call
    setTimeout(() => {
      this.isSubmitting = false;
      // Navigate to stock preference selection (survey with just stock question)
      this.router.navigate(['/survey']);
    }, 1000);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}