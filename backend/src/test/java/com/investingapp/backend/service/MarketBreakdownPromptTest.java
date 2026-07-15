package com.investingapp.backend.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MarketBreakdownPromptTest {

    private static MarketBreakdownService.SymbolMonthlyReturn ret(String symbol, String pct) {
        return new MarketBreakdownService.SymbolMonthlyReturn(
                symbol, new BigDecimal("100.00"), new BigDecimal("102.00"), new BigDecimal(pct));
    }

    @Test
    void systemPromptContainsComplianceRules() {
        String system = MarketBreakdownService.buildSystemPrompt();
        String lower = system.toLowerCase();
        assertTrue(lower.contains("never recommend"));
        assertTrue(lower.contains("never predict"));
        assertTrue(lower.contains("only the"), "must pin numbers to provided data");
        assertTrue(lower.contains("<p>"), "must constrain output tags");
    }

    @Test
    void userPromptContainsMonthNumbersAndWeights() {
        String prompt = MarketBreakdownService.buildUserPrompt(YearMonth.of(2026, 6),
                List.of(ret("VTI", "2.12"), ret("VXUS", "-0.80"), ret("VBR", "1.05"), ret("SPY", "1.90")));

        assertTrue(prompt.contains("June 2026"));
        assertTrue(prompt.contains("VTI"));
        assertTrue(prompt.contains("2.12"));
        assertTrue(prompt.contains("-0.80"));
        assertTrue(prompt.contains("75%"));
        assertTrue(prompt.contains("context only"), "SPY must be marked as not in the portfolio");
        assertTrue(prompt.toLowerCase().contains("search the web"));
    }
}
