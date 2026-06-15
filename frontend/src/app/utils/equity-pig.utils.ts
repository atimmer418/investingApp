/**
 * Shared helper for mapping equity values to the 5-range pig avatar SVGs.
 *
 * Range → file mapping (mirrors MonthlyFreedomUpdateService.calculateEquityLevel):
 *   Range 1: $0      – $999.99    → pig-range-1.svg
 *   Range 2: $1,000  – $9,999.99  → pig-range-2.svg
 *   Range 3: $10,000 – $99,999.99 → pig-range-3.svg
 *   Range 4: $100,000 – $999,999.99 → pig-range-4.svg
 *   Range 5: $1,000,000+           → pig-range-5.svg
 *
 * Backend equityLevel mapping:
 *   L1 → range 1 · L2 → range 2 · L3 → range 3 · L4 → range 4
 *   L5 & L6 → range 5 (both collapse to the single $1m+ pig)
 */
export class EquityPigUtils {

  private static readonly RANGE_COUNT = 5;

  /**
   * Returns the asset URL for the pig SVG matching the given live equity value.
   * Falls back to range 1 (pig-range-1.svg) for zero, null, undefined, or NaN.
   */
  static pigSrcFromEquity(equity: number | null | undefined): string {
    const value = (equity != null && isFinite(equity) && !isNaN(equity)) ? equity : 0;
    let range: number;
    if (value < 1_000) {
      range = 1;
    } else if (value < 10_000) {
      range = 2;
    } else if (value < 100_000) {
      range = 3;
    } else if (value < 1_000_000) {
      range = 4;
    } else {
      range = 5;
    }
    return `assets/images/pig-range-${range}.svg`;
  }

  /**
   * Returns the asset URL for the pig SVG matching the given backend equityLevel (1–6).
   * L5 and L6 both map to range 5 (the $1m+ pig).
   * Falls back to range 1 for any invalid / out-of-range level.
   */
  static pigSrcFromLevel(equityLevel: number | null | undefined): string {
    if (equityLevel == null || equityLevel < 1 || equityLevel > 6) {
      return `assets/images/pig-range-1.svg`;
    }
    // Levels 1–4 map 1-to-1; levels 5 and 6 both collapse to range 5.
    const range = Math.min(equityLevel, EquityPigUtils.RANGE_COUNT);
    return `assets/images/pig-range-${range}.svg`;
  }
}
