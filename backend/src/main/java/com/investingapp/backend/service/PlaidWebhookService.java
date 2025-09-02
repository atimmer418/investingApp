package com.investingapp.backend.service;

import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class PlaidWebhookService {

    private static final Logger logger = LoggerFactory.getLogger(PlaidWebhookService.class);

    private final UserRepository userRepository;
    private final PlaidService plaidService;
    private final EncryptionService encryptionService;
    // You'll need to create these services for the investment flow
    // private final InvestmentService investmentService;
    // private final PaycheckConfigService paycheckConfigService;

    @Autowired
    public PlaidWebhookService(
            UserRepository userRepository,
            PlaidService plaidService,
            EncryptionService encryptionService) {
        this.userRepository = userRepository;
        this.plaidService = plaidService;
        this.encryptionService = encryptionService;
    }

    /**
     * Handle new transaction updates from Plaid
     * This is where we check for matching paycheck deposits and trigger investments
     */
    public void handleTransactionUpdate(Map<String, Object> webhookData) {
        try {
            String itemId = (String) webhookData.get("item_id");
            @SuppressWarnings("unchecked")
            List<String> newTransactionIds = (List<String>) webhookData.get("new_transactions");
            
            logger.info("Processing transaction update for item_id: {}, new transactions: {}", 
                itemId, newTransactionIds != null ? newTransactionIds.size() : 0);

            // Find user by item_id
            User user = userRepository.findByPlaidItemId(itemId);
            if (user == null) {
                logger.warn("No user found for item_id: {}", itemId);
                return;
            }

            if (!user.isPlaidLinked() || user.getPlaidAccessToken() == null) {
                logger.warn("User {} does not have valid Plaid connection", user.getEmail());
                return;
            }

            // Get user's paycheck configurations
            // List<PaycheckConfig> userPaycheckConfigs = paycheckConfigService.getUserPaycheckConfigs(user);
            
            if (newTransactionIds != null && !newTransactionIds.isEmpty()) {
                String decryptedAccessToken = encryptionService.decrypt(user.getPlaidAccessToken());
                
                // Fetch the new transactions and check if any match configured paycheck sources
                checkForMatchingPaychecksAndInvest(user, decryptedAccessToken, newTransactionIds);
            }
            
        } catch (Exception e) {
            logger.error("Error handling transaction update webhook: {}", e.getMessage(), e);
        }
    }

    /**
     * Check new transactions against user's configured paycheck sources
     * and trigger investments for matches
     */
    private void checkForMatchingPaychecksAndInvest(User user, String accessToken, List<String> transactionIds) {
        try {
            logger.info("Checking {} new transactions for user {} against configured paycheck sources", 
                transactionIds.size(), user.getEmail());

            // TODO: Implement the following steps:
            // 1. Fetch the specific transactions by ID from Plaid
            // 2. Get user's saved paycheck configurations (which deposits should trigger investments)
            // 3. For each new transaction, check if it matches any configured paycheck source:
            //    - Similar merchant name/description
            //    - Similar amount (within tolerance)
            //    - Same account
            // 4. If match found, trigger investment:
            //    - Calculate investment amount based on user's configured percentage
            //    - Call investment service to execute the trade
            //    - Log the transaction for user records
            //    - Optionally notify user of automatic investment

            /* Example implementation structure:
            
            // Get new transactions from Plaid
            List<Transaction> newTransactions = plaidService.getTransactionsByIds(accessToken, transactionIds);
            
            // Get user's paycheck configurations
            List<PaycheckConfig> paycheckConfigs = paycheckConfigService.getUserPaycheckConfigs(user);
            
            for (Transaction transaction : newTransactions) {
                // Only process deposits (negative amounts in Plaid)
                if (transaction.getAmount() != null && transaction.getAmount() < 0) {
                    
                    for (PaycheckConfig config : paycheckConfigs) {
                        if (isTransactionMatchingPaycheck(transaction, config)) {
                            double depositAmount = Math.abs(transaction.getAmount());
                            double investmentAmount = depositAmount * config.getInvestmentPercentage();
                            
                            logger.info("Matched deposit ${} to configured paycheck source: {}, triggering investment of ${}", 
                                depositAmount, config.getSourceName(), investmentAmount);
                            
                            // Trigger the investment
                            investmentService.executeAutomaticInvestment(user, investmentAmount, config, transaction);
                            
                            break; // Only match to one configuration
                        }
                    }
                }
            }
            */

            logger.info("Completed checking new transactions for automatic investment triggers");
            
        } catch (Exception e) {
            logger.error("Error checking transactions for paycheck matches: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle initial transaction history being ready
     */
    public void handleInitialTransactionUpdate(Map<String, Object> webhookData) {
        logger.info("Initial transaction history ready for item_id: {}", webhookData.get("item_id"));
        // Optionally process initial transactions or just log
    }

    /**
     * Handle historical transaction updates
     */
    public void handleHistoricalTransactionUpdate(Map<String, Object> webhookData) {
        logger.info("Historical transaction update for item_id: {}", webhookData.get("item_id"));
        // Usually no action needed for historical updates in this use case
    }

    /**
     * Handle income verification updates
     */
    public void handleIncomeUpdate(Map<String, Object> webhookData) {
        logger.info("Income verification update for item_id: {}", webhookData.get("item_id"));
        // Could be used to update user's income profile or recalculate investment amounts
    }

    /**
     * Check if a transaction matches a configured paycheck source
     * This is where you implement the matching logic based on:
     * - Merchant name similarity
     * - Amount similarity (within tolerance)
     * - Account matching
     * - Description patterns
     */
    private boolean isTransactionMatchingPaycheck(Object transaction, Object paycheckConfig) {
        // TODO: Implement sophisticated matching logic
        // For now, this is a placeholder
        return false;
    }
}
