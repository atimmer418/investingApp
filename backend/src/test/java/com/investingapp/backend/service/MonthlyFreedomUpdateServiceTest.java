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
}
