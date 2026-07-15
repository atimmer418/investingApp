package com.investingapp.backend.scheduler;

import com.investingapp.backend.dto.EmailMessage;
import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.service.EmailService;
import com.investingapp.backend.service.MarketBreakdownEmailComposer;
import com.investingapp.backend.service.MarketBreakdownService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MarketBreakdownSchedulerTest {

    private UserRepository userRepository;
    private MarketBreakdownService breakdownService;
    private MarketBreakdownEmailComposer composer;
    private EmailService emailService;
    private MarketBreakdownScheduler scheduler;

    private static final YearMonth JUNE = YearMonth.of(2026, 6);

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        breakdownService = mock(MarketBreakdownService.class);
        composer = mock(MarketBreakdownEmailComposer.class);
        emailService = mock(EmailService.class);
        scheduler = new MarketBreakdownScheduler(userRepository, breakdownService, composer, emailService);

        MarketBreakdown breakdown = new MarketBreakdown();
        breakdown.setPeriodKey("2026-06");
        breakdown.setPeriodLabel("June 2026");
        breakdown.setStatus(MarketBreakdown.STATUS_GENERATED);
        breakdown.setNarrativeHtml("<p>ok</p>");
        when(breakdownService.getOrGenerate(JUNE)).thenReturn(breakdown);

        when(composer.compose(any(), any())).thenReturn(
                new MarketBreakdownEmailComposer.ComposedEmail("Subject", "<html></html>", "text"));
        when(emailService.hasBeenSent(anyString(), anyLong(), anyString())).thenReturn(false);
    }

    private static User user(long id, String email, String tier) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setSelectedTier(tier);
        return u;
    }

    @Test
    void queriesPlusAndProTiersOnly() {
        when(userRepository.findBySelectedTierIn(anyCollection())).thenReturn(List.of());

        scheduler.runForMonth(JUNE);

        verify(userRepository).findBySelectedTierIn(List.of("plus", "pro"));
    }

    @Test
    void sendsToEligibleUserWithTypeAndPeriod() {
        when(userRepository.findBySelectedTierIn(anyCollection()))
                .thenReturn(List.of(user(7L, "andy@fredvested.com", "plus")));
        when(composer.resolveNumbers(any(), eq(JUNE))).thenReturn(null);

        scheduler.runForMonth(JUNE);

        ArgumentCaptor<EmailMessage> msg = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailService).sendEmail(msg.capture(), eq(7L),
                eq(MarketBreakdownScheduler.EMAIL_TYPE), eq("2026-06"));
        assertEquals("andy@fredvested.com", msg.getValue().getTo());
        assertEquals("Subject", msg.getValue().getSubject());
        assertEquals("<html></html>", msg.getValue().getHtmlBody());
        assertEquals("text", msg.getValue().getTextBody());
    }

    @Test
    void alreadySentUserIsSkipped() {
        when(userRepository.findBySelectedTierIn(anyCollection()))
                .thenReturn(List.of(user(7L, "andy@fredvested.com", "pro")));
        when(emailService.hasBeenSent(MarketBreakdownScheduler.EMAIL_TYPE, 7L, "2026-06"))
                .thenReturn(true);

        scheduler.runForMonth(JUNE);

        verify(composer, never()).resolveNumbers(any(), any());
        verify(emailService, never()).sendEmail(any(), anyLong(), anyString(), anyString());
    }

    @Test
    void oneUserFailureIsIsolatedAndRecorded() {
        User failing = user(1L, "fail@fredvested.com", "plus");
        User healthy = user(2L, "ok@fredvested.com", "pro");
        when(userRepository.findBySelectedTierIn(anyCollection())).thenReturn(List.of(failing, healthy));
        when(composer.resolveNumbers(eq(failing), eq(JUNE)))
                .thenThrow(new RuntimeException("alpaca down"));
        when(composer.resolveNumbers(eq(healthy), eq(JUNE)))
                .thenReturn(new MarketBreakdownEmailComposer.UserMonthlyNumbers(
                        new BigDecimal("100"), new BigDecimal("110"), BigDecimal.ZERO));

        scheduler.runForMonth(JUNE);

        verify(emailService).recordFailedAttempt(eq(1L), eq("fail@fredvested.com"),
                eq(MarketBreakdownScheduler.EMAIL_TYPE), eq("2026-06"), contains("alpaca down"));
        verify(emailService).sendEmail(any(EmailMessage.class), eq(2L),
                eq(MarketBreakdownScheduler.EMAIL_TYPE), eq("2026-06"));
    }

    @Test
    void generationFailureAbortsWithoutTouchingUsers() {
        // any(YearMonth.class): runMonthlyBreakdownJob derives "prior month" from
        // the real clock — pinning JUNE would make this test time-dependent
        when(breakdownService.getOrGenerate(any(YearMonth.class)))
                .thenThrow(new IllegalStateException("llm down"));

        assertDoesNotThrow(() -> scheduler.runMonthlyBreakdownJob());

        verify(userRepository, never()).findBySelectedTierIn(anyCollection());
    }

    @Test
    void blankEmailUserIsSkippedNotFailed() {
        User noEmail = user(3L, "  ", "plus");
        when(userRepository.findBySelectedTierIn(anyCollection())).thenReturn(List.of(noEmail));

        scheduler.runForMonth(JUNE);

        verify(emailService, never()).sendEmail(any(), anyLong(), anyString(), anyString());
        verify(emailService, never()).recordFailedAttempt(anyLong(), anyString(), anyString(), anyString(), anyString());
    }
}
