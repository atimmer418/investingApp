/**
 * investment-frequency.utils.ts
 *
 * Converts a per-execution investment amount to its monthly equivalent.
 *
 * The factors MUST stay in lockstep with the backend's
 * MonthlyFreedomUpdateService.calculateMonthlyEquivalent
 * (WEEKLY ×4.33, BIWEEKLY ×2.17, SEMI_MONTHLY ×2, MONTHLY ×1) —
 * the unified freedom date depends on both stacks converting identically.
 */
export class InvestmentFrequencyUtils {

  static toMonthlyEquivalent(amount: number, frequency: string | null | undefined): number {
    if (!amount || amount <= 0) return 0;

    const freq = (frequency ?? 'MONTHLY').toUpperCase();
    let factor = 1;
    if (freq === 'WEEKLY') factor = 4.33;
    else if (freq === 'BIWEEKLY') factor = 2.17;
    else if (freq === 'SEMI_MONTHLY' || freq === 'SEMIMONTHLY') factor = 2;

    // Mirror the backend's setScale(2, RoundingMode.HALF_UP)
    return Math.round(amount * factor * 100) / 100;
  }
}
