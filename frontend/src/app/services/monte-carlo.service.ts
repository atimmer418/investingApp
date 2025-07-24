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

  constructor() {}

  /**
   * Runs the full Monte Carlo simulation for a given SBLOC plan.
   *
   * @param startingPortfolioValue The user's current portfolio value.
   * @param initialAnnualWithdrawal The desired first-year income (e.g., 6% of the portfolio).
   * @returns The probability of success as a percentage (e.g., 95.3).
   */
  public runSimulation(startingPortfolioValue: number, initialAnnualWithdrawal: number): { successProbability: number, failedMarketReturns: number[][] } {
    let successCount = 0;
    const failedMarketReturns: number[][] = [];

    for (let i = 0; i < this.NUM_SIMULATIONS; i++) {
      const { success, marketReturns } = this.runSingleLifePath(startingPortfolioValue, initialAnnualWithdrawal);
      if (success) {
        successCount++;
      } else {
        failedMarketReturns.push(marketReturns);
      }
    }

    return { successProbability: (successCount / this.NUM_SIMULATIONS) * 100, failedMarketReturns };
  }

  /**
   * Simulates a single 50-year financial life path with random market returns.
   */
  private runSingleLifePath(startPortfolio: number, startWithdrawal: number): { success: boolean, marketReturns: number[] } {
    let portfolio = startPortfolio;
    let debt = 0;
    let withdrawal = startWithdrawal;
    let accumulatedInterest = 0; // Tracks interest since the last True-Up
    const marketReturns: number[] = [];

    for (let year = 1; year <= this.SIMULATION_YEARS; year++) {
      // 1. Generate a realistic random market return for this year.
      const marketReturn = this.generateNormalRandom(this.MEAN_ANNUAL_RETURN, this.STD_DEV_ANNUAL_RETURN);
      marketReturns.push(parseFloat((100 * marketReturn).toFixed(2)));

      // 2. Portfolio value compounds with the market return.
      portfolio *= (1 + marketReturn);

      // 3. Check for the "True-Up" condition.
      if (marketReturn > this.TRUE_UP_THRESHOLD) {
        // Use portfolio funds to pay off accumulated interest.
        portfolio -= accumulatedInterest;
        debt -= accumulatedInterest;
        accumulatedInterest = 0; // Reset the interest tracker
      }

      // 4. Calculate this year's new interest and add it to debt and the tracker.
      const interestForThisYear = debt * this.SBLOC_INTEREST_RATE;
      debt += interestForThisYear;
      accumulatedInterest += interestForThisYear;

      // 5. Add this year's withdrawal to the debt.
      debt += withdrawal;

      // 6. Check for failure condition.
      if (portfolio <= 0 || (debt / portfolio) >= this.MAX_LTV) {
        return { success: false, marketReturns }; // This "life path" has failed.
      }

      // 7. Prepare for next year: increase withdrawal for inflation.
      withdrawal *= (1 + this.INFLATION_RATE);
    }

    // If the loop completes without ever failing...
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