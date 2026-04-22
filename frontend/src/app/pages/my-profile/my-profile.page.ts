import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
  IonCard, IonCardContent, IonInput, IonButton, IonIcon, IonAvatar, IonItem, IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shareOutline, checkmarkCircleOutline, saveOutline, camera, walletOutline, timeOutline, ticketOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { ToastService } from '../../services/toast.service';
import { PortfolioService } from '../../services/portfolio.service';
import { AccountStatusService } from '../../services/account-status.service';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

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
  // Action-required banner
  actionRequired$: Observable<boolean>;

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
  yearsToReach: number | string = 0; // Based on input goal
  yearsToReachCurrent: number | string = 0; // Based on actual schedule (From $0)
  yearsToReachRemaining: number | string | null = null; // Based on actual schedule + current equity
  currentMonthlyEquivalent: number = 0; // Derived effective monthly amount
  currentPortfolioValue: number = 0; // From Portfolio Service
  progressPercentage: number = 0; // currentPortfolioValue / portfolioGoal

  // Referral
  referralCode: string = ''; 
  redeemCodeInput: string = '';
  referralCount: number = 0;
  hasAppliedReferral: boolean = false;
  isLoadingReferral: boolean = false;

  // State
  isDirty: boolean = false;
  originalValues: { monthly: number, income: number } = { monthly: 0, income: 0 };

  // Constants
  private readonly SAFE_WITHDRAWAL_RATE = 0.04;
  private readonly AVG_MARKET_YIELD = 0.10;

  // Internal state
  private exactAnnualIncome: number | null = null;
  currentFrequency: string = '';

  constructor(
    private authService: AuthService,
    private settingsService: SettingsService,
    private toastService: ToastService,
    private portfolioService: PortfolioService,
    private accountStatusService: AccountStatusService,
    private router: Router
  ) {
    addIcons({camera,walletOutline,timeOutline,shareOutline,ticketOutline,checkmarkCircleOutline,saveOutline});
    this.actionRequired$ = this.accountStatusService.actionRequired$;
  }

  goToDocumentUpload() {
    this.router.navigateByUrl('/document-upload');
  }


  ngOnInit() {
    this.loadUserData();
  }

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
        
        // Referral Data
        if (progress.referralCode) {
           this.referralCode = progress.referralCode;
        }
        if (progress.referralCount !== undefined) {
           this.referralCount = progress.referralCount;
        }
        if (progress.hasAppliedReferral !== undefined) {
           this.hasAppliedReferral = progress.hasAppliedReferral;
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
          this.currentScheduledInvestment = investment.investmentAmount;
          this.currentFrequency = investment.frequency ? investment.frequency.toLowerCase() : '';
          
          this.formatScheduleText(investment);
          
          // Trigger calculation using the centralized method
          this.calculateCurrentScheduleYears();
        }
      },
      error: (err) => {
        console.log('No active investment schedule found or error fetching:', err);
        this.currentScheduledInvestment = 0;
        this.investmentFrequencyText = '';
        this.currentFrequency = '';
        this.currentMonthlyEquivalent = 0;
        this.yearsToReachCurrent = '∞';
      }
    });

    // Get Current Portfolio Value for Progress Bar
    this.portfolioService.getPortfolioDashboard().subscribe({
      next: (data) => {
        if (data && data.summary) {
          this.currentPortfolioValue = data.summary.equity || 0;
          this.calculateProgress();
          // Recalculate years now that we have portfolio value
          this.calculateCurrentScheduleYears();
        }
      },
      error: (err) => {
        console.log('Error fetching portfolio summary:', err);
        // Use 0 as default if fails
        this.currentPortfolioValue = 0;
        this.calculateProgress();
      }
    });

    // Mock Referral Code based on Email/ID if available
    // const user = this.authService.getCurrentUser();
    // if (user && user.email) {
    //   const prefix = user.email.split('@')[0].toUpperCase().substring(0, 4);
    //   this.referralCode = `${prefix}${user.id || '2025'}`;
    // }
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
    // Initial load full calculation
    this.calculatePortfolioGoal();
    this.calculateHypotheticalYears();
    this.calculateCurrentScheduleYears();
    this.checkDirty();
  }

  // Triggered by "To retire with $Y/mo" input
  onIncomeChange() {
    // 1. Validate Input
    if (this.retirementIncomeGoal && this.retirementIncomeGoal.toString().length > 5) {
      this.retirementIncomeGoal = Number(this.retirementIncomeGoal.toString().slice(0, 5));
    }

    // 2. Update Portfolio Goal (Source of Truth)
    this.calculatePortfolioGoal();

    // 3. Update BOTH time estimates because target changed
    this.calculateHypotheticalYears();
    this.calculateCurrentScheduleYears();

    this.checkDirty();
  }

  // Triggered by "By investing $X/mo" input
  onInvestChange() {
    // 1. Validate Input
    if (this.monthlyInvestGoal && this.monthlyInvestGoal.toString().length > 5) {
      this.monthlyInvestGoal = Number(this.monthlyInvestGoal.toString().slice(0, 5));
    }

    // 2. Only update the hypothetical years locally
    // Does NOT affect portfolio goal or current schedule outlook
    this.calculateHypotheticalYears();

    this.checkDirty();
  }

  private calculatePortfolioGoal() {
    let annualIncome: number;
    if (this.exactAnnualIncome !== null &&
      Math.round(this.exactAnnualIncome / 12) === this.retirementIncomeGoal) {
      annualIncome = this.exactAnnualIncome;
    } else {
      annualIncome = this.retirementIncomeGoal * 12;
    }
    this.portfolioGoal = annualIncome / this.SAFE_WITHDRAWAL_RATE;
    this.calculateProgress(); // Update progress when goal changes
  }

  private calculateProgress() {
    if (this.portfolioGoal > 0) {
      this.progressPercentage = Math.min((this.currentPortfolioValue / this.portfolioGoal), 1.0);
    } else {
      this.progressPercentage = 0;
    }
  }

  private calculateHypotheticalYears() {
    if (this.monthlyInvestGoal > 0) {
      this.yearsToReach = this.calculateYears(this.monthlyInvestGoal);
    } else {
      this.yearsToReach = '∞';
    }
  }

  private calculateCurrentScheduleYears() {
    if (this.currentScheduledInvestment > 0) {
      // Re-approximating for dynamic update. 
      let monthly = this.currentScheduledInvestment;
      
      // Use stored frequency code instead of parsing UI text
      if (this.currentFrequency === 'weekly') monthly *= 4.33;
      else if (this.currentFrequency === 'biweekly') monthly *= 2.16;
      else if (this.currentFrequency === 'semi_monthly' || this.currentFrequency === 'semimonthly') monthly *= 2;
      
      this.currentMonthlyEquivalent = monthly;
      this.yearsToReachCurrent = this.calculateYears(monthly);

      // Calculate remaining years considering current equity (PV)
      if (this.currentPortfolioValue > 0) {
        this.yearsToReachRemaining = this.calculateYearsWithPV(monthly, this.currentPortfolioValue);
      } else {
        this.yearsToReachRemaining = null;
      }
    }
  }

  calculateYearsWithPV(monthlyAmount: number, currentEquity: number): string | number {
    if (monthlyAmount <= 0) return '∞';
    if (currentEquity >= this.portfolioGoal) return 0;

    const r = this.AVG_MARKET_YIELD / 12; // Monthly rate
    const FV = this.portfolioGoal;
    const PV = currentEquity;
    const PMT = monthlyAmount;

    // Formula: n = ln( (FV + PMT/r) / (PV + PMT/r) ) / ln(1 + r)
    const numerator = Math.log((FV + PMT / r) / (PV + PMT / r));
    const denominator = Math.log(1 + r);
    const months = numerator / denominator;

    if (isNaN(months) || !isFinite(months)) {
      return '∞';
    } else {
      return (months / 12).toFixed(1);
    }
  }

  calculateYears(monthlyAmount: number): string | number {
    if (monthlyAmount <= 0) {
      return '∞';
    }

    const monthlyRate = this.AVG_MARKET_YIELD / 12;
    const numerator = Math.log((this.portfolioGoal * monthlyRate / monthlyAmount) + 1);
    const denominator = Math.log(1 + monthlyRate);
    const months = numerator / denominator;

    if (isNaN(months) || !isFinite(months)) {
      return '∞';
    } else {
      return (months / 12).toFixed(1);
    }
  }

  // Old method kept or removed? Removed to replace with calculateYears
  calculateYearsToReach(monthlyAmount: number) {
      this.yearsToReach = this.calculateYears(monthlyAmount);
  }



  checkDirty() {
    this.isDirty =
      this.monthlyInvestGoal !== this.originalValues.monthly ||
      this.retirementIncomeGoal !== this.originalValues.income;
  }

  saveChanges() {
    if (!this.isDirty) return;

    if (!this.monthlyInvestGoal || !this.retirementIncomeGoal) {
        this.toastService.showToast('Please enter valid amounts for both goals.', 'warning');
        return;
    }

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
        // Refresh local state from backend to ensure persistence
        this.authService.loadUserProgress();
      },
      error: (err) => {
        console.error('Failed to save changes:', err);
        this.toastService.showToast('Failed to save changes.', 'danger');
      }
    });
  }

  async copyReferral() {
    if (!this.referralCode) return;
    await navigator.clipboard.writeText(this.referralCode);
    this.toastService.showToast('Referral code copied!', 'success');
  }

  redeemCode() {
    if (!this.redeemCodeInput || this.redeemCodeInput.trim() === '') {
      this.toastService.showToast('Please enter a referral code.', 'warning');
      return;
    }

    if (this.referralCode && this.redeemCodeInput.trim().toUpperCase() === this.referralCode.toUpperCase()) {
        this.toastService.showToast('You cannot use your own referral code.', 'danger');
        return;
    }

    if (this.hasAppliedReferral) {
        this.toastService.showToast('You have already applied a referral code.', 'warning');
        return;
    }

    this.isLoadingReferral = true;
    this.authService.applyReferralCode(this.redeemCodeInput).subscribe({
      next: () => {
        this.isLoadingReferral = false;
        this.toastService.showToast('Referral code applied successfully!', 'success');
        this.redeemCodeInput = '';
        this.authService.loadUserProgress(); // Refresh state
      },
      error: (error) => {
        this.isLoadingReferral = false;
        const msg = error.error?.message || 'Failed to apply referral code.';
        this.toastService.showToast(msg, 'danger');
      }
    });
  }
}
