package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.cfg.JsonNodeFeature;
import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.repository.MarketBreakdownRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.*;

/**
 * Generates and stores the once-per-month Market Breakdown narrative.
 * Numbers come from Alpaca Market Data (real monthly closes); the narrative
 * comes from one web-search-grounded Claude call and must pass the
 * deterministic compliance gate before it can be stored as GENERATED.
 */
@Service
public class MarketBreakdownService {

    private static final Logger logger = LoggerFactory.getLogger(MarketBreakdownService.class);

    /** FRED default portfolio (see PortfolioService default allocation). */
    static final List<String> PORTFOLIO_SYMBOLS = List.of("VTI", "VXUS", "VBR");
    static final Map<String, Integer> PORTFOLIO_WEIGHTS = Map.of("VTI", 75, "VXUS", 20, "VBR", 5);
    /** Included for "the market" context in the narrative — not in the portfolio. */
    static final String MARKET_CONTEXT_SYMBOL = "SPY";

    private final MarketBreakdownRepository repository;
    private final LLMService llmService;
    private final RestTemplate restTemplate = new RestTemplate();
    // DEVIATION FROM BRIEF (see task-4-report.md): must match the tree-building
    // config used in extractMonthlyReturns' tests, or a live Alpaca response with
    // a round close (e.g. "530.00") would silently lose its trailing zero the
    // same way — see MarketBreakdownServiceReturnsTest.MAPPER for the full why.
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS, true)
            .configure(JsonNodeFeature.STRIP_TRAILING_BIGDECIMAL_ZEROES, false);

    @Value("${alpaca.market.key:}")
    private String marketDataKey;

    @Value("${alpaca.market.secret:}")
    private String marketDataSecret;

    @Value("${alpaca.market.base-url:https://data.alpaca.markets/v2}")
    private String marketDataBaseUrl;

    @Autowired
    public MarketBreakdownService(MarketBreakdownRepository repository, LLMService llmService) {
        this.repository = repository;
        this.llmService = llmService;
    }

    private static List<String> allSymbols() {
        List<String> symbols = new ArrayList<>(PORTFOLIO_SYMBOLS);
        symbols.add(MARKET_CONTEXT_SYMBOL);
        return symbols;
    }

    /**
     * Fetch monthly bars for the target month and the month before it, and
     * compute close-to-close monthly returns. Protected so orchestration tests
     * can stub the HTTP hop.
     */
    protected List<SymbolMonthlyReturn> fetchMonthlyReturns(YearMonth target) {
        YearMonth prior = target.minusMonths(1);
        String url = String.format(
                "%s/stocks/bars?symbols=%s&timeframe=1Month&start=%s&end=%s&limit=1000",
                marketDataBaseUrl, String.join(",", allSymbols()),
                prior.atDay(1), target.atEndOfMonth());

        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", marketDataKey);
        headers.set("APCA-API-SECRET-KEY", marketDataSecret);
        headers.set("Accept", "application/json");

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                throw new IllegalStateException("Alpaca bars request returned HTTP " + response.getStatusCode());
            }
            return extractMonthlyReturns(objectMapper.readTree(response.getBody()), target, allSymbols());
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to fetch monthly bars: " + e.getMessage(), e);
        }
    }

    /**
     * Pure math: month-over-month close returns from an Alpaca multi-symbol
     * 1Month bars response. Throws IllegalStateException when any requested
     * symbol is missing either month's bar — a partial narrative must never
     * generate from partial numbers.
     */
    static List<SymbolMonthlyReturn> extractMonthlyReturns(JsonNode root, YearMonth target,
            List<String> symbols) {
        YearMonth prior = target.minusMonths(1);
        JsonNode bars = root.path("bars");
        List<SymbolMonthlyReturn> out = new ArrayList<>();

        for (String symbol : symbols) {
            JsonNode symbolBars = bars.path(symbol);
            if (!symbolBars.isArray() || symbolBars.isEmpty()) {
                throw new IllegalStateException("No bars returned for symbol " + symbol);
            }
            // Defensive sort by timestamp (ISO strings sort lexicographically)
            List<JsonNode> sorted = new ArrayList<>();
            symbolBars.forEach(sorted::add);
            sorted.sort(Comparator.comparing(b -> b.path("t").asText()));

            BigDecimal priorClose = closeForMonth(sorted, prior);
            BigDecimal endClose = closeForMonth(sorted, target);
            if (priorClose == null || endClose == null
                    || priorClose.compareTo(BigDecimal.ZERO) <= 0
                    || endClose.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalStateException("Missing monthly close for symbol " + symbol
                        + " (prior=" + priorClose + ", end=" + endClose + ")");
            }
            BigDecimal returnPct = endClose.subtract(priorClose)
                    .divide(priorClose, 6, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);
            out.add(new SymbolMonthlyReturn(symbol, priorClose, endClose, returnPct));
        }
        return out;
    }

    private static BigDecimal closeForMonth(List<JsonNode> sortedBars, YearMonth month) {
        String prefix = month.toString(); // "2026-06" matches "2026-06-01T04:00:00Z"
        for (JsonNode bar : sortedBars) {
            if (bar.path("t").asText().startsWith(prefix) && bar.has("c")) {
                return new BigDecimal(bar.path("c").asText());
            }
        }
        return null;
    }

    /** Monthly close-to-close result for one symbol. */
    public static class SymbolMonthlyReturn {
        public final String symbol;
        public final BigDecimal priorClose;
        public final BigDecimal endClose;
        public final BigDecimal returnPct;

        public SymbolMonthlyReturn(String symbol, BigDecimal priorClose, BigDecimal endClose,
                BigDecimal returnPct) {
            this.symbol = symbol;
            this.priorClose = priorClose;
            this.endClose = endClose;
            this.returnPct = returnPct;
        }
    }
}
