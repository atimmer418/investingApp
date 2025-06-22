// src/main/java/com/investingapp/backend/service/PlaidService.java
package com.investingapp.backend.service;

import com.investingapp.backend.model.PendingPlaidConnection; // Import new entity
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.PendingPlaidConnectionRepository; // Import new repository
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

    @Autowired
    private PendingPlaidConnectionRepository pendingPlaidConnectionRepository; // Inject the new repository

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


    // createLinkTokenAnonymous method remains the same...
    public LinkTokenCreateResponse createLinkTokenAnonymous(String temporaryUserId) throws IOException {
        logger.info("Creating Plaid Link token for temporary user ID: {}", temporaryUserId);
        LinkTokenCreateRequestUser user = new LinkTokenCreateRequestUser().clientUserId(temporaryUserId);
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
            logger.error("Plaid Link Token creation (anonymous) failed: {} - {}", response.code(), errorBody);
            throw new IOException("Plaid Link Token creation (anonymous) failed: " + errorBody);
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


    // Modified to use the database repository
    @Transactional
    public void exchangePublicTokenAndStoreTemporarily(String publicToken, String temporaryUserId) throws IOException {
        logger.info("Exchanging public token for temporary user ID: {}", temporaryUserId);
        ItemPublicTokenExchangeRequest request = new ItemPublicTokenExchangeRequest().publicToken(publicToken);
        Response<ItemPublicTokenExchangeResponse> response = plaidApi.itemPublicTokenExchange(request).execute();

        if (!response.isSuccessful() || response.body() == null) {
            String errorBody = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
            logger.error("Plaid Public Token exchange (anonymous) failed: {} - {}", response.code(), errorBody);
            throw new IOException("Plaid Public Token exchange (anonymous) failed: " + errorBody);
        }

        ItemPublicTokenExchangeResponse exchangeResponse = response.body();
        String rawAccessToken = exchangeResponse.getAccessToken(); // Raw token from Plaid
        String itemId = exchangeResponse.getItemId();

        // --- ENCRYPT THE ACCESS TOKEN ---
        String encryptedAccessToken;
        try {
            encryptedAccessToken = encryptionService.encrypt(rawAccessToken);
        } catch (Exception e) {
            logger.error("Failed to encrypt Plaid access token for temporaryUserId {}: {}", temporaryUserId, e.getMessage(), e);
            // Decide on failure strategy: throw exception, or log and potentially store raw (NOT RECOMMENDED)
            // For security, it's better to fail the operation if encryption fails.
            throw new IOException("Failed to secure Plaid access token.", e);
        }

        PendingPlaidConnection pendingConnection = new PendingPlaidConnection();
        pendingConnection.setTemporaryUserId(temporaryUserId);
        pendingConnection.setPlaidAccessToken(encryptedAccessToken); // Store the ENCRYPTED token
        pendingConnection.setPlaidItemId(itemId);
        pendingConnection.setCreateDate(LocalDateTime.now());
        pendingConnection.setExpireDate(LocalDateTime.now().plusHours(24)); // Example: 24-hour expiry
        pendingConnection.setStatus(PendingPlaidConnection.Status.PENDING_ACCOUNT_CREATION);

        pendingPlaidConnectionRepository.save(pendingConnection);
        logger.info("Encrypted Plaid token stored temporarily in DB for ID: {}. Expires at: {}", temporaryUserId, pendingConnection.getExpireDate());
    }

    // Modified to use the database repository
    @Transactional
    public PendingPlaidConnection retrieveAndRemovePendingConnection(String temporaryUserId) {
        Optional<PendingPlaidConnection> optConnection = pendingPlaidConnectionRepository
                .findByTemporaryUserIdAndStatus(temporaryUserId, PendingPlaidConnection.Status.PENDING_ACCOUNT_CREATION);
    
        if (optConnection.isPresent()) {
            PendingPlaidConnection connection = optConnection.get();
            if (connection.isExpired()) {
                logger.warn("Pending Plaid connection for {} has expired. Marking as EXPIRED.", temporaryUserId);
                connection.setStatus(PendingPlaidConnection.Status.EXPIRED);
                pendingPlaidConnectionRepository.save(connection);
                return null;
            }
    
            // --- DECRYPT THE ACCESS TOKEN ---
            String encryptedAccessToken = connection.getPlaidAccessToken();
            String rawAccessToken;
            try {
                rawAccessToken = encryptionService.decrypt(encryptedAccessToken);
            } catch (Exception e) {
                logger.error("Failed to decrypt Plaid access token from pending connection for temporaryUserId {}: {}", temporaryUserId, e.getMessage(), e);
                // If decryption fails, the token is unusable. Treat as if not found or an error.
                // You might want to mark it as problematic or delete it.
                // For now, returning null indicates the process can't proceed with this token.
                pendingPlaidConnectionRepository.delete(connection); // Clean up bad record
                return null;
            }
            // Set the raw token back on the object being returned (or a DTO)
            connection.setPlaidAccessToken(rawAccessToken); 
    
            pendingPlaidConnectionRepository.delete(connection);
            logger.info("Retrieved, decrypted, and removed pending Plaid connection from DB for {}", temporaryUserId);
            return connection;
        }
        logger.info("No PENDING Plaid connection found in DB for temporary ID: {}", temporaryUserId);
        return null;
    }
}