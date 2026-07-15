package com.investingapp.backend.service;

import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.InvestmentExecutionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class MarketBreakdownEmailComposerTest {

    private PortfolioDashboardService dashboard;
    private InvestmentExecutionRepository executions;
    private MarketBreakdownEmailComposer composer;

    private static final YearMonth JUNE = YearMonth.of(2026, 6);

    @BeforeEach
    void setUp() {
        dashboard = mock(PortfolioDashboardService.class);
        executions = mock(InvestmentExecutionRepository.class);
        composer = new MarketBreakdownEmailComposer(dashboard, executions);
    }

    private static User activeUser() {
        User user = new User();
        user.setId(7L);
        user.setEmail("andy@fredvested.com");
        user.setAccountStatus("ACTIVE");
        user.setAlpacaAccountId("ENC:abc");
        return user;
    }

    private static MarketBreakdown juneBreakdown() {
        MarketBreakdown b = new MarketBreakdown();
        b.setPeriodKey("2026-06");
        b.setPeriodLabel("June 2026");
        b.setStatus(MarketBreakdown.STATUS_GENERATED);
        b.setNarrativeHtml("<h3>What happened in June 2026</h3><p>Markets rose.</p>");
        return b;
    }

    private void historyReturns(List<String> dates, List<BigDecimal> values) {
        when(dashboard.getPortfolioHistoryForPeriod(any(User.class), eq("3M")))
                .thenReturn(new PortfolioDashboardService.PortfolioHistory(dates, values));
    }

    // ── resolveNumbers ───────────────────────────────────────────────────────

    @Test
    void nonActiveUserGetsNullNumbers() {
        User user = activeUser();
        user.setAccountStatus("SUBMITTED");
        assertNull(composer.resolveNumbers(user, JUNE));

        User noAlpaca = activeUser();
        noAlpaca.setAlpacaAccountId(null);
        assertNull(composer.resolveNumbers(noAlpaca, JUNE));

        verify(dashboard, never()).getPortfolioHistoryForPeriod(any(), any());
    }

    @Test
    void fundedUserGetsStartEndAndContributions() {
        historyReturns(
                List.of("2026-05-29", "2026-06-15", "2026-06-30"),
                List.of(new BigDecimal("5000.00"), new BigDecimal("5400.00"), new BigDecimal("5930.10")));
        when(executions.sumCompletedAmountsByUserAndDateRange(eq(7L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(new BigDecimal("400.00"));

        MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                composer.resolveNumbers(activeUser(), JUNE);

        assertNotNull(numbers);
        assertEquals(new BigDecimal("5000.00"), numbers.startEquity); // last point <= Jun 1
        assertEquals(new BigDecimal("5930.10"), numbers.endEquity);   // last point <= Jun 30
        assertEquals(new BigDecimal("400.00"), numbers.contributions);
    }

    @Test
    void userFundedMidMonthHasZeroStartEquity() {
        historyReturns(
                List.of("2026-06-15", "2026-06-30"),
                List.of(new BigDecimal("500.00"), new BigDecimal("510.00")));
        when(executions.sumCompletedAmountsByUserAndDateRange(anyLong(), any(), any()))
                .thenReturn(new BigDecimal("500.00"));

        MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                composer.resolveNumbers(activeUser(), JUNE);

        assertNotNull(numbers);
        assertEquals(BigDecimal.ZERO, numbers.startEquity);
        assertEquals(new BigDecimal("510.00"), numbers.endEquity);
    }

    @Test
    void noHistoryPointsMeansMarketOnlyVariant() {
        historyReturns(List.of(), List.of());
        assertNull(composer.resolveNumbers(activeUser(), JUNE));
    }

    @Test
    void historyFetchFailurePropagates() {
        when(dashboard.getPortfolioHistoryForPeriod(any(User.class), eq("3M")))
                .thenThrow(new RuntimeException("alpaca down"));
        assertThrows(RuntimeException.class, () -> composer.resolveNumbers(activeUser(), JUNE));
    }

    // ── compose ──────────────────────────────────────────────────────────────

    @Test
    void composeFullVariantMergesRealNumbers() {
        MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                new MarketBreakdownEmailComposer.UserMonthlyNumbers(
                        new BigDecimal("5000.00"), new BigDecimal("5930.10"), new BigDecimal("400.00"));

        MarketBreakdownEmailComposer.ComposedEmail email = composer.compose(juneBreakdown(), numbers);

        assertEquals("FRED's Monthly Market Breakdown - June 2026", email.subject);
        assertTrue(email.htmlBody.contains("<p>Markets rose.</p>"));
        assertTrue(email.htmlBody.contains("$5,930.10"));
        assertTrue(email.htmlBody.contains("$400.00"));
        // delta = 930.10 (+18.6%); market-driven = (930.10-400)/5000 = +10.6%
        assertTrue(email.htmlBody.contains("+$930.10 (+18.6%)"));
        assertTrue(email.htmlBody.contains("+10.6%"));
        assertTrue(email.htmlBody.contains("#16A34A"), "positive change renders green");
        assertFalse(email.htmlBody.contains("{{"));
        assertTrue(email.textBody.contains("Markets rose."));
        assertTrue(email.textBody.contains("5,930.10"));
    }

    @Test
    void composeNegativeMonthRendersRedAndMinus() {
        MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                new MarketBreakdownEmailComposer.UserMonthlyNumbers(
                        new BigDecimal("5000.00"), new BigDecimal("4800.00"), new BigDecimal("100.00"));

        MarketBreakdownEmailComposer.ComposedEmail email = composer.compose(juneBreakdown(), numbers);

        // delta = -200.00 (-4.0%); market-driven = (-200-100)/5000 = -6.0%
        assertTrue(email.htmlBody.contains("-$200.00 (-4.0%)"));
        assertTrue(email.htmlBody.contains("-6.0%"));
        assertTrue(email.htmlBody.contains("#DC2626"), "negative change renders red");
    }

    @Test
    void composeMidMonthFundedOmitsChangeRows() {
        MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                new MarketBreakdownEmailComposer.UserMonthlyNumbers(
                        BigDecimal.ZERO, new BigDecimal("510.00"), new BigDecimal("500.00"));

        MarketBreakdownEmailComposer.ComposedEmail email = composer.compose(juneBreakdown(), numbers);

        assertTrue(email.htmlBody.contains("$510.00"));
        assertFalse(email.htmlBody.contains("Market-driven"), "no % rows without a month-start value");
        assertFalse(email.htmlBody.contains("{{"));
    }

    @Test
    void composeMarketOnlyVariantUsesEmptyPartial() {
        MarketBreakdownEmailComposer.ComposedEmail email = composer.compose(juneBreakdown(), null);

        assertTrue(email.htmlBody.toLowerCase().contains("once your account is funded"));
        assertFalse(email.htmlBody.contains("Market-driven"));
        assertFalse(email.htmlBody.contains("{{"));
        assertEquals("FRED's Monthly Market Breakdown - June 2026", email.subject);
    }
}
