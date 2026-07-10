package com.investingapp.backend.service;

import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.InvestmentExecutionRepository;
import com.investingapp.backend.repository.InvestmentScheduleRepository;
import com.investingapp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Exactly-once / month-stamp guard for MonthlyFreedomUpdateService.commitMfuSeen(). The full
 * server-authoritative recompute path (phase 1) is exercised by integration tests; here we pin the
 * correctness of the advances-only guard and the min(now, hint) month stamp via the degraded
 * (recompute-fails) branch, so no Alpaca fixtures are needed.
 *
 * commitMfuSeen delegates the locked write to self.applySeenCommit as a separate transaction; in this
 * plain unit test we route the self-proxy back to the same instance so the real phase-2 logic runs.
 */
@ExtendWith(MockitoExtension.class)
class MonthlyFreedomUpdateCommitSeenTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private InvestmentExecutionRepository executionRepository;
    @Mock
    private InvestmentScheduleRepository scheduleRepository;
    @Mock
    private PortfolioDashboardService portfolioDashboardService;

    @InjectMocks
    private MonthlyFreedomUpdateService service;

    @BeforeEach
    void wireSelfProxy() {
        // The @Lazy self-proxy is a Spring concern; unit tests route it to the same instance.
        ReflectionTestUtils.setField(service, "self", service);
    }

    private static String currentMonth() {
        return YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
    }

    @Test
    void noOpWhenAlreadySeenThisMonth() {
        User user = new User();
        user.setLastLoggedInMonth(currentMonth()); // already stamped
        user.setMfuCount(5);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        // Recompute is allowed to fail; the phase-2 guard must no-op regardless.
        when(portfolioDashboardService.getPortfolioDashboard(user))
                .thenThrow(new RuntimeException("irrelevant — guard should no-op"));

        service.commitMfuSeen(1L, null);

        verify(userRepository, never()).save(any()); // guard returns before any write
        assertEquals(5, user.getMfuCount());          // mfuCount not advanced
    }

    @Test
    void userNotFoundIsNoOp() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        service.commitMfuSeen(99L, null);

        verify(portfolioDashboardService, never()).getPortfolioDashboard(any()); // returns before phase 1
        verify(userRepository, never()).findByIdForUpdate(any());                 // never reaches phase 2
        verify(userRepository, never()).save(any());
    }

    @Test
    void degradedPathStampsCurrentMonthWhenRecomputeFails() {
        User user = new User();
        user.setLastLoggedInMonth(null); // not yet seen
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(portfolioDashboardService.getPortfolioDashboard(user))
                .thenThrow(new RuntimeException("Alpaca down"));

        service.commitMfuSeen(1L, null);

        // Recompute failed → month is still stamped so the popup does not re-fire.
        assertEquals(currentMonth(), user.getLastLoggedInMonth());
        verify(userRepository).save(user);
    }

    @Test
    void seenMonthHintPullsStampEarlierThanNow() {
        User user = new User();
        user.setLastLoggedInMonth(null);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(portfolioDashboardService.getPortfolioDashboard(user))
                .thenThrow(new RuntimeException("Alpaca down"));

        // A commit that crossed a rollover carries the earlier month it was shown for.
        service.commitMfuSeen(1L, "2020-01");

        assertEquals("2020-01", user.getLastLoggedInMonth());
        verify(userRepository).save(user);
    }

    @Test
    void futureOrBogusHintDoesNotSkipAhead() {
        User user = new User();
        user.setLastLoggedInMonth(null);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(portfolioDashboardService.getPortfolioDashboard(user))
                .thenThrow(new RuntimeException("Alpaca down"));

        // A future/garbage hint must never pull the stamp forward — it falls back to now().
        service.commitMfuSeen(1L, "9999-12");

        assertEquals(currentMonth(), user.getLastLoggedInMonth());
    }
}
