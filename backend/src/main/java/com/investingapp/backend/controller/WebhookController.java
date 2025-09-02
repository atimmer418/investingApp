package com.investingapp.backend.controller;

import com.investingapp.backend.service.PlaidWebhookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger logger = LoggerFactory.getLogger(WebhookController.class);

    private final PlaidWebhookService plaidWebhookService;

    @Autowired
    public WebhookController(PlaidWebhookService plaidWebhookService) {
        this.plaidWebhookService = plaidWebhookService;
    }

    /**
     * Handle Plaid webhook notifications
     * This endpoint will be called by Plaid when transaction events occur
     */
    @PostMapping("/plaid")
    public ResponseEntity<?> handlePlaidWebhook(@RequestBody Map<String, Object> webhookData) {
        try {
            logger.info("Received Plaid webhook: {}", webhookData);
            
            String webhookType = (String) webhookData.get("webhook_type");
            String webhookCode = (String) webhookData.get("webhook_code");
            
            if ("TRANSACTIONS".equals(webhookType)) {
                switch (webhookCode) {
                    case "DEFAULT_UPDATE":
                        // New transactions are available
                        plaidWebhookService.handleTransactionUpdate(webhookData);
                        break;
                    case "INITIAL_UPDATE":
                        // Initial transaction history is ready
                        plaidWebhookService.handleInitialTransactionUpdate(webhookData);
                        break;
                    case "HISTORICAL_UPDATE":
                        // Historical transaction update
                        plaidWebhookService.handleHistoricalTransactionUpdate(webhookData);
                        break;
                    default:
                        logger.info("Unhandled TRANSACTIONS webhook code: {}", webhookCode);
                }
            } else if ("INCOME".equals(webhookType)) {
                // Handle income verification webhooks if needed
                plaidWebhookService.handleIncomeUpdate(webhookData);
            } else {
                logger.info("Unhandled webhook type: {}", webhookType);
            }
            
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            logger.error("Error processing Plaid webhook: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
