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
    
    @Autowired
    public InvestmentScheduleService(InvestmentScheduleRepository investmentScheduleRepository,
                                   PortfolioService portfolioService) {
        this.investmentScheduleRepository = investmentScheduleRepository;
        this.portfolioService = portfolioService;
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
            
            // Update start date if provided (except for semi-monthly)
            if (startDate != null) {
                if ("SEMI_MONTHLY".equalsIgnoreCase(frequency)) {
                    // For semi-monthly, ignore provided start date and enforce 1st/15th
                    LocalDate enforcedStartDate = getNextSemiMonthlyDate();
                    schedule.setStartDate(enforcedStartDate);
                    schedule.setNextInvestmentDate(schedule.calculateNextInvestmentDate(enforcedStartDate));
                } else {
                    schedule.setStartDate(startDate);
                    
                    // If nextInvestmentDate is explicitly provided, use it
                    if (nextInvestmentDate != null) {
                        schedule.setNextInvestmentDate(nextInvestmentDate);
                    } else {
                        // Otherwise calculate from start date
                        schedule.setNextInvestmentDate(schedule.calculateNextInvestmentDate(startDate));
                    }
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
            
            // Set dates (enforce semi-monthly rules)
            LocalDate effectiveStartDate;
            if ("SEMI_MONTHLY".equalsIgnoreCase(frequency)) {
                // For semi-monthly, ignore provided start date and enforce 1st/15th
                effectiveStartDate = getNextSemiMonthlyDate();
            } else {
                effectiveStartDate = startDate != null ? startDate : LocalDate.now();
            }
            schedule.setStartDate(effectiveStartDate);
            
            if (nextInvestmentDate != null) {
                schedule.setNextInvestmentDate(nextInvestmentDate);
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
     * Update investment schedule with ACH request ID
     */
    public InvestmentSchedule updateWithAchRequestId(User user, String achRequestId) {
        logger.info("Updating investment schedule with ACH request ID: {} for user: {}", 
                   achRequestId, user.getEmail());
        
        Optional<InvestmentSchedule> scheduleOpt = investmentScheduleRepository.findTopByUserOrderByCreatedAtDesc(user);
        
        if (scheduleOpt.isEmpty()) {
            logger.error("No investment schedule found for user: {}", user.getEmail());
            throw new RuntimeException("No investment schedule found for user");
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
     * Get all schedules ready for investment execution (for cron processing)
     */
    @Transactional(readOnly = true)
    public List<InvestmentSchedule> getSchedulesReadyForInvestment() {
        logger.info("Finding investment schedules ready for execution...");
        
        List<InvestmentSchedule> allSchedules = investmentScheduleRepository.findAll();
        List<InvestmentSchedule> readySchedules = allSchedules.stream()
                .filter(InvestmentSchedule::isReadyForInvestment)
                .toList();
        
        logger.info("Found {} schedules ready for investment execution", readySchedules.size());
        return readySchedules;
    }

    /**
     * Calculate monthly amount from investment amount and frequency
     */
    private BigDecimal calculateMonthlyAmountFromInvestment(BigDecimal investmentAmount, String frequency) {
        if (investmentAmount == null) return BigDecimal.ZERO;
        
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
        
        InvestmentSchedule updatedSchedule = investmentScheduleRepository.save(schedule);
        logger.info("Successfully paused investment schedule ID: {}", scheduleId);
        
        return updatedSchedule;
    }
    
    /**
     * Resume an investment schedule
     */
    public InvestmentSchedule resumeSchedule(User user, Long scheduleId) {
        logger.info("Resuming investment schedule ID: {} for user: {}", scheduleId, user.getEmail());
        
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

    /**
     * Get the next semi-monthly date (1st or 15th)
     */
    private LocalDate getNextSemiMonthlyDate() {
        LocalDate today = LocalDate.now();
        int currentDay = today.getDayOfMonth();
        
        if (currentDay == 1) {
            return today;
        } else if (currentDay < 15) {
            return today.withDayOfMonth(15);
        } else if (currentDay == 15) {
            return today;
        } else {
            return today.plusMonths(1).withDayOfMonth(1);
        }
    }
}