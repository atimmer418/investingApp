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
import java.time.LocalDateTime; // For expiry
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
// Removed UUID, ConcurrentHashMap, TimeUnit as they are no longer needed for this part

import com.investingapp.backend.dto.PaycheckSourceDto;

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

    public List<PaycheckSourceDto> getRecurringIncome(String decryptedAccessToken) throws IOException {
        logger.info("Fetching recurring income for an access token.");
        List<PaycheckSourceDto> paycheckSources = new ArrayList<>();

        // 1. Get all account IDs for the access token
        AccountsGetRequest accountsRequest = new AccountsGetRequest().accessToken(decryptedAccessToken);
        Response<AccountsGetResponse> accountsResponse = plaidApi.accountsGet(accountsRequest).execute();

        if (!accountsResponse.isSuccessful() || accountsResponse.body() == null) {
            String errorBody = accountsResponse.errorBody() != null ? accountsResponse.errorBody().string() : "Unknown error fetching accounts";
            logger.error("Plaid /accounts/get failed: {} - {}", accountsResponse.code(), errorBody);
            throw new IOException("Failed to fetch accounts for income analysis: " + errorBody);
        }
        List<String> accountIds = accountsResponse.body().getAccounts().stream()
                                    .map(AccountBase::getAccountId)
                                    .collect(Collectors.toList());

        if (accountIds.isEmpty()) {
            logger.info("No accounts found for the given access token. Cannot fetch recurring income.");
            return Collections.emptyList();
        }
        
        // 2. Fetch recurring transactions for these account IDs
        TransactionsRecurringGetRequest recurringRequest = new TransactionsRecurringGetRequest()
                .accessToken(decryptedAccessToken)
                .accountIds(accountIds);
        
        logger.debug("Calling Plaid /transactions/recurring/get for account IDs: {}", accountIds);
        Response<TransactionsRecurringGetResponse> response = plaidApi.transactionsRecurringGet(recurringRequest).execute();

        if (!response.isSuccessful() || response.body() == null) {
            String errorBody = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
            logger.error("Plaid /transactions/recurring/get failed: {} - {}", response.code(), errorBody);
            throw new IOException("Plaid /transactions/recurring/get failed: " + errorBody);
        }

        TransactionsRecurringGetResponse recurringData = response.body();
        logger.info("Received {} inflow streams and {} outflow streams.", 
            recurringData.getInflowStreams().size(), 
            recurringData.getOutflowStreams().size());

        for (TransactionStream stream : recurringData.getInflowStreams()) {
            // Basic filtering: consider streams that are active and have a known frequency
            if ((stream.getStatus() == TransactionStreamStatus.MATURE || stream.getStatus() == TransactionStreamStatus.EARLY_DETECTION) &&
                stream.getFrequency() != null &&
                stream.getFrequency() != RecurringTransactionFrequency.UNKNOWN &&
                stream.getFrequency() != RecurringTransactionFrequency.ANNUALLY /* Annually might not be a typical paycheck */) {
                
                PaycheckSourceDto dto = new PaycheckSourceDto();
                dto.setAccountId(stream.getAccountId());
                
                // Use merchant name if available, otherwise description.
                String name = stream.getMerchantName();
                if (name == null || name.trim().isEmpty() || name.equalsIgnoreCase("null")) { // Plaid sometimes returns "null" as string
                    name = stream.getDescription();
                }
                dto.setName(name != null ? name : "Unknown Income Source");

                if (stream.getLastAmount() != null && stream.getLastAmount().getAmount() != null) {
                    Double amountValue = stream.getLastAmount().getAmount();
                    // Convert to BigDecimal if your DTO expects BigDecimal, then take abs
                    dto.setLastAmount(BigDecimal.valueOf(Math.abs(amountValue))); 
                } else {
                    dto.setLastAmount(BigDecimal.ZERO);
                }
               
                dto.setLastDate(stream.getLastDate() != null ? stream.getLastDate().toString() : "N/A");
                dto.setFrequency(stream.getFrequency() != null ? stream.getFrequency().toString() : "UNKNOWN");
                
                paycheckSources.add(dto);
                logger.debug("Identified potential paycheck source: Name='{}', AccountID='{}', LastAmt='{}', Freq='{}'", 
                    dto.getName(), dto.getAccountId(), dto.getLastAmount(), dto.getFrequency());
            }
        }
        
        if (paycheckSources.isEmpty()) {
            logger.info("No active, regularly recurring inflow streams identified as potential paychecks after filtering.");
        }

        return paycheckSources;
    }

    // createLinkTokenForAuthenticatedUser method remains the same...
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
        return response.body();
    }

    // exchangePublicTokenAndLinkUser method remains the same...
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

        appUser.setPlaidAccessToken(encryptedAccessToken);
        appUser.setPlaidItemId(exchangeResponse.getItemId());
        appUser.setPlaidLinked(true);
        userRepository.save(appUser);
        logger.info("Plaid item linked to user ID: {}", appUser.getId());
        return exchangeResponse;
    }
}