package com.investingapp.backend.service;

import com.investingapp.backend.model.User;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Plain JUnit 5 (no Spring context) — unified freedom-target resolution and
 * freedom-year math.
 *
 * PARITY: the parityFixtureFreedomYear values are mirrored in
 * frontend/src/app/services/freedom-stats.service.spec.ts ("cross-stack parity
 * fixture"). If you change one, change both.
 */
class MonthlyFreedomUpdateServiceTest {

    private final MonthlyFreedomUpdateService service = new MonthlyFreedomUpdateService();

    @Test
    void targetIsLiveIncomeBasedAndIgnoresStoredTargetPortfolio() {
        User user = new User();
        user.setRetirementIncome(60000.0);
        user.setTargetPortfolio(150000.0); // stale signup snapshot — must be ignored
        assertEquals(1_500_000.0, service.resolveTargetPortfolio(user), 0.001);
    }

    @Test
    void targetDefaultsWhenIncomeAbsent() {
        User user = new User();
        user.setTargetPortfolio(150000.0);
        assertEquals(1_500_000.0, service.resolveTargetPortfolio(user), 0.001);
    }

    @Test
    void targetDefaultsWhenIncomeZero() {
        User user = new User();
        user.setRetirementIncome(0.0);
        assertEquals(1_500_000.0, service.resolveTargetPortfolio(user), 0.001);
    }

    @Test
    void parityFixtureFreedomYear() {
        // equity $10,000 · $500/month · target $1,500,000
        // → months-to-target ≈ 374.02 → ceil(374.02 / 12) = 32 years
        int year = service.calculateFreedomYear(
                new BigDecimal("10000"), new BigDecimal("500"), new BigDecimal("1500000"));
        assertEquals(LocalDate.now().getYear() + 32, year);
    }

    @Test
    void targetDefaultsWhenIncomeNegative() {
        User user = new User();
        user.setRetirementIncome(-5000.0);
        assertEquals(1_500_000.0, service.resolveTargetPortfolio(user), 0.001);
    }

    @Test
    void contributionPrefersScheduleOverSurvey() {
        User user = new User();
        user.setMonthlyInvestment(999.0); // survey value must NOT win
        BigDecimal result = service.resolveMonthlyContribution(new BigDecimal("433.00"), user);
        assertEquals(0, new BigDecimal("433.00").compareTo(result));
    }

    @Test
    void contributionFallsBackToSurveyWhenNoSchedule() {
        User user = new User();
        user.setMonthlyInvestment(500.0);
        BigDecimal result = service.resolveMonthlyContribution(BigDecimal.ZERO, user);
        assertEquals(0, new BigDecimal("500").compareTo(result));
    }

    @Test
    void contributionZeroWhenNoScheduleAndNoSurvey() {
        User user = new User();
        assertEquals(0, BigDecimal.ZERO.compareTo(service.resolveMonthlyContribution(BigDecimal.ZERO, user)));
        User userNull = new User();
        userNull.setMonthlyInvestment(null);
        assertEquals(0, BigDecimal.ZERO.compareTo(service.resolveMonthlyContribution(null, userNull)));
    }

    @Test
    void monthlyEquivalentFactorsMatchFrontendUtil() {
        // PARITY: mirrored in frontend/src/app/utils/investment-frequency.utils.spec.ts.
        // If you change one, change both. (WEEKLY x4.33, BIWEEKLY x2.17, SEMI_MONTHLY x2)
        assertEquals(new BigDecimal("433.00"), service.calculateMonthlyEquivalent(new BigDecimal("100"), "WEEKLY"));
        assertEquals(new BigDecimal("217.00"), service.calculateMonthlyEquivalent(new BigDecimal("100"), "BIWEEKLY"));
        assertEquals(new BigDecimal("499.99"), service.calculateMonthlyEquivalent(new BigDecimal("115.47"), "WEEKLY"));
        assertEquals(new BigDecimal("500.00"), service.calculateMonthlyEquivalent(new BigDecimal("250"), "SEMI_MONTHLY"));
        assertEquals(new BigDecimal("500.00"), service.calculateMonthlyEquivalent(new BigDecimal("250"), "SEMIMONTHLY"));
        assertEquals(0, new BigDecimal("500").compareTo(service.calculateMonthlyEquivalent(new BigDecimal("500"), "MONTHLY")));
    }
}
