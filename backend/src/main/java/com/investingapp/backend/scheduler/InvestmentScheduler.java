package com.investingapp.backend.scheduler;

import com.investingapp.backend.service.InvestmentExecutionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class InvestmentScheduler {
    
    private static final Logger logger = LoggerFactory.getLogger(InvestmentScheduler.class);
    
    @Autowired
    private InvestmentExecutionService investmentExecutionService;

    /**
     * Process scheduled investments every day at 11:55 PM ET
     * This runs before the 11:59 PM batch process, allowing users to update their
     * investment schedule to "today" at any point during the day and still have it picked up.
     * Cron: "0 55 23 * * *" (Daily at 11:55 PM)
     */
    @Scheduled(cron = "0 55 23 * * *", zone = "America/New_York")
    public void processScheduledInvestments() {
        logger.info("Starting scheduled investment processing job");
        try {
            investmentExecutionService.processScheduledInvestments();
            logger.info("Completed scheduled investment processing job successfully");
        } catch (Exception e) {
            logger.error("Error in scheduled investment processing job", e);
        }
    }
    
    /**
     * Check funding status every 30 minutes during funding hours
     * ACH transfers process on business days roughly 8 AM - 6 PM ET
     * Cron: every 30 min, hours 8-17, Mon-Fri ET
     */
    @Scheduled(cron = "0 */30 8-17 * * MON-FRI", zone = "America/New_York")
    public void checkFundingStatus() {
        logger.info("Starting funding status check job");
        try {
            investmentExecutionService.checkFundingStatus();
            logger.info("Completed funding status check job successfully");
        } catch (Exception e) {
            logger.error("Error in funding status check job", e);
        }
    }

    /**
     * Check trading status every 15 minutes during US market hours
     * US equity markets: 9:30 AM - 4:00 PM ET, Mon-Fri
     * Cron: every 15 min, hours 9-15, Mon-Fri ET (covers 9:00-15:45)
     */
    @Scheduled(cron = "0 */15 9-15 * * MON-FRI", zone = "America/New_York")
    public void checkTradingStatus() {
        logger.info("Starting trading status check job");
        try {
            investmentExecutionService.checkTradingStatus();
            logger.info("Completed trading status check job successfully");
        } catch (Exception e) {
            logger.error("Error in trading status check job", e);
        }
    }    /**
     * For testing purposes - run every minute (disable in production)
     * Uncomment and use this for testing the investment flow
     */
    // @Scheduled(fixedRate = 60000) // 1 minute for testing
    // public void testInvestmentProcessing() {
    //     logger.info("Running test investment processing");
    //     try {
    //         investmentExecutionService.processScheduledInvestments();
    //     } catch (Exception e) {
    //         logger.error("Error in test investment processing", e);
    //     }
    // }
}
