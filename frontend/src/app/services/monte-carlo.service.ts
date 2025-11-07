import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MonteCarloSBLOCSimulator {

  // --- Core Economic & Model Assumptions ---
  // These parameters define the "physics" of our simulated world.
  private readonly MEAN_ANNUAL_RETURN = 0.082;   // 8.2% average return for a 80% NSTX and 20% NTI portfolio
  private readonly STD_DEV_ANNUAL_RETURN = 0.11; // 11% standard deviation (historical volatility for bond based stock portfolio)
  private readonly SBLOC_INTEREST_RATE = 0.06;   // 6% interest on the SBLOC loan
  private readonly INFLATION_RATE = 0.025;       // 2.5% assumed inflation
  private readonly MAX_LTV = 0.70;               // 70% LTV failure threshold
  private readonly TRUE_UP_THRESHOLD = 0.12;     // Pay down interest if market return > 12%
  private readonly SIMULATION_YEARS = 50;        // Test each plan for 50 years
  private readonly NUM_SIMULATIONS = 1000;       // Number of "futures" to test
  private readonly LTV_RECOVERY_TARGET = 0.68; // Target LTV after a margin call paydown

  constructor() {}

  /**
   * UPDATED: Runs the full Monte Carlo simulation, now including a cash savings buffer.
   *
   * @param startingPortfolioValue The user's portfolio value.
   * @param initialAnnualWithdrawal The desired first-year income.
   * @param startingCashSavings The amount in their "Sleep Well At Night" fund.
   * @returns An object with the success probability and any failed run data.
   */
  public runSimulation(
    startingPortfolioValue: number, 
    initialAnnualWithdrawal: number,
    startingCashSavings: number // <-- NEW PARAMETER
  ): { successProbability: number, failedMarketReturns: number[][] } {
    let successCount = 0;
    const failedMarketReturns: number[][] = [];

    for (let i = 0; i < this.NUM_SIMULATIONS; i++) {
      // Pass the new savings parameter to the simulation
      const { success, marketReturns } = this.runSingleLifePath(
        startingPortfolioValue, 
        initialAnnualWithdrawal,
        startingCashSavings // <-- PASSING IT HERE
      );
      if (success) {
        successCount++;
      } else {
        failedMarketReturns.push(marketReturns);
      }
    }

    return { successProbability: (successCount / this.NUM_SIMULATIONS) * 100, failedMarketReturns };
  }

  /**
   * REWRITTEN: Simulates a single 50-year financial life path, now with a cash buffer and crisis management logic.
   */
  private runSingleLifePath(
    startPortfolio: number, 
    startWithdrawal: number,
    startCash: number // <-- NEW PARAMETER
  ): { success: boolean, marketReturns: number[] } {
    
    // --- Initialize the simulation state ---
    let portfolio = startPortfolio;
    let debt = 0;
    let cashSavings = startCash; // Initialize the cash buffer
    let withdrawal = startWithdrawal;
    let accumulatedInterest = 0;
    const marketReturns: number[] = [];

    for (let year = 1; year <= this.SIMULATION_YEARS; year++) {
      // 1. Get market return and grow the portfolio
      const marketReturn = this.generateNormalRandom(this.MEAN_ANNUAL_RETURN, this.STD_DEV_ANNUAL_RETURN);
      marketReturns.push(parseFloat((100 * marketReturn).toFixed(2)));
      portfolio *= (1 + marketReturn);

      // 2. Handle "True-Up" in good years
      if (marketReturn > this.TRUE_UP_THRESHOLD) {
        if (portfolio > accumulatedInterest) { // Safety check
            portfolio -= accumulatedInterest;
            debt -= accumulatedInterest;
            accumulatedInterest = 0;
        }
      }

      // 3. Accrue interest on the loan
      const interestForThisYear = debt * this.SBLOC_INTEREST_RATE;
      debt += interestForThisYear;
      accumulatedInterest += interestForThisYear;

      // 4. --- NEW: Crisis Management Logic ---
      // We check LTV *before* taking this year's withdrawal to see if we're in trouble.
      let withdrawalFromSBLOC = withdrawal;
      const potentialNextLTV = (debt + withdrawalFromSBLOC) / portfolio;

      if (potentialNextLTV >= this.MAX_LTV) {
        // "Red Alert": A margin call is imminent. Trigger the Recovery Playbook.
        
        // Calculate how much cash we need to pay down the debt to get to a safe LTV
        const amountToPaydown = (debt + withdrawalFromSBLOC) - (portfolio * this.LTV_RECOVERY_TARGET);

        if (cashSavings >= amountToPaydown) {
          // Playbook Step 1: We have enough cash to solve the problem.
          cashSavings -= amountToPaydown;
          debt -= amountToPaydown;
          
          // Playbook Step 2: Live off cash this year, so no SBLOC withdrawal.
          // We still need to account for this spending by reducing our cash buffer.
          if (cashSavings >= withdrawal) {
            cashSavings -= withdrawal;
            withdrawalFromSBLOC = 0;
          } else {
            // Not enough cash to live on for the whole year. This is a failure.
            return { success: false, marketReturns };
          }

        } else {
          // We don't have enough cash to cover the margin call. The plan has failed.
          return { success: false, marketReturns };
        }
      }

      // 5. Add the (potentially modified) withdrawal to the debt
      debt += withdrawalFromSBLOC;

      // 6. Final safety check on the cash buffer
      if (cashSavings < 0) {
        return { success: false, marketReturns };
      }

      // 7. Prepare for next year by inflating the withdrawal amount
      withdrawal *= (1 + this.INFLATION_RATE);
    }

    // If we survived all 50 years without failing...
    return { success: true, marketReturns };
  }

  /**
   * Generates a random number from a normal distribution using the Box-Muller transform.
   * This is what creates our realistic, weighted market returns.
   */
  private generateNormalRandom(mean: number, stdDev: number): number {
    let u1 = Math.random();
    let u2 = Math.random();
    // This formula converts two uniform random numbers into a normal distribution
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    // Scale it to our desired mean and standard deviation
    return z0 * stdDev + mean;
  }
}