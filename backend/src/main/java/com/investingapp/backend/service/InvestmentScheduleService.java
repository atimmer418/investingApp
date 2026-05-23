package com.investingapp.backend.service;

import com.investingapp.backend.model.InvestmentSchedule;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.InvestmentScheduleRepository;
import com.investingapp.backend.service.PortfolioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.time.LocalDate;
import java.util.Optional;

@Service
@Transactional
public class InvestmentScheduleService {

    private static final Logger logger = LoggerFactory.getLogger(InvestmentScheduleService.class);

    private final InvestmentScheduleRepository investmentScheduleRepository;
    private final PortfolioService portfolioService;
    private final StreakService streakService;

    @Autowired
    public InvestmentScheduleService(InvestmentScheduleRepository investmentScheduleRepository,
            PortfolioService portfolioService, StreakService streakService) {
        this.investmentScheduleRepository = investmentScheduleRepository;
        this.portfolioService = portfolioService;
        this.streakService = streakService;
    }

    /**
     * Create or update investment schedule for a user (upsert operation)
     */
    public InvestmentSchedule createInvestmentSchedule(User user, BigDecimal investmentAmount,
            String frequency, LocalDate startDate, LocalDate nextInvestmentDate) {
        logger.info("Creating/updating investment schedule for user: {} with investment amount: {}",
                user.getEmail(), investmentAmount);

        // Check if user already has an investment schedule
        Optional<InvestmentSchedule> existingScheduleOpt = getCurrentSchedule(user);

        InvestmentSchedule schedule;
        if (existingScheduleOpt.isPresent()) {
            // Update existing schedule
            schedule = existingScheduleOpt.get();
            logger.info("Updating existing investment schedule with ID: {} for user: {}",
                    schedule.getId(), user.getEmail());

            // Update core investment fields
            schedule.setInvestmentAmount(investmentAmount);
            schedule.setFrequency(frequency);

            // Calculate monthly amount from investment amount and frequency
            schedule.setMonthlyAmount(calculateMonthlyAmountFromInvestment(investmentAmount, frequency));

            // Update start date if provided
            if (startDate != null) {
                // Only update start date if it's not already set OR if the schedule hasn't
                // started yet (brand new)
                if (schedule.getStartDate() == null || LocalDate.now().isBefore(schedule.getStartDate())) {
                    schedule.setStartDate(startDate);
                }

                LocalDate today = LocalDate.now();
                LocalDate anchorDate = schedule.getStartDate();
                LocalDate intendedDate = null;

                // If brand new (before start date), derive from start date
                if (anchorDate != null && today.isBefore(anchorDate)) {
                    intendedDate = anchorDate;
                } else {
                    // Otherwise use nextInvestmentDate (for updates to active schedules)
                    intendedDate = nextInvestmentDate;
                }

                if (intendedDate != null) {
                    schedule.setChosenDate(intendedDate);
                    schedule.setDayOfWeek(intendedDate.getDayOfWeek().name());
                    schedule.setDayOfMonth(intendedDate.getDayOfMonth());
                }

                // If nextInvestmentDate is explicitly provided, use it but adjust for holidays
                if (nextInvestmentDate != null) {
                    // Only update if the date has actually changed OR if chosenDate is missing
                    // to avoid overwriting chosenDate with an adjusted date when the user is just updating the amount
                    boolean dateChanged = schedule.getNextInvestmentDate() == null
                            || !nextInvestmentDate.equals(schedule.getNextInvestmentDate())
                            || schedule.getChosenDate() == null;

                    if (dateChanged) {
                        // Update chosenDate to the user's selected date
                        schedule.setChosenDate(nextInvestmentDate);
                        schedule.setDayOfWeek(nextInvestmentDate.getDayOfWeek().name());
                        schedule.setDayOfMonth(nextInvestmentDate.getDayOfMonth());

                        // Adjust the provided date for business days/holidays
                        schedule.setNextInvestmentDate(schedule.adjustForBusinessDay(nextInvestmentDate));
                    }
                } else {
                    // Otherwise calculate from start date
                    schedule.setNextInvestmentDate(schedule.calculateNextInvestmentDate(schedule.getStartDate()));
                }
            }

        } else {
            // Create new investment schedule
            schedule = new InvestmentSchedule();
            schedule.setUser(user);
            schedule.setInvestmentAmount(investmentAmount);
            schedule.setFrequency(frequency);

            // Calculate monthly amount from investment amount and frequency
            schedule.setMonthlyAmount(calculateMonthlyAmountFromInvestment(investmentAmount, frequency));

            // Set dates
            LocalDate effectiveStartDate = startDate != null ? startDate : LocalDate.now();
            schedule.setStartDate(effectiveStartDate);

            LocalDate today = LocalDate.now();
            LocalDate preferenceSourceDate;

            // Rule: Derive from nextInvestmentDate, unless today is before start day
            if (today.isBefore(effectiveStartDate)) {
                preferenceSourceDate = effectiveStartDate;
            } else {
                preferenceSourceDate = (nextInvestmentDate != null) ? nextInvestmentDate : effectiveStartDate;
            }

            if (preferenceSourceDate != null) {
                schedule.setDayOfWeek(preferenceSourceDate.getDayOfWeek().name());
                schedule.setDayOfMonth(preferenceSourceDate.getDayOfMonth());
            }

            // Set chosenDate preferences
            LocalDate chosen = (nextInvestmentDate != null) ? nextInvestmentDate : effectiveStartDate;
            schedule.setChosenDate(chosen);
            schedule.setDayOfWeek(chosen.getDayOfWeek().name());
            schedule.setDayOfMonth(chosen.getDayOfMonth());

            if (nextInvestmentDate != null) {
                schedule.setNextInvestmentDate(schedule.adjustForBusinessDay(nextInvestmentDate));
            } else {
                schedule.setNextInvestmentDate(schedule.calculateNextInvestmentDate(effectiveStartDate));
            }

            schedule.setIsPaused(true); // Always start paused until ACH is confirmed

            logger.info("Creating new investment schedule for user: {}", user.getEmail());
        }

        InvestmentSchedule savedSchedule = investmentScheduleRepository.save(schedule);

        // Additional debug: Query the database directly to see what's actually stored
        InvestmentSchedule reloadedSchedule = investmentScheduleRepository.findById(savedSchedule.getId()).orElse(null);
        if (reloadedSchedule != null) {
            logger.info("DEBUG: Reloaded from DB - startDate: {}, nextInvestmentDate: {}",
                    reloadedSchedule.getStartDate(), reloadedSchedule.getNextInvestmentDate());
        }

        // Ensure user has a default portfolio (create if not exists)
        portfolioService.getOrCreatePortfolio(user);

        logger.info("Successfully saved investment schedule with ID: {} for user: {} (Next investment: {})",
                savedSchedule.getId(), user.getEmail(), savedSchedule.getNextInvestmentDate());
        return savedSchedule;
    }

    /**
     * Clear ACH data and re-pause the schedule when a user changes their bank account.
     * A new ACH relationship will be created by attemptAchCreation after this.
     */
    public void resetForBankChange(User user) {
        Optional<InvestmentSchedule> scheduleOpt = investmentScheduleRepository.findTopByUserOrderByCreatedAtDesc(user);
        if (scheduleOpt.isEmpty()) {
            logger.info("No investment schedule found for user {} — nothing to reset", user.getEmail());
            return;
        }
        InvestmentSchedule schedule = scheduleOpt.get();
        schedule.setAchRequestId(null);
        schedule.setIsPaused(true);
        investmentScheduleRepository.save(schedule);
        logger.info("Investment schedule re-paused for bank account change — user {}", user.getEmail());
    }

    /**
     * Update investment schedule with ACH request ID
     */
    public InvestmentSchedule updateWithAchRequestId(User user, String achRequestId) {
        logger.info("Updating investment schedule with ACH request ID: {} for user: {}",
                achRequestId, user.getEmail());

        Optional<InvestmentSchedule> scheduleOpt = investmentScheduleRepository.findTopByUserOrderByCreatedAtDesc(user);

        if (scheduleOpt.isEmpty()) {
            logger.warn("No investment schedule found for user: {} — ACH saved to user profile, schedule will pick it up when created", user.getEmail());
            return null;
        }

        InvestmentSchedule schedule = scheduleOpt.get();
        schedule.setAchRequestId(achRequestId);
        schedule.setIsPaused(false); // Unpause when ACH is confirmed

        InvestmentSchedule updatedSchedule = investmentScheduleRepository.save(schedule);
        logger.info("Successfully updated investment schedule ID: {} with ACH request ID: {} and unpaused it",
                updatedSchedule.getId(), achRequestId);
        return updatedSchedule;
    }

    /**
     * Get the current active investment schedule for a user
     */
    @Transactional(readOnly = true)
    public Optional<InvestmentSchedule> getCurrentSchedule(User user) {
        return investmentScheduleRepository.findTopByUserOrderByCreatedAtDesc(user);
    }

    /**
     * Get all investment schedules for a user
     */
    @Transactional(readOnly = true)
    public List<InvestmentSchedule> getAllSchedules(User user) {
        return investmentScheduleRepository.findByUserOrderByCreatedAtDesc(user);
    }

    /**
     * Get all schedules ready for investment execution (for cron processing).
     * Only returns schedules where:
     *   - isPaused == false (the user has not paused the schedule), AND
     *   - user.accountStatus == "ACTIVE" (the Alpaca account is fully active)
     * Both conditions must be true for a trade to be placed.
     */
    @Transactional(readOnly = true)
    public List<InvestmentSchedule> getSchedulesReadyForInvestment() {
        logger.info("Finding investment schedules ready for execution...");

        List<InvestmentSchedule> readySchedules = investmentScheduleRepository
                .findByUser_AccountStatus("ACTIVE")
                .stream()
                .filter(InvestmentSchedule::isReadyForInvestment)
                .toList();

        logger.info("Found {} schedules ready for investment execution", readySchedules.size());
        return readySchedules;
    }

    /**
     * Calculate monthly amount from investment amount and frequency
     */
    private BigDecimal calculateMonthlyAmountFromInvestment(BigDecimal investmentAmount, String frequency) {
        if (investmentAmount == null)
            return BigDecimal.ZERO;

        return switch (frequency.toUpperCase()) {
            case "WEEKLY" -> investmentAmount.multiply(new BigDecimal("4.33")); // ~4.33 weeks per month
            case "BIWEEKLY" -> investmentAmount.multiply(new BigDecimal("2.17")); // ~2.17 biweekly periods per month
            case "SEMI_MONTHLY" -> investmentAmount.multiply(new BigDecimal("2")); // Exactly 2 times per month
            case "MONTHLY" -> investmentAmount;
            default -> investmentAmount;
        };
    }

    /**
     * Pause an investment schedule
     */
    public InvestmentSchedule pauseSchedule(User user, Long scheduleId) {
        logger.info("Pausing investment schedule ID: {} for user: {}", scheduleId, user.getEmail());

        Optional<InvestmentSchedule> scheduleOpt = investmentScheduleRepository.findByIdAndUser(scheduleId, user);

        if (scheduleOpt.isEmpty()) {
            logger.error("Investment schedule ID: {} not found for user: {}", scheduleId, user.getEmail());
            throw new RuntimeException("Investment schedule not found");
        }

        InvestmentSchedule schedule = scheduleOpt.get();
        schedule.setIsPaused(true);
        schedule.setMonthlyStreak(0);

        InvestmentSchedule updatedSchedule = investmentScheduleRepository.save(schedule);
        logger.info("Successfully paused investment schedule ID: {}", scheduleId);

        // Reset the user's consecutive-month streak
        streakService.resetStreak(user);

        return updatedSchedule;
    }

    /**
     * Resume an investment schedule.
     * The user's Alpaca account must be ACTIVE before a schedule can be resumed.
     *
     * @throws IllegalStateException with message "ACCOUNT_NOT_ACTIVE" if the account
     *                               is not yet active — the controller converts this to a 403.
     */
    public InvestmentSchedule resumeSchedule(User user, Long scheduleId) {
        logger.info("Resuming investment schedule ID: {} for user: {}", scheduleId, user.getEmail());

        // Gate: account must be ACTIVE before schedules can be resumed
        if (!"ACTIVE".equals(user.getAccountStatus())) {
            logger.warn("Resume blocked for user {}: accountStatus is '{}', not ACTIVE",
                    user.getEmail(), user.getAccountStatus());
            throw new IllegalStateException("ACCOUNT_NOT_ACTIVE");
        }

        Optional<InvestmentSchedule> scheduleOpt = investmentScheduleRepository.findByIdAndUser(scheduleId, user);

        if (scheduleOpt.isEmpty()) {
            logger.error("Investment schedule ID: {} not found for user: {}", scheduleId, user.getEmail());
            throw new RuntimeException("Investment schedule not found");
        }

        InvestmentSchedule schedule = scheduleOpt.get();
        schedule.setIsPaused(false);

        InvestmentSchedule updatedSchedule = investmentScheduleRepository.save(schedule);
        logger.info("Successfully resumed investment schedule ID: {}", scheduleId);

        return updatedSchedule;
    }

    /**
     * Check if user has any active investment schedules
     */
    @Transactional(readOnly = true)
    public boolean hasActiveSchedules(User user) {
        return investmentScheduleRepository.hasActiveSchedules(user);
    }

    /**
     * Update investment schedule details
     */
    public InvestmentSchedule updateSchedule(User user, Long scheduleId, BigDecimal investmentAmount,
            String frequency) {
        logger.info("Updating investment schedule ID: {} for user: {}", scheduleId, user.getEmail());

        Optional<InvestmentSchedule> scheduleOpt = investmentScheduleRepository.findByIdAndUser(scheduleId, user);

        if (scheduleOpt.isEmpty()) {
            logger.error("Investment schedule ID: {} not found for user: {}", scheduleId, user.getEmail());
            throw new RuntimeException("Investment schedule not found");
        }

        InvestmentSchedule schedule = scheduleOpt.get();
        schedule.setInvestmentAmount(investmentAmount);
        schedule.setFrequency(frequency);

        // Recalculate monthly amount from investment amount and frequency
        schedule.setMonthlyAmount(calculateMonthlyAmountFromInvestment(investmentAmount, frequency));

        InvestmentSchedule updatedSchedule = investmentScheduleRepository.save(schedule);
        logger.info("Successfully updated investment schedule ID: {}", scheduleId);

        return updatedSchedule;
    }

}