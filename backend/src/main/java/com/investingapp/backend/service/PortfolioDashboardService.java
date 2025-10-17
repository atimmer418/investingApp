package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investingapp.backend.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
    
    @Value("${alpaca.api.key}")
    private String alpacaApiKey;
    
    @Value("${alpaca.api.secret}")
    private String alpacaApiSecret;
    
    @Value("${alpaca.broker.base-url:https://broker-api.sandbox.alpaca.markets/v1}")
    private String alpacaBrokerBaseUrl;
    
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
            BigDecimal totalInvested = calculateTotalInvested(accountId);
            
            return new PortfolioDashboardData(
                accountSummary,
                positions,
                portfolioHistory,
                recentTransactions,
                totalInvested
            );
            
        } catch (Exception e) {
            logger.error("Error fetching portfolio dashboard data for user {}", user.getId(), e);
            throw new RuntimeException("Failed to fetch portfolio data: " + e.getMessage());
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
                
                // Note: Alpaca Broker API doesn't provide buying_power, daily changes, etc.
                // These would need to be calculated or fetched from Trading API if available
                BigDecimal buyingPower = BigDecimal.ZERO; // Not available in Broker API
                BigDecimal todayChange = BigDecimal.ZERO; // Would need historical data
                BigDecimal todayChangePercent = BigDecimal.ZERO; // Would need historical data
                
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
     * Get current positions/holdings
     */
    /**
     * Get current positions/holdings
     * Note: Alpaca Broker API doesn't have a direct positions endpoint
     * We'll need to derive positions from transaction history
     */
    private List<Position> getCurrentPositions(String accountId) {
        logger.info("Note: Alpaca Broker API doesn't provide a direct positions endpoint");
        logger.info("Positions would need to be calculated from transaction history");
        
        // For now, return empty list - we'll calculate from transactions later
        return new ArrayList<>();
    }
    
    /**
     * Get portfolio value history for charting
     * Note: Alpaca Broker API doesn't provide portfolio history endpoint
     * We'll need to calculate this from transaction history and current values
     */
    private PortfolioHistory getPortfolioHistory(String accountId, String period) {
        logger.info("Note: Alpaca Broker API doesn't provide portfolio history endpoint");
        logger.info("Portfolio history would need to be calculated from transaction data");
        
        // For now, return empty history - we'll implement calculation later
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
     * Calculate total amount invested by summing all cash deposits
     */
    private BigDecimal calculateTotalInvested(String accountId) {
        try {
            String url = alpacaBrokerBaseUrl + "/accounts/" + accountId + "/activities?activity_types=CSD&limit=200";
            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            logger.info("Calculating total invested for account: {}", accountId);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                JsonNode activitiesArray = objectMapper.readTree(response.getBody());
                BigDecimal totalInvested = BigDecimal.ZERO;
                
                if (activitiesArray.isArray()) {
                    for (JsonNode activityNode : activitiesArray) {
                        // CSD = Cash Disbursement (deposits into account)
                        if ("CSD".equals(activityNode.get("activity_type").asText())) {
                            BigDecimal amount = parseDecimalSafely(activityNode, "net_amount", BigDecimal.ZERO);
                            if (amount.compareTo(BigDecimal.ZERO) > 0) {
                                totalInvested = totalInvested.add(amount);
                            }
                        }
                    }
                }
                
                logger.info("Total invested calculated: {} for account {}", totalInvested, accountId);
                return totalInvested;
            } else {
                logger.error("Failed to fetch cash activities. Status: {}, Response: {}", 
                    response.getStatusCode(), response.getBody());
                return BigDecimal.ZERO;
            }
        } catch (Exception e) {
            logger.error("Error calculating total invested for account {}", accountId, e);
            return BigDecimal.ZERO;
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
                                    BigDecimal totalInvested) {
            this.summary = summary;
            this.positions = positions;
            this.history = history;
            this.recentTransactions = recentTransactions;
            this.totalInvested = totalInvested;
            
            // Calculate total gains/losses
            this.totalGainLoss = summary.portfolioValue.subtract(totalInvested);
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
        
        public PortfolioHistory(List<String> timestamps, List<BigDecimal> values) {
            this.timestamps = timestamps;
            this.values = values;
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
}
