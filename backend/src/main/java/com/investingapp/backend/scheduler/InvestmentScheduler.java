package com.investingapp.backend.scheduler;

import com.investingapp.backend.service.InvestmentExecutionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
public class InvestmentScheduler {
    
    private static final Logger logger = LoggerFactory.getLogger(InvestmentScheduler.class);
    
    @Autowired
    private InvestmentExecutionService investmentExecutionService;

    /**
     * Check if markets are currently open (US Eastern Time)
     * Market hours: Monday-Friday 9:30 AM - 4:00 PM ET
     */
    private boolean isMarketHours() {
        LocalDateTime now = LocalDateTime.now();
        DayOfWeek dayOfWeek = now.getDayOfWeek();
        LocalTime currentTime = now.toLocalTime();
        
        // Weekend check
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            return false;
        }
        
        // Market hours: 9:30 AM - 4:00 PM ET
        LocalTime marketOpen = LocalTime.of(9, 30);
        LocalTime marketClose = LocalTime.of(16, 0);
        
        return currentTime.isAfter(marketOpen) && currentTime.isBefore(marketClose);
    }

    /**
     * Check if it's a reasonable time to process funding
     * Allow broader hours for funding (8 AM - 6 PM ET) since funding can happen outside market hours
     */
    private boolean isFundingHours() {
        LocalDateTime now = LocalDateTime.now();
        DayOfWeek dayOfWeek = now.getDayOfWeek();
        LocalTime currentTime = now.toLocalTime();
        
        // Weekend check
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            return false;
        }
        
        // Broader hours for funding activities: 8:00 AM - 6:00 PM ET
        LocalTime fundingStart = LocalTime.of(8, 0);
        LocalTime fundingEnd = LocalTime.of(18, 0);
        
        return currentTime.isAfter(fundingStart) && currentTime.isBefore(fundingEnd);
    }
    
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
     * This allows for the 10-30 minute ACH delay mentioned in the requirements
     */
    @Scheduled(fixedRate = 1800000) // 30 minutes = 1800000 milliseconds
    public void checkFundingStatus() {
        if (!isFundingHours()) {
            logger.debug("Skipping funding status check - outside funding hours");
            return;
        }
        
        logger.info("Starting funding status check job");
        try {
            investmentExecutionService.checkFundingStatus();
            logger.info("Completed funding status check job successfully");
        } catch (Exception e) {
            logger.error("Error in funding status check job", e);
        }
    }

    /**
     * Check trading status every 15 minutes during market hours only
     * This ensures quick detection of filled orders when market is open
     */
    @Scheduled(fixedRate = 900000) // 15 minutes = 900000 milliseconds
    public void checkTradingStatus() {
        if (!isMarketHours()) {
            logger.debug("Skipping trading status check - market is closed");
            return;
        }
        
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
