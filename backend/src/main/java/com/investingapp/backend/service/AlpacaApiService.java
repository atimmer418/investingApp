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
    private final String baseUrl;

    public AlpacaApiService(
        @Value("${alpaca.api.key}") String apiKey,
        @Value("${alpaca.api.secret}") String apiSecret,
        @Value("${alpaca.api.base-url:https://broker-api.sandbox.alpaca.markets/v1}") String baseUrl
    ) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = baseUrl;
        
        // Log configuration (without exposing secrets)
        logger.info("AlpacaApiService initialized:");
        logger.info("  Base URL: {}", baseUrl);
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
            baseUrl + "/accounts", 
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
        
        Map<String, Object> accountData = new HashMap<>();
        
        // Contact information
        Map<String, String> contactInfo = new HashMap<>();
        contactInfo.put("email_address", email);
        contactInfo.put("phone_number", phone);
        
        // Identity information
        Map<String, String> identity = new HashMap<>();
        identity.put("given_name", firstName);
        identity.put("family_name", lastName);
        identity.put("date_of_birth", dateOfBirth); // Format: YYYY-MM-DD
        identity.put("tax_id", ssn);
        identity.put("tax_id_type", "USA_SSN");
        identity.put("country_of_citizenship", "USA");
        identity.put("country_of_birth", "USA");
        
        // Address information
        accountData.put("contact", contactInfo);
        accountData.put("identity", identity);
        accountData.put("disclosures", Map.of(
            "is_control_person", false,
            "is_affiliated_exchange_or_finra", false,
            "is_politically_exposed", false,
            "immediate_family_exposed", false
        ));
        accountData.put("agreements", List.of(
            Map.of(
                "agreement", "margin_agreement",
                "signed_at", java.time.Instant.now().toString(),
                "ip_address", "127.0.0.1"
            ),
            Map.of(
                "agreement", "account_agreement",
                "signed_at", java.time.Instant.now().toString(),
                "ip_address", "127.0.0.1"
            ),
            Map.of(
                "agreement", "customer_agreement",
                "signed_at", java.time.Instant.now().toString(),
                "ip_address", "127.0.0.1"
            )
        ));
        
        if (address != null) {
            accountData.put("address", address);
        }

        try {
            String jsonBody = objectMapper.writeValueAsString(accountData);
            logger.debug("Alpaca account creation request: {}", jsonBody);
            
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(
                baseUrl + "/accounts",
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
     * Get account status by account ID
     */
    public String getAccountStatus(String accountId) {
        HttpEntity<String> entity = new HttpEntity<>(createHeaders());
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/accounts/" + accountId,
            HttpMethod.GET,
            entity,
            String.class
        );
        return response.getBody();
    }
}