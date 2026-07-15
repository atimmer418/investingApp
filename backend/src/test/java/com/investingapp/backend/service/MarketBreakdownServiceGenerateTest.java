package com.investingapp.backend.service;

import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.repository.MarketBreakdownRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class MarketBreakdownServiceGenerateTest {

    private MarketBreakdownRepository repo;
    private LLMService llm;
    private MarketBreakdownService service; // spy — fetchMonthlyReturns stubbed

    private static final YearMonth JUNE = YearMonth.of(2026, 6);

    @BeforeEach
    void setUp() {
        repo = mock(MarketBreakdownRepository.class);
        llm = mock(LLMService.class);
        service = spy(new MarketBreakdownService(repo, llm));
        when(repo.findByPeriodKey(anyString())).thenReturn(Optional.empty());
        when(repo.save(any(MarketBreakdown.class))).thenAnswer(inv -> inv.getArgument(0));
        doReturn(List.of(new MarketBreakdownService.SymbolMonthlyReturn(
                "VTI", new BigDecimal("250.10"), new BigDecimal("255.40"), new BigDecimal("2.12"))))
                .when(service).fetchMonthlyReturns(JUNE);
    }

    /** Valid narrative: long enough, allowed tags only, no advice. */
    private static String validNarrative() {
        StringBuilder sb = new StringBuilder("<h3>What happened in June 2026</h3>");
        for (int i = 0; i < 6; i++) {
            sb.append("<p>Stocks drifted higher as inflation cooled and the Federal Reserve held ")
              .append("rates steady, lifting <strong>VTI</strong> by month end.</p>");
        }
        return sb.toString();
    }

    private void llmReturns(String text) {
        when(llm.generateGroundedMarketSummary(anyString(), anyString()))
                .thenReturn(new LLMService.GroundedSummary(text, "claude-sonnet-5",
                        List.of(new LLMService.GroundedSummary.Source("https://x.com/a", "Article"))));
    }

    @Test
    void happyPathPersistsGeneratedRowWithAuditJson() {
        llmReturns(validNarrative());

        MarketBreakdown out = service.getOrGenerate(JUNE);

        assertEquals(MarketBreakdown.STATUS_GENERATED, out.getStatus());
        assertEquals("2026-06", out.getPeriodKey());
        assertEquals("June 2026", out.getPeriodLabel());
        assertTrue(out.getNarrativeHtml().contains("VTI"));
        assertTrue(out.getEtfReturnsJson().contains("VTI"));
        assertTrue(out.getEtfReturnsJson().contains("2.12"));
        assertTrue(out.getSourcesJson().contains("https://x.com/a"));
        assertEquals("claude-sonnet-5", out.getModel());
        verify(repo).save(out);
    }

    @Test
    void existingGeneratedRowShortCircuits() {
        MarketBreakdown existing = new MarketBreakdown();
        existing.setPeriodKey("2026-06");
        existing.setStatus(MarketBreakdown.STATUS_GENERATED);
        when(repo.findByPeriodKey("2026-06")).thenReturn(Optional.of(existing));

        MarketBreakdown out = service.getOrGenerate(JUNE);

        assertSame(existing, out);
        verify(llm, never()).generateGroundedMarketSummary(anyString(), anyString());
        verify(repo, never()).save(any());
    }

    @Test
    void complianceRejectionPersistsFailedAndThrows() {
        llmReturns(validNarrative() + "<p>You should buy more before prices rise.</p>");

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> service.getOrGenerate(JUNE));

        assertTrue(ex.getMessage().contains("compliance"));
        ArgumentCaptor<MarketBreakdown> cap = ArgumentCaptor.forClass(MarketBreakdown.class);
        verify(repo).save(cap.capture());
        assertEquals(MarketBreakdown.STATUS_FAILED, cap.getValue().getStatus());
        assertTrue(cap.getValue().getErrorMessage().contains("you should"));
        assertNull(cap.getValue().getNarrativeHtml(), "rejected narrative must not be stored as sendable");
    }

    @Test
    void failedRowIsRegeneratedInPlace() {
        MarketBreakdown failed = new MarketBreakdown();
        failed.setPeriodKey("2026-06");
        failed.setStatus(MarketBreakdown.STATUS_FAILED);
        failed.setErrorMessage("old");
        when(repo.findByPeriodKey("2026-06")).thenReturn(Optional.of(failed));
        llmReturns(validNarrative());

        MarketBreakdown out = service.getOrGenerate(JUNE);

        assertSame(failed, out, "must update the existing row — periodKey is unique");
        assertEquals(MarketBreakdown.STATUS_GENERATED, out.getStatus());
        assertNull(out.getErrorMessage());
    }

    @Test
    void incompleteMonthIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> service.getOrGenerate(YearMonth.now()));
        assertThrows(IllegalArgumentException.class, () -> service.getOrGenerate(YearMonth.now().plusMonths(1)));
        verify(repo, never()).save(any());
    }

    @Test
    void ungroundedNarrativePersistsFailedAndThrows() {
        when(llm.generateGroundedMarketSummary(anyString(), anyString()))
                .thenReturn(new LLMService.GroundedSummary(validNarrative(), "claude-sonnet-5", List.of()));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> service.getOrGenerate(JUNE));

        assertTrue(ex.getMessage().contains("grounded"));
        ArgumentCaptor<MarketBreakdown> cap = ArgumentCaptor.forClass(MarketBreakdown.class);
        verify(repo).save(cap.capture());
        assertEquals(MarketBreakdown.STATUS_FAILED, cap.getValue().getStatus());
        assertNull(cap.getValue().getNarrativeHtml());
    }
}
