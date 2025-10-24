package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investingapp.backend.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.Base64;

@Service
public class PortfolioDashboardService {
    
    private static final Logger logger = LoggerFactory.getLogger(PortfolioDashboardService.class);
    
    // Broker API credentials (for account management, portfolio data, etc.)
    @Value("${alpaca.api.key}")
    private String alpacaApiKey;
    
    @Value("${alpaca.api.secret}")
    private String alpacaApiSecret;
    
    // Market Data API credentials (for real-time stock prices, quotes, etc.)
    @Value("${alpaca.market.data.key}")
    private String alpacaMarketDataKey;
    
    @Value("${alpaca.market.data.secret}")
    private String alpacaMarketDataSecret;
    
    @Value("${alpaca.broker.base-url:https://broker-api.sandbox.alpaca.markets/v1}")
    private String alpacaBrokerBaseUrl;
    
    @Value("${alpaca.trading.base-url:https://paper-api.alpaca.markets/v2}")
    private String alpacaTradingBaseUrl;
    
    @Value("${alpaca.market.data.base-url:https://data.alpaca.markets/v2}")
    private String alpacaMarketDataBaseUrl;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    public PortfolioDashboardService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }
    
    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        // Use HTTP Basic authentication for Broker API
        String credentials = alpacaApiKey + ":" + alpacaApiSecret;
        String base64Credentials = Base64.getEncoder().encodeToString(
            credentials.getBytes(StandardCharsets.UTF_8)
        );
        headers.set("Authorization", "Basic " + base64Credentials);
        
        return headers;
    }
    
    /**
     * Calculate total invested amount from current positions (sum of cost basis)
     */
    private BigDecimal calculateTotalInvestedFromPositions(List<Position> positions) {
        return positions.stream()
                .map(position -> position.costBasis)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    /**
     * Get comprehensive portfolio dashboard data for a user
     */
    public PortfolioDashboardData getPortfolioDashboard(User user) {
        if (user.getAlpacaAccountId() == null) {
            throw new IllegalArgumentException("User does not have an Alpaca account");
        }
        
        String accountId = user.getAlpacaAccountId();
        
        try {
            // Get all required data from Alpaca
            AccountSummary accountSummary = getAccountSummary(accountId);
            List<Position> positions = getCurrentPositions(accountId);
            PortfolioHistory portfolioHistory = getPortfolioHistory(accountId, "1M");
            List<Transaction> recentTransactions = getRecentTransactions(accountId);
            
            // Calculate totals from positions data instead of account activities
            BigDecimal totalInvested = calculateTotalInvestedFromPositions(positions);
            
            // Calculate total gain/loss in real-time: current portfolio value - total invested
            // This ensures consistency with real-time portfolio value rather than using stale EOD unrealized P&L
            BigDecimal totalGainLoss = accountSummary.portfolioValue.subtract(totalInvested);
            
            return new PortfolioDashboardData(
                accountSummary,
                positions,
                portfolioHistory,
                recentTransactions,
                totalInvested,
                totalGainLoss
            );
            
        } catch (Exception e) {
            logger.error("Error fetching portfolio dashboard data for user {}", user.getId(), e);
            throw new RuntimeException("Failed to fetch portfolio data: " + e.getMessage());
        }
    }
    
    /**
     * Get portfolio history for a specific time period
     */
    public PortfolioHistory getPortfolioHistoryForPeriod(User user, String period) {
        if (user.getAlpacaAccountId() == null) {
            throw new IllegalArgumentException("User does not have an Alpaca account");
        }
        
        String accountId = user.getAlpacaAccountId();
        
        try {
            return getPortfolioHistory(accountId, period);
        } catch (Exception e) {
            logger.error("Error fetching portfolio history for user {} with period {}", user.getId(), period, e);
            throw new RuntimeException("Failed to fetch portfolio history: " + e.getMessage());
        }
    }
    
    /**
     * Get account summary (current values, buying power, etc.)
     */
    private AccountSummary getAccountSummary(String accountId) {
        try {
            String url = alpacaBrokerBaseUrl + "/accounts/" + accountId;
            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            logger.info("Fetching account summary for account: {}", accountId);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                JsonNode accountData = objectMapper.readTree(response.getBody());
                
                // Parse account data based on actual Alpaca response structure
                BigDecimal lastEquity = parseDecimalSafely(accountData, "last_equity", BigDecimal.ZERO);
                
                // Get USD specific data if available
                BigDecimal usdEquity = BigDecimal.ZERO;
                if (accountData.has("usd") && accountData.get("usd").has("last_equity")) {
                    usdEquity = parseDecimalSafely(accountData.get("usd"), "last_equity", BigDecimal.ZERO);
                }
                
                // Use the more specific USD equity if available, otherwise use general last_equity
                BigDecimal portfolioValue = usdEquity.compareTo(BigDecimal.ZERO) > 0 ? usdEquity : lastEquity;
                
                // Calculate today's change by getting position-level performance
                BigDecimal todayChange = BigDecimal.ZERO;
                BigDecimal todayChangePercent = BigDecimal.ZERO;
                
                try {
                    // Calculate today's change based on current positions vs yesterday's close
                    BigDecimal[] todayChangeData = calculateIntradayPerformance(accountId, portfolioValue);
                    todayChange = todayChangeData[0];
                    todayChangePercent = todayChangeData[1];
                    logger.info("Calculated intraday performance: {} ({}%)", todayChange, todayChangePercent);
                } catch (Exception e) {
                    logger.warn("Could not calculate intraday performance for account {}: {}", accountId, e.getMessage());
                    // Keep default values of 0
                }
                
                BigDecimal buyingPower = BigDecimal.ZERO; // Not available in Broker API
                
                String accountStatus = accountData.has("status") ? accountData.get("status").asText() : "UNKNOWN";
                String currency = accountData.has("currency") ? accountData.get("currency").asText() : "USD";
                
                logger.info("Account summary retrieved - Status: {}, Currency: {}, Last Equity: {}", 
                    accountStatus, currency, portfolioValue);
                
                return new AccountSummary(portfolioValue, todayChange, todayChangePercent, buyingPower, portfolioValue);
            } else {
                logger.error("Failed to fetch account summary. Status: {}, Response: {}", 
                    response.getStatusCode(), response.getBody());
                throw new RuntimeException("Failed to fetch account summary");
            }
        } catch (Exception e) {
            logger.error("Error fetching account summary for account {}", accountId, e);
            throw new RuntimeException("Failed to fetch account summary: " + e.getMessage());
        }
    }
    
    /**
     * Get current positions using EOD positions endpoint
     * Uses the /v1/reporting/eod/positions endpoint from Broker API
     */
    private List<Position> getCurrentPositions(String accountId) {
        try {
            // Get yesterday's date since EOD positions are for previous trading day
            LocalDate yesterday = LocalDate.now().minusDays(1);
            String asofDate = yesterday.format(DateTimeFormatter.ISO_LOCAL_DATE);
            
            String url = alpacaBrokerBaseUrl + "/reporting/eod/positions" +
                        "?account_id=" + accountId +
                        "&asof=" + asofDate;
            
            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            logger.info("Fetching EOD positions for account: {} as of: {}", accountId, asofDate);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                JsonNode responseData = objectMapper.readTree(response.getBody());
                List<Position> positions = new ArrayList<>();
                
                JsonNode positionsNode = responseData.get("positions");
                if (positionsNode != null && positionsNode.isObject()) {
                    // The positions object contains account IDs as keys
                    for (JsonNode accountPositions : positionsNode) {
                        if (accountPositions.isArray()) {
                            for (JsonNode positionNode : accountPositions) {
                                String symbol = positionNode.has("symbol") ? positionNode.get("symbol").asText() : "";
                                BigDecimal quantity = parseDecimalSafely(positionNode, "qty", BigDecimal.ZERO);
                                BigDecimal marketValue = parseDecimalSafely(positionNode, "market_value", BigDecimal.ZERO);
                                BigDecimal costBasis = parseDecimalSafely(positionNode, "cost_basis", BigDecimal.ZERO);
                                BigDecimal unrealizedPL = parseDecimalSafely(positionNode, "unrealized_pl", BigDecimal.ZERO);
                                BigDecimal currentPrice = parseDecimalSafely(positionNode, "current_price", BigDecimal.ZERO);
                                
                                // Calculate unrealized P&L percentage
                                BigDecimal unrealizedPLPercent = BigDecimal.ZERO;
                                if (costBasis.compareTo(BigDecimal.ZERO) > 0) {
                                    unrealizedPLPercent = unrealizedPL.divide(costBasis, 4, RoundingMode.HALF_UP);
                                }
                                
                                Position position = new Position(
                                    symbol,
                                    symbol, // Use symbol as name for now
                                    quantity,
                                    marketValue,
                                    costBasis,
                                    unrealizedPL,
                                    unrealizedPLPercent,
                                    currentPrice
                                );
                                
                                positions.add(position);
                            }
                        }
                    }
                }
                
                logger.info("Retrieved {} positions", positions.size());
                return positions;
                
            } else {
                logger.warn("Failed to fetch positions: {}", response.getStatusCode());
            }
            
        } catch (Exception e) {
            logger.error("Error fetching current positions", e);
        }
        
        // Return empty list on error
        return new ArrayList<>();
    }
    
    /**
     * Get portfolio value history for charting using Broker API
     * Uses the /v1/trading/accounts/{account_id}/account/portfolio/history endpoint
     */
    private PortfolioHistory getPortfolioHistory(String accountId, String period) {
        try {
            // Build URL with account ID for Broker API
            // Use timeframe=1D to get daily data points, not intraday minutes
            // Add cashflow_types=NONE to exclude cash flows from P&L calculation
            String url = alpacaBrokerBaseUrl + "/trading/accounts/" + accountId + "/account/portfolio/history" +
                        "?period=" + period +
                        "&timeframe=1D" +
                        "&intraday_reporting=market_hours" +
                        "&cashflow_types=NONE";
            
            HttpHeaders headers = createAuthHeaders(); // Use broker API headers
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            logger.info("Fetching portfolio history for period: {} from URL: {}", period, url);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("Portfolio history API response: {}", response.getBody());
                JsonNode historyData = objectMapper.readTree(response.getBody());
                
                List<String> dates = new ArrayList<>();
                List<BigDecimal> values = new ArrayList<>();
                List<BigDecimal> profitLoss = new ArrayList<>();
                
                // Parse timestamps, equity arrays, and profit_loss
                JsonNode timestamps = historyData.get("timestamp");
                JsonNode equityValues = historyData.get("equity");
                JsonNode profitLossValues = historyData.get("profit_loss");
                
                if (timestamps != null && timestamps.isArray() && 
                    equityValues != null && equityValues.isArray() &&
                    timestamps.size() == equityValues.size()) {
                    
                    for (int i = 0; i < timestamps.size(); i++) {
                        // Convert timestamp to date string (timestamps are in epoch seconds)
                        long epochSeconds = timestamps.get(i).asLong();
                        LocalDate date = LocalDate.ofEpochDay(epochSeconds / 86400); // 86400 seconds in a day
                        String dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE);
                        
                        BigDecimal equity = new BigDecimal(equityValues.get(i).asText());
                        
                        dates.add(dateStr);
                        values.add(equity);
                        
                        // Also parse profit/loss data if available
                        if (profitLossValues != null && profitLossValues.isArray() && i < profitLossValues.size()) {
                            BigDecimal pl = new BigDecimal(profitLossValues.get(i).asText());
                            profitLoss.add(pl);
                        }
                    }
                }
                
                logger.info("Retrieved {} portfolio history data points", dates.size());
                logger.info("Profit/Loss data points: {}", profitLoss);
                return new PortfolioHistory(dates, values, profitLoss);
                
            } else {
                logger.warn("Failed to fetch portfolio history: {}", response.getStatusCode());
            }
            
        } catch (Exception e) {
            logger.error("Error fetching portfolio history", e);
        }
        
        // Return empty history on error
        return new PortfolioHistory(new ArrayList<>(), new ArrayList<>());
    }
    
    /**
     * Get recent transactions/trades using correct Alpaca API structure
     */
    private List<Transaction> getRecentTransactions(String accountId) {
        try {
            // Use the activities endpoint with account_id query parameter
            String url = alpacaBrokerBaseUrl + "/accounts/activities?account_id=" + accountId + "&activity_types=FILL&limit=50";
            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            logger.info("Fetching recent transactions for account: {}", accountId);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                JsonNode transactionsArray = objectMapper.readTree(response.getBody());
                List<Transaction> transactions = new ArrayList<>();
                
                if (transactionsArray.isArray()) {
                    for (JsonNode transactionNode : transactionsArray) {
                        // Parse according to the structure you provided
                        String id = transactionNode.has("order_id") ? transactionNode.get("order_id").asText() : "";
                        String type = transactionNode.has("type") ? transactionNode.get("type").asText() : "fill";
                        String symbol = transactionNode.has("symbol") ? transactionNode.get("symbol").asText() : "";
                        BigDecimal quantity = parseDecimalSafely(transactionNode, "qty", BigDecimal.ZERO);
                        BigDecimal price = parseDecimalSafely(transactionNode, "price", BigDecimal.ZERO);
                        
                        // Calculate amount (price * quantity)
                        BigDecimal amount = price.multiply(quantity);
                        
                        String date = transactionNode.has("transaction_time") ? 
                            transactionNode.get("transaction_time").asText() : "";
                        String status = transactionNode.has("order_status") ? 
                            transactionNode.get("order_status").asText() : "filled";
                        
                        transactions.add(new Transaction(id, type, symbol, quantity, price, amount, date, status));
                    }
                }
                
                logger.info("Retrieved {} recent transactions for account {}", transactions.size(), accountId);
                return transactions;
            } else {
                logger.error("Failed to fetch transactions. Status: {}, Response: {}", 
                    response.getStatusCode(), response.getBody());
                return new ArrayList<>();
            }
        } catch (Exception e) {
            logger.error("Error fetching transactions for account {}", accountId, e);
            return new ArrayList<>();
        }
    }
    
    /**
     * Safely parse decimal values from JSON, handling null and "null" strings
     */
    private BigDecimal parseDecimalSafely(JsonNode node, String fieldName, BigDecimal defaultValue) {
        if (!node.has(fieldName) || node.get(fieldName).isNull()) {
            return defaultValue;
        }
        
        String value = node.get(fieldName).asText();
        if ("null".equals(value) || value.trim().isEmpty()) {
            return defaultValue;
        }
        
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException e) {
            logger.warn("Failed to parse decimal value '{}' for field '{}', using default: {}", 
                value, fieldName, defaultValue);
            return defaultValue;
        }
    }
    
    // DTOs for response structure
    
    public static class PortfolioDashboardData {
        public final AccountSummary summary;
        public final List<Position> positions;
        public final PortfolioHistory history;
        public final List<Transaction> recentTransactions;
        public final BigDecimal totalInvested;
        public final BigDecimal totalGainLoss;
        public final BigDecimal totalGainLossPercent;
        
        public PortfolioDashboardData(AccountSummary summary, List<Position> positions, 
                                    PortfolioHistory history, List<Transaction> recentTransactions,
                                    BigDecimal totalInvested, BigDecimal totalGainLoss) {
            this.summary = summary;
            this.positions = positions;
            this.history = history;
            this.recentTransactions = recentTransactions;
            this.totalInvested = totalInvested;
            this.totalGainLoss = totalGainLoss;
            
            // Calculate percentage gain/loss
            this.totalGainLossPercent = totalInvested.compareTo(BigDecimal.ZERO) > 0 ?
                totalGainLoss.divide(totalInvested, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")) :
                BigDecimal.ZERO;
        }
    }
    
    public static class AccountSummary {
        public final BigDecimal portfolioValue;
        public final BigDecimal todayChange;
        public final BigDecimal todayChangePercent;
        public final BigDecimal buyingPower;
        public final BigDecimal equity;
        
        public AccountSummary(BigDecimal portfolioValue, BigDecimal todayChange, 
                            BigDecimal todayChangePercent, BigDecimal buyingPower, BigDecimal equity) {
            this.portfolioValue = portfolioValue;
            this.todayChange = todayChange;
            this.todayChangePercent = todayChangePercent;
            this.buyingPower = buyingPower;
            this.equity = equity;
        }
    }
    
    public static class Position {
        public final String symbol;
        public final String name;
        public final BigDecimal quantity;
        public final BigDecimal marketValue;
        public final BigDecimal costBasis;
        public final BigDecimal unrealizedPL;
        public final BigDecimal unrealizedPLPercent;
        public final BigDecimal currentPrice;
        
        public Position(String symbol, String name, BigDecimal quantity, BigDecimal marketValue,
                       BigDecimal costBasis, BigDecimal unrealizedPL, BigDecimal unrealizedPLPercent,
                       BigDecimal currentPrice) {
            this.symbol = symbol;
            this.name = name;
            this.quantity = quantity;
            this.marketValue = marketValue;
            this.costBasis = costBasis;
            this.unrealizedPL = unrealizedPL;
            this.unrealizedPLPercent = unrealizedPLPercent;
            this.currentPrice = currentPrice;
        }
    }
    
    public static class PortfolioHistory {
        public final List<String> timestamps;
        public final List<BigDecimal> values;
        public final List<BigDecimal> profitLoss;
        
        public PortfolioHistory(List<String> timestamps, List<BigDecimal> values) {
            this.timestamps = timestamps;
            this.values = values;
            this.profitLoss = new ArrayList<>();
        }
        
        public PortfolioHistory(List<String> timestamps, List<BigDecimal> values, List<BigDecimal> profitLoss) {
            this.timestamps = timestamps;
            this.values = values;
            this.profitLoss = profitLoss;
        }
    }
    
    public static class Transaction {
        public final String id;
        public final String type;
        public final String symbol;
        public final BigDecimal quantity;
        public final BigDecimal price;
        public final BigDecimal amount;
        public final String date;
        public final String status;
        
        public Transaction(String id, String type, String symbol, BigDecimal quantity,
                         BigDecimal price, BigDecimal amount, String date, String status) {
            this.id = id;
            this.type = type;
            this.symbol = symbol;
            this.quantity = quantity;
            this.price = price;
            this.amount = amount;
            this.date = date;
            this.status = status;
        }
    }
    
    /**
     * Calculate real intraday performance using current market prices vs yesterday's close
     * Gets real-time quotes for each position and calculates actual market movement
     * Returns [todayChange, todayChangePercent]
     */
    private BigDecimal[] calculateIntradayPerformance(String accountId, BigDecimal currentPortfolioValue) {
        try {
            // Get yesterday's EOD positions (quantities and symbols)
            List<Position> yesterdayPositions = getCurrentPositions(accountId); 
            
            if (yesterdayPositions.isEmpty()) {
                return new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO};
            }
            
            // Calculate yesterday's total value and prepare for real-time calculation
            BigDecimal yesterdayTotalValue = BigDecimal.ZERO;
            BigDecimal currentCalculatedValue = BigDecimal.ZERO;
            
            logger.info("Calculating real intraday performance for {} positions", yesterdayPositions.size());
            
            for (Position position : yesterdayPositions) {
                // Yesterday's value (from EOD data)
                BigDecimal yesterdayValue = position.marketValue;
                yesterdayTotalValue = yesterdayTotalValue.add(yesterdayValue);
                
                // Get current real-time price for this symbol
                BigDecimal currentPrice = getCurrentPrice(position.symbol);
                
                if (currentPrice.compareTo(BigDecimal.ZERO) > 0) {
                    // Calculate current value: quantity × current_price
                    BigDecimal currentValue = position.quantity.multiply(currentPrice);
                    currentCalculatedValue = currentCalculatedValue.add(currentValue);
                    
                    logger.info("Position {}: {} shares, Yesterday: ${}, Current price: ${}, Current value: ${}", 
                        position.symbol, position.quantity, position.marketValue, currentPrice, currentValue);
                } else {
                    // Fallback to yesterday's value if we can't get current price
                    currentCalculatedValue = currentCalculatedValue.add(yesterdayValue);
                    logger.warn("Could not get current price for {}, using yesterday's value", position.symbol);
                }
            }
            
            logger.info("Intraday calculation: Yesterday total = ${}, Current calculated = ${}", 
                yesterdayTotalValue, currentCalculatedValue);
            
            if (yesterdayTotalValue.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal todayChange = currentCalculatedValue.subtract(yesterdayTotalValue);
                BigDecimal todayChangePercent = todayChange.divide(yesterdayTotalValue, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
                
                logger.info("Real intraday performance: {} ({}%)", todayChange, todayChangePercent);
                return new BigDecimal[]{todayChange, todayChangePercent};
            }
            
        } catch (Exception e) {
            logger.error("Error calculating real intraday performance: {}", e.getMessage());
        }
        
        return new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO};
    }
    
    /**
     * Get current real-time price for a symbol using Alpaca market data API
     */
    private BigDecimal getCurrentPrice(String symbol) {
        try {
            // Use Alpaca's latest quote endpoint for real-time pricing
            String url = alpacaMarketDataBaseUrl + "/stocks/" + symbol + "/quotes/latest";
            
            HttpHeaders headers = new HttpHeaders();
            // Use dedicated market data API credentials
            headers.set("APCA-API-KEY-ID", alpacaMarketDataKey);
            headers.set("APCA-API-SECRET-KEY", alpacaMarketDataSecret);
            headers.set("Accept", "application/json");
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                JsonNode responseData = objectMapper.readTree(response.getBody());
                JsonNode quote = responseData.get("quote");
                
                if (quote != null) {
                    // Use bid-ask midpoint for current price
                    BigDecimal bidPrice = parseDecimalSafely(quote, "bid_price", BigDecimal.ZERO);
                    BigDecimal askPrice = parseDecimalSafely(quote, "ask_price", BigDecimal.ZERO);
                    
                    if (bidPrice.compareTo(BigDecimal.ZERO) > 0 && askPrice.compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal midPrice = bidPrice.add(askPrice).divide(new BigDecimal("2"), 4, RoundingMode.HALF_UP);
                        logger.debug("Current price for {}: ${} (bid: ${}, ask: ${})", symbol, midPrice, bidPrice, askPrice);
                        return midPrice;
                    }
                }
            } else {
                logger.warn("Failed to get current price for {}: HTTP {}", symbol, response.getStatusCode());
            }
            
        } catch (Exception e) {
            logger.error("Error getting current price for {}: {}", symbol, e.getMessage());
        }
        
        return BigDecimal.ZERO;
    }
}
