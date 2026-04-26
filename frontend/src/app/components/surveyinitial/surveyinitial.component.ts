import { Component, OnInit, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonFooter,
  NavController,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-surveyinitial',
  templateUrl: './surveyinitial.component.html',
  styleUrls: ['./surveyinitial.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonFooter,
  ],
})
export class SurveyInitialComponent implements OnInit {
  @HostBinding('class.page-ready') isReady = false;

  // --- User Input Properties ---
  monthlyInvestment: number = 1000;
  retirementIncome: number = 65000;

  formattedMonthlyInvestment: string = '1,000';
  formattedRetirementIncome: string = '65,000';

  // --- Display Properties ---
  timeToFI: string = '';
  isCalculationExpanded: boolean = false;

  // --- Economic Assumptions for the SWR/FIRE calculation ---
  private readonly AVG_MARKET_YIELD = 0.10;     // ~10% average annual return
  private readonly SAFE_WITHDRAWAL_RATE = 0.04; // 4% safe withdrawal rate

  constructor(private router: Router, private authService: AuthService, private navCtrl: NavController) {
  }

  ngOnInit() {
    this.loadSavedValues();

    // Clamp to the new slider ranges after loading
    if (this.monthlyInvestment < 100) this.monthlyInvestment = 100;
    if (this.monthlyInvestment > 5000) this.monthlyInvestment = 5000;
    if (this.retirementIncome < 40000) this.retirementIncome = 40000;
    if (this.retirementIncome > 200000) this.retirementIncome = 200000;

    this.updateFormattedValues();
    this.calculateFITimeline();
    this.preloadAssets();
  }

  private preloadAssets() {
    const imageReady = new Promise<void>(resolve => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = '/assets/images/whenPigsFly-2.png';
    });

    // Explicitly wait for the two fonts used on this page
    const fontsReady = Promise.all([
      document.fonts.load('700 16px "Manrope"').catch(() => []),
      document.fonts.load('400 24px "Material Symbols Outlined"').catch(() => []),
    ]);

    const allReady = Promise.all([fontsReady, imageReady]);
    const timeout = new Promise<void>(resolve => setTimeout(resolve, 2000));

    // Lift the veil as soon as everything is ready, but never wait longer than 2s
    Promise.race([allReady, timeout]).then(() => {
      this.isReady = true;
    });
  }

  goBack() {
    this.navCtrl.navigateBack('/get-started');
  }

  get formattedTargetPortfolio(): string {
    const target = this.retirementIncome / this.SAFE_WITHDRAWAL_RATE;
    const rounded = Math.round(target / 100_000) * 100_000;
    if (rounded >= 1_000_000) {
      return '$' + (rounded / 1_000_000).toFixed(1) + 'M';
    }
    return '$' + (rounded / 1_000).toFixed(0) + 'K';
  }

  getSliderGradient(value: number, min: number, max: number): string {
    const pct = ((value - min) / (max - min)) * 100;
    return `linear-gradient(to right, #2563EB ${pct}%, #e5e7eb ${pct}%)`;
  }

  // Load saved values from localStorage or user progress
  private loadSavedValues() {
    // First try to get values from user progress (for authenticated users)
    this.authService.userProgress$.subscribe(progress => {
      if (progress && progress.monthlyInvestment !== undefined) {
        this.monthlyInvestment = progress.monthlyInvestment;
      }
      if (progress && progress.retirementIncome !== undefined) {
        this.retirementIncome = progress.retirementIncome;
      }
      this.updateFormattedValues();
    });

    // Fallback to localStorage for any missing values (for non-authenticated users)
    const savedMonthlyInvestment = localStorage.getItem('surveyMonthlyInvestment');
    const savedRetirementIncome = localStorage.getItem('surveyRetirementIncome');

    if (savedMonthlyInvestment && this.monthlyInvestment === 1000) {
      this.monthlyInvestment = parseInt(savedMonthlyInvestment, 10);
    }

    if (savedRetirementIncome && this.retirementIncome === 65000) {
      this.retirementIncome = parseInt(savedRetirementIncome, 10);
    }

    this.updateFormattedValues();
    console.log('[SurveyInitial] Loaded saved values:', {
      monthlyInvestment: this.monthlyInvestment,
      retirementIncome: this.retirementIncome
    });
  }

  // Save values to localStorage and update user progress
  private saveValues() {
    localStorage.setItem('surveyMonthlyInvestment', this.monthlyInvestment.toString());
    localStorage.setItem('surveyRetirementIncome', this.retirementIncome.toString());

    this.authService.updateProgress({
      monthlyInvestment: this.monthlyInvestment,
      retirementIncome: this.retirementIncome
    }).subscribe({
      next: (_) => {
        console.log('[SurveyInitial] Updated user progress with values:', {
          monthlyInvestment: this.monthlyInvestment,
          retirementIncome: this.retirementIncome
        });
      },
      error: (error) => {
        console.log('[SurveyInitial] Could not update user progress (user may not be authenticated):', error);
      }
    });
  }

  // --- Event Handlers ---
  onSliderChange() {
    this.updateFormattedValues();
    this.calculateFITimeline();
    this.saveValues();
  }

  unformatMonthlyInvestment() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toString();
  }

  formatAndSetMonthlyInvestment() {
    const numericValue = parseInt(this.formattedMonthlyInvestment.replace(/,/g, ''), 10);
    this.monthlyInvestment = isNaN(numericValue) ? 100 : numericValue;
    this.updateFormattedValues();
    this.calculateFITimeline();
    this.saveValues();
  }

  unformatRetirementIncome() {
    this.formattedRetirementIncome = this.retirementIncome.toString();
  }

  formatAndSetRetirementIncome() {
    const numericValue = parseInt(this.formattedRetirementIncome.replace(/,/g, ''), 10);
    this.retirementIncome = isNaN(numericValue) ? 40000 : numericValue;
    this.updateFormattedValues();
    this.calculateFITimeline();
    this.saveValues();
  }

  private updateFormattedValues() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toLocaleString('en-US');
    this.formattedRetirementIncome = this.retirementIncome.toLocaleString('en-US');
  }

  /**
   * Calculates the timeline to reach the FIRE number based on the 4% rule.
   */
  private calculateFITimeline() {
    const targetPortfolio = this.retirementIncome / this.SAFE_WITHDRAWAL_RATE;
    const monthlyRate = this.AVG_MARKET_YIELD / 12;
    if (this.monthlyInvestment <= 0) {
      this.timeToFI = '∞';
      return;
    }

    const numberOfMonths = Math.log((targetPortfolio * monthlyRate / this.monthlyInvestment) + 1) / Math.log(1 + monthlyRate);
    const years = numberOfMonths / 12;
    this.timeToFI = isFinite(years) ? years.toFixed(1) : '∞';
  }

  toggleCalculationInfo() {
    this.isCalculationExpanded = !this.isCalculationExpanded;
  }

  /**
   * Navigates to the results page where the SWR, SBLOC, and Annuity options will be shown.
   */
  viewMyPlan() {
    console.log('Navigating to results with:', {
      monthly: this.monthlyInvestment,
      annual: this.retirementIncome,
      years: this.timeToFI
    });

    this.authService.completeStep('surveyInitial').subscribe({
      next: (response) => {
        console.log('SurveyInitial step completed successfully:', response);

        const localStorageValue = localStorage.getItem('surveyInitialCompleted');
        console.log('SurveyInitial localStorage value after completion:', localStorageValue);

        this.authService.userProgress$.subscribe(progress => {
          if (progress) {
            console.log('SurveyInitial current progress after completion:', progress.surveyInitialCompleted);
          }
        });

        this.router.navigate(['/fi-plan-results'], {
          queryParams: {
            mI: this.monthlyInvestment,
            rI: this.retirementIncome,
            t: this.timeToFI
          }
        });
      },
      error: (err) => {
        console.log('SurveyInitial step could not be completed (likely not authenticated yet):', err);

        const localStorageValue = localStorage.getItem('surveyInitialCompleted');
        console.log('SurveyInitial localStorage value after failed completion:', localStorageValue);

        this.router.navigate(['/fi-plan-results'], {
          queryParams: {
            mI: this.monthlyInvestment,
            rI: this.retirementIncome,
            t: this.timeToFI
          }
        });
      }
    });
  }
}
