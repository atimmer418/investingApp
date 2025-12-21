import { Injectable } from '@angular/core';

export type StrategyType = 'traditional' | 'sbloc' | 'annuity-growth' | 'dynamic-guardrails' | 'full-annuity';

export interface SimulationParams {
  strategy: StrategyType;
  portfolioValue: number;
  annualWithdrawal: number;
  yearsToLast: number;
  useNTSX: boolean;
  // Advanced parameters
  sblocInterestRate?: number;
  sblocLtvLimit?: number;
  annuityPercentage?: number; // 0 to 1
  guardrailLower?: number;
  guardrailUpper?: number;
}

export interface SimulationResult {
  successProbability: number;
  medianEndValue: number;
  minimumEndValue: number;
  failureRate: number;
  medianTrajectory: number[]; // Array of median portfolio values per year [year0, year1, ...]
  worstCaseTrajectory: number[]; // Array of worst-case values
  bestCaseTrajectory: number[]; // Array of best-case values
}

@Injectable({
  providedIn: 'root'
})
export class MonteCarloService {

  private readonly SIMULATIONS = 1000;
  private readonly INFLATION_RATE = 0.025;

  // Market Assumptions
  private readonly STOCK_RETURN = 0.10;
  private readonly STOCK_VOL = 0.18;
  private readonly BOND_RETURN = 0.04;
  private readonly BOND_VOL = 0.05;

  // NTSX Assumptions (90/60)
  private readonly NTSX_RETURN = 0.10;
  private readonly NTSX_VOL = 0.15;

  constructor() { }

  /**
   * Run a simulation for a specific strategy configuration
   */
  public runSimulation(params: SimulationParams): SimulationResult {
    switch (params.strategy) {
      case 'sbloc':
        return this.simulateSBLOC(params);
      case 'annuity-growth':
        return this.simulateAnnuityGrowth(params);
      case 'dynamic-guardrails':
        return this.simulateDynamicGuardrails(params);
      case 'full-annuity':
        return this.simulateFullAnnuity(params);
      case 'traditional':
      default:
        return this.simulateTraditional(params);
    }
  }

  /**
   * Run all strategies in parallel for comparison
   */
  public runComparison(baseParams: Omit<SimulationParams, 'strategy'>): Record<StrategyType, SimulationResult> {
    const strategies: StrategyType[] = ['traditional', 'sbloc', 'annuity-growth', 'dynamic-guardrails', 'full-annuity'];
    const results: any = {};

    strategies.forEach(strategy => {
      results[strategy] = this.runSimulation({ ...baseParams, strategy });
    });

    return results;
  }

  // =========================================================================
  // STRATEGY IMPLEMENTATIONS
  // =========================================================================

  private simulateTraditional(params: SimulationParams): SimulationResult {
    let successCount = 0;
    const endValues: number[] = [];
    const yearlyValues: number[][] = [];

    for (let sim = 0; sim < this.SIMULATIONS; sim++) {
      let portfolioVal = params.portfolioValue;
      let withdrawal = params.annualWithdrawal;
      let success = true;
      const trajectory: number[] = [portfolioVal];

      for (let year = 0; year < params.yearsToLast; year++) {
        const ret = this.getPortfolioReturn(params.useNTSX);
        portfolioVal *= (1 + ret);
        withdrawal *= (1 + this.INFLATION_RATE);
        portfolioVal -= withdrawal;

        if (portfolioVal <= 0) {
          success = false;
          portfolioVal = 0; // Floor at 0
        }
        trajectory.push(portfolioVal);
        if (!success) break; // Optimization: stop calculating if failed
      }

      // If failed early, we need to fill the rest of the trajectory with 0s for charting
      while (trajectory.length <= params.yearsToLast) {
        trajectory.push(0);
      }

      endValues.push(portfolioVal);
      yearlyValues.push(trajectory);
      if (success && portfolioVal > 0) successCount++;
    }

    return this.processResults(successCount, endValues, yearlyValues, params.yearsToLast);
  }

  private simulateSBLOC(params: SimulationParams): SimulationResult {
    let successCount = 0;
    const endValues: number[] = [];
    const yearlyValues: number[][] = [];

    const interestRate = params.sblocInterestRate ?? 0.055;
    const ltvLimit = params.sblocLtvLimit ?? 0.70;

    for (let sim = 0; sim < this.SIMULATIONS; sim++) {
      let portfolioVal = params.portfolioValue;
      let withdrawal = params.annualWithdrawal;
      let sblocDebt = 0;
      let success = true;
      const trajectory: number[] = [portfolioVal];

      for (let year = 0; year < params.yearsToLast; year++) {
        const ret = this.getPortfolioReturn(params.useNTSX);
        portfolioVal *= (1 + ret);
        withdrawal *= (1 + this.INFLATION_RATE);

        if (ret < 0) {
          // Borrow
          sblocDebt += withdrawal;
          sblocDebt *= (1 + interestRate);
        } else {
          // Sell
          portfolioVal -= withdrawal;
          // True-up
          if (ret > 0.12 && sblocDebt > 0) {
            const payoff = Math.min(sblocDebt, portfolioVal * 0.1);
            sblocDebt -= payoff;
            portfolioVal -= payoff;
          }
        }

        const ltv = sblocDebt / portfolioVal;
        if (ltv > ltvLimit || portfolioVal <= 0) {
          success = false;
          portfolioVal = 0; // Treat as ruin
        }

        let netValue = Math.max(0, portfolioVal - sblocDebt);
        trajectory.push(netValue);

        if (!success) break;
      }

      while (trajectory.length <= params.yearsToLast) {
        trajectory.push(0);
      }

      endValues.push(trajectory[trajectory.length - 1]);
      yearlyValues.push(trajectory);
      if (success) successCount++;
    }

    return this.processResults(successCount, endValues, yearlyValues, params.yearsToLast);
  }

  private simulateAnnuityGrowth(params: SimulationParams): SimulationResult {
    let successCount = 0;
    const endValues: number[] = [];
    const yearlyValues: number[][] = [];

    const annuityPct = params.annuityPercentage ?? 0.50; // Default if not provided
    const annuityAmount = params.portfolioValue * annuityPct;
    const growthStart = params.portfolioValue - annuityAmount;
    const annuityIncome = annuityAmount * 0.06;

    for (let sim = 0; sim < this.SIMULATIONS; sim++) {
      let growthVal = growthStart;
      let withdrawal = params.annualWithdrawal;
      let success = true;
      // Start value is growth portion + annuity value (theoretical principal remain)
      // But simpler is to track "Net Worth" = Growth + Annuity Principal (proxy)
      // For charting, let's track Total Net Worth (Growth + implied Annuity Value)
      // Or just Liquid Net Worth? Let's track Liquid Net Worth (Growth Portfolio)
      const trajectory: number[] = [growthVal];

      for (let year = 0; year < params.yearsToLast; year++) {
        const ret = this.getPortfolioReturn(params.useNTSX);
        growthVal *= (1 + ret);
        withdrawal *= (1 + this.INFLATION_RATE);

        const need = Math.max(0, withdrawal - annuityIncome);
        growthVal -= need;

        // Failure only if growth depletes AND annuity isn't enough (it never is enough for full withdrawal if need > 0)
        // Actually, logic says: success = expenses covered. 
        // If growthVal <= 0, we can only pay annuityIncome. If withdrawal > annuityIncome, we fail.
        if (growthVal <= 0) {
          growthVal = 0;
          if (withdrawal > annuityIncome) success = false;
        }

        trajectory.push(growthVal);
        if (!success && growthVal <= 0) break;
      }

      while (trajectory.length <= params.yearsToLast) {
        // If failed, it stays 0. If success (expenses covered by annuity), technically 0 liquid but fine.
        // Let's keep it 0 for liquid trajectory.
        trajectory.push(0);
      }

      endValues.push(growthVal);
      yearlyValues.push(trajectory);
      if (success) successCount++;
    }

    return this.processResults(successCount, endValues, yearlyValues, params.yearsToLast);
  }

  private simulateDynamicGuardrails(params: SimulationParams): SimulationResult {
    let successCount = 0;
    const endValues: number[] = [];
    const yearlyValues: number[][] = [];

    const lower = params.guardrailLower ?? 0.04;
    const upper = params.guardrailUpper ?? 0.06;

    for (let sim = 0; sim < this.SIMULATIONS; sim++) {
      let portfolioVal = params.portfolioValue;
      let withdrawal = params.portfolioValue * 0.05; // Initial 5%
      let success = true;
      const trajectory: number[] = [portfolioVal];

      for (let year = 0; year < params.yearsToLast; year++) {
        const ret = this.getPortfolioReturn(params.useNTSX);
        portfolioVal *= (1 + ret);

        const rate = withdrawal / portfolioVal;

        if (rate > upper) withdrawal *= 0.90;
        else if (rate < lower) withdrawal *= 1.10;
        else withdrawal *= (1 + this.INFLATION_RATE);

        portfolioVal -= withdrawal;

        if (portfolioVal <= 0) {
          success = false;
          portfolioVal = 0;
        }

        trajectory.push(portfolioVal);
        if (!success) break;
      }

      while (trajectory.length <= params.yearsToLast) {
        trajectory.push(0);
      }

      endValues.push(portfolioVal);
      yearlyValues.push(trajectory);
      if (success) successCount++;
    }

    return this.processResults(successCount, endValues, yearlyValues, params.yearsToLast);
  }

  private simulateFullAnnuity(params: SimulationParams): SimulationResult {
    // Deterministic. 6% payout.
    const income = params.portfolioValue * 0.06;
    const success = income >= params.annualWithdrawal;
    const trajectory = Array(params.yearsToLast + 1).fill(0); // No liquid value

    return {
      successProbability: success ? 100 : 0,
      medianEndValue: 0,
      minimumEndValue: 0,
      failureRate: success ? 0 : 100,
      medianTrajectory: trajectory,
      worstCaseTrajectory: trajectory,
      bestCaseTrajectory: trajectory
    };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  private getPortfolioReturn(useNTSX: boolean): number {
    if (useNTSX) {
      return this.generateNormalRandom(this.NTSX_RETURN, this.NTSX_VOL);
    } else {
      const stock = this.generateNormalRandom(this.STOCK_RETURN, this.STOCK_VOL);
      const bond = this.generateNormalRandom(this.BOND_RETURN, this.BOND_VOL);
      return 0.7 * stock + 0.3 * bond;
    }
  }

  private generateNormalRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  private processResults(
    successCount: number,
    endValues: number[],
    yearlyValues: number[][],
    years: number
  ): SimulationResult {
    endValues.sort((a, b) => a - b);

    // Calculate trajectories (Median, Best, Worst)
    const medianTrajectory: number[] = [];
    const worstCaseTrajectory: number[] = [];
    const bestCaseTrajectory: number[] = [];

    // For each year, get sorted values across all simulations to find percentiles
    for (let t = 0; t <= years; t++) {
      const valuesAtT = yearlyValues.map(sim => sim[t]).sort((a, b) => a - b);
      medianTrajectory.push(valuesAtT[Math.floor(valuesAtT.length * 0.5)]);
      worstCaseTrajectory.push(valuesAtT[Math.floor(valuesAtT.length * 0.05)]); // 5th percentile
      bestCaseTrajectory.push(valuesAtT[Math.floor(valuesAtT.length * 0.95)]); // 95th percentile
    }

    return {
      successProbability: (successCount / this.SIMULATIONS) * 100,
      medianEndValue: endValues[Math.floor(endValues.length / 2)],
      minimumEndValue: endValues[0],
      failureRate: ((this.SIMULATIONS - successCount) / this.SIMULATIONS) * 100,
      medianTrajectory,
      worstCaseTrajectory,
      bestCaseTrajectory
    };
  }

}