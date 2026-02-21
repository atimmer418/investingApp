package com.investingapp.backend.service;

import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.InvestmentScheduleRepository;
import com.investingapp.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Manages the investment streak independently of the MFU.
 *
 * Streak = consecutive months the user has had an active (non-paused) investment schedule.
 * - Incremented once per month by a cron job (1st of each month at midnight ET).
 * - Reset to 0 immediately when the user pauses their schedule.
 */
@Service
public class StreakService {

    private static final Logger logger = LoggerFactory.getLogger(StreakService.class);
    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InvestmentScheduleRepository scheduleRepository;

    /**
     * Monthly cron: runs on the 1st of every month at 12:05 AM ET.
     * For every user with an active (non-paused) schedule, increment their streak by 1.
     * Uses lastStreakUpdate to ensure idempotency (won't double-count the same month).
     */
    @Scheduled(cron = "0 5 0 1 * *", zone = "America/New_York")
    @Transactional
    public void updateAllStreaks() {
        String currentMonth = YearMonth.now().format(MONTH_FMT);
        logger.info("Running monthly streak update for {}", currentMonth);

        List<User> allUsers = userRepository.findAll();
        int updated = 0;

        for (User user : allUsers) {
            // Skip if already updated this month
            if (currentMonth.equals(user.getLastStreakUpdate())) {
                continue;
            }

            boolean hasActive = scheduleRepository.hasActiveSchedules(user);

            if (hasActive) {
                int current = user.getCurrentStreak() != null ? user.getCurrentStreak() : 0;
                user.setCurrentStreak(current + 1);
                user.setLastStreakUpdate(currentMonth);
                userRepository.save(user);
                updated++;
            }
            // If no active schedule, streak stays where it is (pause handler resets to 0)
        }

        logger.info("Monthly streak update complete. {} users incremented.", updated);
    }

    /**
     * Reset the user's streak to 0.
     * Called when the user pauses their investment schedule.
     */
    @Transactional
    public void resetStreak(User user) {
        logger.info("Resetting streak to 0 for user {}", user.getEmail());
        user.setCurrentStreak(0);
        user.setLastStreakUpdate(null); // Clear so next month's cron can start fresh
        userRepository.save(user);
    }
}
