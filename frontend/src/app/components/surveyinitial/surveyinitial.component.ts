import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MonteCarloSBLOCSimulator } from '../../services/monte-carlo.service';
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

type PlanResult = {
  success: boolean;
  timeInYears: number;
  finalPortfolio: number;
};

export interface TimelineRangeResult {
  targetPortfolio: number;
  conservativeYears: number | string; // Can be a number or '∞'
  optimisticYears: number | string;
}

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
  targetPortfolio: number = 4000000;
  formattedMonthlyInvestment: string = '7,000';
  formattedRetirementIncome: string = '100,000';
  formattedTargetPortfolio: string = '4,000,000';

  private currentPlanResult: PlanResult | null = null;
  private timelineRangeResult: TimelineRangeResult | null = null;
  timeToIndependence: string = ''; // This will now hold the new, precise calculation
  optimisticYears: number | string = '∞'; // Can be a number or '∞'
  conservativeYears: number | string = '∞'; // Can be a number or '∞'

  // --- NEW: Core Economic Assumptions for the Simulation Engine ---
  private readonly ACCUMULATION_YIELD = 0.08; 
  private readonly FIXED_SIM_STRESS_TEST_YIELD = 0.07;
  private readonly SBLOC_INTEREST_RATE = 0.06;
  private readonly INFLATION_RATE = 0.025;
  private readonly MAX_LTV = 0.70;
  private readonly LTV_SIMULATION_YEARS = 50;
  private readonly MIN_PORTFOLIO_FOR_SBLOC = 1000000;
  private readonly TRUE_UP_THRESHOLD = 0.12;

  public successProbability: number | null = null;
  public isMonteCarloLoading = false;
  private simulator: MonteCarloSBLOCSimulator;;

  constructor(private router: Router) {
    this.simulator = new MonteCarloSBLOCSimulator();
  }

  ngOnInit() {
    this.updatePlanAndRunSimulations();
  }

  private updatePlanAndRunSimulations() {
    this.setInitialValues();
    this.updateFormattedValues();
    // this.calculateFixedReturnPlan(); // First, find the timeline
    this.runMonteCarlo(); // Then, stress-test that timeline
  }



  setInitialValues() {
    this.timelineRangeResult = this.calculateTimelineRange(this.monthlyInvestment, this.retirementIncome);
    this.optimisticYears = this.timelineRangeResult.optimisticYears;
    this.conservativeYears = this.timelineRangeResult.conservativeYears;
    this.targetPortfolio = this.timelineRangeResult.targetPortfolio;
  }

  /**
   * Calculates a range of time needed to reach a retirement goal based on a target withdrawal rate.
   * 
   * @param monthlyInvestment The amount the user invests each month (e.g., 7000).
   * @param desiredAnnualIncome The annual income the user wants to live off (e.g., 100000).
   * @returns An object containing the target portfolio and the conservative/optimistic timelines in years.
   */
  public calculateTimelineRange(
    monthlyInvestment: number, 
    desiredAnnualIncome: number
  ): TimelineRangeResult {
    
    // --- Define Core Assumptions ---
    const TARGET_WITHDRAWAL_RATE = 0.025; // The 2.5% rate you specified
    const CONSERVATIVE_ANNUAL_YIELD = 0.06; // 6% average return
    const OPTIMISTIC_ANNUAL_YIELD = 0.10;   // 10% average return

    // --- Step 1: Calculate the Target Portfolio Value ---
    // This is the finish line the user needs to reach.
    const targetPortfolio = desiredAnnualIncome / TARGET_WITHDRAWAL_RATE;

    // --- Step 2: Calculate the timeline for both scenarios ---
    const conservativeYears = this.calculateYearsToTarget(
      targetPortfolio,
      monthlyInvestment,
      CONSERVATIVE_ANNUAL_YIELD
    );

    const optimisticYears = this.calculateYearsToTarget(
      targetPortfolio,
      monthlyInvestment,
      OPTIMISTIC_ANNUAL_YIELD
    );
    
    // --- Step 3: Return the complete result object ---
    return {
      targetPortfolio: Math.round(targetPortfolio),
      conservativeYears: conservativeYears,
      optimisticYears: optimisticYears
    };
  }

  /**
   * A private helper function that calculates the number of years to reach a target value.
   * It uses the NPER financial formula logic.
   * 
   * @param targetValue The future value goal (e.g., $4,000,000).
   * @param monthlyPayment The user's monthly contribution.
   * @param annualRate The assumed average annual growth rate for this scenario.
   * @returns The number of years as a number, or '∞' if not possible.
   */
  private calculateYearsToTarget(
    targetValue: number, 
    monthlyPayment: number, 
    annualRate: number
  ): number | string {
    // Cannot reach the target if investing nothing or a negative amount
    if (monthlyPayment <= 0) {
      return '∞';
    }

    const monthlyRate = annualRate / 12;
    
    // This is the core financial formula to find the number of periods (months)
    const numberOfMonths = Math.log( (targetValue * monthlyRate / monthlyPayment) + 1 ) / Math.log(1 + monthlyRate);
    
    // If the calculation results in a non-finite number (e.g., if rate is 0), return infinity
    if (!isFinite(numberOfMonths)) {
      return '∞';
    }
    
    const years = numberOfMonths / 12;

    // Return the result rounded to one decimal place
    return parseFloat(years.toFixed(1));
  }

  
  // private calculateFixedReturnPlan() {
  //   const result = this.findTimeToIndependence(this.monthlyInvestment, this.retirementIncome);
  //   this.currentPlanResult = result; // Store the entire result object

  //   if (result.success) {
  //     this.timeToIndependence = result.timeInYears.toFixed(1);
  //   } else {
  //     this.timeToIndependence = '∞';
  //   }
  // }

  // --- REPLACED: The Old `calculateTimeline` is gone, replaced by these new functions ---

  public runMonteCarlo() {
    // Only run if a valid plan was found by the fixed-return model
    // if (!this.currentPlanResult || !this.currentPlanResult.success) {
    //   this.successProbability = 0; // Or null, to hide it
    //   return;
    // }

    this.isMonteCarloLoading = true;
    this.successProbability = null;

    // Use the ACCURATE data from our plan result
    // const startingPortfolio = 2500000;
    // const startingPortfolio = this.currentPlanResult.finalPortfolio;
    const startingPortfolio = this.targetPortfolio;
    console.log('Starting Portfolio:', startingPortfolio);
    console.log('Withdrawal Percentage:', this.retirementIncome / startingPortfolio * 100);
    const initialWithdrawal = this.retirementIncome; // Use the user's actual goal

    setTimeout(() => {
      const { successProbability, failedMarketReturns } = this.simulator.runSimulation(startingPortfolio, initialWithdrawal, 200000);
      for (const run of failedMarketReturns) {
        console.log(run);
      }
      console.log('Total runs:', failedMarketReturns.length);
      this.successProbability = parseFloat(successProbability.toFixed(1));
      this.isMonteCarloLoading = false;
    }, 50);
  }

  /**
   * The main calculation function that finds the optimal time to retire.
   */
  // private findTimeToIndependence(monthlyInvestment: number, walkAwayAnnualIncome: number): PlanResult {
  //   let currentPortfolio = 0;
  //   const MAX_ACCUMULATION_YEARS = 60;

  //   for (let year = 1; year <= MAX_ACCUMULATION_YEARS; year++) {
  //     // The accumulation phase should use the optimistic average yield
  //     currentPortfolio = (currentPortfolio + (monthlyInvestment * 12)) * (1 + this.ACCUMULATION_YIELD);
      
  //     if (currentPortfolio < this.MIN_PORTFOLIO_FOR_SBLOC) continue;

  //     const maxSafeWithdrawal = this.calculateMaxSafeSBLOCWithdrawal(currentPortfolio);

  //     if (maxSafeWithdrawal >= walkAwayAnnualIncome) {
  //       return {
  //         success: true,
  //         timeInYears: year,
  //         finalPortfolio: Math.round(currentPortfolio)
  //       };
  //     }
  //   }
  //   return { success: false, timeInYears: 0, finalPortfolio: 0 };
  // }

  /**
   * Calculates the maximum safe annual SBLOC withdrawal for a given portfolio value using binary search.
   */
  // private calculateMaxSafeSBLOCWithdrawal(portfolioValue: number): number {
  //   let low = 0;
  //   let high = portfolioValue * 0.10;
  //   let bestSafeWithdrawal = 0;

  //   for (let i = 0; i < 100; i++) {
  //     const mid = low + (high - low) / 2;
  //     if (this.isPlanSustainable(portfolioValue, mid)) {
  //       bestSafeWithdrawal = mid;
  //       low = mid;
  //     } else {
  //       high = mid;
  //     }
  //   }
  //   return bestSafeWithdrawal;
  // }

  /**
   * The 50-year flight simulator to test a plan's sustainability.
   */
  // private isPlanSustainable(startingPortfolio: number, firstYearWithdrawal: number): boolean {
  //   let simPortfolio = startingPortfolio;
  //   let simDebt = 0;
  //   let simCurrentWithdrawal = firstYearWithdrawal;
  //   let accumulatedInterest = 0; // It now needs to track interest

  //   for (let simYear = 1; simYear <= this.LTV_SIMULATION_YEARS; simYear++) {
  //     // We use the STRESS_TEST_YIELD here to be conservative
  //     const marketReturn = this.FIXED_SIM_STRESS_TEST_YIELD;
  //     simPortfolio *= (1 + marketReturn);

  //     // --- NEW: Implement the True-Up Logic ---
  //     if (marketReturn > this.TRUE_UP_THRESHOLD) {
  //       // Note: In a fixed model, this check might not trigger often unless you set
  //       // the stress test yield higher, but it's crucial for model consistency.
  //       simPortfolio -= accumulatedInterest;
  //       simDebt -= accumulatedInterest;
  //       accumulatedInterest = 0;
  //     }

  //     const interestForThisYear = simDebt * this.SBLOC_INTEREST_RATE;
  //     simDebt += interestForThisYear;
  //     accumulatedInterest += interestForThisYear; // Keep track of it
  //     simDebt += simCurrentWithdrawal;
      
  //     if (simDebt / simPortfolio >= 0.45) {
  //       return false;
  //     }

  //     simCurrentWithdrawal *= (1 + this.INFLATION_RATE);
  //   }
    
  //   return true;
  // }

  



  // --- Event Handlers (Unchanged, but now call the new main function) ---
  onMonthlySliderChange() {
    this.updatePlanAndRunSimulations();
  }

  onIncomeSliderChange() {
    this.updatePlanAndRunSimulations();
  }

  unformatMonthlyInvestment() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toString();
  }

  formatAndSetMonthlyInvestment() {
    const numericValue = parseInt(this.formattedMonthlyInvestment.replace(/,/g, ''), 10);
    this.monthlyInvestment = isNaN(numericValue) ? 100 : numericValue;
    this.updatePlanAndRunSimulations();
  }

  unformatRetirementIncome() {
    this.formattedRetirementIncome = this.retirementIncome.toString();
  }

  formatAndSetRetirementIncome() {
    const numericValue = parseInt(this.formattedRetirementIncome.replace(/,/g, ''), 10);
    this.retirementIncome = isNaN(numericValue) ? 40000 : numericValue;
    this.updatePlanAndRunSimulations();
  }

  unformatPortfolioValue() {
    this.formattedTargetPortfolio = this.targetPortfolio.toString();
  }

  formatAndSetPortfolioValue() {
    const numericValue = parseInt(this.formattedTargetPortfolio.replace(/,/g, ''), 10);
    this.targetPortfolio = isNaN(numericValue) ? 40000 : numericValue;
    this.updatePlanAndRunSimulations();
  }

  private updateFormattedValues() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toLocaleString('en-US');
    this.formattedRetirementIncome = this.retirementIncome.toLocaleString('en-US');
    this.formattedTargetPortfolio = this.targetPortfolio.toLocaleString('en-US');
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