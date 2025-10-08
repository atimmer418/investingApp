package com.investingapp.backend.repository;

import com.investingapp.backend.model.InvestmentExecution;
import com.investingapp.backend.model.InvestmentExecution.ExecutionStatus;
import com.investingapp.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InvestmentExecutionRepository extends JpaRepository<InvestmentExecution, Long> {
    
    /**
     * Find all scheduled executions for today
     */
    @Query("SELECT ie FROM InvestmentExecution ie WHERE " +
           "DATE(ie.scheduledDate) = DATE(:date) AND " +
           "ie.status = :status")
    List<InvestmentExecution> findScheduledExecutionsForDate(
        @Param("date") LocalDateTime date, 
        @Param("status") ExecutionStatus status
    );
    
    /**
     * Find executions that need funding status check
     */
    @Query("SELECT ie FROM InvestmentExecution ie WHERE " +
           "ie.status = :status AND " +
           "ie.executionDate < :cutoffTime")
    List<InvestmentExecution> findExecutionsAwaitingFundingCheck(
        @Param("status") ExecutionStatus status,
        @Param("cutoffTime") LocalDateTime cutoffTime
    );
    
    /**
     * Find executions that need trading status check
     */
    @Query("SELECT ie FROM InvestmentExecution ie WHERE " +
           "ie.status = :status AND " +
           "ie.fundingCompletedAt < :cutoffTime")
    List<InvestmentExecution> findExecutionsAwaitingTradingCheck(
        @Param("status") ExecutionStatus status,
        @Param("cutoffTime") LocalDateTime cutoffTime
    );
    
    /**
     * Find executions by user and status
     */
    List<InvestmentExecution> findByUserIdAndStatus(Long userId, ExecutionStatus status);
    
    /**
     * Find recent executions for a user
     */
    @Query("SELECT ie FROM InvestmentExecution ie WHERE " +
           "ie.user.id = :userId AND " +
           "ie.scheduledDate >= :since " +
           "ORDER BY ie.scheduledDate DESC")
    List<InvestmentExecution> findRecentExecutionsForUser(
        @Param("userId") Long userId,
        @Param("since") LocalDateTime since
    );
    
    /**
     * Find all executions by user ordered by creation date
     */
    List<InvestmentExecution> findByUserOrderByCreatedAtDesc(User user);
    
    /**
     * Find all executions with a specific status (for delayed trading initiation)
     */
    List<InvestmentExecution> findByStatus(ExecutionStatus status);
}
