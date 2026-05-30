package com.investingapp.backend.service;

import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class SubscriptionService {

    private static final Logger logger = LoggerFactory.getLogger(SubscriptionService.class);

    @Autowired
    private UserRepository userRepository;

    public void confirmSubscription(String email, String tier, String billingPeriod) {
        Optional<User> opt = userRepository.findByEmail(email);
        if (opt.isEmpty()) {
            logger.warn("[Subscription] User not found: {}", email);
            return;
        }
        User user = opt.get();
        user.setSelectedTier(tier);
        user.setBillingPeriod(billingPeriod);
        if (user.getSubscriptionStartDate() == null) {
            user.setSubscriptionStartDate(LocalDate.now());
        }
        userRepository.save(user);
        logger.info("[Subscription] Confirmed tier={} billing={} for {}", tier, billingPeriod, email);
    }

    public void expireSubscription(String email) {
        Optional<User> opt = userRepository.findByEmail(email);
        if (opt.isEmpty()) {
            logger.warn("[Subscription] User not found for expiry: {}", email);
            return;
        }
        User user = opt.get();
        user.setSelectedTier(null);
        userRepository.save(user);
        logger.info("[Subscription] Expired subscription for {}", email);
    }
}
