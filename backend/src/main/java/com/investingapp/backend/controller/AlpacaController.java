package com.investingapp.backend.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.investingapp.backend.service.AlpacaApiService;
import com.investingapp.backend.service.PlaidToAlpacaService;
import com.investingapp.backend.security.services.UserDetailsImpl;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/alpaca")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AlpacaController {

    private static final Logger logger = LoggerFactory.getLogger(AlpacaController.class);
    private final AlpacaApiService alpacaApiService;
    private final PlaidToAlpacaService plaidToAlpacaService;
    private final com.investingapp.backend.repository.UserRepository userRepository;

    public AlpacaController(AlpacaApiService alpacaApiService, PlaidToAlpacaService plaidToAlpacaService,
            com.investingapp.backend.repository.UserRepository userRepository) {
        this.alpacaApiService = alpacaApiService;
        this.plaidToAlpacaService = plaidToAlpacaService;
        this.userRepository = userRepository;
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
                    request.getAddress());

            if (result.containsKey("error")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }

            // Save Alpaca Account ID and Number to User entity
            String email = request.getEmail();
            if (email != null && !email.isEmpty()) {
                com.investingapp.backend.model.User user = userRepository.findByEmail(email).orElse(null);
                if (user != null) {
                    if (result.containsKey("account_id")) {
                        user.setAlpacaAccountId((String) result.get("account_id"));
                    }
                    if (result.containsKey("account_number")) {
                        user.setAlpacaAccountNumber((String) result.get("account_number"));
                    }
                    userRepository.save(user);
                    logger.info("Saved Alpaca Account ID and Number for user: {}", email);
                } else {
                    logger.warn("User not found for email: {}, could not save Alpaca details locally", email);
                }
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            logger.error("Error creating Alpaca account", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/sync-account-number")
    public ResponseEntity<?> syncAccountNumber(org.springframework.security.core.Authentication authentication) {
        String email = authentication.getName();
        com.investingapp.backend.model.User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }

        String accountId = user.getAlpacaAccountId();
        if (accountId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No Alpaca account ID found for user"));
        }

        String accountNumber = alpacaApiService.getAccountNumber(accountId);
        if (accountNumber != null) {
            user.setAlpacaAccountNumber(accountNumber);
            userRepository.save(user);
            logger.info("Synced Alpaca Account Number for user: {}", email);
            return ResponseEntity.ok(Map.of("account_number", accountNumber));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Could not fetch account number from Alpaca"));
        }
    }

    @GetMapping("/assets")
    public ResponseEntity<String> getAssets(
            @RequestParam(value = "status", defaultValue = "active") String status,
            @RequestParam(value = "asset_class", defaultValue = "us_equity") String assetClass,
            @RequestParam(value = "search", required = false) String search) {
        try {
            logger.info("Getting assets with status: {}, asset_class: {}, search: {}", status, assetClass, search);
            String assets = alpacaApiService.getAssets(status, assetClass, search);
            return ResponseEntity.ok(assets);
        } catch (Exception e) {
            logger.error("Error getting assets: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\":\"Failed to get assets\"}");
        }
    }

    @PostMapping("/accounts/{accountId}/ach-relationships")
    public ResponseEntity<Map<String, Object>> createAchRelationship(
            @PathVariable String accountId,
            @RequestBody CreateAchRelationshipRequest request) {
        try {
            logger.info("Creating ACH relationship for account: {}", accountId);

            Map<String, Object> result = alpacaApiService.createAchRelationship(
                    accountId,
                    request.getAccountOwnerName(),
                    request.getBankAccountType(),
                    request.getBankAccountNumber(),
                    request.getBankRoutingNumber(),
                    request.getNickname());

            if (result.containsKey("error")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            logger.error("Error creating ACH relationship: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to create ACH relationship: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/accounts/{accountId}/ach-relationships/plaid")
    public ResponseEntity<Map<String, Object>> createAchRelationshipFromPlaid(
            @PathVariable String accountId,
            @RequestBody CreateAchFromPlaidRequest request,
            Authentication authentication) {
        try {
            logger.info("Creating ACH relationship for account {} using Plaid", accountId);

            // Get user email from authentication
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            String userEmail = userDetails.getUsername();

            Map<String, Object> result = plaidToAlpacaService.createAchRelationshipFromPlaid(
                    accountId,
                    request.getPlaidAccessToken(),
                    request.getPlaidAccountId(),
                    request.getAccountOwnerName(),
                    userEmail);

            if (result.containsKey("error")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            logger.error("Error creating ACH relationship from Plaid: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to create ACH relationship from Plaid: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/accounts/{accountId}/ach-relationships")
    public ResponseEntity<String> getAchRelationships(@PathVariable String accountId) {
        try {
            String relationships = alpacaApiService.getAchRelationships(accountId);
            return ResponseEntity.ok(relationships);
        } catch (Exception e) {
            logger.error("Error getting ACH relationships: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\":\"Failed to get ACH relationships\"}");
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
        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getDateOfBirth() {
            return dateOfBirth;
        }

        public void setDateOfBirth(String dateOfBirth) {
            this.dateOfBirth = dateOfBirth;
        }

        public String getSsn() {
            return ssn;
        }

        public void setSsn(String ssn) {
            this.ssn = ssn;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public Map<String, String> getAddress() {
            return address;
        }

        public void setAddress(Map<String, String> address) {
            this.address = address;
        }
    }

    @PostMapping("/acats/transfer")
    public ResponseEntity<?> initiateAcatsTransfer(@RequestBody AcatsTransferRequest request) {
        try {
            User user = getCurrentUser();
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
            }
            if (user.getAlpacaAccountId() == null) {
                return ResponseEntity.badRequest().body("User does not have an Alpaca account");
            }

            String transferId = alpacaService.initiateAcatsTransfer(
                user.getAlpacaAccountId(), 
                request.getAccountNumber(), 
                "BROKERAGE", 
                request.getDtcNumber()
            );
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("transferId", transferId);
            response.put("message", "ACATS transfer initiated successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error initiating ACATS transfer", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to initiate transfer: " + e.getMessage()));
        }
    }

    public static class AcatsTransferRequest {
        private String dtcNumber;
        private String accountNumber;
        
        public String getDtcNumber() { return dtcNumber; }
        public void setDtcNumber(String dtcNumber) { this.dtcNumber = dtcNumber; }
        public String getAccountNumber() { return accountNumber; }
        public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }
    }

    // DTO for ACH relationship creation request
    public static class CreateAchRelationshipRequest {
        private String accountOwnerName;
        private String bankAccountType; // CHECKING or SAVINGS
        private String bankAccountNumber;
        private String bankRoutingNumber;
        private String nickname;

        // Getters and setters
        public String getAccountOwnerName() {
            return accountOwnerName;
        }

        public void setAccountOwnerName(String accountOwnerName) {
            this.accountOwnerName = accountOwnerName;
        }

        public String getBankAccountType() {
            return bankAccountType;
        }

        public void setBankAccountType(String bankAccountType) {
            this.bankAccountType = bankAccountType;
        }

        public String getBankAccountNumber() {
            return bankAccountNumber;
        }

        public void setBankAccountNumber(String bankAccountNumber) {
            this.bankAccountNumber = bankAccountNumber;
        }

        public String getBankRoutingNumber() {
            return bankRoutingNumber;
        }

        public void setBankRoutingNumber(String bankRoutingNumber) {
            this.bankRoutingNumber = bankRoutingNumber;
        }

        public String getNickname() {
            return nickname;
        }

        public void setNickname(String nickname) {
            this.nickname = nickname;
        }
    }

    // DTO for ACH relationship creation using Plaid
    public static class CreateAchFromPlaidRequest {
        private String plaidAccessToken;
        private String plaidAccountId;
        private String accountOwnerName;

        // Getters and setters
        public String getPlaidAccessToken() {
            return plaidAccessToken;
        }

        public void setPlaidAccessToken(String plaidAccessToken) {
            this.plaidAccessToken = plaidAccessToken;
        }

        public String getPlaidAccountId() {
            return plaidAccountId;
        }

        public void setPlaidAccountId(String plaidAccountId) {
            this.plaidAccountId = plaidAccountId;
        }

        public String getAccountOwnerName() {
            return accountOwnerName;
        }

        public void setAccountOwnerName(String accountOwnerName) {
            this.accountOwnerName = accountOwnerName;
        }
    }
}