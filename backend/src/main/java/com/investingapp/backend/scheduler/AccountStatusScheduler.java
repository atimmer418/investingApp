package com.investingapp.backend.scheduler;

// TODO: Replace with Alpaca SSE subscription (GET /v1/events/accounts/status) once
//       SSE support is added. The poller approach is used for v1 simplicity.

import com.investingapp.backend.service.AccountStatusService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AccountStatusScheduler {

    private static final Logger logger = LoggerFactory.getLogger(AccountStatusScheduler.class);

    private final AccountStatusService accountStatusService;

    public AccountStatusScheduler(AccountStatusService accountStatusService) {
        this.accountStatusService = accountStatusService;
    }

    /**
     * Poll Alpaca for account status updates every 5 minutes.
     * Only users whose accountStatus is non-null and non-terminal are checked.
     * Cron: "0 *\/5 * * * *" (every 5 minutes)
     */
    @Scheduled(cron = "0 */5 * * * *")
    public void pollAccountStatuses() {
        logger.info("Starting account status poll job");
        try {
            accountStatusService.checkAndUpdateAccountStatuses();
            logger.info("Completed account status poll job successfully");
        } catch (Exception e) {
            logger.error("Error in account status poll job", e);
        }
    }

    /**
     * Retry ACH relationship creation for ACTIVE users who haven't linked their bank yet.
     * Handles the race where an account becomes ACTIVE before the user completes Plaid linking.
     * Cron: "0 *\/15 * * * *" (every 15 minutes)
     */
    @Scheduled(cron = "0 */15 * * * *")
    public void setupPendingAchRelationships() {
        logger.info("Starting ACH setup retry job");
        try {
            accountStatusService.setupPendingAchRelationships();
            logger.info("Completed ACH setup retry job successfully");
        } catch (Exception e) {
            logger.error("Error in ACH setup retry job", e);
        }
    }
}
