package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

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
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public AlpacaService() {
        this.restTemplate = new RestTemplate();

        // Create a custom request factory that supports PATCH
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(java.net.HttpURLConnection connection, String httpMethod)
                    throws java.io.IOException {
                super.prepareConnection(connection, httpMethod);

                // Enable PATCH method using reflection
                if ("PATCH".equals(httpMethod)) {
                    try {
                        // Use reflection to set the method field directly
                        java.lang.reflect.Field methodField = java.net.HttpURLConnection.class
                                .getDeclaredField("method");
                        methodField.setAccessible(true);
                        methodField.set(connection, "PATCH");
                    } catch (Exception e) {
                        logger.warn("Could not enable PATCH method via reflection: {}", e.getMessage());
                        throw new java.io.IOException("PATCH method not supported", e);
                    }
                }
            }
        };

        this.restTemplate.setRequestFactory(requestFactory);

        // Create WebClient for PATCH requests (better PATCH support)
        this.webClient = WebClient.builder()
                .baseUrl(alpacaBaseUrl)
                .build();

        this.objectMapper = new ObjectMapper();
    }

    /**
     * Get buying power for an account
     */
    public BigDecimal getBuyingPower(String accountId) {
        try {
            String url = alpacaBrokerBaseUrl + "/trading/accounts/" + accountId + "/account";
            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            logger.info("Fetching buying power for account: {}", accountId);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                JsonNode accountData = objectMapper.readTree(response.getBody());
                
                if (accountData.has("effective_buying_power")) {
                    return new BigDecimal(accountData.get("effective_buying_power").asText());
                } else if (accountData.has("buying_power")) {
                    return new BigDecimal(accountData.get("buying_power").asText());
                }
            }
        } catch (Exception e) {
            logger.error("Error fetching buying power for account {}: {}", accountId, e.getMessage());
        }
        return BigDecimal.ZERO;
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

                // Parse amount safely
                BigDecimal parsedAmount = amount;
                if (jsonResponse.has("amount") && !jsonResponse.get("amount").isNull()) {
                    String amountStr = jsonResponse.get("amount").asText();
                    if (!"null".equals(amountStr) && !amountStr.trim().isEmpty()) {
                        try {
                            parsedAmount = new BigDecimal(amountStr);
                        } catch (NumberFormatException e) {
                            logger.warn("Failed to parse amount from response: '{}', using original amount: {}",
                                    amountStr, amount);
                        }
                    }
                }

                return new AlpacaTransferResponse(
                        jsonResponse.get("id").asText(),
                        jsonResponse.get("status").asText(),
                        parsedAmount,
                        jsonResponse.get("created_at").asText(),
                        null);
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
     * Check transfer status by looking at cash deposit activities (CSD) with
     * context
     * According to Alpaca docs: "After around 10-30 minutes (to simulate ACH delay)
     * the transfer should reflect on the user's balance via a cash deposit activity
     * (CSD)"
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

            logger.info(
                    "Checking cash deposit activities for account {} to verify transfer {} (amount: {}, initiated: {})",
                    accountId, transferId, expectedAmount, transferInitiatedTime);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                JsonNode jsonResponse = objectMapper.readTree(response.getBody());

                // Alpaca API returns array of activities with two types:
                // 1. TRADEACTIVITY - has transaction_time, type, price, qty, etc. (for stock
                // trades)
                // 2. NONTRADEACTIVITY - has date, net_amount, description, etc. (for cash
                // movements)
                //
                // CSD (Cash Disbursement) appears in BOTH, but we want NONTRADEACTIVITY
                // because:
                // - Cash transfers are non-trading activities
                // - We need 'net_amount' field (not available in TRADEACTIVITY)
                // - We need 'date' field (TRADEACTIVITY uses 'transaction_time')
                logger.info(
                        "Checking {} activities for CSD (Cash Disbursement) NONTRADEACTIVITY entries matching transfer {}",
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
                                logger.debug(
                                        "Skipping CSD TRADEACTIVITY (we need NONTRADEACTIVITY for cash transfers)");
                                continue;
                            }

                            if (!isNonTradeActivity) {
                                logger.warn("CSD activity missing NONTRADEACTIVITY fields (date/net_amount): {}",
                                        activity);
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
                                            DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                                } else {
                                    // Date only format: "2023-10-07" - assume start of day
                                    activityDate = LocalDate.parse(activityDateStr).atStartOfDay();
                                }

                                // Parse the net_amount - always a string according to API docs
                                String amountStr = activity.get("net_amount").asText();
                                if ("null".equals(amountStr) || amountStr.trim().isEmpty()) {
                                    logger.warn("CSD activity has null or empty net_amount, skipping: {}", activity);
                                    continue;
                                }

                                BigDecimal activityAmount;
                                try {
                                    activityAmount = new BigDecimal(amountStr);
                                } catch (NumberFormatException e) {
                                    logger.warn("Failed to parse net_amount '{}' as BigDecimal, skipping activity: {}",
                                            amountStr, activity);
                                    continue;
                                }

                                // Check if this CSD activity matches our transfer:
                                // 1. Occurred on or after our transfer was initiated (same day or later)
                                // 2. Amount matches (within $0.01 tolerance for rounding)
                                // 3. Occurred within reasonable ACH timeframe (3 business days)
                                boolean timeMatch = activityDate.toLocalDate()
                                        .isEqual(transferInitiatedTime.toLocalDate()) ||
                                        (activityDate.isAfter(transferInitiatedTime) &&
                                                activityDate.isBefore(transferInitiatedTime.plusDays(3)));
                                boolean amountMatch = activityAmount.subtract(expectedAmount).abs()
                                        .compareTo(new BigDecimal("0.01")) <= 0;

                                logger.debug(
                                        "CSD Activity Analysis - Date: {}, Amount: {}, Time Match: {}, Amount Match: {} (expected: {}), Transfer Initiated: {}",
                                        activityDateStr, activityAmount, timeMatch, amountMatch, expectedAmount,
                                        transferInitiatedTime);

                                if (timeMatch && amountMatch) {
                                    logger.info(
                                            "✅ Found matching CSD (NONTRADEACTIVITY) for transfer {} - Amount: {}, Date: {}, Initiated: {}",
                                            transferId, activityAmount, activityDateStr, transferInitiatedTime);

                                    return new AlpacaTransferResponse(
                                            transferId,
                                            "COMPLETED",
                                            activityAmount,
                                            activityDateStr,
                                            null);
                                } else {
                                    logger.debug(
                                            "❌ CSD activity doesn't match - Time: {} ({}), Amount: {} (expected: {})",
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
                        (jsonResponse.has("qty") && !jsonResponse.get("qty").isNull()
                                && !"null".equals(jsonResponse.get("qty").asText()))
                                        ? new BigDecimal(jsonResponse.get("qty").asText())
                                        : null,
                        notionalAmount,
                        (jsonResponse.has("filled_qty") && !jsonResponse.get("filled_qty").isNull()
                                && !"null".equals(jsonResponse.get("filled_qty").asText()))
                                        ? new BigDecimal(jsonResponse.get("filled_qty").asText())
                                        : BigDecimal.ZERO,
                        (jsonResponse.has("filled_avg_price") && !jsonResponse.get("filled_avg_price").isNull()
                                && !"null".equals(jsonResponse.get("filled_avg_price").asText()))
                                        ? new BigDecimal(jsonResponse.get("filled_avg_price").asText())
                                        : null,
                        jsonResponse.get("submitted_at").asText(),
                        null);
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
                        (jsonResponse.has("qty") && !jsonResponse.get("qty").isNull()
                                && !"null".equals(jsonResponse.get("qty").asText()))
                                        ? new BigDecimal(jsonResponse.get("qty").asText())
                                        : null,
                        (jsonResponse.has("notional") && !jsonResponse.get("notional").isNull()
                                && !"null".equals(jsonResponse.get("notional").asText()))
                                        ? new BigDecimal(jsonResponse.get("notional").asText())
                                        : null,
                        (jsonResponse.has("filled_qty") && !jsonResponse.get("filled_qty").isNull()
                                && !"null".equals(jsonResponse.get("filled_qty").asText()))
                                        ? new BigDecimal(jsonResponse.get("filled_qty").asText())
                                        : BigDecimal.ZERO,
                        (jsonResponse.has("filled_avg_price") && !jsonResponse.get("filled_avg_price").isNull()
                                && !"null".equals(jsonResponse.get("filled_avg_price").asText()))
                                        ? new BigDecimal(jsonResponse.get("filled_avg_price").asText())
                                        : null,
                        jsonResponse.get("submitted_at").asText(),
                        null);
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

        public AlpacaTransferResponse(String id, String status, BigDecimal amount, String createdAt,
                String errorMessage) {
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

    /**
     * Disable margin trading for an account to make it cash-only
     * This prevents users from borrowing money to buy stocks
     */
    public boolean disableMarginTrading(String accountId) {
        try {
            String url = alpacaBaseUrl + "/accounts/" + accountId + "/configurations";

            Map<String, Object> config = new HashMap<>();
            config.put("max_margin_multiplier", "1.0"); // Cash-only (no borrowing)
            config.put("pdt_check", "both"); // Pattern day trader protection

            HttpHeaders headers = createAuthHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(config, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.PATCH, request, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("Successfully disabled margin trading for account: {}", accountId);
                return true;
            } else {
                logger.error("Failed to disable margin trading. Status: {}, Response: {}",
                        response.getStatusCode(), response.getBody());
                return false;
            }

        } catch (Exception e) {
            logger.error("Error disabling margin trading for account: {}", accountId, e);
            return false;
        }
    }

    /**
     * Configure account for cash-only trading during account creation
     * Call this immediately after creating a new Alpaca account
     */
    public void setupCashOnlyAccount(String accountId) {
        logger.info("Setting up cash-only trading for account: {}", accountId);

        // Wait a moment for account to be fully created
        try {
            Thread.sleep(2000); // 2 second delay
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        boolean success = disableMarginTrading(accountId);
        if (!success) {
            logger.warn("Failed to disable margin trading for account: {}. Will retry later.", accountId);
            // Could implement retry logic here if needed
        }
    }

    /**
     * Update account beneficiaries using Alpaca PATCH API
     * 
     * @param accountId     Alpaca account ID
     * @param beneficiaries List of beneficiaries to set on the account
     * @return true if successful, false otherwise
     */
    public boolean updateAccountBeneficiaries(String accountId,
            java.util.List<com.investingapp.backend.model.Beneficiary> beneficiaries) {
        try {
            String url = alpacaBaseUrl + "/accounts/" + accountId;
            logger.info("Updating beneficiaries for account: {} with {} beneficiaries", accountId,
                    beneficiaries.size());

            // Transform internal beneficiaries to Alpaca format
            java.util.List<Map<String, Object>> alpacaBeneficiaries = new java.util.ArrayList<>();

            for (com.investingapp.backend.model.Beneficiary beneficiary : beneficiaries) {
                // Validate required fields before creating the Alpaca beneficiary object
                if (beneficiary.getFirstName() == null || beneficiary.getFirstName().trim().isEmpty()) {
                    logger.error("Beneficiary missing first name: {}", beneficiary.getId());
                    throw new IllegalArgumentException("Beneficiary first name is required");
                }
                if (beneficiary.getLastName() == null || beneficiary.getLastName().trim().isEmpty()) {
                    logger.error("Beneficiary missing last name: {}", beneficiary.getId());
                    throw new IllegalArgumentException("Beneficiary last name is required");
                }
                if (beneficiary.getDateOfBirth() == null) {
                    logger.error("Beneficiary missing date of birth: {}", beneficiary.getId());
                    throw new IllegalArgumentException("Beneficiary date of birth is required");
                }
                if (beneficiary.getSocialSecurityNumber() == null
                        || beneficiary.getSocialSecurityNumber().trim().isEmpty()) {
                    logger.error("Beneficiary missing SSN: {}", beneficiary.getId());
                    throw new IllegalArgumentException("Beneficiary Social Security Number is required");
                }
                if (beneficiary.getRelationship() == null) {
                    logger.error("Beneficiary missing relationship: {}", beneficiary.getId());
                    throw new IllegalArgumentException("Beneficiary relationship is required");
                }
                if (beneficiary.getPercentageAllocation() == null
                        || beneficiary.getPercentageAllocation().compareTo(BigDecimal.ZERO) <= 0) {
                    logger.error("Beneficiary missing or invalid percentage allocation: {}", beneficiary.getId());
                    throw new IllegalArgumentException("Beneficiary percentage allocation must be greater than 0");
                }

                Map<String, Object> alpacaBeneficiary = new HashMap<>();

                // Required fields according to Alpaca API
                alpacaBeneficiary.put("given_name", beneficiary.getFirstName());
                alpacaBeneficiary.put("family_name", beneficiary.getLastName());
                alpacaBeneficiary.put("date_of_birth", beneficiary.getDateOfBirth().toString()); // Format: YYYY-MM-DD
                alpacaBeneficiary.put("tax_id", beneficiary.getSocialSecurityNumber());
                alpacaBeneficiary.put("tax_id_type", "ssn"); // Assuming SSN for US users
                alpacaBeneficiary.put("relationship", beneficiary.getRelationship().name().toLowerCase());
                alpacaBeneficiary.put("share_pct", beneficiary.getPercentageAllocation().toString());

                // Set type based on beneficiary type
                String type = beneficiary
                        .getBeneficiaryType() == com.investingapp.backend.model.Beneficiary.BeneficiaryType.PRIMARY
                                ? "primary"
                                : "contingent";
                alpacaBeneficiary.put("type", type);

                alpacaBeneficiaries.add(alpacaBeneficiary);

                logger.debug("Added beneficiary to submission: {} {} ({}), DOB: {}, Allocation: {}%",
                        beneficiary.getFirstName(), beneficiary.getLastName(), type,
                        beneficiary.getDateOfBirth(), beneficiary.getPercentageAllocation());
            }

            // Build request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("beneficiaries", alpacaBeneficiaries);

            // Use WebClient for PATCH request (better PATCH support)
            String response = webClient.patch()
                    .uri(url)
                    .header("Authorization",
                            "Basic " + java.util.Base64.getEncoder()
                                    .encodeToString((alpacaApiKey + ":" + alpacaApiSecret).getBytes()))
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            logger.info("Successfully updated beneficiaries for account: {}", accountId);
            return true;

        } catch (Exception e) {
            logger.error("Error updating beneficiaries for account: {}", accountId, e);
            return false;
        }
    }

    /**
     * Get current positions for an account
     */
    public String getCurrentPositions(String accountId) {
        try {
            String url = alpacaBaseUrl + "/trading/accounts/" + accountId + "/positions";

            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            logger.info("Getting positions for account {}", accountId);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                logger.error("Failed to get positions. Status: {}, Response: {}",
                        response.getStatusCode(), response.getBody());
                return null;
            }

        } catch (Exception e) {
            logger.error("Error getting positions for account {}", accountId, e);
            return null;
        }
    }

    /**
     * Place a sell order for a percentage of a position
     */
    public AlpacaOrderResponse placeSellOrderByPercentage(String accountId, String symbol, BigDecimal percentage) {
        try {
            // First get the current position to know how much to sell
            String positionUrl = alpacaBaseUrl + "/trading/accounts/" + accountId + "/positions/" + symbol;
            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> posResponse = restTemplate.exchange(positionUrl, HttpMethod.GET, entity,
                    String.class);

            if (posResponse.getStatusCode() != HttpStatus.OK) {
                return new AlpacaOrderResponse(null, symbol, "FAILED", null, null,
                        BigDecimal.ZERO, null, null, "Could not fetch position for " + symbol);
            }

            JsonNode position = objectMapper.readTree(posResponse.getBody());
            BigDecimal currentQty = new BigDecimal(position.get("qty").asText());

            // Calculate quantity to sell
            BigDecimal qtyToSell = currentQty.multiply(percentage).divide(new BigDecimal("100"));

            // If selling 100% or very close to it, just sell all
            if (percentage.compareTo(new BigDecimal("99.9")) >= 0) {
                qtyToSell = currentQty;
            }

            // Place the sell order
            String orderUrl = alpacaBaseUrl + "/trading/accounts/" + accountId + "/orders";

            Map<String, Object> request = new HashMap<>();
            request.put("symbol", symbol);
            request.put("qty", qtyToSell.toString());
            request.put("side", "sell");
            request.put("type", "market");
            request.put("time_in_force", "day");

            HttpEntity<Map<String, Object>> orderEntity = new HttpEntity<>(request, headers);

            logger.info("Placing sell order for account {} - Symbol: {}, Qty: {} ({}%)",
                    accountId, symbol, qtyToSell, percentage);

            ResponseEntity<String> response = restTemplate.exchange(orderUrl, HttpMethod.POST, orderEntity,
                    String.class);

            if (response.getStatusCode() == HttpStatus.OK || response.getStatusCode() == HttpStatus.CREATED) {
                JsonNode jsonResponse = objectMapper.readTree(response.getBody());
                return new AlpacaOrderResponse(
                        jsonResponse.get("id").asText(),
                        symbol,
                        jsonResponse.get("status").asText(),
                        new BigDecimal(jsonResponse.get("qty").asText()),
                        null,
                        BigDecimal.ZERO,
                        null,
                        jsonResponse.get("submitted_at").asText(),
                        null);
            } else {
                return new AlpacaOrderResponse(null, symbol, "FAILED", null, null,
                        BigDecimal.ZERO, null, null,
                        "HTTP " + response.getStatusCode() + ": " + response.getBody());
            }

        } catch (Exception e) {
            logger.error("Error placing sell order for account {} - Symbol: {}", accountId, symbol, e);
            return new AlpacaOrderResponse(null, symbol, "FAILED", null, null,
                    BigDecimal.ZERO, null, null, e.getMessage());
        }
    }

    /**
     * Liquidate entire portfolio
     */
    public AlpacaOrderResponse liquidatePortfolio(String accountId) {
        try {
            String url = alpacaBaseUrl + "/trading/accounts/" + accountId + "/positions";

            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            logger.info("Liquidating all positions for account {}", accountId);

            // DELETE request to positions endpoint liquidates all positions
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK || response.getStatusCode() == HttpStatus.MULTI_STATUS) {
                // Returns a list of orders, but we'll just return a summary success response
                return new AlpacaOrderResponse(
                        "liquidation-" + System.currentTimeMillis(),
                        "ALL",
                        "ACCEPTED",
                        null, null, BigDecimal.ZERO, null,
                        java.time.Instant.now().toString(),
                        null);
            } else {
                return new AlpacaOrderResponse(null, "ALL", "FAILED", null, null,
                        BigDecimal.ZERO, null, null,
                        "HTTP " + response.getStatusCode() + ": " + response.getBody());
            }

        } catch (Exception e) {
            logger.error("Error liquidating portfolio for account {}", accountId, e);
            return new AlpacaOrderResponse(null, "ALL", "FAILED", null, null,
                    BigDecimal.ZERO, null, null, e.getMessage());
        }
    }

    /**
     * Initiate withdrawal via ACH
     */
    public AlpacaTransferResponse initiateWithdrawal(String accountId, String relationshipId, BigDecimal amount) {
        try {
            String url = alpacaBaseUrl + "/accounts/" + accountId + "/transfers";

            Map<String, Object> request = new HashMap<>();
            request.put("transfer_type", "ach");
            request.put("relationship_id", relationshipId);
            request.put("amount", amount.toString());
            request.put("direction", "OUTGOING");

            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            logger.info("Initiating withdrawal for account {} with amount {}", accountId, amount);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK || response.getStatusCode() == HttpStatus.CREATED) {
                JsonNode jsonResponse = objectMapper.readTree(response.getBody());
                return new AlpacaTransferResponse(
                        jsonResponse.get("id").asText(),
                        jsonResponse.get("status").asText(),
                        amount,
                        jsonResponse.get("created_at").asText(),
                        null);
            } else {
                return new AlpacaTransferResponse(null, "FAILED", amount, null,
                        "HTTP " + response.getStatusCode() + ": " + response.getBody());
            }

        } catch (Exception e) {
            logger.error("Error initiating withdrawal for account {}", accountId, e);
            return new AlpacaTransferResponse(null, "FAILED", amount, null, e.getMessage());
        }
    }
}
