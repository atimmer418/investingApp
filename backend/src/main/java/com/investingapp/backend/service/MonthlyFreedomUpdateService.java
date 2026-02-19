package com.investingapp.backend.service;

import com.investingapp.backend.dto.MonthlyFreedomUpdateDTO;
import com.investingapp.backend.dto.MonthlyFreedomUpdateDTO.MilestoneDTO;
import com.investingapp.backend.model.InvestmentSchedule;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.InvestmentExecutionRepository;
import com.investingapp.backend.repository.InvestmentScheduleRepository;
import com.investingapp.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class MonthlyFreedomUpdateService {

    private static final Logger logger = LoggerFactory.getLogger(MonthlyFreedomUpdateService.class);

    private static final double ASSUMED_ANNUAL_RETURN = 0.09;
    private static final BigDecimal FIFTY_DOLLARS = new BigDecimal("50");

    // Age-based equity percentile lookup (simplified global population estimates)
    // Key: age bracket upper bound, Value: median equity for that bracket
    private static final TreeMap<Integer, BigDecimal> AGE_EQUITY_ESTIMATES = new TreeMap<>();
    static {
        AGE_EQUITY_ESTIMATES.put(25, new BigDecimal("10000"));
        AGE_EQUITY_ESTIMATES.put(30, new BigDecimal("30000"));
        AGE_EQUITY_ESTIMATES.put(35, new BigDecimal("70000"));
        AGE_EQUITY_ESTIMATES.put(40, new BigDecimal("120000"));
        AGE_EQUITY_ESTIMATES.put(45, new BigDecimal("200000"));
        AGE_EQUITY_ESTIMATES.put(50, new BigDecimal("300000"));
        AGE_EQUITY_ESTIMATES.put(55, new BigDecimal("400000"));
        AGE_EQUITY_ESTIMATES.put(60, new BigDecimal("500000"));
        AGE_EQUITY_ESTIMATES.put(65, new BigDecimal("650000"));
        AGE_EQUITY_ESTIMATES.put(100, new BigDecimal("800000"));
    }

    // Investment count milestones
    private static final int[] INVESTMENT_COUNT_MILESTONES = {1, 10, 100, 1000, 10000};
    // Equity value milestones
    private static final BigDecimal[] EQUITY_VALUE_MILESTONES = {
        new BigDecimal("1000"),
        new BigDecimal("10000"),
        new BigDecimal("50000"),
        new BigDecimal("100000"),
        new BigDecimal("250000"),
        new BigDecimal("500000"),
        new BigDecimal("1000000")
    };

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InvestmentExecutionRepository executionRepository;

    @Autowired
    private InvestmentScheduleRepository scheduleRepository;

    @Autowired
    private PortfolioDashboardService portfolioDashboardService;

    /**
     * Check if the Monthly Freedom Update should be shown for the given user.
     * Returns a short DTO with just shouldShow and the user's lastLoggedInMonth.
     */
    public MonthlyFreedomUpdateDTO checkShouldShow(User user, BigDecimal currentEquity) {
        MonthlyFreedomUpdateDTO dto = new MonthlyFreedomUpdateDTO();
        dto.setShouldShow(false);

        String currentMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        String lastLoggedMonth = user.getLastLoggedInMonth();

        // If no last logged month, this is first time -> set it and don't show
        if (lastLoggedMonth == null || lastLoggedMonth.isEmpty()) {
            dto.setShouldShow(false);
            return dto;
        }

        // If current month matches lastLoggedInMonth, already shown this month
        if (currentMonth.equals(lastLoggedMonth)) {
            dto.setShouldShow(false);
            return dto;
        }

        // Current equity must be > 0
        if (currentEquity == null || currentEquity.compareTo(BigDecimal.ZERO) <= 0) {
            dto.setShouldShow(false);
            return dto;
        }

        // Different month and equity > 0 → should show
        dto.setShouldShow(true);
        return dto;
    }

    /**
     * Generate the complete Monthly Freedom Update data.
     * Called when the modal should be shown or when reopened from FRED tab.
     *
     * @param user         The user
     * @param currentEquity Current equity value from Alpaca
     * @param portfolioHistory ALL-time portfolio history (timestamps as ISO dates, values as equity)
     * @param isReopen     Whether this is a reopen from FRED tab (no 5-second lock)
     */
    @Transactional
    public MonthlyFreedomUpdateDTO generateUpdate(
            User user,
            BigDecimal currentEquity,
            PortfolioDashboardService.PortfolioHistory portfolioHistory,
            boolean isReopen) {

        MonthlyFreedomUpdateDTO dto = new MonthlyFreedomUpdateDTO();
        dto.setReopen(isReopen);
        dto.setShouldShow(true);

        String currentMonthStr = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        String lastLoggedMonth = user.getLastLoggedInMonth();

        // --- Period Calculation ---
        // On reopen, use stored period dates if available
        LocalDate periodStart;
        LocalDate periodEnd;

        if (isReopen && user.getLastMfuPeriodStart() != null && user.getLastMfuPeriodEnd() != null) {
            periodStart = LocalDate.parse(user.getLastMfuPeriodStart());
            periodEnd = LocalDate.parse(user.getLastMfuPeriodEnd());
        } else {
            YearMonth lastMonth = lastLoggedMonth != null && !lastLoggedMonth.isEmpty()
                    ? YearMonth.parse(lastLoggedMonth)
                    : YearMonth.now().minusMonths(1);
            YearMonth currentYM = YearMonth.now();

            // Period: first day of lastLoggedInMonth → last day of month before current
            periodStart = lastMonth.atDay(1);
            periodEnd = currentYM.minusMonths(1).atEndOfMonth();

            // If periodEnd < periodStart (same month scenario), adjust
            if (periodEnd.isBefore(periodStart)) {
                periodStart = currentYM.minusMonths(1).atDay(1);
                periodEnd = currentYM.minusMonths(1).atEndOfMonth();
            }
        }

        dto.setPeriodStart(periodStart.toString());
        dto.setPeriodEnd(periodEnd.toString());

        DateTimeFormatter labelFormat = DateTimeFormatter.ofPattern("MMM d");
        dto.setPeriodLabel(periodStart.format(labelFormat) + " to " + periodEnd.format(labelFormat));

        // --- Equity values from portfolio history ---
        BigDecimal startEquity = findEquityAtDate(portfolioHistory, periodStart);
        BigDecimal endEquity = findEquityAtDate(portfolioHistory, periodEnd);

        // If endEquity is still 0, use currentEquity as approximation
        if (endEquity.compareTo(BigDecimal.ZERO) == 0 && currentEquity.compareTo(BigDecimal.ZERO) > 0) {
            endEquity = currentEquity;
        }

        dto.setStartEquityValue(startEquity);
        dto.setEndEquityValue(endEquity);
        dto.setCurrentEquityValue(currentEquity);

        BigDecimal periodDelta = endEquity.subtract(startEquity);
        dto.setPeriodProgressDelta(periodDelta);
        dto.setPositive(periodDelta.compareTo(BigDecimal.ZERO) > 0);

        // --- Status Percentile ---
        int percentile = calculateStatusPercentile(user, currentEquity);
        dto.setStatusPercentile(percentile);

        // --- Streak (compute fresh for accurate display) ---
        int streak;
        Optional<InvestmentSchedule> activeSchedule = scheduleRepository.findTopByUserOrderByCreatedAtDesc(user);
        if (activeSchedule.isEmpty() || activeSchedule.get().getIsPaused()) {
            streak = 0;
        } else {
            streak = (user.getCurrentStreak() != null ? user.getCurrentStreak() : 0);
            if (!isReopen) {
                streak += 1; // Will be persisted in updateUserState
            }
        }
        dto.setCurrentStreak(streak);

        // --- Milestones ---
        long totalInvestmentCount = executionRepository.countCompletedExecutionsByUser(user.getId());
        List<MilestoneDTO> milestones = calculateMilestones(user, totalInvestmentCount, startEquity, endEquity);
        dto.setMilestones(milestones);

        // --- Analytics Section ---
        LocalDateTime periodStartDT = periodStart.atStartOfDay();
        LocalDateTime periodEndDT = periodEnd.atTime(23, 59, 59);
        BigDecimal periodContributions = executionRepository.sumCompletedAmountsByUserAndDateRange(
                user.getId(), periodStartDT, periodEndDT);
        dto.setPeriodContributions(periodContributions);
        dto.setEquityValueChange(periodDelta);

        // Return rate = (periodDelta - contributions) / startEquity
        BigDecimal returnRate = BigDecimal.ZERO;
        if (startEquity.compareTo(BigDecimal.ZERO) > 0) {
            returnRate = periodDelta.subtract(periodContributions)
                    .divide(startEquity, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
        }
        dto.setReturnRate(returnRate);

        // --- Investment Schedule info ---
        Optional<InvestmentSchedule> scheduleOpt = scheduleRepository.findTopByUserOrderByCreatedAtDesc(user);
        BigDecimal investmentAmount = BigDecimal.ZERO;
        String frequency = "MONTHLY";
        if (scheduleOpt.isPresent()) {
            InvestmentSchedule schedule = scheduleOpt.get();
            investmentAmount = schedule.getInvestmentAmount();
            frequency = schedule.getFrequency();
        }
        dto.setRecurringInvestmentAmount(investmentAmount);
        dto.setInvestmentFrequency(frequency);
        dto.setCurrentInvestmentAmount(investmentAmount);

        // --- Frequency label for display ---
        String freqLabel = getFrequencyLabel(frequency);
        dto.setFrequencyLabel(freqLabel);

        // --- Projection: Freedom Year ---
        BigDecimal monthlyContribution = calculateMonthlyEquivalent(investmentAmount, frequency);
        Double targetPortfolio = user.getTargetPortfolio();
        if (targetPortfolio == null || targetPortfolio <= 0) {
            // Fallback: use retirementIncome / 0.04 (4% SWR)
            Double retirementIncome = user.getRetirementIncome();
            if (retirementIncome != null && retirementIncome > 0) {
                targetPortfolio = retirementIncome / 0.04;
            } else {
                targetPortfolio = 1500000.0; // Default $1.5M
            }
        }

        int freedomYear = calculateFreedomYear(currentEquity, monthlyContribution, new BigDecimal(targetPortfolio));
        dto.setProjectedFreedomYear(freedomYear);

        // --- Best Next Action (+$50) ---
        BigDecimal boostedMonthly = monthlyContribution.add(calculateMonthlyEquivalent(FIFTY_DOLLARS, frequency));
        int boostedFreedomYear = calculateFreedomYear(currentEquity, boostedMonthly, new BigDecimal(targetPortfolio));
        int yearsEarlier = freedomYear - boostedFreedomYear;
        if (yearsEarlier < 0) yearsEarlier = 0;
        dto.setBestNextMoveYearsEarlier(yearsEarlier);
        dto.setBestNextMoveYear(boostedFreedomYear);

        // --- Days Bought Back (days freedom moved closer this period) ---
        BigDecimal targetBD = new BigDecimal(targetPortfolio);
        int daysBoughtBack = calculateDaysBoughtBack(startEquity, endEquity, monthlyContribution, targetBD);
        dto.setDaysBoughtBack(daysBoughtBack);

        // --- Quarterly Compare (every 3rd month) ---
        Integer accountLength = user.getUserAccountLength();
        if (accountLength == null) accountLength = 0;
        boolean showQuarterly = accountLength > 0 && accountLength % 3 == 0;
        dto.setShowQuarterlyCompare(showQuarterly);

        if (showQuarterly) {
            BigDecimal equity12MonthsAgo = BigDecimal.ZERO;
            if (accountLength >= 12) {
                equity12MonthsAgo = findEquityAtDate(portfolioHistory, LocalDate.now().minusMonths(12));
            }
            dto.setEquity12MonthsAgo(equity12MonthsAgo);
            dto.setNetWorthChange(currentEquity.subtract(equity12MonthsAgo));

            Integer prevEstimate = user.getPreviousFreedomEstimate();
            Integer currentEstimate = user.getCurrentFreedomEstimate();
            if (prevEstimate == null) prevEstimate = LocalDate.now().getYear();
            if (currentEstimate == null) currentEstimate = freedomYear;

            BigDecimal freedomYearsChange = new BigDecimal(prevEstimate - currentEstimate);
            dto.setFreedomYearsChange(freedomYearsChange);
        }

        // --- Persist user state (idempotent) ---
        if (!isReopen) {
            updateUserState(user, currentMonthStr, freedomYear, (int) totalInvestmentCount,
                    milestones, startEquity, endEquity, periodStart, periodEnd, streak);
        }

        return dto;
    }

    /**
     * Update user fields after showing the Monthly Freedom Update.
     */
    @Transactional
    public void updateUserState(User user, String currentMonth, int freedomYear,
                                int totalInvestmentCount, List<MilestoneDTO> newMilestones,
                                BigDecimal startEquity, BigDecimal endEquity,
                                LocalDate periodStart, LocalDate periodEnd, int newStreak) {

        // Update lastLoggedInMonth
        user.setLastLoggedInMonth(currentMonth);

        // Store period for reopen
        user.setLastMfuPeriodStart(periodStart.toString());
        user.setLastMfuPeriodEnd(periodEnd.toString());

        // Update userAccountLength
        if (user.getUserAccountLength() == null) {
            // Calculate from createDate
            if (user.getCreateDate() != null) {
                long months = ChronoUnit.MONTHS.between(
                        YearMonth.from(user.getCreateDate()),
                        YearMonth.now());
                user.setUserAccountLength((int) months);
            } else {
                user.setUserAccountLength(0);
            }
        } else {
            user.setUserAccountLength(user.getUserAccountLength() + 1);
        }

        // Update freedom estimates
        // If accountLength crosses 12-month boundary, save current as previous
        Integer accountLength = user.getUserAccountLength();
        if (accountLength != null && accountLength >= 12 && user.getPreviousFreedomEstimate() == null) {
            // First time reaching 12 months - save current estimate as previous
            Integer current = user.getCurrentFreedomEstimate();
            if (current != null) {
                user.setPreviousFreedomEstimate(current);
            } else {
                user.setPreviousFreedomEstimate(LocalDate.now().getYear());
            }
        }
        // Every 12 months, rotate current -> previous
        if (accountLength != null && accountLength > 0 && accountLength % 12 == 0) {
            Integer current = user.getCurrentFreedomEstimate();
            if (current != null) {
                user.setPreviousFreedomEstimate(current);
            }
        }
        user.setCurrentFreedomEstimate(freedomYear);

        // Update recurring investment count
        user.setRecurringInvestmentCount(totalInvestmentCount);

        // Update streak (pre-computed in generateUpdate)
        user.setCurrentStreak(newStreak);

        // Update milestone history
        updateMilestoneHistory(user, newMilestones);

        userRepository.save(user);
    }



    /**
     * Merge new milestones into the user's milestone history (JSON string).
     */
    private void updateMilestoneHistory(User user, List<MilestoneDTO> newMilestones) {
        Set<String> existing = new HashSet<>();
        String history = user.getMilestoneHistory();
        if (history != null && !history.isEmpty()) {
            // Simple JSON array parsing: ["INVESTMENT_10","EQUITY_1K"]
            history = history.replace("[", "").replace("]", "").replace("\"", "");
            if (!history.isEmpty()) {
                existing.addAll(Arrays.asList(history.split(",")));
            }
        }

        for (MilestoneDTO m : newMilestones) {
            // Combined type keys may contain comma-separated values
            if (m.getType() != null && !"DEFAULT".equals(m.getType())) {
                for (String key : m.getType().split(",")) {
                    if (!key.trim().isEmpty()) {
                        existing.add(key.trim());
                    }
                }
            }
        }

        // Rebuild JSON array string
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        for (String s : existing) {
            if (!first) sb.append(",");
            sb.append("\"").append(s).append("\"");
            first = false;
        }
        sb.append("]");
        user.setMilestoneHistory(sb.toString());
    }

    /**
     * Calculate status percentile based on age and equity compared to population estimates.
     */
    private int calculateStatusPercentile(User user, BigDecimal currentEquity) {
        Integer age = user.getAge();
        if (age == null) age = 30; // Default age

        // Find the median equity for the user's age bracket
        Map.Entry<Integer, BigDecimal> entry = AGE_EQUITY_ESTIMATES.ceilingEntry(age);
        if (entry == null) {
            entry = AGE_EQUITY_ESTIMATES.lastEntry();
        }
        BigDecimal medianEquity = entry.getValue();

        if (medianEquity.compareTo(BigDecimal.ZERO) == 0) return 50;

        // Simple percentile: assume normal-ish distribution
        // If equityValue == median → 50th percentile
        // Use ratio to estimate percentile (capped 1-99)
        double ratio = currentEquity.doubleValue() / medianEquity.doubleValue();

        // Map ratio to percentile using a simple logistic-like function
        // ratio=0 → ~1%, ratio=1 → 50%, ratio=2 → ~85%, ratio=4 → ~97%
        double percentile = 100.0 / (1.0 + Math.exp(-1.5 * (ratio - 1.0)));
        int result = (int) Math.round(percentile);
        return Math.max(1, Math.min(99, result));
    }

    /**
     * Calculate milestones achieved during the period.
     * Returns a single combined milestone or a default "no milestones" entry.
     * - Investment Count: prevCount < milestone <= currentCount
     * - Total Equity Value: startEquity <= milestone <= endEquity (highest only)
     * All milestones are combined into one card with a merged title and subtitle.
     */
    private List<MilestoneDTO> calculateMilestones(User user, long totalInvestmentCount,
                                                    BigDecimal startEquity, BigDecimal endEquity) {
        List<MilestoneDTO> result = new ArrayList<>();

        // Previous investment count (from last update)
        int prevCount = user.getRecurringInvestmentCount() != null ? user.getRecurringInvestmentCount() : 0;

        // Collect investment count milestones crossed: prevCount < milestone <= currentCount
        List<String> investmentLabels = new ArrayList<>();
        List<String> investmentKeys = new ArrayList<>();
        for (int milestone : INVESTMENT_COUNT_MILESTONES) {
            if (prevCount < milestone && totalInvestmentCount >= milestone) {
                investmentKeys.add("INVESTMENT_" + milestone);
                investmentLabels.add(formatOrdinal(milestone));
            }
        }

        // Collect equity milestone: startEquity <= milestone <= endEquity, take highest only
        String equityLabel = null;
        String equityKey = null;
        for (int i = EQUITY_VALUE_MILESTONES.length - 1; i >= 0; i--) {
            BigDecimal milestone = EQUITY_VALUE_MILESTONES[i];
            if (startEquity.compareTo(milestone) <= 0 && endEquity.compareTo(milestone) >= 0) {
                equityKey = "EQUITY_" + formatMilestoneKey(milestone);
                equityLabel = formatEquityLabel(milestone);
                break; // Take highest only
            }
        }

        // Build combined milestone
        int totalMilestones = investmentLabels.size() + (equityLabel != null ? 1 : 0);

        if (totalMilestones == 0) {
            // Default: no milestones reached
            result.add(new MilestoneDTO("DEFAULT", "No major milestones reached",
                    "FRED's still so proud of you though"));
        } else {
            // Build combined title
            StringBuilder title = new StringBuilder();
            if (!investmentLabels.isEmpty()) {
                title.append(String.join(" and ", investmentLabels));
                title.append(" Investment!");
            }
            if (equityLabel != null) {
                if (title.length() > 0) title.append(" ");
                title.append(equityLabel).append(" Total Equity Reached!");
            }

            // Build subtitle
            String subtitle;
            if (totalMilestones == 1) {
                subtitle = "You reached a major milestone.";
            } else {
                subtitle = "You reached " + totalMilestones + " major milestones.";
            }

            // Combined type key for milestone history
            String combinedType = String.join(",", investmentKeys);
            if (equityKey != null) {
                if (!combinedType.isEmpty()) combinedType += ",";
                combinedType += equityKey;
            }

            result.add(new MilestoneDTO(combinedType, title.toString(), subtitle));
        }

        return result;
    }

    /**
     * Format a number as an ordinal: 1→"1st", 10→"10th", 100→"100th", 1000→"1,000th", 10000→"10,000th"
     */
    private String formatOrdinal(int n) {
        String formatted;
        if (n >= 1000) {
            formatted = String.format("%,d", n);
        } else {
            formatted = String.valueOf(n);
        }

        if (n == 1) return formatted + "st";
        if (n == 2) return formatted + "nd";
        if (n == 3) return formatted + "rd";
        return formatted + "th";
    }

    /**
     * Format equity milestone label: $1k, $10k, $50k, $100k, $250k, $500k, $1M
     */
    private String formatEquityLabel(BigDecimal value) {
        double val = value.doubleValue();
        if (val >= 1_000_000) return "$" + ((int)(val / 1_000_000)) + "M";
        if (val >= 1_000) return "$" + ((int)(val / 1_000)) + "k";
        return "$" + (int)val;
    }

    private String formatMilestoneKey(BigDecimal value) {
        double val = value.doubleValue();
        if (val >= 1_000_000) return ((int)(val / 1_000_000)) + "M";
        if (val >= 1_000) return ((int)(val / 1_000)) + "K";
        return String.valueOf((int)val);
    }



    /**
     * Find equity value at a specific date from portfolio history.
     * Falls back to nearest previous date.
     */
    private BigDecimal findEquityAtDate(PortfolioDashboardService.PortfolioHistory history,
                                         LocalDate targetDate) {
        if (history == null || history.timestamps == null || history.timestamps.isEmpty()) {
            return BigDecimal.ZERO;
        }

        String targetStr = targetDate.toString(); // ISO format yyyy-MM-dd

        // Try exact match first
        for (int i = 0; i < history.timestamps.size(); i++) {
            if (history.timestamps.get(i).equals(targetStr)) {
                return history.values.get(i);
            }
        }

        // Find nearest date before target
        BigDecimal closestValue = BigDecimal.ZERO;
        for (int i = 0; i < history.timestamps.size(); i++) {
            String dateStr = history.timestamps.get(i);
            LocalDate date = LocalDate.parse(dateStr);
            if (!date.isAfter(targetDate)) {
                closestValue = history.values.get(i);
            } else {
                break; // Assuming timestamps are sorted ascending
            }
        }
        return closestValue;
    }

    /**
     * Calculate months to reach target portfolio with compound growth and monthly contributions.
     * Core formula: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
     * Solved for n.
     */
    private double calculateMonthsToTarget(BigDecimal currentEquity, BigDecimal monthlyContribution,
                                            BigDecimal targetPortfolio) {
        if (currentEquity.compareTo(targetPortfolio) >= 0) return 0;
        if (currentEquity.compareTo(BigDecimal.ZERO) <= 0 &&
            monthlyContribution.compareTo(BigDecimal.ZERO) <= 0) return 600;

        double r = ASSUMED_ANNUAL_RETURN / 12.0;
        double PV = currentEquity.doubleValue();
        double FV = targetPortfolio.doubleValue();
        double PMT = monthlyContribution.doubleValue();

        if (PMT <= 0) {
            // Growth only, no contributions
            if (PV <= 0) return 600;
            double months = Math.log(FV / PV) / Math.log(1 + r);
            if (Double.isNaN(months) || Double.isInfinite(months) || months < 0) return 600;
            return months;
        }

        double numerator = Math.log((FV + PMT / r) / (PV + PMT / r));
        double denominator = Math.log(1 + r);

        if (denominator == 0 || Double.isNaN(numerator) || Double.isInfinite(numerator)) return 600;
        double months = numerator / denominator;
        if (Double.isNaN(months) || Double.isInfinite(months) || months < 0) return 600;
        return months;
    }

    /**
     * Calculate time to reach target portfolio value.
     * Returns the projected year.
     */
    private int calculateFreedomYear(BigDecimal currentEquity, BigDecimal monthlyContribution,
                                      BigDecimal targetPortfolio) {
        double months = calculateMonthsToTarget(currentEquity, monthlyContribution, targetPortfolio);
        int years = (int) Math.ceil(months / 12.0);
        return Math.min(LocalDate.now().getYear() + years, LocalDate.now().getYear() + 100);
    }

    /**
     * Calculate days bought back from the standard 59.5 retirement age.
     * Compares months-to-target from startEquity vs endEquity.
     */
    private int calculateDaysBoughtBack(BigDecimal startEquity, BigDecimal endEquity,
                                         BigDecimal monthlyContribution, BigDecimal targetPortfolio) {
        double monthsFromStart = calculateMonthsToTarget(startEquity, monthlyContribution, targetPortfolio);
        double monthsFromEnd = calculateMonthsToTarget(endEquity, monthlyContribution, targetPortfolio);
        double monthsDiff = monthsFromStart - monthsFromEnd;
        int days = (int) Math.round(monthsDiff * 30.44);
        return Math.max(0, days);
    }

    /**
     * Convert per-execution investment amount to monthly equivalent.
     */
    private BigDecimal calculateMonthlyEquivalent(BigDecimal amount, String frequency) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;

        switch (frequency.toUpperCase()) {
            case "WEEKLY":
                return amount.multiply(new BigDecimal("4.33")).setScale(2, RoundingMode.HALF_UP);
            case "BIWEEKLY":
                return amount.multiply(new BigDecimal("2.17")).setScale(2, RoundingMode.HALF_UP);
            case "SEMI_MONTHLY":
                return amount.multiply(new BigDecimal("2")).setScale(2, RoundingMode.HALF_UP);
            case "MONTHLY":
                return amount;
            default:
                return amount;
        }
    }

    /**
     * Get a display-friendly frequency label.
     */
    private String getFrequencyLabel(String frequency) {
        switch (frequency.toUpperCase()) {
            case "WEEKLY": return "week";
            case "BIWEEKLY": return "paycheck";
            case "SEMI_MONTHLY": return "paycheck";
            case "MONTHLY": return "month";
            default: return "month";
        }
    }
}
