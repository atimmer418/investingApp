package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
public class AlpacaService {
    
    private static final Logger logger = LoggerFactory.getLogger(AlpacaService.class);
    
    @Value("${alpaca.api.key}")
    private String alpacaApiKey;
    
    @Value("${alpaca.api.secret}")
    private String alpacaApiSecret;
    
    @Value("${alpaca.broker.base-url:https://broker-api.sandbox.alpaca.markets/v1}")
    private String alpacaBaseUrl;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    public AlpacaService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * Initiate ACH transfer to fund account
     */
    public AlpacaTransferResponse initiateAchTransfer(String accountId, String relationshipId, BigDecimal amount) {
        try {
            String url = alpacaBaseUrl + "/accounts/" + accountId + "/transfers";
            
            Map<String, Object> request = new HashMap<>();
            request.put("transfer_type", "ach");
            request.put("relationship_id", relationshipId);
            request.put("amount", amount.toString());
            request.put("direction", "INCOMING");
            
            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            logger.info("Initiating ACH transfer for account {} with amount {}", accountId, amount);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK || response.getStatusCode() == HttpStatus.CREATED) {
                JsonNode jsonResponse = objectMapper.readTree(response.getBody());
                return new AlpacaTransferResponse(
                    jsonResponse.get("id").asText(),
                    jsonResponse.get("status").asText(),
                    new BigDecimal(jsonResponse.get("amount").asText()),
                    jsonResponse.get("created_at").asText(),
                    null
                );
            } else {
                logger.error("Failed to initiate ACH transfer. Status: {}, Response: {}", 
                    response.getStatusCode(), response.getBody());
                return new AlpacaTransferResponse(null, "FAILED", amount, null, 
                    "HTTP " + response.getStatusCode() + ": " + response.getBody());
            }
            
        } catch (Exception e) {
            logger.error("Error initiating ACH transfer for account {}", accountId, e);
            return new AlpacaTransferResponse(null, "FAILED", amount, null, e.getMessage());
        }
    }
    
    /**
     * Check transfer status by looking at cash deposit activities (CSD) with context
     * According to Alpaca docs: "After around 10-30 minutes (to simulate ACH delay) 
     * the transfer should reflect on the user's balance via a cash deposit activity (CSD)"
     * 
     * API Reference: GET /v1/accounts/activities/CSD?account_id={account_id}
     */
    public AlpacaTransferResponse checkTransferStatus(String accountId, String transferId, 
            BigDecimal expectedAmount, LocalDateTime transferInitiatedTime) {
        try {
            // Check for cash deposit activities (CSD) which indicate completed transfers
            String url = alpacaBaseUrl + "/accounts/activities/CSD?account_id=" + accountId;
            
            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            logger.info("Checking cash deposit activities for account {} to verify transfer {} (amount: {}, initiated: {})", 
                accountId, transferId, expectedAmount, transferInitiatedTime);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                JsonNode jsonResponse = objectMapper.readTree(response.getBody());
                
                // Alpaca API returns array of activities with two types:
                // 1. TRADEACTIVITY - has transaction_time, type, price, qty, etc. (for stock trades)
                // 2. NONTRADEACTIVITY - has date, net_amount, description, etc. (for cash movements)
                // 
                // CSD (Cash Disbursement) appears in BOTH, but we want NONTRADEACTIVITY because:
                // - Cash transfers are non-trading activities
                // - We need 'net_amount' field (not available in TRADEACTIVITY)
                // - We need 'date' field (TRADEACTIVITY uses 'transaction_time')
                logger.info("Checking {} activities for CSD (Cash Disbursement) NONTRADEACTIVITY entries matching transfer {}", 
                    jsonResponse.size(), transferId);
                
                // Look for recent cash deposit activities that match our criteria
                if (jsonResponse.isArray()) {
                    for (JsonNode activity : jsonResponse) {
                        // Verify we have the required fields for NONTRADEACTIVITY (CSD is non-trade)
                        if (!activity.has("activity_type")) {
                            logger.warn("Activity missing activity_type field: {}", activity);
                            continue;
                        }
                        
                        String activityType = activity.get("activity_type").asText();
                        if ("CSD".equals(activityType)) {
                            // Determine if this is a TRADEACTIVITY or NONTRADEACTIVITY CSD
                            // TRADEACTIVITY has: transaction_time, price, qty, symbol
                            // NONTRADEACTIVITY has: date, net_amount, description
                            boolean isTradeActivity = activity.has("transaction_time") && activity.has("price");
                            boolean isNonTradeActivity = activity.has("date") && activity.has("net_amount");
                            
                            if (isTradeActivity) {
                                logger.debug("Skipping CSD TRADEACTIVITY (we need NONTRADEACTIVITY for cash transfers)");
                                continue;
                            }
                            
                            if (!isNonTradeActivity) {
                                logger.warn("CSD activity missing NONTRADEACTIVITY fields (date/net_amount): {}", activity);
                                continue;
                            }
                            
                            // Process NONTRADEACTIVITY CSD (cash disbursement)
                            
                            try {
                                // Parse the activity date - CSD uses 'date' field (date format, not datetime)
                                String activityDateStr = activity.get("date").asText();
                                LocalDateTime activityDate;
                                
                                if (activityDateStr.contains("T")) {
                                    // ISO datetime format: "2023-10-07T14:30:00Z" or "2023-10-07T14:30:00"
                                    activityDate = LocalDateTime.parse(
                                        activityDateStr.replace("Z", ""), 
                                        DateTimeFormatter.ISO_LOCAL_DATE_TIME
                                    );
                                } else {
                                    // Date only format: "2023-10-07" - assume start of day
                                    activityDate = LocalDate.parse(activityDateStr).atStartOfDay();
                                }
                                
                                // Parse the net_amount - always a string according to API docs
                                String amountStr = activity.get("net_amount").asText();
                                BigDecimal activityAmount = new BigDecimal(amountStr);
                                
                                // Check if this CSD activity matches our transfer:
                                // 1. Occurred on or after our transfer was initiated (same day or later)
                                // 2. Amount matches (within $0.01 tolerance for rounding)
                                // 3. Occurred within reasonable ACH timeframe (3 business days)
                                boolean timeMatch = activityDate.toLocalDate().isEqual(transferInitiatedTime.toLocalDate()) ||
                                                  (activityDate.isAfter(transferInitiatedTime) && 
                                                   activityDate.isBefore(transferInitiatedTime.plusDays(3)));
                                boolean amountMatch = activityAmount.subtract(expectedAmount).abs()
                                                    .compareTo(new BigDecimal("0.01")) <= 0;
                                
                                logger.debug("CSD Activity Analysis - Date: {}, Amount: {}, Time Match: {}, Amount Match: {} (expected: {}), Transfer Initiated: {}", 
                                    activityDateStr, activityAmount, timeMatch, amountMatch, expectedAmount, transferInitiatedTime);
                                
                                if (timeMatch && amountMatch) {
                                    logger.info("✅ Found matching CSD (NONTRADEACTIVITY) for transfer {} - Amount: {}, Date: {}, Initiated: {}", 
                                        transferId, activityAmount, activityDateStr, transferInitiatedTime);
                                    
                                    return new AlpacaTransferResponse(
                                        transferId,
                                        "COMPLETED",
                                        activityAmount,
                                        activityDateStr,
                                        null
                                    );
                                } else {
                                    logger.debug("❌ CSD activity doesn't match - Time: {} ({}), Amount: {} (expected: {})", 
                                        timeMatch, activityDateStr, amountMatch, expectedAmount);
                                }
                                
                            } catch (Exception e) {
                                logger.warn("Failed to parse CSD activity: {}", activity, e);
                            }
                        }
                    }
                }
                
                // No matching CSD activity found - transfer still pending
                logger.info("No matching cash deposit activity found for transfer {}, still pending", transferId);
                return new AlpacaTransferResponse(transferId, "PENDING", null, null, null);
                
            } else if (response.getStatusCode() == HttpStatus.NOT_FOUND) {
                logger.info("No activities found for account {}, transfer {} still pending", accountId, transferId);
                return new AlpacaTransferResponse(transferId, "PENDING", null, null, null);
                
            } else {
                logger.error("Failed to check cash deposit activities. Status: {}, Response: {}", 
                    response.getStatusCode(), response.getBody());
                return new AlpacaTransferResponse(transferId, "UNKNOWN", null, null, 
                    "HTTP " + response.getStatusCode() + ": " + response.getBody());
            }
            
        } catch (Exception e) {
            logger.error("Error checking transfer status for transfer {}", transferId, e);
            return new AlpacaTransferResponse(transferId, "ERROR", null, null, e.getMessage());
        }
    }
    
    /**
     * Place a market buy order
     */
    public AlpacaOrderResponse placeBuyOrder(String accountId, String symbol, BigDecimal notionalAmount) {
        try {
            String url = alpacaBaseUrl + "/trading/accounts/" + accountId + "/orders";
            
            Map<String, Object> request = new HashMap<>();
            request.put("symbol", symbol);
            request.put("notional", notionalAmount.toString());
            request.put("side", "buy");
            request.put("type", "market");
            request.put("time_in_force", "day");
            
            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            logger.info("Placing buy order for account {} - Symbol: {}, Amount: {}", 
                accountId, symbol, notionalAmount);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK || response.getStatusCode() == HttpStatus.CREATED) {
                JsonNode jsonResponse = objectMapper.readTree(response.getBody());
                return new AlpacaOrderResponse(
                    jsonResponse.get("id").asText(),
                    symbol,
                    jsonResponse.get("status").asText(),
                    jsonResponse.has("qty") ? new BigDecimal(jsonResponse.get("qty").asText()) : null,
                    notionalAmount,
                    jsonResponse.has("filled_qty") ? new BigDecimal(jsonResponse.get("filled_qty").asText()) : BigDecimal.ZERO,
                    jsonResponse.has("filled_avg_price") && !jsonResponse.get("filled_avg_price").isNull() ? 
                        new BigDecimal(jsonResponse.get("filled_avg_price").asText()) : null,
                    jsonResponse.get("submitted_at").asText(),
                    null
                );
            } else {
                logger.error("Failed to place buy order. Status: {}, Response: {}", 
                    response.getStatusCode(), response.getBody());
                return new AlpacaOrderResponse(null, symbol, "FAILED", null, notionalAmount, 
                    BigDecimal.ZERO, null, null, 
                    "HTTP " + response.getStatusCode() + ": " + response.getBody());
            }
            
        } catch (Exception e) {
            logger.error("Error placing buy order for account {} - Symbol: {}", accountId, symbol, e);
            return new AlpacaOrderResponse(null, symbol, "FAILED", null, notionalAmount, 
                BigDecimal.ZERO, null, null, e.getMessage());
        }
    }
    
    /**
     * Check order status
     */
    public AlpacaOrderResponse checkOrderStatus(String accountId, String orderId) {
        try {
            String url = alpacaBaseUrl + "/trading/accounts/" + accountId + "/orders/" + orderId;
            
            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                JsonNode jsonResponse = objectMapper.readTree(response.getBody());
                return new AlpacaOrderResponse(
                    jsonResponse.get("id").asText(),
                    jsonResponse.get("symbol").asText(),
                    jsonResponse.get("status").asText(),
                    jsonResponse.has("qty") ? new BigDecimal(jsonResponse.get("qty").asText()) : null,
                    jsonResponse.has("notional") && !jsonResponse.get("notional").isNull() ? 
                        new BigDecimal(jsonResponse.get("notional").asText()) : null,
                    jsonResponse.has("filled_qty") ? new BigDecimal(jsonResponse.get("filled_qty").asText()) : BigDecimal.ZERO,
                    jsonResponse.has("filled_avg_price") && !jsonResponse.get("filled_avg_price").isNull() ? 
                        new BigDecimal(jsonResponse.get("filled_avg_price").asText()) : null,
                    jsonResponse.get("submitted_at").asText(),
                    null
                );
            } else {
                logger.error("Failed to check order status. Status: {}, Response: {}", 
                    response.getStatusCode(), response.getBody());
                return new AlpacaOrderResponse(orderId, null, "UNKNOWN", null, null, 
                    BigDecimal.ZERO, null, null, 
                    "HTTP " + response.getStatusCode() + ": " + response.getBody());
            }
            
        } catch (Exception e) {
            logger.error("Error checking order status for order {}", orderId, e);
            return new AlpacaOrderResponse(orderId, null, "ERROR", null, null, 
                BigDecimal.ZERO, null, null, e.getMessage());
        }
    }
    
    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("APCA-API-KEY-ID", alpacaApiKey);
        headers.set("APCA-API-SECRET-KEY", alpacaApiSecret);
        return headers;
    }
    
    // Response DTOs
    public static class AlpacaTransferResponse {
        public final String id;
        public final String status;
        public final BigDecimal amount;
        public final String createdAt;
        public final String errorMessage;
        
        public AlpacaTransferResponse(String id, String status, BigDecimal amount, String createdAt, String errorMessage) {
            this.id = id;
            this.status = status;
            this.amount = amount;
            this.createdAt = createdAt;
            this.errorMessage = errorMessage;
        }
        
        public boolean isSuccess() {
            return errorMessage == null && !"FAILED".equals(status) && !"ERROR".equals(status);
        }
    }
    
    public static class AlpacaOrderResponse {
        public final String id;
        public final String symbol;
        public final String status;
        public final BigDecimal quantity;
        public final BigDecimal notionalAmount;
        public final BigDecimal filledQuantity;
        public final BigDecimal filledAvgPrice;
        public final String submittedAt;
        public final String errorMessage;
        
        public AlpacaOrderResponse(String id, String symbol, String status, BigDecimal quantity, 
                                 BigDecimal notionalAmount, BigDecimal filledQuantity, 
                                 BigDecimal filledAvgPrice, String submittedAt, String errorMessage) {
            this.id = id;
            this.symbol = symbol;
            this.status = status;
            this.quantity = quantity;
            this.notionalAmount = notionalAmount;
            this.filledQuantity = filledQuantity;
            this.filledAvgPrice = filledAvgPrice;
            this.submittedAt = submittedAt;
            this.errorMessage = errorMessage;
        }
        
        public boolean isSuccess() {
            return errorMessage == null && !"FAILED".equals(status) && !"ERROR".equals(status);
        }
        
        public boolean isFilled() {
            return "filled".equalsIgnoreCase(status);
        }
        
        public boolean isPartiallyFilled() {
            return "partially_filled".equalsIgnoreCase(status);
        }
    }
}
