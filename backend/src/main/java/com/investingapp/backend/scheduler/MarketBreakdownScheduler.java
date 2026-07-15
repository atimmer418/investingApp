package com.investingapp.backend.scheduler;

import com.investingapp.backend.dto.EmailMessage;
import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.service.EmailService;
import com.investingapp.backend.service.MarketBreakdownEmailComposer;
import com.investingapp.backend.service.MarketBreakdownService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;

/**
 * Sends the Monthly Market Breakdown to plus/pro members. Runs on the 1st
 * (the real send) plus catch-up passes on the 2nd and 3rd — idempotency via
 * EmailService.hasBeenSent makes catch-ups no-ops unless something failed
 * (server down on the 1st, generation failure, per-user Alpaca hiccups).
 */
@Component
public class MarketBreakdownScheduler {

    private static final Logger logger = LoggerFactory.getLogger(MarketBreakdownScheduler.class);

    public static final String EMAIL_TYPE = "MARKET_BREAKDOWN";
    private static final List<String> ELIGIBLE_TIERS = List.of("plus", "pro");
    private static final ZoneId ET = ZoneId.of("America/New_York");

    private final UserRepository userRepository;
    private final MarketBreakdownService marketBreakdownService;
    private final MarketBreakdownEmailComposer composer;
    private final EmailService emailService;

    public MarketBreakdownScheduler(UserRepository userRepository,
            MarketBreakdownService marketBreakdownService,
            MarketBreakdownEmailComposer composer,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.marketBreakdownService = marketBreakdownService;
        this.composer = composer;
        this.emailService = emailService;
    }

    /** 9am ET on the 1st, with catch-up passes on the 2nd and 3rd. */
    @Scheduled(cron = "0 0 9 1,2,3 * *", zone = "America/New_York")
    public void runMonthlyBreakdownJob() {
        YearMonth priorMonth = YearMonth.now(ET).minusMonths(1);
        logger.info("Starting Monthly Market Breakdown job for {}", priorMonth);
        try {
            runForMonth(priorMonth);
            logger.info("Completed Monthly Market Breakdown job for {}", priorMonth);
        } catch (Exception e) {
            // Generation failure — FAILED row persisted by the service; the
            // catch-up cron on the 2nd/3rd retries.
            logger.error("Monthly Market Breakdown job failed for {}", priorMonth, e);
        }
    }

    public void runForMonth(YearMonth month) {
        MarketBreakdown breakdown = marketBreakdownService.getOrGenerate(month);
        String periodKey = breakdown.getPeriodKey();

        List<User> eligible = userRepository.findBySelectedTierIn(ELIGIBLE_TIERS);
        int sent = 0, skipped = 0, failed = 0;

        for (User user : eligible) {
            try {
                if (user.getEmail() == null || user.getEmail().isBlank()) {
                    skipped++;
                    continue;
                }
                if (emailService.hasBeenSent(EMAIL_TYPE, user.getId(), periodKey)) {
                    skipped++;
                    continue;
                }
                MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                        composer.resolveNumbers(user, month); // throws for funded users with data issues
                MarketBreakdownEmailComposer.ComposedEmail email = composer.compose(breakdown, numbers);
                emailService.sendEmail(
                        new EmailMessage(user.getEmail(), null, email.subject, email.htmlBody, email.textBody),
                        user.getId(), EMAIL_TYPE, periodKey);
                sent++;
            } catch (Exception e) {
                // One user's failure never kills the batch; FAILED row → catch-up retries
                failed++;
                logger.error("Market breakdown failed for user {}: {}", user.getId(), e.getMessage());
                emailService.recordFailedAttempt(user.getId(), user.getEmail(), EMAIL_TYPE,
                        periodKey, e.getMessage());
            }
        }
        logger.info("Market breakdown {}: {} sent, {} skipped, {} failed of {} eligible",
                periodKey, sent, skipped, failed, eligible.size());
    }
}
