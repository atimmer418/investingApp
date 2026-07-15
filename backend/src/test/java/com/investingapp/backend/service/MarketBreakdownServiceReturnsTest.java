package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.cfg.JsonNodeFeature;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MarketBreakdownServiceReturnsTest {

    // DEVIATION FROM BRIEF (see task-4-report.md): a plain `new ObjectMapper()`
    // parses JSON float literals through double, so "250.10" and "250.1" collapse
    // to the same value and asText() returns the shortest round-trip form
    // ("250.1") — failing exact-scale BigDecimal.equals() below. Both flags are
    // required: USE_BIG_DECIMAL_FOR_FLOATS alone still gets re-stripped by
    // JsonNodeFactory's default STRIP_TRAILING_BIGDECIMAL_ZEROES behavior.
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS, true)
            .configure(JsonNodeFeature.STRIP_TRAILING_BIGDECIMAL_ZEROES, false);

    private static JsonNode bars(String json) throws Exception {
        return MAPPER.readTree(json);
    }

    // Alpaca GET /v2/stocks/bars?timeframe=1Month shape: {"bars": {"SYM": [{t,o,h,l,c,v}, ...]}}
    private static final String TWO_MONTHS = """
            {"bars": {
              "VTI":  [{"t":"2026-05-01T04:00:00Z","c":250.10},{"t":"2026-06-01T04:00:00Z","c":255.40}],
              "SPY":  [{"t":"2026-05-01T04:00:00Z","c":530.00},{"t":"2026-06-01T04:00:00Z","c":524.70}]
            }, "next_page_token": null}
            """;

    @Test
    void computesMonthOverMonthCloseReturn() throws Exception {
        List<MarketBreakdownService.SymbolMonthlyReturn> out =
                MarketBreakdownService.extractMonthlyReturns(
                        bars(TWO_MONTHS), YearMonth.of(2026, 6), List.of("VTI", "SPY"));

        assertEquals(2, out.size());
        MarketBreakdownService.SymbolMonthlyReturn vti = out.get(0);
        assertEquals("VTI", vti.symbol);
        assertEquals(new BigDecimal("250.10"), vti.priorClose);
        assertEquals(new BigDecimal("255.40"), vti.endClose);
        assertEquals(new BigDecimal("2.12"), vti.returnPct); // (255.40-250.10)/250.10*100 = 2.1191 -> 2.12

        MarketBreakdownService.SymbolMonthlyReturn spy = out.get(1);
        assertEquals(new BigDecimal("-1.00"), spy.returnPct); // (524.70-530.00)/530.00*100 = -1.0
    }

    @Test
    void unsortedBarsAreSortedByTimestamp() throws Exception {
        String reversed = """
                {"bars": {"VTI": [
                  {"t":"2026-06-01T04:00:00Z","c":255.40},
                  {"t":"2026-05-01T04:00:00Z","c":250.10}
                ]}}
                """;
        List<MarketBreakdownService.SymbolMonthlyReturn> out =
                MarketBreakdownService.extractMonthlyReturns(
                        bars(reversed), YearMonth.of(2026, 6), List.of("VTI"));
        assertEquals(new BigDecimal("2.12"), out.get(0).returnPct);
    }

    @Test
    void missingSymbolThrows() throws Exception {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                MarketBreakdownService.extractMonthlyReturns(
                        bars(TWO_MONTHS), YearMonth.of(2026, 6), List.of("VTI", "VXUS")));
        assertTrue(ex.getMessage().contains("VXUS"));
    }

    @Test
    void missingPriorMonthBarThrows() throws Exception {
        String oneBar = """
                {"bars": {"VTI": [{"t":"2026-06-01T04:00:00Z","c":255.40}]}}
                """;
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                MarketBreakdownService.extractMonthlyReturns(
                        bars(oneBar), YearMonth.of(2026, 6), List.of("VTI")));
        assertTrue(ex.getMessage().contains("VTI"));
    }
}
