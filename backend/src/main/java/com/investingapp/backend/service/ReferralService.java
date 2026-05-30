package com.investingapp.backend.service;

import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class ReferralService {

    private static final Logger logger = LoggerFactory.getLogger(ReferralService.class);

    @Autowired
    private UserRepository userRepository;

    private static final int CORE_THRESHOLD = 3;
    private static final int PLUS_THRESHOLD = 2;
    private static final int PRO_THRESHOLD = 1;
    private static final int FOUNDER_THRESHOLD = 3;

    @Transactional
    public void processEligibleReferrals() {
        // Find users who: applied a referral, haven't been counted yet, have a subscription
        List<User> candidates = userRepository.findAll().stream()
            .filter(u -> Boolean.TRUE.equals(u.getHasAppliedReferral()))
            .filter(u -> !Boolean.TRUE.equals(u.getReferralCounted()))
            .filter(u -> u.getReferralAppliedAt() != null)
            .filter(u -> u.getSubscriptionStartedAt() != null)
            .filter(u -> ChronoUnit.DAYS.between(u.getSubscriptionStartedAt(), LocalDateTime.now()) >= 30)
            .toList();

        for (User referred : candidates) {
            if (referred.getReferredByUserId() == null) {
                logger.warn("[ReferralService] User {} has no referredByUserId — skipping", referred.getId());
                referred.setReferralCounted(true);
                userRepository.save(referred);
                continue;
            }
            userRepository.findById(referred.getReferredByUserId()).ifPresentOrElse(referrer -> {
                if (!Boolean.TRUE.equals(referrer.getReferralRewardTriggered())) {
                    int count = referrer.getReferralCount() != null ? referrer.getReferralCount() : 0;
                    referrer.setReferralCount(count + 1);
                    userRepository.save(referrer);
                    checkAndTriggerReward(referrer);
                    logger.info("[ReferralService] Credited referrer {} for referred user {}", referrer.getId(), referred.getId());
                }
                referred.setReferralCounted(true);
                userRepository.save(referred);
            }, () -> {
                logger.warn("[ReferralService] Referrer id={} not found for referred user {}", referred.getReferredByUserId(), referred.getId());
                referred.setReferralCounted(true);
                userRepository.save(referred);
            });
        }
    }

    public void checkAndTriggerReward(User referrer) {
        if (Boolean.TRUE.equals(referrer.getReferralRewardTriggered())) return;

        int count = referrer.getReferralCount() != null ? referrer.getReferralCount() : 0;
        int threshold = getThreshold(referrer);

        if (count >= threshold) {
            referrer.setReferralRewardTriggered(true);
            userRepository.save(referrer);
            if (Boolean.TRUE.equals(referrer.getPrivateBeta())) {
                // TODO: stub — EmailService.sendMerchSelectionEmail(referrer) — implement after FRED-101
                logger.info("[ReferralService] FOUNDER reward triggered for user {}: send merch selection email", referrer.getId());
            } else {
                // TODO: stub — IAP Promotional Offer downgrade — implement after FRED-174
                logger.info("[ReferralService] Reward triggered for user {} (tier={}): apply subscription discount", referrer.getId(), referrer.getSelectedTier());
            }
        }
    }

    private int getThreshold(User user) {
        if (Boolean.TRUE.equals(user.getPrivateBeta())) return FOUNDER_THRESHOLD;
        String tier = user.getSelectedTier();
        if ("plus".equalsIgnoreCase(tier)) return PLUS_THRESHOLD;
        if ("pro".equalsIgnoreCase(tier)) return PRO_THRESHOLD;
        return CORE_THRESHOLD; // default (core or null)
    }
}
