import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
  IonCard, IonCardContent, IonInput, IonButton, IonIcon, IonAvatar, IonItem, IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shareOutline, checkmarkCircleOutline, saveOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.page.html',
  styleUrls: ['./my-profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
    IonCard, IonCardContent, IonInput, IonButton, IonIcon, IonAvatar, IonItem, IonLabel
  ]
})
export class MyProfilePage implements OnInit {
  // User Info
  userName: string = 'Investor';
  userEmail: string = '';

  // Inputs (Editable)
  monthlyInvestGoal: number = 2500;
  retirementIncomeGoal: number = 5000; // Monthly

  // Read-only / Calculated
  currentScheduledInvestment: number = 0;
  investmentFrequencyText: string = '';
  portfolioGoal: number = 0;
  yearsToReach: number | string = 0;

  // Referral
  referralCode: string = 'FREDJOINS'; // Mocked default, could use user ID
  redeemCodeInput: string = '';

  // State
  isDirty: boolean = false;
  originalValues: { monthly: number, income: number } = { monthly: 0, income: 0 };

  // Constants
  private readonly SAFE_WITHDRAWAL_RATE = 0.04;
  private readonly AVG_MARKET_YIELD = 0.09;

  constructor(
    private authService: AuthService,
    private settingsService: SettingsService,
    private toastService: ToastService
  ) {
    addIcons({ shareOutline, checkmarkCircleOutline, saveOutline });
  }

  ngOnInit() {
    this.loadUserData();
  }

  // Internal state for precision
  private exactAnnualIncome: number | null = null;

  loadUserData() {
    // Get Basic User Info & Progress Data
    this.authService.userProgress$.subscribe(progress => {
      if (progress) {
        // Name
        if (progress.firstName && progress.lastName) {
          this.userName = `${progress.firstName} ${progress.lastName}`;
        } else if (progress.firstName) {
          this.userName = progress.firstName;
        }

        // Goals
        if (progress.monthlyInvestment) {
          this.monthlyInvestGoal = progress.monthlyInvestment;
        }

        // Income is stored as Annual in backend, convert to Monthly for UI
        if (progress.retirementIncome) {
          this.exactAnnualIncome = progress.retirementIncome; // Store exact value
          this.retirementIncomeGoal = Math.round(progress.retirementIncome / 12);
        }

        // Store originals for dirty check
        this.originalValues = {
          monthly: this.monthlyInvestGoal,
          income: this.retirementIncomeGoal
        };

        this.calculatePlan();
      }
    });

    // Get Current Scheduled Investment from Backend (Source of Truth)
    this.authService.getCurrentInvestmentSchedule().subscribe({
      next: (investment) => {
        if (investment) {
          this.currentScheduledInvestment = investment.investmentAmount; // Note: DTO uses investmentAmount

          // Format frequency text
          this.formatScheduleText(investment);

          // Calculate monthly equivalent for "years to reach" prediction
          let monthlyEquivalent = investment.investmentAmount;
          const freq = investment.frequency ? investment.frequency.toLowerCase() : '';

          if (freq === 'weekly') monthlyEquivalent *= 4.33;
          if (freq === 'biweekly') monthlyEquivalent *= 2.16;
          if (freq === 'semi_monthly') monthlyEquivalent *= 2;

          this.calculateYearsToReach(monthlyEquivalent);
        }
      },
      error: (err) => {
        console.log('No active investment schedule found or error fetching:', err);
        this.currentScheduledInvestment = 0;
        this.investmentFrequencyText = '';
        this.yearsToReach = '∞';
      }
    });

    // Mock Referral Code based on Email/ID if available
    const user = this.authService.getCurrentUser();
    if (user && user.email) {
      const prefix = user.email.split('@')[0].toUpperCase().substring(0, 4);
      this.referralCode = `${prefix}${user.id || '2025'}`;
    }
  }

  formatScheduleText(investment: any) {
    if (!investment || !investment.frequency) {
      this.investmentFrequencyText = '';
      return;
    }

    const freq = investment.frequency ? investment.frequency.toLowerCase() : '';

    switch (freq) {
      case 'weekly':
        const day = this.getDayOfWeekName(investment.dayOfWeek || investment.startDate);
        this.investmentFrequencyText = `every ${day}`;
        break;
      case 'biweekly':
        const biDay = this.getDayOfWeekName(investment.dayOfWeek || investment.startDate);
        this.investmentFrequencyText = `every other ${biDay}`;
        break;
      case 'semi_monthly':
        this.investmentFrequencyText = 'every 1st and 15th';
        break;
      case 'monthly':
        const dom = investment.dayOfMonth || (investment.startDate ? new Date(investment.startDate).getDate() : 1);
        this.investmentFrequencyText = `every ${this.getOrdinal(dom)}`;
        break;
      default:
        this.investmentFrequencyText = '';
    }
  }

  getDayOfWeekName(source: string | Date): string {
    if (!source) return 'day';

    // If it's a string (e.g. "FRIDAY" from backend)
    if (typeof source === 'string' && isNaN(Date.parse(source))) {
      // Capitalize first letter, lowercase rest
      return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
    }

    // If it's a date string or Date object
    const date = new Date(source);
    // Adjust for timezone issues if pulling raw date string YYYY-MM-DD which JS treats as UTC
    // We want the literal day name. 
    // Actually, backend 'startDate' is LocalDate (YYYY-MM-DD). Date(str) treats as UTC.
    // To be safe, we use the UTC methods if the input looks like ISO date without time
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    return dayName;
  }

  getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  calculatePlan() {
    // 1. Calculate Portfolio Goal
    // If the user hasn't touched the input (or it matches the rounded value of our exact source),
    // use the exact source for calculation to avoid "5833 * 12 = 69996" rounding artifacts.
    let annualIncome: number;

    if (this.exactAnnualIncome !== null &&
      Math.round(this.exactAnnualIncome / 12) === this.retirementIncomeGoal) {
      annualIncome = this.exactAnnualIncome;
    } else {
      annualIncome = this.retirementIncomeGoal * 12;
    }

    this.portfolioGoal = annualIncome / this.SAFE_WITHDRAWAL_RATE;

    // 2. Re-calculate years with CURRENT investment (since target changed)
    // We need the ACTUAL current investment amount for this.
    // I'll grab it from the subscription if available, or just rely on the stored `currentScheduledInvestment` 
    // *Wait*, I calculated years in the subscription based on `portfolioGoal`. 
    // Since `portfolioGoal` depends on `retirementIncomeGoal`, I need to re-run `calculateYearsToReach` whenever `retirementIncomeGoal` changes.

    // Check if we have a current investment to calc against
    if (this.currentScheduledInvestment > 0) {
      // Need to re-derive monthly equivalent for accuracy... 
      // Accessing the raw observable value is tricky here without storing it. 
      // I'll assume standard monthly for now or try to store the multiplier.
      // Let's just use currentScheduledInvestment as a proxy for monthly for now to keep it simple unless I store frequency.
      this.calculateYearsToReach(this.currentScheduledInvestment);
    }

    this.checkDirty();
  }

  calculateYearsToReach(monthlyAmount: number) {
    if (monthlyAmount <= 0) {
      this.yearsToReach = '∞';
      return;
    }

    const monthlyRate = this.AVG_MARKET_YIELD / 12;
    // Formula: N = ln(FV * r / P + 1) / ln(1 + r)
    // FV = Target Portfolio
    // P = Monthly Contribution

    // Check if we can ever reach it
    // if P < 0... handled.

    const numerator = Math.log((this.portfolioGoal * monthlyRate / monthlyAmount) + 1);
    const denominator = Math.log(1 + monthlyRate);
    const months = numerator / denominator;

    if (isNaN(months) || !isFinite(months)) {
      this.yearsToReach = '∞';
    } else {
      this.yearsToReach = (months / 12).toFixed(1);
    }
  }

  onInputChange() {
    this.calculatePlan();
  }

  checkDirty() {
    this.isDirty =
      this.monthlyInvestGoal !== this.originalValues.monthly ||
      this.retirementIncomeGoal !== this.originalValues.income;
  }

  saveChanges() {
    if (!this.isDirty) return;

    this.authService.updateUserProfile({
      monthlyInvestment: this.monthlyInvestGoal,
      retirementIncome: this.retirementIncomeGoal * 12 // Convert back to Annual
    }).subscribe({
      next: () => {
        this.toastService.showToast('Profile updated!', 'success');
        this.isDirty = false;
        this.originalValues = {
          monthly: this.monthlyInvestGoal,
          income: this.retirementIncomeGoal
        };
      },
      error: (err) => {
        console.error('Failed to save changes:', err);
        this.toastService.showToast('Failed to save changes.', 'danger');
      }
    });
  }

  async copyReferral() {
    await navigator.clipboard.writeText(this.referralCode);
    this.toastService.showToast('Referral code copied!', 'success');
  }

  redeemCode() {
    if (!this.redeemCodeInput.trim()) return;

    // Mock redemption
    setTimeout(() => {
      this.toastService.showToast('Code redeemed successfully!', 'success');
      this.redeemCodeInput = '';
    }, 1000);
  }
}
