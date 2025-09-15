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
            
            // Handle PRODUCT_NOT_READY specifically - this is expected for recently linked accounts
            if (response.code() == 400 && errorBody.contains("PRODUCT_NOT_READY")) {
                logger.warn("Recurring transactions product not ready yet. This is expected for recently linked accounts. Returning empty list for now.");
                logger.info("User can try again later or wait for webhook notification when product becomes ready.");
                return Collections.emptyList(); // Return empty list instead of throwing exception
            }
            
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

    /**
     * Get potential income sources from recent transactions (immediate analysis)
     * This method analyzes recent deposits to identify potential income sources for webhook configuration
     * Users can select which deposits should trigger automatic investments when detected via webhooks
     */
    public List<PaycheckSourceDto> getImmediateIncomeSourcesFromTransactions(String decryptedAccessToken) throws IOException {
        logger.info("Fetching potential income sources from recent transactions for webhook trigger configuration.");
        List<PaycheckSourceDto> potentialIncomes = new ArrayList<>();

        // Get accounts first
        AccountsGetRequest accountsRequest = new AccountsGetRequest().accessToken(decryptedAccessToken);
        Response<AccountsGetResponse> accountsResponse = plaidApi.accountsGet(accountsRequest).execute();

        if (!accountsResponse.isSuccessful() || accountsResponse.body() == null) {
            String errorBody = accountsResponse.errorBody() != null ? accountsResponse.errorBody().string() : "Unknown error";
            logger.error("Failed to fetch accounts: {} - {}", accountsResponse.code(), errorBody);
            throw new IOException("Failed to fetch accounts: " + errorBody);
        }

        // Get transactions from the last 60 days for better pattern recognition
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(60); // Extended window for better income detection

        TransactionsGetRequest transactionsRequest = new TransactionsGetRequest()
                .accessToken(decryptedAccessToken)
                .startDate(startDate)
                .endDate(endDate);

        Response<TransactionsGetResponse> transactionsResponse = plaidApi.transactionsGet(transactionsRequest).execute();

        if (!transactionsResponse.isSuccessful()) {
            String errorBody = transactionsResponse.errorBody() != null ? transactionsResponse.errorBody().string() : "Unknown error";
            
            // Check if it's a product not ready error - this is expected for newly linked accounts
            if (transactionsResponse.code() == 400 && errorBody.contains("PRODUCT_NOT_READY")) {
                logger.info("TRANSACTIONS product not ready yet for immediate income detection - this is expected for newly linked accounts");
                return potentialIncomes; // Return empty list gracefully
            }
            
            logger.error("Failed to fetch transactions for immediate income detection: {} - {}", transactionsResponse.code(), errorBody);
            throw new IOException("Failed to fetch transactions: " + errorBody);
        }

        if (transactionsResponse.body() == null || transactionsResponse.body().getTransactions().isEmpty()) {
            logger.info("No transactions available yet for immediate income detection");
            return potentialIncomes; // Return empty list if no transactions
        }

        // Group deposits by merchant/description to identify potential recurring income
        Map<String, List<Transaction>> depositGroups = new HashMap<>();
        
        for (Transaction transaction : transactionsResponse.body().getTransactions()) {
            // Look for deposits (positive amounts in income accounts or negative amounts representing credits)
            if (transaction.getAmount() != null && transaction.getAmount() < 0) { // Negative amounts are credits/deposits in Plaid
                String key = getIncomeSourceKey(transaction);
                depositGroups.computeIfAbsent(key, k -> new ArrayList<>()).add(transaction);
            }
        }

        // Convert potential recurring deposits to PaycheckSourceDto for webhook trigger configuration
        for (Map.Entry<String, List<Transaction>> entry : depositGroups.entrySet()) {
            List<Transaction> deposits = entry.getValue();
            
            // Consider any deposit pattern that could be income (even single large deposits)
            if (deposits.size() >= 1) {
                Transaction mostRecent = deposits.get(0); // First transaction is most recent
                
                // Filter out very small amounts and obvious non-income transactions
                double amount = Math.abs(mostRecent.getAmount());
                if (amount >= 50.0 && !isLikelyNonIncomeTransaction(mostRecent)) { // Lowered threshold, added filtering
                    
                    PaycheckSourceDto dto = new PaycheckSourceDto();
                    dto.setAccountId(mostRecent.getAccountId());
                    dto.setName(getDisplayName(mostRecent));
                    dto.setLastAmount(BigDecimal.valueOf(amount));
                    dto.setLastDate(mostRecent.getDate() != null ? mostRecent.getDate().toString() : "N/A");
                    
                    // Estimate frequency based on number of deposits in 60 days
                    String frequency = estimateFrequency(deposits.size(), 60);
                    dto.setFrequency(frequency);
                    
                    // Add webhook trigger info
                    dto.setDescription("Select this to automatically invest when similar deposits are detected");
                    
                    potentialIncomes.add(dto);
                    logger.info("Found potential income source for webhook config: {} - ${} (appeared {} times in 60 days)", 
                        dto.getName(), dto.getLastAmount(), deposits.size());
                }
            }
        }

        logger.info("Found {} potential income sources from recent transactions.", potentialIncomes.size());
        return potentialIncomes;
    }

    private String getIncomeSourceKey(Transaction transaction) {
        // Create a key to group similar transactions
        String merchantName = transaction.getMerchantName();
        if (merchantName != null && !merchantName.trim().isEmpty()) {
            return merchantName.trim().toLowerCase();
        }
        
        String description = transaction.getName();
        if (description != null && !description.trim().isEmpty()) {
            return description.trim().toLowerCase();
        }
        
        return "unknown_source";
    }

    private String getDisplayName(Transaction transaction) {
        String merchantName = transaction.getMerchantName();
        if (merchantName != null && !merchantName.trim().isEmpty()) {
            return merchantName;
        }
        
        String description = transaction.getName();
        if (description != null && !description.trim().isEmpty()) {
            return description;
        }
        
        return "Income Source";
    }

    private String estimateFrequency(int occurrencesInPeriod, int periodDays) {
        // Calculate approximate frequency based on occurrences over the period
        double occurrencesPerMonth = (occurrencesInPeriod * 30.0) / periodDays;
        
        if (occurrencesPerMonth >= 3.5) {
            return "WEEKLY";
        } else if (occurrencesPerMonth >= 1.8) {
            return "BIWEEKLY";
        } else if (occurrencesPerMonth >= 0.8) {
            return "MONTHLY";
        } else {
            return "IRREGULAR";
        }
    }

    private boolean isLikelyNonIncomeTransaction(Transaction transaction) {
        String description = getDisplayName(transaction).toLowerCase();
        
        // Filter out obvious non-income transactions
        String[] nonIncomeKeywords = {
            "refund", "return", "cashback", "rebate", "credit card", "loan", "transfer", 
            "insurance", "settlement", "tax refund", "irs", "dividend", "interest",
            "venmo", "paypal", "zelle", "cashapp", "atm", "deposit correction"
        };
        
        for (String keyword : nonIncomeKeywords) {
            if (description.contains(keyword)) {
                return true;
            }
        }
        
        return false;
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
                .language("en")
                .webhook("https://your-app-domain.com/api/webhooks/plaid"); // Add webhook URL for real-time transaction updates

        Response<LinkTokenCreateResponse> response = plaidApi.linkTokenCreate(request).execute();
        if (!response.isSuccessful() || response.body() == null) {
            String errorBody = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
            logger.error("Plaid Link Token creation failed: {} - {}", response.code(), errorBody);
            throw new IOException("Plaid Link Token creation failed: " + errorBody);
        }
        logger.info("Successfully created Link token with TRANSACTIONS product and webhook enabled");
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

    /**
     * Get bank income data using Plaid's Bank Income API with proper error handling
     */
    public Map<String, Object> getBankIncomeData(String encryptedAccessToken) throws IOException {
        logger.info("Fetching bank income data from Plaid Bank Income API");
        
        try {
            // Decrypt the access token
            String accessToken = encryptionService.decrypt(encryptedAccessToken);
            
            // Create the Credit Bank Income request with options
            Map<String, Integer> options = new HashMap<>();
            options.put("count", 1);
            
            CreditBankIncomeGetRequest request = new CreditBankIncomeGetRequest()
                .userToken(accessToken);
            
            logger.debug("Making Plaid Credit Bank Income API call...");
            Response<CreditBankIncomeGetResponse> response = plaidApi.creditBankIncomeGet(request).execute();
            
            if (!response.isSuccessful()) {
                String errorBody = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
                logger.error("Plaid Bank Income API call failed: {} - {}", response.code(), errorBody);
                
                // Return structured error for the frontend to handle
                Map<String, Object> errorResult = new HashMap<>();
                errorResult.put("error", true);
                errorResult.put("message", "Bank income data is still being processed. Please wait a moment and try again.");
                errorResult.put("code", response.code());
                return errorResult;
            }
            
            if (response.body() == null) {
                logger.error("Plaid Bank Income API returned null response body");
                Map<String, Object> errorResult = new HashMap<>();
                errorResult.put("error", true);
                errorResult.put("message", "No income data available yet. Please try again in a few moments.");
                return errorResult;
            }
            
            CreditBankIncomeGetResponse incomeResponse = response.body();
            logger.info("Successfully received Credit Bank Income API response");
            
            // Process response and create structured data for frontend
            Map<String, Object> result = new HashMap<>();
            List<Map<String, Object>> incomeSources = new ArrayList<>();
            double totalAmount = 0.0;
            String currency = "USD";
            
            if (incomeResponse.getBankIncome() != null && !incomeResponse.getBankIncome().isEmpty()) {
                // Get the first bank income object (typically there's only one per user)
                CreditBankIncome bankIncome = incomeResponse.getBankIncome().get(0);
                
                if (bankIncome.getItems() != null && !bankIncome.getItems().isEmpty()) {
                    // Get the first item (typically there's only one per bank account)
                    CreditBankIncomeItem item = bankIncome.getItems().get(0);
                    
                    if (item.getBankIncomeSources() != null) {
                        for (CreditBankIncomeSource source : item.getBankIncomeSources()) {
                            Map<String, Object> incomeSourceMap = new HashMap<>();
                            
                            incomeSourceMap.put("id", source.getIncomeSourceId());
                            incomeSourceMap.put("description", source.getIncomeDescription());
                            incomeSourceMap.put("category", source.getIncomeCategory() != null ? source.getIncomeCategory().toString() : "UNKNOWN");
                            incomeSourceMap.put("amount", source.getTotalAmount());
                            incomeSourceMap.put("frequency", source.getPayFrequency() != null ? source.getPayFrequency().toString() : "UNKNOWN");
                            incomeSourceMap.put("startDate", source.getStartDate());
                            incomeSourceMap.put("endDate", source.getEndDate());
                            incomeSourceMap.put("transactionCount", source.getTransactionCount());
                            incomeSourceMap.put("selected", false); // Default to not selected
                            
                            incomeSources.add(incomeSourceMap);
                            totalAmount += source.getTotalAmount() != null ? source.getTotalAmount() : 0.0;
                        }
                    }
                }
                
                // Get currency from bank income summary if available
                if (bankIncome.getBankIncomeSummary() != null && 
                    bankIncome.getBankIncomeSummary().getIsoCurrencyCode() != null) {
                    currency = bankIncome.getBankIncomeSummary().getIsoCurrencyCode();
                }
                
                logger.info("Successfully processed {} income sources with total amount: {} {}", 
                    incomeSources.size(), totalAmount, currency);
                
            } else {
                logger.warn("No bank income data found in response");
            }
            
            // Structure the response to match what frontend expects
            result.put("success", true);
            result.put("incomeSources", incomeSources);
            result.put("totalAmount", totalAmount);
            result.put("currency", currency);
            result.put("api_available", true);
            
            if (incomeSources.isEmpty()) {
                result.put("message", "No income sources found. Make sure you have recent income transactions in your linked account.");
            }
            
            return result;
            
        } catch (Exception e) {
            logger.error("Error calling Plaid Bank Income API: {}", e.getMessage(), e);
            
            // Check if it's a 500 error (still processing)
            if (e.getMessage() != null && e.getMessage().contains("500")) {
                Map<String, Object> errorResult = new HashMap<>();
                errorResult.put("error", true);
                errorResult.put("message", "Income analysis still in progress. Please wait a few moments and try again.");
                errorResult.put("retry", true);
                return errorResult;
            }
            
            // For other errors, throw IOException to be handled by controller
            throw new IOException("Bank Income API unavailable: " + e.getMessage());
        }
    }
}