import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { informationCircleOutline, chevronUp } from 'ionicons/icons';
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
  private readonly AVG_MARKET_YIELD = 0.08; // A standard assumption for a growth portfolio
  private readonly SAFE_WITHDRAWAL_RATE = 0.04; // The classic 4% rule

  constructor(private router: Router) {
    addIcons({ informationCircleOutline, chevronUp });
  }

  ngOnInit() {
    this.calculateFITimeline();
  }

  // --- Event Handlers ---
  onSliderChange() {
    this.updateFormattedValues();
    this.calculateFITimeline();
  }

  unformatMonthlyInvestment() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toString();
  }

  formatAndSetMonthlyInvestment() {
    const numericValue = parseInt(this.formattedMonthlyInvestment.replace(/,/g, ''), 10);
    this.monthlyInvestment = isNaN(numericValue) ? 100 : numericValue;
    this.updateFormattedValues();
    this.calculateFITimeline();
  }

  unformatRetirementIncome() {
    this.formattedRetirementIncome = this.retirementIncome.toString();
  }

  formatAndSetRetirementIncome() {
    const numericValue = parseInt(this.formattedRetirementIncome.replace(/,/g, ''), 10);
    this.retirementIncome = isNaN(numericValue) ? 40000 : numericValue;
    this.updateFormattedValues();
    this.calculateFITimeline();
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
    
    this.router.navigate(['/fi-plan-results'], { // A new route for your detailed plan page
      queryParams: {
        y: this.monthlyInvestment,
        x: this.retirementIncome,
        t: this.timeToFI
      }
    });
  }
}