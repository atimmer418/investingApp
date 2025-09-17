// src/main/java/com/investingapp/backend/service/PlaidService.java
package com.investingapp.backend.service;

import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.service.EncryptionService;
// Import for frequency enum
import com.plaid.client.model.*;
import com.plaid.client.request.PlaidApi;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Import Transactional
import retrofit2.Response;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime; // For expiry
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
// Removed UUID, ConcurrentHashMap, TimeUnit as they are no longer needed for this part

import java.util.Collections;
import java.util.stream.Collectors;


@Service
public class PlaidService {

    private static final Logger logger = LoggerFactory.getLogger(PlaidService.class);

    @Autowired
    private PlaidApi plaidApi;

    @Autowired
    private UserRepository userRepository;

    @Value("${plaid.client.name}")
    private String plaidClientName;

    @Autowired
    private EncryptionService encryptionService;

    public LinkTokenCreateResponse createLinkTokenForAuthenticatedUser(String clientUserId) throws IOException {
        logger.info("Creating Plaid Link token for authenticated user ID: {}", clientUserId);
        LinkTokenCreateRequestUser user = new LinkTokenCreateRequestUser().clientUserId(clientUserId);
        List<Products> products = Arrays.asList(Products.AUTH, Products.TRANSACTIONS);
        List<CountryCode> countryCodes = Arrays.asList(CountryCode.US);

        LinkTokenCreateRequest request = new LinkTokenCreateRequest()
                .user(user)
                .clientName(plaidClientName)
                .products(products)
                .countryCodes(countryCodes)
                .language("en");

        Response<LinkTokenCreateResponse> response = plaidApi.linkTokenCreate(request).execute();
        if (!response.isSuccessful() || response.body() == null) {
            String errorBody = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
            logger.error("Plaid Link Token creation failed: {} - {}", response.code(), errorBody);
            throw new IOException("Plaid Link Token creation failed: " + errorBody);
        }
        logger.info("Successfully created Link token with TRANSACTIONS product");
        return response.body();
    }

    // exchangePublicTokenAndLinkUser method - enhanced to store account details
    @Transactional // Add transactional if multiple DB operations
    public ItemPublicTokenExchangeResponse exchangePublicTokenAndLinkUser(String publicToken, User appUser) throws IOException {
        logger.info("Exchanging public token for user ID: {}", appUser.getId());
        ItemPublicTokenExchangeRequest request = new ItemPublicTokenExchangeRequest().publicToken(publicToken);
        Response<ItemPublicTokenExchangeResponse> response = plaidApi.itemPublicTokenExchange(request).execute();

        if (!response.isSuccessful() || response.body() == null) {
            String errorBody = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
            logger.error("Plaid Public Token exchange failed for user {}: {} - {}", appUser.getId(), response.code(), errorBody);
            throw new IOException("Plaid Public Token exchange failed: " + errorBody);
        }

        ItemPublicTokenExchangeResponse exchangeResponse = response.body();
        String rawAccessToken = exchangeResponse.getAccessToken(); // Raw token from Plaid

        String encryptedAccessToken = encryptionService.encrypt(rawAccessToken);

        // Store basic Plaid info
        appUser.setPlaidAccessToken(encryptedAccessToken);
        appUser.setPlaidItemId(exchangeResponse.getItemId());
        appUser.setPlaidLinked(true);
        
        try {
            // Fetch and store account details and institution information
            populateAccountAndInstitutionDetails(rawAccessToken, appUser);
            logger.info("Successfully populated account and institution details for user ID: {}", appUser.getId());
        } catch (Exception e) {
            logger.error("Failed to populate account details for user {}: {}", appUser.getId(), e.getMessage());
            // Don't fail the whole process if this fails - user can still use the app
        }
        
        userRepository.save(appUser);
        logger.info("Plaid item linked to user ID: {} with account details", appUser.getId());
        return exchangeResponse;
    }
    
    /**
     * Fetch and populate account details and institution information
     */
    private void populateAccountAndInstitutionDetails(String accessToken, User appUser) throws IOException {
        // 1. Get accounts information
        AccountsGetRequest accountsRequest = new AccountsGetRequest().accessToken(accessToken);
        Response<AccountsGetResponse> accountsResponse = plaidApi.accountsGet(accountsRequest).execute();
        
        if (!accountsResponse.isSuccessful() || accountsResponse.body() == null) {
            throw new IOException("Failed to fetch account details from Plaid");
        }
        
        List<AccountBase> accounts = accountsResponse.body().getAccounts();
        if (!accounts.isEmpty()) {
            // Use the first checking account, or first account if no checking account
            AccountBase primaryAccount = accounts.stream()
                .filter(acc -> acc.getSubtype() != null && 
                              acc.getSubtype().toString().toLowerCase().contains("checking"))
                .findFirst()
                .orElse(accounts.get(0));
            
            // Store account details
            appUser.setPlaidAccountId(primaryAccount.getAccountId());
            appUser.setPlaidAccountName(primaryAccount.getName());
            appUser.setPlaidAccountType(primaryAccount.getType() != null ? 
                primaryAccount.getType().toString() : null);
            appUser.setPlaidAccountSubtype(primaryAccount.getSubtype() != null ? 
                primaryAccount.getSubtype().toString() : null);
            
            logger.info("Set primary account for user {}: {} ({})", 
                appUser.getId(), primaryAccount.getName(), primaryAccount.getSubtype());
        }
        
        // 2. Get institution information
        try {
            InstitutionsGetByIdRequest institutionRequest = new InstitutionsGetByIdRequest()
                .institutionId(accountsResponse.body().getItem().getInstitutionId())
                .countryCodes(Arrays.asList(CountryCode.US));
            
            Response<InstitutionsGetByIdResponse> institutionResponse = 
                plaidApi.institutionsGetById(institutionRequest).execute();
            
            if (institutionResponse.isSuccessful() && institutionResponse.body() != null) {
                Institution institution = institutionResponse.body().getInstitution();
                appUser.setPlaidInstitutionName(institution.getName());
                
                logger.info("Set institution for user {}: {}", 
                    appUser.getId(), institution.getName());
            }
        } catch (Exception e) {
            logger.warn("Could not fetch institution details for user {}: {}", 
                appUser.getId(), e.getMessage());
            // Don't fail if institution lookup fails
        }
    }
}