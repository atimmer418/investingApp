package com.investingapp.backend.service;

import com.investingapp.backend.dto.EmailMessage;
import com.investingapp.backend.model.EmailLog;
import com.investingapp.backend.repository.EmailLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EmailServiceTest {

    private EmailLogRepository repo;
    private EmailSender sender;

    @BeforeEach
    void setUp() {
        repo = mock(EmailLogRepository.class);
        sender = mock(EmailSender.class);
        when(repo.findByEmailTypeAndUserIdAndPeriodKey(any(), any(), any())).thenReturn(Optional.empty());
    }

    private EmailService service(boolean enabled) {
        return new EmailService(repo, sender, enabled, "noreply@fredvested.com");
    }

    private static EmailMessage msg() {
        return new EmailMessage("andy@fredvested.com", null, "Subject", "<p>hi</p>", "hi");
    }

    @Test
    void disabledRecordsMockedAndNeverDispatches() {
        service(false).sendEmail(msg(), 7L, "MARKET_BREAKDOWN", "2026-06");

        verify(sender, never()).send(any());
        ArgumentCaptor<EmailLog> cap = ArgumentCaptor.forClass(EmailLog.class);
        verify(repo).save(cap.capture());
        assertEquals(EmailLog.STATUS_MOCKED, cap.getValue().getStatus());
        assertEquals("MARKET_BREAKDOWN", cap.getValue().getEmailType());
        assertEquals("2026-06", cap.getValue().getPeriodKey());
        assertEquals(7L, cap.getValue().getUserId());
    }

    @Test
    void enabledDispatchesAndRecordsSentWithFromFilled() {
        EmailMessage m = msg();
        service(true).sendEmail(m, 7L, "MARKET_BREAKDOWN", "2026-06");

        verify(sender).send(m);
        assertEquals("noreply@fredvested.com", m.getFrom());
        ArgumentCaptor<EmailLog> cap = ArgumentCaptor.forClass(EmailLog.class);
        verify(repo).save(cap.capture());
        assertEquals(EmailLog.STATUS_SENT, cap.getValue().getStatus());
    }

    @Test
    void senderFailureRecordsFailedAndDoesNotThrow() {
        doThrow(new RuntimeException("smtp boom")).when(sender).send(any());

        assertDoesNotThrow(() -> service(true).sendEmail(msg(), 7L, "MARKET_BREAKDOWN", "2026-06"));

        ArgumentCaptor<EmailLog> cap = ArgumentCaptor.forClass(EmailLog.class);
        verify(repo).save(cap.capture());
        assertEquals(EmailLog.STATUS_FAILED, cap.getValue().getStatus());
        assertTrue(cap.getValue().getErrorMessage().contains("smtp boom"));
    }

    @Test
    void retryAfterFailureUpdatesExistingRowInsteadOfInserting() {
        EmailLog failed = new EmailLog(7L, "andy@fredvested.com", "Subject",
                "MARKET_BREAKDOWN", "2026-06", EmailLog.STATUS_FAILED, "old error");
        when(repo.findByEmailTypeAndUserIdAndPeriodKey("MARKET_BREAKDOWN", 7L, "2026-06"))
                .thenReturn(Optional.of(failed));

        service(false).sendEmail(msg(), 7L, "MARKET_BREAKDOWN", "2026-06");

        // Same entity instance updated — no second row for the unique index to reject
        verify(repo).save(failed);
        assertEquals(EmailLog.STATUS_MOCKED, failed.getStatus());
        assertNull(failed.getErrorMessage());
    }

    @Test
    void legacySignatureRecordsLegacyTypeWithNullUser() {
        service(false).sendEmail("andy@fredvested.com", "Hello", "Body text");

        verify(sender, never()).send(any());
        ArgumentCaptor<EmailLog> cap = ArgumentCaptor.forClass(EmailLog.class);
        verify(repo).save(cap.capture());
        assertEquals(EmailService.TYPE_LEGACY, cap.getValue().getEmailType());
        assertNull(cap.getValue().getUserId());
        assertNull(cap.getValue().getPeriodKey());
        assertEquals(EmailLog.STATUS_MOCKED, cap.getValue().getStatus());
    }

    @Test
    void hasBeenSentTrueOnlyForSentOrMocked() {
        EmailService svc = service(false);

        when(repo.findByEmailTypeAndUserIdAndPeriodKey("T", 1L, "2026-06"))
                .thenReturn(Optional.of(new EmailLog(1L, "a@b.c", "s", "T", "2026-06", EmailLog.STATUS_SENT, null)));
        assertTrue(svc.hasBeenSent("T", 1L, "2026-06"));

        when(repo.findByEmailTypeAndUserIdAndPeriodKey("T", 1L, "2026-06"))
                .thenReturn(Optional.of(new EmailLog(1L, "a@b.c", "s", "T", "2026-06", EmailLog.STATUS_MOCKED, null)));
        assertTrue(svc.hasBeenSent("T", 1L, "2026-06"));

        when(repo.findByEmailTypeAndUserIdAndPeriodKey("T", 1L, "2026-06"))
                .thenReturn(Optional.of(new EmailLog(1L, "a@b.c", "s", "T", "2026-06", EmailLog.STATUS_FAILED, "x")));
        assertFalse(svc.hasBeenSent("T", 1L, "2026-06"));

        when(repo.findByEmailTypeAndUserIdAndPeriodKey("T", 1L, "2026-06")).thenReturn(Optional.empty());
        assertFalse(svc.hasBeenSent("T", 1L, "2026-06"));
    }

    @Test
    void recordFailedAttemptWritesFailedRow() {
        service(false).recordFailedAttempt(7L, "andy@fredvested.com", "MARKET_BREAKDOWN", "2026-06", "numbers unresolved");

        ArgumentCaptor<EmailLog> cap = ArgumentCaptor.forClass(EmailLog.class);
        verify(repo).save(cap.capture());
        assertEquals(EmailLog.STATUS_FAILED, cap.getValue().getStatus());
        assertEquals("numbers unresolved", cap.getValue().getErrorMessage());
        verify(sender, never()).send(any());
    }
}
