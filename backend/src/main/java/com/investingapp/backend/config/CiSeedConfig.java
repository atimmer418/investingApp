package com.investingapp.backend.config;

import com.investingapp.backend.model.User;
import com.investingapp.backend.model.UserProgress;
import com.investingapp.backend.repository.UserProgressRepository;
import com.investingapp.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * CI-only seed data so {@code /api/dev/authenticate-as-user} can mint a JWT.
 *
 * DevAuthController returns a token only if the user row exists (it looks the
 * user up by email, then loads it via UserDetailsService). This runner inserts
 * the two test users the Phase 2 API checks authenticate as, each with a linked
 * {@link UserProgress} row.
 *
 * Idempotent: skips any user that already exists (so repeated CI boots against
 * a persistent schema do not duplicate rows or fail the unique-email constraint).
 */
@Configuration
@Profile("ci")
public class CiSeedConfig {

    private static final Logger logger = LoggerFactory.getLogger(CiSeedConfig.class);

    private static final String[] SEED_EMAILS = {"facebook@gmail.com", "hottie2@yn.con"};

    @Bean
    public CommandLineRunner seedCiUsers(UserRepository users, UserProgressRepository progress) {
        return args -> {
            for (String email : SEED_EMAILS) {
                if (Boolean.TRUE.equals(users.existsByEmail(email))) {
                    logger.info("[CI seed] User already exists, skipping: {}", email);
                    continue;
                }

                // The User(String email) constructor sets sensible non-null defaults
                // (monthlyInvestment, payFrequency, selectedStrategy, dripEnabled).
                // 'email' is the only column declared nullable=false on User.
                User user = new User(email);
                user = users.save(user);

                // UserProgress owns the FK (user_id, nullable=false). Its eight
                // onboarding flags default to false via field initializers, so only
                // the User link is required. Link both sides, then persist.
                UserProgress p = new UserProgress();
                p.setUser(user);
                progress.save(p);

                logger.info("[CI seed] Seeded user + progress: {} (id={})", email, user.getId());
            }
        };
    }
}
