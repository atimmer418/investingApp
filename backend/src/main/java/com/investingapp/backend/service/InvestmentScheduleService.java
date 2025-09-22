package com.investingapp.backend.service;

import com.investingapp.backend.model.InvestmentSchedule;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.InvestmentScheduleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class InvestmentScheduleService {
    
    private static final Logger logger = LoggerFactory.getLogger(InvestmentScheduleService.class);
    
    private final InvestmentScheduleRepository investmentScheduleRepository;
    
    @Autowired
    public InvestmentScheduleService(InvestmentScheduleRepository investmentScheduleRepository) {
        this.investmentScheduleRepository = investmentScheduleRepository;
    }
    
    /**
     * Create or update investment schedule for a user (upsert operation)
     */
    public InvestmentSchedule createInvestmentSchedule(User user, BigDecimal monthlyAmount, 
                                                      String frequency, BigDecimal targetPortfolio, 
                                                      Integer timeToFI) {
        logger.info("Creating/updating investment schedule for user: {} with monthly amount: {}", 
                   user.getEmail(), monthlyAmount);
        
        // Check if user already has an investment schedule
        Optional<InvestmentSchedule> existingScheduleOpt = getCurrentSchedule(user);
        
        InvestmentSchedule schedule;
        if (existingScheduleOpt.isPresent()) {
            // Update existing schedule
            schedule = existingScheduleOpt.get();
            logger.info("Updating existing investment schedule with ID: {} for user: {}", 
                       schedule.getId(), user.getEmail());
            
            // Update the fields
            schedule.setMonthlyAmount(monthlyAmount);
            schedule.setFrequency(frequency);
            schedule.setTargetPortfolio(targetPortfolio);
            schedule.setTimeToFI(timeToFI);
            // Keep existing isPaused and achRequestId values
            
        } else {
            // Create new investment schedule
            schedule = new InvestmentSchedule();
            schedule.setUser(user);
            schedule.setMonthlyAmount(monthlyAmount);
            schedule.setFrequency(frequency);
            schedule.setTargetPortfolio(targetPortfolio);
            schedule.setTimeToFI(timeToFI);
            schedule.setIsPaused(true); // Always start paused until ACH is confirmed
            
            logger.info("Creating new investment schedule for user: {}", user.getEmail());
        }

        InvestmentSchedule savedSchedule = investmentScheduleRepository.save(schedule);
        logger.info("Successfully saved investment schedule with ID: {} for user: {}", 
                   savedSchedule.getId(), user.getEmail());
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
    public InvestmentSchedule updateSchedule(User user, Long scheduleId, BigDecimal monthlyAmount, 
                                           String frequency, BigDecimal targetPortfolio, Integer timeToFI) {
        logger.info("Updating investment schedule ID: {} for user: {}", scheduleId, user.getEmail());
        
        Optional<InvestmentSchedule> scheduleOpt = investmentScheduleRepository.findByIdAndUser(scheduleId, user);
        
        if (scheduleOpt.isEmpty()) {
            logger.error("Investment schedule ID: {} not found for user: {}", scheduleId, user.getEmail());
            throw new RuntimeException("Investment schedule not found");
        }
        
        InvestmentSchedule schedule = scheduleOpt.get();
        schedule.setMonthlyAmount(monthlyAmount);
        schedule.setFrequency(frequency);
        schedule.setTargetPortfolio(targetPortfolio);
        schedule.setTimeToFI(timeToFI);
        
        InvestmentSchedule updatedSchedule = investmentScheduleRepository.save(schedule);
        logger.info("Successfully updated investment schedule ID: {}", scheduleId);
        
        return updatedSchedule;
    }
}