package com.investingapp.backend.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.investingapp.backend.service.AlpacaApiService;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/alpaca")
public class AlpacaController {

    private static final Logger logger = LoggerFactory.getLogger(AlpacaController.class);
    private final AlpacaApiService alpacaApiService;

    public AlpacaController(AlpacaApiService alpacaApiService) {
        this.alpacaApiService = alpacaApiService;
    }

    @GetMapping("/account")
    public ResponseEntity<String> getAccount() {
        try {
            String accountInfo = alpacaApiService.getAccountInfo();
            return ResponseEntity.ok(accountInfo);
        } catch (Exception e) {
            logger.error("Error getting account info: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"error\":\"Failed to get account info\"}");
        }
    }

    @PostMapping("/create-account")
    public ResponseEntity<Map<String, Object>> createAccount(@RequestBody CreateAccountRequest request) {
        try {
            logger.info("Creating Alpaca account for email: {}", request.getEmail());
            
            Map<String, Object> result = alpacaApiService.createAccount(
                request.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                request.getDateOfBirth(),
                request.getSsn(),
                request.getPhone(),
                request.getAddress()
            );
            
            if (result.containsKey("error")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            logger.error("Error creating account: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to create account: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/assets")
    public ResponseEntity<String> getAssets(
            @RequestParam(value = "status", defaultValue = "active") String status,
            @RequestParam(value = "asset_class", defaultValue = "us_equity") String assetClass) {
        try {
            String assets = alpacaApiService.getAssets(status, assetClass);
            return ResponseEntity.ok(assets);
        } catch (Exception e) {
            logger.error("Error getting assets: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"error\":\"Failed to get assets\"}");
        }
    }

    @GetMapping("/account/{accountId}/status")
    public ResponseEntity<String> getAccountStatus(@PathVariable String accountId) {
        try {
            String status = alpacaApiService.getAccountStatus(accountId);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            logger.error("Error getting account status: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"error\":\"Failed to get account status\"}");
        }
    }

    // DTO for account creation request
    public static class CreateAccountRequest {
        private String email;
        private String firstName;
        private String lastName;
        private String dateOfBirth;
        private String ssn;
        private String phone;
        private Map<String, String> address;

        // Getters and setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }

        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }

        public String getDateOfBirth() { return dateOfBirth; }
        public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

        public String getSsn() { return ssn; }
        public void setSsn(String ssn) { this.ssn = ssn; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public Map<String, String> getAddress() { return address; }
        public void setAddress(Map<String, String> address) { this.address = address; }
    }
}