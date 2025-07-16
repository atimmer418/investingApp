import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
    IonTitle,
    IonProgressBar,
    IonInput,
    IonRange,
    IonButton,
    IonFooter,
    IonButtons,
    IonBackButton,
  ],
})
export class SurveyInitialComponent implements OnInit {
  // --- User Input Properties (Unchanged) ---
  monthlyInvestment: number = 7000;
  retirementIncome: number = 100000;
  formattedMonthlyInvestment: string = '7,000';
  formattedRetirementIncome: string = '100,000';
  timeToIndependence: string = ''; // This will now hold the new, precise calculation

  // --- NEW: Core Economic Assumptions for the Simulation Engine ---
  private readonly AVG_MARKET_YIELD = 0.07;
  private readonly SBLOC_INTEREST_RATE = 0.06;
  private readonly INFLATION_RATE = 0.025;
  private readonly MAX_LTV = 0.70;
  private readonly LTV_SIMULATION_YEARS = 50;
  private readonly MIN_PORTFOLIO_FOR_SBLOC = 1000000;

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateFormattedValues();
    this.findTimeToIndependence(); // Use the new primary function
  }

  // --- Event Handlers (Unchanged, but now call the new main function) ---
  onMonthlySliderChange() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toLocaleString('en-US');
    this.findTimeToIndependence();
  }

  onIncomeSliderChange() {
    this.formattedRetirementIncome = this.retirementIncome.toLocaleString('en-US');
    this.findTimeToIndependence();
  }

  unformatMonthlyInvestment() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toString();
  }

  formatAndSetMonthlyInvestment() {
    const numericValue = parseInt(this.formattedMonthlyInvestment.replace(/,/g, ''), 10);
    this.monthlyInvestment = isNaN(numericValue) ? 100 : numericValue;
    this.updateFormattedValues();
    this.findTimeToIndependence();
  }

  unformatRetirementIncome() {
    this.formattedRetirementIncome = this.retirementIncome.toString();
  }

  formatAndSetRetirementIncome() {
    const numericValue = parseInt(this.formattedRetirementIncome.replace(/,/g, ''), 10);
    this.retirementIncome = isNaN(numericValue) ? 40000 : numericValue;
    this.updateFormattedValues();
    this.findTimeToIndependence();
  }

  private updateFormattedValues() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toLocaleString('en-US');
    this.formattedRetirementIncome = this.retirementIncome.toLocaleString('en-US');
  }

  // --- REPLACED: The Old `calculateTimeline` is gone, replaced by these new functions ---

  /**
   * The main calculation function that finds the optimal time to retire.
   */
  private findTimeToIndependence() {
    let currentPortfolio = 0;
    const MAX_ACCUMULATION_YEARS = 60;

    for (let year = 1; year <= MAX_ACCUMULATION_YEARS; year++) {
      currentPortfolio = (currentPortfolio + (this.monthlyInvestment * 12)) * (1 + this.AVG_MARKET_YIELD);

      if (currentPortfolio < this.MIN_PORTFOLIO_FOR_SBLOC) {
        continue;
      }

      const maxSafeWithdrawal = this.calculateMaxSafeSBLOCWithdrawal(currentPortfolio);

      if (maxSafeWithdrawal >= this.retirementIncome) {
        this.timeToIndependence = year.toString();
        return; // Exit the loop as soon as we find the answer
      }
    }

    // If loop finishes, no solution was found
    this.timeToIndependence = '∞';
  }

  /**
   * Calculates the maximum safe annual SBLOC withdrawal for a given portfolio value using binary search.
   */
  private calculateMaxSafeSBLOCWithdrawal(portfolioValue: number): number {
    let low = 0;
    let high = portfolioValue * 0.10;
    let bestSafeWithdrawal = 0;

    for (let i = 0; i < 100; i++) {
      const mid = low + (high - low) / 2;
      if (this.isPlanSustainable(portfolioValue, mid)) {
        bestSafeWithdrawal = mid;
        low = mid;
      } else {
        high = mid;
      }
    }
    return bestSafeWithdrawal;
  }

  /**
   * The 50-year flight simulator to test a plan's sustainability.
   */
  private isPlanSustainable(startingPortfolio: number, firstYearWithdrawal: number): boolean {
    let simPortfolio = startingPortfolio;
    let simDebt = 0;
    let simCurrentWithdrawal = firstYearWithdrawal;

    for (let simYear = 1; simYear <= this.LTV_SIMULATION_YEARS; simYear++) {
      simPortfolio *= (1 + this.AVG_MARKET_YIELD);
      const interestAccrued = simDebt * this.SBLOC_INTEREST_RATE;
      simDebt += interestAccrued + simCurrentWithdrawal;
      
      if (simDebt / simPortfolio >= this.MAX_LTV) {
        return false;
      }

      simCurrentWithdrawal *= (1 + this.INFLATION_RATE);
    }
    
    return true;
  }


  // --- Final Action (Unchanged) ---
  continueToLinking() {
    console.log('Continuing to bank linking with:', {
      monthly: this.monthlyInvestment,
      annual: this.retirementIncome,
      years: this.timeToIndependence
    });
    // You can now pass the calculated years to the next component if needed
    this.router.navigate(['/link-bank']);
  }
}