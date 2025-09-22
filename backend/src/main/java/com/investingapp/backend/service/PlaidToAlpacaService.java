package com.investingapp.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.plaid.client.request.PlaidApi;
import com.plaid.client.model.AuthGetRequest;
import com.plaid.client.model.AuthGetResponse;
import com.plaid.client.model.AccountBase;
import com.plaid.client.model.NumbersACH;

import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.service.EncryptionService;

import retrofit2.Response;
import java.util.Arrays;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@Service
public class PlaidToAlpacaService {
    
    private static final Logger logger = LoggerFactory.getLogger(PlaidToAlpacaService.class);
    
    @Autowired
    private PlaidApi plaidApi;
    
    @Autowired
    private AlpacaApiService alpacaApiService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EncryptionService encryptionService;

    /**
     * Create ACH relationship using Plaid access token
     * This gets bank account details from Plaid and creates ACH relationship in Alpaca
     */
    public Map<String, Object> createAchRelationshipFromPlaid(String alpacaAccountId, 
                                                            String plaidAccessToken, 
                                                            String plaidAccountId, 
                                                            String accountOwnerName,
                                                            String userEmail) {
        logger.info("Creating ACH relationship for Alpaca account {} using Plaid account {}", 
                   alpacaAccountId, plaidAccountId);
        
        try {
            // Get bank account details from Plaid
            PlaidBankAccount bankAccount = getBankAccountFromPlaid(plaidAccessToken, plaidAccountId);
            
            if (bankAccount == null) {
                Map<String, Object> errorResult = new HashMap<>();
                errorResult.put("error", "Could not retrieve bank account from Plaid");
                return errorResult;
            }
            
            // Create ACH relationship in Alpaca using Plaid data
            Map<String, Object> achResult = alpacaApiService.createAchRelationship(
                alpacaAccountId,
                accountOwnerName,
                bankAccount.getAccountType(),
                bankAccount.getAccountNumber(),
                bankAccount.getRoutingNumber(),
                bankAccount.getNickname()
            );
            
            // If ACH creation was successful, save the relationship ID to user profile
            if (achResult != null && !achResult.containsKey("error")) {
                String achRelationshipId = (String) achResult.get("id");
                String achStatus = (String) achResult.get("status");
                
                if (achRelationshipId != null) {
                    saveAchRelationshipToUser(userEmail, alpacaAccountId, achRelationshipId, achStatus);
                    logger.info("Saved ACH relationship {} to user profile {}", achRelationshipId, userEmail);
                }
            }
            
            return achResult;
            
        } catch (Exception e) {
            logger.error("Error creating ACH relationship from Plaid: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("error", "Failed to create ACH relationship from Plaid: " + e.getMessage());
            return errorResult;
        }
    }

    /**
     * Save ACH relationship information to user profile for future funding operations
     */
    private void saveAchRelationshipToUser(String userEmail, String alpacaAccountId, 
                                         String achRelationshipId, String achStatus) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                user.setAlpacaAccountId(alpacaAccountId);
                user.setAlpacaAchRelationshipId(achRelationshipId);
                user.setAlpacaAchStatus(achStatus);
                userRepository.save(user);
                logger.info("Successfully saved ACH relationship data for user: {}", userEmail);
            } else {
                logger.error("User not found when trying to save ACH relationship: {}", userEmail);
            }
        } catch (Exception e) {
            logger.error("Error saving ACH relationship to user profile: {}", e.getMessage(), e);
        }
    }

    /**
     * Get bank account details from Plaid using access token
     */
    private PlaidBankAccount getBankAccountFromPlaid(String encryptedAccessToken, String accountId) {
        try {
            // Decrypt the access token before using it with Plaid API
            String accessToken = encryptionService.decrypt(encryptedAccessToken);
            
            // Create Plaid Auth request - get all accounts and filter later
            AuthGetRequest request = new AuthGetRequest()
                .accessToken(accessToken);

            // Get account and routing numbers from Plaid
            retrofit2.Response<AuthGetResponse> apiResponse = plaidApi.authGet(request).execute();
            
            if (!apiResponse.isSuccessful() || apiResponse.body() == null) {
                String errorBody = apiResponse.errorBody() != null ? apiResponse.errorBody().string() : "Unknown error";
                logger.error("Plaid Auth API call failed: {} - {}", apiResponse.code(), errorBody);
                return null;
            }
            
            AuthGetResponse response = apiResponse.body();
            
            if (response.getAccounts().isEmpty()) {
                logger.error("No accounts found for access token");
                return null;
            }

            // Find the specific account
            AccountBase account = response.getAccounts().stream()
                .filter(acc -> acc.getAccountId().equals(accountId))
                .findFirst()
                .orElse(null);

            if (account == null) {
                logger.error("Account {} not found in Plaid response", accountId);
                return null;
            }

            // Get ACH numbers for the account
            NumbersACH achNumbers = response.getNumbers().getAch().stream()
                .filter(ach -> ach.getAccountId().equals(accountId))
                .findFirst()
                .orElse(null);

            if (achNumbers == null) {
                logger.error("ACH numbers not found for account {}", accountId);
                return null;
            }

            // Map Plaid account type to Alpaca format
            String subtypeString = account.getSubtype() != null ? account.getSubtype().toString() : null;
            String alpacaAccountType = mapPlaidAccountType(subtypeString);
            
            // Create nickname from account info
            String nickname = String.format("%s %s ****%s", 
                account.getOfficialName() != null ? account.getOfficialName() : "Bank",
                alpacaAccountType,
                achNumbers.getAccount().substring(Math.max(0, achNumbers.getAccount().length() - 4))
            );

            return new PlaidBankAccount(
                achNumbers.getAccount(),
                achNumbers.getRouting(),
                alpacaAccountType,
                nickname
            );

        } catch (Exception e) {
            logger.error("Error getting bank account from Plaid: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Map Plaid account subtype to Alpaca account type
     */
    private String mapPlaidAccountType(String plaidSubtype) {
        if (plaidSubtype == null) {
            return "CHECKING"; // Default
        }
        
        switch (plaidSubtype.toLowerCase()) {
            case "checking":
                return "CHECKING";
            case "savings":
                return "SAVINGS";
            case "money market":
                return "SAVINGS"; // Treat money market as savings
            default:
                logger.warn("Unknown Plaid account subtype: {}, defaulting to CHECKING", plaidSubtype);
                return "CHECKING";
        }
    }

    /**
     * Inner class to hold bank account data from Plaid
     */
    private static class PlaidBankAccount {
        private final String accountNumber;
        private final String routingNumber;
        private final String accountType;
        private final String nickname;

        public PlaidBankAccount(String accountNumber, String routingNumber, String accountType, String nickname) {
            this.accountNumber = accountNumber;
            this.routingNumber = routingNumber;
            this.accountType = accountType;
            this.nickname = nickname;
        }

        public String getAccountNumber() { return accountNumber; }
        public String getRoutingNumber() { return routingNumber; }
        public String getAccountType() { return accountType; }
        public String getNickname() { return nickname; }
    }
}
