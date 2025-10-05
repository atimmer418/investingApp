import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { informationCircleOutline, chevronUp } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonProgressBar,
  IonInput,
  IonRange,
  IonButton,
  IonFooter,
  IonButtons,
  IonBackButton,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-surveyinitial',
  templateUrl: './surveyinitial.component.html',
  styleUrls: ['./surveyinitial.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonProgressBar,
    IonInput,
    IonRange,
    IonButton,
    IonFooter,
    IonButtons,
    IonBackButton,
    IonIcon,
  ],
})
export class SurveyInitialComponent implements OnInit {
  // --- User Input Properties ---
  monthlyInvestment: number = 2500; // A more common starting point for the target audience
  retirementIncome: number = 60000;

  formattedMonthlyInvestment: string = '2,500';
  formattedRetirementIncome: string = '60,000';

  // --- Display Property ---
  timeToFI: string = '';
  isCalculationExpanded: boolean = false;

  // --- Economic Assumptions for the SWR/FIRE calculation ---
  private readonly AVG_MARKET_YIELD = 0.09; // A standard assumption for a growth portfolio
  private readonly SAFE_WITHDRAWAL_RATE = 0.04; // The classic 4% rule

  constructor(private router: Router, private authService: AuthService) {
    addIcons({ informationCircleOutline, chevronUp });
  }

  ngOnInit() {
    // Mark this step as incomplete when user enters/returns to this page
    this.authService.markStepIncomplete('surveyInitial').subscribe({
      next: () => console.log('SurveyInitial step marked as incomplete'),
      error: (err) => console.log('SurveyInitial step could not be marked incomplete (likely not authenticated yet):', err)
    });
    
    this.loadSavedValues();
    this.calculateFITimeline();
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
    
    if (savedMonthlyInvestment && this.monthlyInvestment === 2500) { // Only override default
      this.monthlyInvestment = parseInt(savedMonthlyInvestment, 10);
    }
    
    if (savedRetirementIncome && this.retirementIncome === 60000) { // Only override default
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
    
    // Update user progress with both values
    this.authService.updateProgress({ 
      monthlyInvestment: this.monthlyInvestment,
      retirementIncome: this.retirementIncome
    }).subscribe({
      next: (progress) => {
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
    this.saveValues(); // Save to localStorage and sync with user progress
  }

  unformatMonthlyInvestment() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toString();
  }

  formatAndSetMonthlyInvestment() {
    const numericValue = parseInt(this.formattedMonthlyInvestment.replace(/,/g, ''), 10);
    this.monthlyInvestment = isNaN(numericValue) ? 100 : numericValue;
    this.updateFormattedValues();
    this.calculateFITimeline();
    this.saveValues(); // Save to localStorage and sync with user progress
  }

  unformatRetirementIncome() {
    this.formattedRetirementIncome = this.retirementIncome.toString();
  }

  formatAndSetRetirementIncome() {
    const numericValue = parseInt(this.formattedRetirementIncome.replace(/,/g, ''), 10);
    this.retirementIncome = isNaN(numericValue) ? 40000 : numericValue;
    this.updateFormattedValues();
    this.calculateFITimeline();
    this.saveValues(); // Save to localStorage and sync with user progress
  }
  
  private updateFormattedValues() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toLocaleString('en-US');
    this.formattedRetirementIncome = this.retirementIncome.toLocaleString('en-US');
  }

  /**
   * Calculates the timeline to reach the FIRE number based on the 4% rule.
   */
  private calculateFITimeline() {
    // Step 1: Calculate the target portfolio needed for the 4% rule.
    const targetPortfolio = this.retirementIncome / this.SAFE_WITHDRAWAL_RATE; // (e.g., $60k / 0.04 = $1.5M)

    // Step 2: Calculate years to reach that target (using our existing formula).
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
    
    // Complete the surveyInitial step
    this.authService.completeStep('surveyInitial').subscribe({
      next: (response) => {
        console.log('SurveyInitial step completed successfully:', response);
        
        // Verify localStorage was updated
        const localStorageValue = localStorage.getItem('surveyInitialCompleted');
        console.log('SurveyInitial localStorage value after completion:', localStorageValue);
        
        // Verify current progress
        this.authService.userProgress$.subscribe(progress => {
          if (progress) {
            console.log('SurveyInitial current progress after completion:', progress.surveyInitialCompleted);
          }
        });
        
        this.router.navigate(['/fi-plan-results'], { // A new route for your detailed plan page
          queryParams: {
            mI: this.monthlyInvestment,
            rI: this.retirementIncome,
            t: this.timeToFI
          }
        });
      },
      error: (err) => {
        console.log('SurveyInitial step could not be completed (likely not authenticated yet):', err);
        
        // Check localStorage even if backend failed
        const localStorageValue = localStorage.getItem('surveyInitialCompleted');
        console.log('SurveyInitial localStorage value after failed completion:', localStorageValue);
        
        // Still navigate even if progress update fails
        this.router.navigate(['/fi-plan-results'], { // A new route for your detailed plan page
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