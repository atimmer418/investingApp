package com.investingapp.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

@Service
public class AlpacaApiService {
    
    private static final Logger logger = LoggerFactory.getLogger(AlpacaApiService.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String apiSecret;
    private final String brokerBaseUrl;
    private final String tradingBaseUrl;

    public AlpacaApiService(
        @Value("${alpaca.api.key}") String apiKey,
        @Value("${alpaca.api.secret}") String apiSecret,
        @Value("${alpaca.broker.base-url:https://broker-api.sandbox.alpaca.markets/v1}") String brokerBaseUrl,
        @Value("${alpaca.trading.base-url:https://paper-api.alpaca.markets/v2}") String tradingBaseUrl
    ) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.brokerBaseUrl = brokerBaseUrl;
        this.tradingBaseUrl = tradingBaseUrl;
        
        // Log configuration (without exposing secrets)
        logger.info("AlpacaApiService initialized:");
        logger.info("  Broker Base URL: {}", brokerBaseUrl);
        logger.info("  Trading Base URL: {}", tradingBaseUrl);
        logger.info("  API Key: {}", apiKey != null ? apiKey.substring(0, Math.min(8, apiKey.length())) + "..." : "null");
        logger.info("  API Secret: {}", apiSecret != null ? "***set***" : "null");
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        // Use HTTP Basic authentication for Broker API
        String credentials = apiKey + ":" + apiSecret;
        String base64Credentials = Base64.getEncoder().encodeToString(
            credentials.getBytes(StandardCharsets.UTF_8)
        );
        headers.set("Authorization", "Basic " + base64Credentials);
        
        return headers;
    }

    public String getAccountInfo() {
        HttpEntity<String> entity = new HttpEntity<>(createHeaders());
        ResponseEntity<String> response = restTemplate.exchange(
            brokerBaseUrl + "/accounts", 
            HttpMethod.GET, 
            entity, 
            String.class
        );
        return response.getBody();
    }

    /**
     * Create an Alpaca account for a user
     * This is a simplified version - in reality, Alpaca requires extensive KYC information
     */
    public Map<String, Object> createAccount(String email, String firstName, String lastName, 
                                           String dateOfBirth, String ssn, String phone,
                                           Map<String, String> address) {
        logger.info("Creating Alpaca account for user: {}", email);
        
        // Add parameter validation and logging
        logger.debug("Parameters received - email: {}, firstName: {}, lastName: {}, dateOfBirth: {}, ssn: {}, phone: {}, address: {}", 
            email, firstName, lastName, dateOfBirth, ssn, phone, address);
        
        if (address != null) {
            logger.debug("Address details - street_address: {}, city: {}, state: {}, postal_code: {}", 
                address.get("street_address"), address.get("city"), address.get("state"), address.get("postal_code"));
        }
        
        if (email == null || firstName == null || lastName == null) {
            logger.error("Required parameters are null - email: {}, firstName: {}, lastName: {}", email, firstName, lastName);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("error", "Required parameters cannot be null: email, firstName, lastName");
            return errorResult;
        }
        
        Map<String, Object> accountData = new HashMap<>();
        
        // Contact information
        Map<String, Object> contactInfo = new HashMap<>();
        contactInfo.put("email_address", email);
        contactInfo.put("phone_number", phone);
        
        // Add address to contact if provided
        if (address != null) {
            String streetAddress = address.get("street_address"); // Fixed: use correct key
            if (streetAddress != null) {
                contactInfo.put("street_address", List.of(streetAddress));
            }
            contactInfo.put("city", address.get("city"));
            contactInfo.put("state", address.get("state"));
            contactInfo.put("postal_code", address.get("postal_code"));
        }
        
        // Identity information
        Map<String, Object> identity = new HashMap<>();
        identity.put("given_name", firstName);
        identity.put("family_name", lastName);
        identity.put("date_of_birth", dateOfBirth); // Format: YYYY-MM-DD
        identity.put("tax_id", ssn);
        identity.put("tax_id_type", "USA_SSN");
        identity.put("country_of_citizenship", "USA");
        identity.put("country_of_birth", "USA");
        identity.put("country_of_tax_residence", "USA");
        identity.put("funding_source", List.of("employment_income"));
        
        // Trusted contact (required)
        Map<String, String> trustedContact = new HashMap<>();
        trustedContact.put("given_name", firstName); // Use same person for simplicity
        trustedContact.put("family_name", lastName);
        trustedContact.put("email_address", email);
        
        // Build account data
        accountData.put("contact", contactInfo);
        accountData.put("identity", identity);
        accountData.put("trusted_contact", trustedContact);
        accountData.put("disclosures", Map.of(
            "is_control_person", false,
            "is_affiliated_exchange_or_finra", false,
            "is_affiliated_exchange_or_iiroc", false,
            "is_politically_exposed", false,
            "immediate_family_exposed", false
        ));
        accountData.put("agreements", List.of(
            Map.of(
                "agreement", "customer_agreement",
                "signed_at", java.time.Instant.now().toString(),
                "ip_address", "127.0.0.1"
            )
        ));
        
        // Remove the separate address handling since it's now in contact
        
        try {
            String jsonBody = objectMapper.writeValueAsString(accountData);
            logger.debug("Alpaca account creation request: {}", jsonBody);
            
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(
                brokerBaseUrl + "/accounts",
                HttpMethod.POST,
                entity,
                String.class
            );
            
            String responseBody = response.getBody();
            JsonNode responseNode = objectMapper.readTree(responseBody);
            Map<String, Object> result = new HashMap<>();
            result.put("account_id", responseNode.get("id").asText());
            result.put("status", responseNode.get("status").asText());
            result.put("created_at", responseNode.get("created_at").asText());
            result.put("raw_response", responseBody);
            logger.info("Successfully created Alpaca account: {}", result.get("account_id"));
            return result;
            
        } catch (JsonProcessingException e) {
            logger.error("Error processing JSON", e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("error", "Failed to process JSON: " + e.getMessage());
            return errorResult;
        } catch (Exception e) {
            logger.error("Error creating Alpaca account for {}: {}", email, e.getMessage());
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("error", "Failed to create account: " + e.getMessage());
            return errorResult;
        }
    }

    /**
     * Get tradeable assets from Alpaca
     * Note: Assets endpoint is typically public and doesn't require authentication
     */
    public String getAssets(String status, String assetClass, String search) {
        
        // Add query parameters
        StringBuilder queryParams = new StringBuilder("?");
        if (status != null && !status.isEmpty()) {
            queryParams.append("status=").append(status).append("&");
        }
        if (assetClass != null && !assetClass.isEmpty()) {
            queryParams.append("asset_class=").append(assetClass).append("&");
        }
        if (search != null && !search.isEmpty()) {
            queryParams.append("search=").append(search).append("&");
        }

        String fullUrl = brokerBaseUrl + "/assets" + queryParams.toString().replaceAll("&$", "");
        logger.info("Fetching assets from: {}", fullUrl);
        logger.info("Using API Key: {}***", apiKey != null ? apiKey.substring(0, Math.min(4, apiKey.length())) : "null");
        
        try {
            HttpEntity<String> entity = new HttpEntity<>(createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(
                fullUrl,
                HttpMethod.GET,
                entity,
                String.class
            );
            
            String responseBody = response.getBody();
            logger.info("Assets API response status: {}, body length: {}", 
                response.getStatusCode(), 
                responseBody != null ? responseBody.length() : 0);
            
            if (responseBody != null && responseBody.length() > 100) {
                logger.debug("Assets API response preview: {}", responseBody.substring(0, 100) + "...");
            }
            
            return responseBody;
        } catch (Exception e) {
            logger.error("Error calling Alpaca assets API: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch assets from Alpaca: " + e.getMessage(), e);
        }
    }

    /**
     * Create ACH relationship for an Alpaca account using bank details
     */
    public Map<String, Object> createAchRelationship(String accountId, String accountOwnerName, 
                                                   String bankAccountType, String bankAccountNumber, 
                                                   String bankRoutingNumber, String nickname) {
        logger.info("Creating ACH relationship for account: {}", accountId);
        
        try {
            Map<String, Object> achData = new HashMap<>();
            achData.put("account_owner_name", accountOwnerName);
            achData.put("bank_account_type", bankAccountType.toUpperCase()); // CHECKING or SAVINGS
            achData.put("bank_account_number", bankAccountNumber);
            achData.put("bank_routing_number", bankRoutingNumber);
            achData.put("nickname", nickname);
            
            String jsonBody = objectMapper.writeValueAsString(achData);
            logger.debug("ACH relationship creation request: {}", jsonBody);
            
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(
                brokerBaseUrl + "/accounts/" + accountId + "/ach_relationships",
                HttpMethod.POST,
                entity,
                String.class
            );
            
            String responseBody = response.getBody();
            JsonNode responseNode = objectMapper.readTree(responseBody);
            Map<String, Object> result = new HashMap<>();
            result.put("id", responseNode.get("id").asText());
            result.put("status", responseNode.get("status").asText());
            result.put("created_at", responseNode.get("created_at").asText());
            result.put("raw_response", responseBody);
            logger.info("Successfully created ACH relationship: {}", result.get("id"));
            return result;
            
        } catch (Exception e) {
            logger.error("Error creating ACH relationship for account {}: {}", accountId, e.getMessage(), e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("error", "Failed to create ACH relationship: " + e.getMessage());
            return errorResult;
        }
    }

    /**
     * Get ACH relationships for an account
     */
    public String getAchRelationships(String accountId) {
        logger.debug("Getting ACH relationships for account: {}", accountId);
        
        HttpEntity<String> entity = new HttpEntity<>(createHeaders());
        ResponseEntity<String> response = restTemplate.exchange(
            brokerBaseUrl + "/accounts/" + accountId + "/ach_relationships",
            HttpMethod.GET,
            entity,
            String.class
        );
        return response.getBody();
    }

    /**
     * Get account status by account ID
     */
    public String getAccountStatus(String accountId) {
        HttpEntity<String> entity = new HttpEntity<>(createHeaders());
        ResponseEntity<String> response = restTemplate.exchange(
            brokerBaseUrl + "/accounts/" + accountId,
            HttpMethod.GET,
            entity,
            String.class
        );
        return response.getBody();
    }
}