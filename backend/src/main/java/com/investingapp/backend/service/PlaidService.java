// src/main/java/com/investingapp/backend/service/PlaidService.java
package com.investingapp.backend.service;

import com.investingapp.backend.model.PendingPlaidConnection; // Import new entity
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.PendingPlaidConnectionRepository; // Import new repository
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.service.EncryptionService;
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
import java.time.LocalDateTime; // For expiry
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
// Removed UUID, ConcurrentHashMap, TimeUnit as they are no longer needed for this part

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