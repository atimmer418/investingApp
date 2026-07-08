/**
 * investment-frequency.utils.ts
 *
 * Converts a per-execution investment amount to its monthly equivalent.
 *
 * The factors MUST stay in lockstep with the backend's
 * MonthlyFreedomUpdateService.calculateMonthlyEquivalent
 * (WEEKLY ×4.33, BIWEEKLY ×2.17, SEMI_MONTHLY ×2, MONTHLY ×1) —
 * the unified freedom date depends on both stacks converting identically.
 * Assumes cents-quantized amounts (the DB stores investment_amount at scale=2);
 * sub-cent inputs are quantized to cents before conversion.
 */
export class InvestmentFrequencyUtils {

  static toMonthlyEquivalent(amount: number, frequency: string | null | undefined): number {
    if (!amount || amount <= 0) return 0;

    const freq = (frequency ?? 'MONTHLY').toUpperCase();
    let factorHundredths = 100; // MONTHLY / unknown
    if (freq === 'WEEKLY') factorHundredths = 433;
    else if (freq === 'BIWEEKLY') factorHundredths = 217;
    else if (freq === 'SEMI_MONTHLY' || freq === 'SEMIMONTHLY') factorHundredths = 200;

    // Exact integer-cents arithmetic — reproduces the backend's
    // BigDecimal setScale(2, HALF_UP) without binary floating-point drift
    // (e.g. 15.5 × 4.33 = 67.115 must round UP to 67.12).
    const cents = Math.round(amount * 100);
    const monthlyCents = Math.floor((cents * factorHundredths + 50) / 100);
    return monthlyCents / 100;
  }
}
