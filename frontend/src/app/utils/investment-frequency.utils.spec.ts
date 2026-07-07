import { InvestmentFrequencyUtils } from './investment-frequency.utils';

describe('InvestmentFrequencyUtils', () => {

  it('converts WEEKLY with the backend factor ×4.33', () => {
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(100, 'WEEKLY')).toBe(433);
  });

  it('converts BIWEEKLY with ×2.17 (backend parity — NOT the old my-profile 2.16)', () => {
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(100, 'BIWEEKLY')).toBe(217);
  });

  it('converts semi-monthly with ×2, accepting both spellings', () => {
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(250, 'SEMI_MONTHLY')).toBe(500);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(250, 'semimonthly')).toBe(500);
  });

  it('passes monthly through unchanged and is case-insensitive', () => {
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(500, 'monthly')).toBe(500);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(500, 'weekly')).toBe(2165);
  });

  it('rounds to cents like the backend setScale(2, HALF_UP)', () => {
    // 115.47 × 4.33 = 499.9851 → 499.99
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(115.47, 'WEEKLY')).toBe(499.99);
    // Halfway-cent boundary: 15.5 × 4.33 = 67.115 → HALF_UP → 67.12
    // (naive float Math.round gives 67.11 — the exact bug this guards)
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(15.5, 'WEEKLY')).toBe(67.12);
    // Halfway-cent boundary for biweekly: 12.5 × 2.17 = 27.125 → 27.13
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(12.5, 'BIWEEKLY')).toBe(27.13);
  });

  it('returns 0 for zero/negative amounts; unknown or missing frequency defaults to monthly', () => {
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(0, 'WEEKLY')).toBe(0);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(-5, 'WEEKLY')).toBe(0);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(500, 'QUARTERLY')).toBe(500);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(500, undefined)).toBe(500);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(500, null)).toBe(500);
  });
});
