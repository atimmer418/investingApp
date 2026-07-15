package com.investingapp.backend.service;

import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.InvestmentExecutionRepository;
import com.investingapp.backend.util.EmailTemplateRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Assembles one user's Monthly Market Breakdown email: the month's shared
 * narrative + that user's real numbers merged into fixed template slots.
 * Numbers are always deterministic (never LLM-generated) so they cannot be
 * hallucinated.
 */
@Service
public class MarketBreakdownEmailComposer {

    private static final Logger logger = LoggerFactory.getLogger(MarketBreakdownEmailComposer.class);

    private static final String GREEN = "#16A34A";
    private static final String RED = "#DC2626";
    private static final String NEUTRAL = "#6B7280";

    private final PortfolioDashboardService portfolioDashboardService;
    private final InvestmentExecutionRepository investmentExecutionRepository;

    @Autowired
    public MarketBreakdownEmailComposer(PortfolioDashboardService portfolioDashboardService,
            InvestmentExecutionRepository investmentExecutionRepository) {
        this.portfolioDashboardService = portfolioDashboardService;
        this.investmentExecutionRepository = investmentExecutionRepository;
    }

    /**
     * Resolve the user's real numbers for the month. Returns null when the user
     * should get the market-only variant (never funded / no history yet).
     * THROWS when a funded user's history cannot be fetched — a funded user must
     * never receive an email with wrong or missing numbers; the scheduler records
     * FAILED and the catch-up run retries.
     */
    public UserMonthlyNumbers resolveNumbers(User user, YearMonth month) {
        if (!"ACTIVE".equals(user.getAccountStatus()) || user.getAlpacaAccountId() == null) {
            return null;
        }
        PortfolioDashboardService.PortfolioHistory history =
                portfolioDashboardService.getPortfolioHistoryForPeriod(user, "3M");

        LocalDate monthStart = month.atDay(1);
        LocalDate monthEnd = month.atEndOfMonth();
        BigDecimal startEquity = PerformancePeriodCalculator
                .findStartValue(history.timestamps, history.values, monthStart)
                .orElse(BigDecimal.ZERO);
        BigDecimal endEquity = PerformancePeriodCalculator
                .findStartValue(history.timestamps, history.values, monthEnd)
                .orElse(BigDecimal.ZERO);

        if (endEquity.compareTo(BigDecimal.ZERO) == 0) {
            // Account is ACTIVE but no equity history in the window — treat as not
            // yet invested rather than erroring
            logger.info("User {} is ACTIVE but has no {} history — market-only variant",
                    user.getId(), month);
            return null;
        }

        BigDecimal contributions = investmentExecutionRepository.sumCompletedAmountsByUserAndDateRange(
                user.getId(), monthStart.atStartOfDay(), monthEnd.atTime(23, 59, 59));
        if (contributions == null) {
            contributions = BigDecimal.ZERO;
        }
        return new UserMonthlyNumbers(startEquity, endEquity, contributions);
    }

    /** Build the final email for one user. numbers == null → market-only variant. */
    public ComposedEmail compose(MarketBreakdown breakdown, UserMonthlyNumbers numbers) {
        String periodLabel = breakdown.getPeriodLabel();
        String subject = "FRED's Monthly Market Breakdown - " + periodLabel;

        String portfolioSection;
        String numbersText = "";
        if (numbers == null) {
            portfolioSection = EmailTemplateRenderer.render("market-breakdown-empty.html", Map.of());
        } else {
            NumberFormat money = NumberFormat.getCurrencyInstance(Locale.US);
            String changeRows = "";
            if (numbers.startEquity.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal delta = numbers.endEquity.subtract(numbers.startEquity);
                BigDecimal deltaPct = pct(delta, numbers.startEquity);
                BigDecimal marketDriven = pct(delta.subtract(numbers.contributions), numbers.startEquity);
                changeRows = EmailTemplateRenderer.render("market-breakdown-change-rows.html", Map.of(
                        "changeLabel", "Change in " + periodLabel,
                        "changeValue", signedMoney(delta, money) + " (" + signedPct(deltaPct) + ")",
                        "changeColor", colorFor(delta),
                        "marketReturnPct", signedPct(marketDriven),
                        "marketReturnColor", colorFor(marketDriven)));
            }
            Map<String, String> slots = new HashMap<>();
            slots.put("periodLabel", periodLabel);
            slots.put("endValue", money.format(numbers.endEquity));
            slots.put("contributions", money.format(numbers.contributions));
            slots.put("changeRows", changeRows);
            portfolioSection = EmailTemplateRenderer.render("market-breakdown-numbers.html", slots);
            numbersText = String.format(Locale.US,
                    "%nYour portfolio in %s: ended at %s, you contributed %s.%n",
                    periodLabel, money.format(numbers.endEquity), money.format(numbers.contributions));
        }

        String html = EmailTemplateRenderer.render("market-breakdown.html", Map.of(
                "periodLabel", periodLabel,
                "narrativeHtml", breakdown.getNarrativeHtml(),
                "portfolioSection", portfolioSection,
                "unsubscribeUrl", "#")); // real provider substitutes its unsubscribe link

        String text = subject + "\n\n"
                + EmailTemplateRenderer.stripHtml(breakdown.getNarrativeHtml())
                + numbersText
                + "\nThis update is informational only and is not investment advice. "
                + "Past performance does not guarantee future results.\n"
                + "Questions? help@fredvested.com";

        return new ComposedEmail(subject, html, text);
    }

    /** Sign → display color: green for gains, red for losses, neutral gray for flat. */
    private static String colorFor(BigDecimal value) {
        int sign = value.compareTo(BigDecimal.ZERO);
        return sign > 0 ? GREEN : sign < 0 ? RED : NEUTRAL;
    }

    private static BigDecimal pct(BigDecimal part, BigDecimal whole) {
        return part.divide(whole, 6, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"))
                .setScale(1, RoundingMode.HALF_UP);
    }

    private static String signedMoney(BigDecimal value, NumberFormat money) {
        return value.compareTo(BigDecimal.ZERO) < 0
                ? "-" + money.format(value.abs())
                : "+" + money.format(value);
    }

    private static String signedPct(BigDecimal value) {
        return (value.compareTo(BigDecimal.ZERO) < 0 ? "" : "+") + value.toPlainString() + "%";
    }

    /** The user's deterministic month numbers. */
    public static class UserMonthlyNumbers {
        public final BigDecimal startEquity;   // ZERO when funded mid-month
        public final BigDecimal endEquity;
        public final BigDecimal contributions;

        public UserMonthlyNumbers(BigDecimal startEquity, BigDecimal endEquity,
                BigDecimal contributions) {
            this.startEquity = startEquity;
            this.endEquity = endEquity;
            this.contributions = contributions;
        }
    }

    /** Fully assembled email, ready for EmailService. */
    public static class ComposedEmail {
        public final String subject;
        public final String htmlBody;
        public final String textBody;

        public ComposedEmail(String subject, String htmlBody, String textBody) {
            this.subject = subject;
            this.htmlBody = htmlBody;
            this.textBody = textBody;
        }
    }
}
