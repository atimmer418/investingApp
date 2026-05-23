package com.investingapp.backend.scheduler;

import com.investingapp.backend.service.ReferralService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReferralValidationScheduler {

    private static final Logger logger = LoggerFactory.getLogger(ReferralValidationScheduler.class);

    @Autowired
    private ReferralService referralService;

    @Scheduled(cron = "0 0 6 * * *", zone = "America/New_York")
    public void validateAndCreditReferrals() {
        logger.info("[ReferralValidationScheduler] Starting daily referral validation");
        try {
            referralService.processEligibleReferrals();
            logger.info("[ReferralValidationScheduler] Completed referral validation successfully");
        } catch (Exception e) {
            logger.error("[ReferralValidationScheduler] Error during referral validation", e);
        }
    }
}
