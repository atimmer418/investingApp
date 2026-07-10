package com.investingapp.backend.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for the Monthly Freedom Update modal data.
 * Contains all calculated fields for the frontend to display.
 */
public class MonthlyFreedomUpdateDTO {

    // Whether the modal should be shown
    private boolean shouldShow;

    // Period info
    private String periodStart; // e.g. "2026-01-01"
    private String periodEnd;   // e.g. "2026-01-31"
    private String periodLabel; // e.g. "Jan 1 to Jan 31"

    // Header badges
    private int statusPercentile;       // "Ahead of X%"
    private int currentStreak;          // "X Month Streak"

    // Milestones achieved during the period
    private List<MilestoneDTO> milestones;

    // Freedom update calculation
    private BigDecimal startEquityValue;
    private BigDecimal endEquityValue;
    private BigDecimal periodProgressDelta; // endEquity - startEquity
    private boolean positive;               // periodProgressDelta > 0

    // Analytics section
    private BigDecimal periodContributions;    // Total invested during period
    private BigDecimal equityValueChange;      // Same as periodProgressDelta
    private BigDecimal returnRate;             // (delta - contributions) / startEquity

    // Projection
    private int projectedFreedomYear;          // Year user reaches targetPortfolio
    private BigDecimal currentEquityValue;
    private BigDecimal recurringInvestmentAmount;
    private String investmentFrequency;

    // Quarterly review (every 3rd MFU)
    private boolean showQuarterlyCompare;
    private BigDecimal equity12MonthsAgo;
    private BigDecimal netWorthChange;           // currentEquity - equity12MonthsAgo
    private BigDecimal freedomYearsChange;       // years closer to freedom vs 12 months ago
    private BigDecimal yearlyContributions;      // total invested in past 12 months

    // Days bought back (days freedom moved closer this period)
    private int daysBoughtBack;

    // Best Next Action
    private int bestNextMoveYearsEarlier;
    private int bestNextMoveYear;
    private String frequencyLabel;              // "paycheck", "week", "month" etc.
    private BigDecimal currentInvestmentAmount;
    private BigDecimal bestNextMoveBoostAmount; // $50 or $25 depending on cycle

    // User age (from dateOfBirth or default 35)
    private int age;

    // Re-open from FRED tab (no 5-second lock)
    private boolean isReopen;

    // MFU count (number of unique non-reopen MFUs the user has seen)
    private int mfuCount;

    // Whether the user has any MFU history (has had at least one MFU period generated)
    private boolean hasMfuHistory;

    // Equity level (1-6) based on endEquity ranges
    private int equityLevel;

    // The calendar month (yyyy-MM) this update was generated FOR, produced server-side. The client
    // echoes it back on /dismiss so the "seen" commit stamps the month actually shown, never the
    // month the dismiss happens to land in (e.g. after a midnight rollover). Carries no financial meaning.
    private String generatedForMonth;

    // Getters and Setters
    public boolean isShouldShow() { return shouldShow; }
    public void setShouldShow(boolean shouldShow) { this.shouldShow = shouldShow; }

    public String getPeriodStart() { return periodStart; }
    public void setPeriodStart(String periodStart) { this.periodStart = periodStart; }

    public String getPeriodEnd() { return periodEnd; }
    public void setPeriodEnd(String periodEnd) { this.periodEnd = periodEnd; }

    public String getPeriodLabel() { return periodLabel; }
    public void setPeriodLabel(String periodLabel) { this.periodLabel = periodLabel; }

    public int getStatusPercentile() { return statusPercentile; }
    public void setStatusPercentile(int statusPercentile) { this.statusPercentile = statusPercentile; }

    public int getCurrentStreak() { return currentStreak; }
    public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }

    public List<MilestoneDTO> getMilestones() { return milestones; }
    public void setMilestones(List<MilestoneDTO> milestones) { this.milestones = milestones; }

    public BigDecimal getStartEquityValue() { return startEquityValue; }
    public void setStartEquityValue(BigDecimal startEquityValue) { this.startEquityValue = startEquityValue; }

    public BigDecimal getEndEquityValue() { return endEquityValue; }
    public void setEndEquityValue(BigDecimal endEquityValue) { this.endEquityValue = endEquityValue; }

    public BigDecimal getPeriodProgressDelta() { return periodProgressDelta; }
    public void setPeriodProgressDelta(BigDecimal periodProgressDelta) { this.periodProgressDelta = periodProgressDelta; }

    public boolean isPositive() { return positive; }
    public void setPositive(boolean positive) { this.positive = positive; }

    public BigDecimal getPeriodContributions() { return periodContributions; }
    public void setPeriodContributions(BigDecimal periodContributions) { this.periodContributions = periodContributions; }

    public BigDecimal getEquityValueChange() { return equityValueChange; }
    public void setEquityValueChange(BigDecimal equityValueChange) { this.equityValueChange = equityValueChange; }

    public BigDecimal getReturnRate() { return returnRate; }
    public void setReturnRate(BigDecimal returnRate) { this.returnRate = returnRate; }

    public int getProjectedFreedomYear() { return projectedFreedomYear; }
    public void setProjectedFreedomYear(int projectedFreedomYear) { this.projectedFreedomYear = projectedFreedomYear; }

    public BigDecimal getCurrentEquityValue() { return currentEquityValue; }
    public void setCurrentEquityValue(BigDecimal currentEquityValue) { this.currentEquityValue = currentEquityValue; }

    public BigDecimal getRecurringInvestmentAmount() { return recurringInvestmentAmount; }
    public void setRecurringInvestmentAmount(BigDecimal recurringInvestmentAmount) { this.recurringInvestmentAmount = recurringInvestmentAmount; }

    public String getInvestmentFrequency() { return investmentFrequency; }
    public void setInvestmentFrequency(String investmentFrequency) { this.investmentFrequency = investmentFrequency; }

    public boolean isShowQuarterlyCompare() { return showQuarterlyCompare; }
    public void setShowQuarterlyCompare(boolean showQuarterlyCompare) { this.showQuarterlyCompare = showQuarterlyCompare; }

    public BigDecimal getEquity12MonthsAgo() { return equity12MonthsAgo; }
    public void setEquity12MonthsAgo(BigDecimal equity12MonthsAgo) { this.equity12MonthsAgo = equity12MonthsAgo; }

    public BigDecimal getNetWorthChange() { return netWorthChange; }
    public void setNetWorthChange(BigDecimal netWorthChange) { this.netWorthChange = netWorthChange; }

    public BigDecimal getFreedomYearsChange() { return freedomYearsChange; }
    public void setFreedomYearsChange(BigDecimal freedomYearsChange) { this.freedomYearsChange = freedomYearsChange; }

    public BigDecimal getYearlyContributions() { return yearlyContributions; }
    public void setYearlyContributions(BigDecimal yearlyContributions) { this.yearlyContributions = yearlyContributions; }

    public int getBestNextMoveYearsEarlier() { return bestNextMoveYearsEarlier; }
    public void setBestNextMoveYearsEarlier(int bestNextMoveYearsEarlier) { this.bestNextMoveYearsEarlier = bestNextMoveYearsEarlier; }

    public int getBestNextMoveYear() { return bestNextMoveYear; }
    public void setBestNextMoveYear(int bestNextMoveYear) { this.bestNextMoveYear = bestNextMoveYear; }

    public String getFrequencyLabel() { return frequencyLabel; }
    public void setFrequencyLabel(String frequencyLabel) { this.frequencyLabel = frequencyLabel; }

    public BigDecimal getCurrentInvestmentAmount() { return currentInvestmentAmount; }
    public void setCurrentInvestmentAmount(BigDecimal currentInvestmentAmount) { this.currentInvestmentAmount = currentInvestmentAmount; }

    public BigDecimal getBestNextMoveBoostAmount() { return bestNextMoveBoostAmount; }
    public void setBestNextMoveBoostAmount(BigDecimal bestNextMoveBoostAmount) { this.bestNextMoveBoostAmount = bestNextMoveBoostAmount; }

    public int getDaysBoughtBack() { return daysBoughtBack; }
    public void setDaysBoughtBack(int daysBoughtBack) { this.daysBoughtBack = daysBoughtBack; }

    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }

    public boolean isReopen() { return isReopen; }
    public void setReopen(boolean reopen) { isReopen = reopen; }

    public int getMfuCount() { return mfuCount; }
    public void setMfuCount(int mfuCount) { this.mfuCount = mfuCount; }

    public boolean isHasMfuHistory() { return hasMfuHistory; }
    public void setHasMfuHistory(boolean hasMfuHistory) { this.hasMfuHistory = hasMfuHistory; }

    public int getEquityLevel() { return equityLevel; }
    public void setEquityLevel(int equityLevel) { this.equityLevel = equityLevel; }

    public String getGeneratedForMonth() { return generatedForMonth; }
    public void setGeneratedForMonth(String generatedForMonth) { this.generatedForMonth = generatedForMonth; }

    /**
     * Nested DTO for milestones
     */
    public static class MilestoneDTO {
        private String type;  // "INVESTMENT_COUNT" or "EQUITY_VALUE"
        private String label; // e.g. "100th Investment!" or "$10k Portfolio!"
        private String subtitle;

        public MilestoneDTO() {}

        public MilestoneDTO(String type, String label, String subtitle) {
            this.type = type;
            this.label = label;
            this.subtitle = subtitle;
        }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }

        public String getSubtitle() { return subtitle; }
        public void setSubtitle(String subtitle) { this.subtitle = subtitle; }
    }
}
