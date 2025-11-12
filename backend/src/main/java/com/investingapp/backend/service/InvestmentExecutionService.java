package com.investingapp.backend.service;

import com.investingapp.backend.model.*;
import com.investingapp.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional
public class InvestmentExecutionService {
    
    private static final Logger logger = LoggerFactory.getLogger(InvestmentExecutionService.class);
    
    // Configuration for lump sum batching behavior
    // Set to true to batch multiple lump sum investments within the window (cost optimization)
    // Set to false for immediate processing (better user experience)
    private static final boolean ENABLE_LUMP_SUM_BATCHING = true;
    
    // Window in minutes to wait for additional lump sum investments before processing
    // Only used when ENABLE_LUMP_SUM_BATCHING = true
    private static final int LUMP_SUM_BATCHING_WINDOW_MINUTES = 5;
    
    @Autowired
    private InvestmentScheduleService investmentScheduleService;
    
    @Autowired
    private InvestmentScheduleRepository investmentScheduleRepository;
    
    @Autowired
    private InvestmentExecutionRepository executionRepository;
    
    @Autowired
    private InvestmentTradeRepository tradeRepository;
    
    @Autowired
    private AlpacaService alpacaService;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private PortfolioRepository portfolioRepository;
    
    @Autowired
    private TaskScheduler taskScheduler;
    
    /**
     * Check if markets are currently open (US Eastern Time)
     * Market hours: Monday-Friday 9:30 AM - 4:00 PM ET
     */
    private boolean isMarketOpen() {
        LocalDateTime now = LocalDateTime.now();
        DayOfWeek dayOfWeek = now.getDayOfWeek();
        
        // Weekend check
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            return false;
        }
        
        // Market hours: 9:30 AM - 4:00 PM ET
        LocalTime marketOpen = LocalTime.of(9, 30);
        LocalTime marketClose = LocalTime.of(16, 0);
        LocalTime currentTime = now.toLocalTime();
        
        return currentTime.isAfter(marketOpen) && currentTime.isBefore(marketClose);
    }
    
    /**
     * Process a single investment execution immediately (for lump sum investments)
     * This is called directly from the API controller to initiate ACH transfer immediately
     */
    public void processInvestmentExecutionImmediately(InvestmentExecution execution) {
        logger.info("Processing lump sum investment execution {} immediately for user {}", 
            execution.getId(), execution.getUser().getEmail());
        
        try {
            // Check if user has any pending funding executions today
            List<InvestmentExecution> pendingFundingToday = executionRepository
                .findPendingFundingExecutionsForUserToday(
                    execution.getUser().getId(),
                    LocalDateTime.now().toLocalDate().atStartOfDay(),
                    LocalDateTime.now().toLocalDate().atTime(23, 59, 59)
                );
            
            // Also check for other scheduled executions from today that might be waiting to batch
            List<InvestmentExecution> scheduledToday = executionRepository.findByUserIdAndStatus(
                execution.getUser().getId(), InvestmentExecution.ExecutionStatus.SCHEDULED
            ).stream()
            .filter(exec -> exec.getCreatedAt().toLocalDate().equals(LocalDateTime.now().toLocalDate()))
            .toList();
            
            if (!pendingFundingToday.isEmpty()) {
                // There's already a pending ACH transfer today
                // For lump sum investments, we'll initiate a separate ACH transfer
                // since they're time-sensitive and Alpaca allows multiple ACH transfers per day
                logger.info("User {} has existing ACH transfer today. Initiating separate ACH for lump sum execution {}", 
                    execution.getUser().getEmail(), execution.getId());
                
                // Process this lump sum investment immediately with its own ACH
                processInvestmentExecution(execution);
                return;
                
            } else if (!scheduledToday.isEmpty()) {
                // There are other investments queued for batching today
                logger.info("User {} has {} other investments queued today. Creating batch ACH transfer.", 
                    execution.getUser().getEmail(), scheduledToday.size());
                
                // Add current execution to the batch
                execution.setStatus(InvestmentExecution.ExecutionStatus.SCHEDULED);
                execution.setErrorMessage("Batched with other investments for single ACH transfer");
                executionRepository.save(execution);
                
                // Process entire batch with combined ACH transfer
                processBatchedInvestments(execution.getUser(), scheduledToday);
                return;
                
            } else {
                // No pending ACH and no queued investments today
                // Decision: Process immediately vs wait for batching
                if (ENABLE_LUMP_SUM_BATCHING) {
                    logger.info("First lump sum investment today for user {}. Using {}-minute batching window.", 
                        execution.getUser().getEmail(), LUMP_SUM_BATCHING_WINDOW_MINUTES);
                    
                    execution.setStatus(InvestmentExecution.ExecutionStatus.SCHEDULED);
                    execution.setErrorMessage("Waiting for potential batch processing (" + 
                                             LUMP_SUM_BATCHING_WINDOW_MINUTES + "-minute window for lump sum)");
                    executionRepository.save(execution);
                    
                    // Schedule batch processing after configured window
                    scheduleLumpSumBatchProcessing(execution.getUser());
                } else {
                    // Process immediately for fastest user experience
                    logger.info("Processing lump sum investment immediately for user {} (batching disabled)", 
                        execution.getUser().getEmail());
                    
                    processInvestmentExecution(execution);
                }
                return;
            }
            
        } catch (Exception e) {
            logger.error("Failed to process lump sum investment execution {}: {}", execution.getId(), e.getMessage(), e);
            throw e; // Re-throw so controller can handle the error appropriately
        }
    }
    
    /**
     * Process batched investments with a single ACH transfer for the total amount
     */
    private void processBatchedInvestments(User user, List<InvestmentExecution> batchExecutions) {
        logger.info("Processing {} batched investments for user {}", batchExecutions.size(), user.getEmail());
        
        // Calculate total amount for all batched investments
        BigDecimal totalAmount = batchExecutions.stream()
            .map(InvestmentExecution::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        logger.info("Total amount for batched investments: {}", totalAmount);
        
        // Create a primary execution for the ACH transfer
        InvestmentExecution primaryExecution = batchExecutions.get(0);
        
        try {
            // Store the original amount before modifying it
            BigDecimal originalAmount = primaryExecution.getAmount();
            
            // Update primary execution with total amount for ACH transfer
            primaryExecution.setAmount(totalAmount);
            primaryExecution.setStatus(InvestmentExecution.ExecutionStatus.FUNDING_INITIATED);
            primaryExecution.setExecutionDate(LocalDateTime.now());
            primaryExecution.setAlpacaAccountId(user.getAlpacaAccountId());
            primaryExecution.setErrorMessage("Primary execution for batch ACH transfer $" + totalAmount + ". Original amount: $" + originalAmount);
            executionRepository.save(primaryExecution);
            
            // Mark other executions as waiting for batch funding
            for (int i = 1; i < batchExecutions.size(); i++) {
                InvestmentExecution batchExec = batchExecutions.get(i);
                batchExec.setStatus(InvestmentExecution.ExecutionStatus.SCHEDULED);
                batchExec.setErrorMessage("Waiting for batch ACH transfer (execution " + primaryExecution.getId() + ")");
                executionRepository.save(batchExec);
            }
            
            // Initiate single ACH transfer for total amount
            AlpacaService.AlpacaTransferResponse transferResponse = alpacaService.initiateAchTransfer(
                user.getAlpacaAccountId(),
                user.getPlaidRelationshipId(),
                totalAmount
            );
            
            if (transferResponse.isSuccess()) {
                primaryExecution.setAlpacaTransferId(transferResponse.id);
                executionRepository.save(primaryExecution);
                
                logger.info("Successfully initiated batch ACH transfer {} for total amount {} covering {} investments", 
                    transferResponse.id, totalAmount, batchExecutions.size());
            } else {
                // Mark all batched executions as failed
                for (InvestmentExecution batchExec : batchExecutions) {
                    batchExec.setStatus(InvestmentExecution.ExecutionStatus.FUNDING_FAILED);
                    batchExec.setErrorMessage("Batch ACH transfer failed: " + transferResponse.errorMessage);
                    executionRepository.save(batchExec);
                }
                
                logger.error("Batch ACH transfer failed for user {}: {}", user.getEmail(), transferResponse.errorMessage);
                throw new RuntimeException("Batch ACH transfer failed: " + transferResponse.errorMessage);
            }
            
        } catch (Exception e) {
            logger.error("Error processing batched investments for user {}: {}", user.getEmail(), e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Schedule lump sum batch processing with a configurable delay
     */
    private void scheduleLumpSumBatchProcessing(User user) {
        logger.info("Scheduling lump sum batch processing for user {} with {}-minute window", 
                   user.getEmail(), LUMP_SUM_BATCHING_WINDOW_MINUTES);
        
        // Schedule the batch processing to run after the configured window
        Instant scheduledTime = Instant.now().plus(Duration.ofMinutes(LUMP_SUM_BATCHING_WINDOW_MINUTES));
        
        taskScheduler.schedule(() -> {
            try {
                // Find all scheduled executions for today
                List<InvestmentExecution> scheduledToday = executionRepository.findByUserIdAndStatus(
                    user.getId(), InvestmentExecution.ExecutionStatus.SCHEDULED
                ).stream()
                .filter(exec -> exec.getCreatedAt().toLocalDate().equals(LocalDateTime.now().toLocalDate()))
                .toList();
                
                if (!scheduledToday.isEmpty()) {
                    logger.info("Processing {} lump sum investments in batch for user {}", 
                               scheduledToday.size(), user.getEmail());
                    processBatchedInvestments(user, scheduledToday);
                } else {
                    logger.info("No scheduled lump sum investments found for user {} during batch processing", user.getEmail());
                }
                
            } catch (Exception e) {
                logger.error("Error in scheduled lump sum batch processing for user {}: {}", user.getEmail(), e.getMessage(), e);
            }
        }, scheduledTime);
    }

    /**
     * Process all scheduled investments for today
     */
    public void processScheduledInvestments() {
        logger.info("Starting scheduled investment processing for {}", LocalDate.now());
        
        // Get all investment schedules that are ready for execution
        // This includes schedules where either:
        // 1. nextInvestmentDate is today or past due (recurring investments)
        // 2. startDate is today (first-time investments starting today)
        List<InvestmentSchedule> readySchedules = investmentScheduleService.getSchedulesReadyForInvestment();
        
        logger.info("Found {} investment schedules ready for execution", readySchedules.size());
        
        LocalDate today = LocalDate.now();
        
        for (InvestmentSchedule schedule : readySchedules) {
            try {
                User user = schedule.getUser();
                
                // Check if this schedule should be processed today
                boolean shouldProcessToday = false;
                String reason = "";
                
                if (schedule.getStartDate() != null && schedule.getStartDate().equals(today)) {
                    shouldProcessToday = true;
                    reason = "start date is today";
                } else if (schedule.getNextInvestmentDate() != null && 
                          !schedule.getNextInvestmentDate().isAfter(today)) {
                    shouldProcessToday = true;
                    reason = "next investment date is due";
                }
                
                if (!shouldProcessToday) {
                    logger.debug("Skipping schedule {} for user {} - not due today", 
                               schedule.getId(), user.getEmail());
                    continue;
                }
                
                logger.info("Processing investment schedule {} for user {} - {}", 
                           schedule.getId(), user.getEmail(), reason);
                
                // Create new investment execution
                InvestmentExecution execution = createInvestmentExecution(schedule);
                
                // Process the execution
                processInvestmentExecution(execution);
                
                // Update the schedule's next investment date (but not start date)
                updateScheduleAfterExecution(schedule);
                
            } catch (Exception e) {
                logger.error("Error processing investment schedule {} for user {}", 
                           schedule.getId(), schedule.getUser().getEmail(), e);
                
                // Could add notification logic here for schedule processing failures
            }
        }
        
        logger.info("Completed scheduled investment processing");
    }
    
    /**
     * Create a new InvestmentExecution from an InvestmentSchedule
     */
    private InvestmentExecution createInvestmentExecution(InvestmentSchedule schedule) {
        InvestmentExecution execution = new InvestmentExecution();
        execution.setUser(schedule.getUser());
        execution.setAmount(schedule.getInvestmentAmount());
        execution.setScheduledDate(LocalDateTime.now()); // Use LocalDateTime
        execution.setStatus(InvestmentExecution.ExecutionStatus.SCHEDULED);
        // Note: InvestmentExecution doesn't have a direct link back to schedule
        
        return executionRepository.save(execution);
    }
    
    /**
     * Update schedule's next investment date after successful execution
     */
    private void updateScheduleAfterExecution(InvestmentSchedule schedule) {
        LocalDate currentNextDate = schedule.getNextInvestmentDate();
        LocalDate newNextDate = schedule.calculateNextInvestmentDate(LocalDate.now());
        
        schedule.setNextInvestmentDate(newNextDate);
        // Note: We don't update startDate - it remains as the original start date
        
        // Save the updated schedule
        investmentScheduleRepository.save(schedule);
        
        logger.info("Updated schedule {} next investment date from {} to {}", 
                   schedule.getId(), currentNextDate, newNextDate);
    }
    
    /**
     * Process a single investment execution
     */
    private void processInvestmentExecution(InvestmentExecution execution) {
        logger.info("Processing investment execution {} for user {}", 
            execution.getId(), execution.getUser().getId());
        
        User user = execution.getUser();
        
        // Validate user has required Alpaca information
        if (user.getAlpacaAccountId() == null || user.getPlaidRelationshipId() == null) {
            throw new RuntimeException("User missing required Alpaca account ID or Plaid relationship ID");
        }
        
        // Update execution status and date
        execution.setStatus(InvestmentExecution.ExecutionStatus.FUNDING_INITIATED);
        execution.setExecutionDate(LocalDateTime.now());
        execution.setAlpacaAccountId(user.getAlpacaAccountId());
        executionRepository.save(execution);
        
        // Initiate ACH funding
        AlpacaService.AlpacaTransferResponse transferResponse = alpacaService.initiateAchTransfer(
            user.getAlpacaAccountId(),
            user.getPlaidRelationshipId(),
            execution.getAmount()
        );
        
        if (transferResponse.isSuccess()) {
            execution.setAlpacaTransferId(transferResponse.id);
            executionRepository.save(execution);
            
            logger.info("Successfully initiated ACH transfer {} for execution {}", 
                transferResponse.id, execution.getId());
        } else {
            execution.setStatus(InvestmentExecution.ExecutionStatus.FUNDING_FAILED);
            execution.setErrorMessage("ACH transfer failed: " + transferResponse.errorMessage);
            executionRepository.save(execution);
            
            notifyUserOfFailure(execution, "Funding Failed", transferResponse.errorMessage);
            throw new RuntimeException("ACH transfer failed: " + transferResponse.errorMessage);
        }
        
        // Note: Next investment date will be updated when the schedule is processed
        // after successful execution via updateScheduleAfterExecution()
    }
    
    /**
     * Check funding status for pending executions
     */
    public void checkFundingStatus() {
        logger.info("Checking funding status for pending executions");
        
        // Check executions that have been waiting for funding for at least 10 minutes
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(10);
        List<InvestmentExecution> pendingExecutions = executionRepository
            .findExecutionsAwaitingFundingCheck(
                InvestmentExecution.ExecutionStatus.FUNDING_INITIATED, 
                cutoffTime
            );
        
        logger.info("Found {} executions awaiting funding check", pendingExecutions.size());
        
        for (InvestmentExecution execution : pendingExecutions) {
            try {
                checkExecutionFundingStatus(execution);
            } catch (Exception e) {
                logger.error("Error checking funding status for execution {}", execution.getId(), e);
            }
        }
    }
    
    /**
     * Check funding status for a specific execution
     */
    private void checkExecutionFundingStatus(InvestmentExecution execution) {
        logger.info("Checking funding status for execution {}", execution.getId());
        
        AlpacaService.AlpacaTransferResponse transferStatus = alpacaService.checkTransferStatus(
            execution.getAlpacaAccountId(),
            execution.getAlpacaTransferId(),
            execution.getAmount(),
            execution.getExecutionDate()
        );
        
        if ("COMPLETED".equalsIgnoreCase(transferStatus.status)) {
            // Funding completed, initiate trading
            execution.setStatus(InvestmentExecution.ExecutionStatus.FUNDING_COMPLETED);
            execution.setFundingCompletedAt(LocalDateTime.now());
            executionRepository.save(execution);
            
            logger.info("Funding completed for execution {}, initiating trading", execution.getId());
            initiateTradingForExecution(execution);
            
            // Check for any queued executions for the same user that can now be processed
            processQueuedExecutionsForUser(execution.getUser());
            
        } else if ("FAILED".equalsIgnoreCase(transferStatus.status) || 
                   "REJECTED".equalsIgnoreCase(transferStatus.status)) {
            // Funding failed
            execution.setStatus(InvestmentExecution.ExecutionStatus.FUNDING_FAILED);
            execution.setErrorMessage("ACH transfer failed with status: " + transferStatus.status);
            executionRepository.save(execution);
            
            notifyUserOfFailure(execution, "Funding Failed", 
                "Your investment could not be processed due to insufficient funds or banking issues.");
            
        } else {
            // Still pending, check if it's been too long (24 hours)
            if (execution.getExecutionDate().isBefore(LocalDateTime.now().minusHours(24))) {
                execution.setStatus(InvestmentExecution.ExecutionStatus.FUNDING_FAILED);
                execution.setErrorMessage("ACH transfer timeout - exceeded 24 hours");
                executionRepository.save(execution);
                
                notifyUserOfFailure(execution, "Funding Timeout", 
                    "Your investment could not be processed due to banking delays.");
            }
        }
    }
    
    /**
     * Process any queued executions for a user (called when ACH funding completes)
     */
    private void processQueuedExecutionsForUser(User user) {
        logger.info("Checking for queued executions for user {}", user.getEmail());
        
        // Find scheduled executions that were queued due to ACH limits or batching
        List<InvestmentExecution> queuedExecutions = executionRepository.findByUserIdAndStatus(
            user.getId(), InvestmentExecution.ExecutionStatus.SCHEDULED
        );
        
        // Filter for executions that were queued today (have error message indicating batching)
        List<InvestmentExecution> todaysQueuedExecutions = queuedExecutions.stream()
            .filter(exec -> exec.getErrorMessage() != null && 
                           (exec.getErrorMessage().contains("Queued for batch processing") ||
                            exec.getErrorMessage().contains("Waiting for batch ACH transfer")))
            .toList();
        
        if (todaysQueuedExecutions.isEmpty()) {
            logger.info("No queued executions found for user {}", user.getEmail());
            return;
        }
        
        logger.info("Found {} queued executions for user {}, processing them now", 
                   todaysQueuedExecutions.size(), user.getEmail());
        
        for (InvestmentExecution queuedExecution : todaysQueuedExecutions) {
            try {
                // For batch executions, we need to restore the original amount
                // (it might have been modified during batching)
                restoreOriginalInvestmentAmount(queuedExecution);
                
                // Clear the queue message and process directly to trading
                queuedExecution.setErrorMessage(null);
                queuedExecution.setStatus(InvestmentExecution.ExecutionStatus.FUNDING_COMPLETED);
                queuedExecution.setFundingCompletedAt(LocalDateTime.now());
                executionRepository.save(queuedExecution);
                
                logger.info("Processing queued execution {} for user {} with amount {}", 
                           queuedExecution.getId(), user.getEmail(), queuedExecution.getAmount());
                
                initiateTradingForExecution(queuedExecution);
                
            } catch (Exception e) {
                logger.error("Error processing queued execution {} for user {}: {}", 
                           queuedExecution.getId(), user.getEmail(), e.getMessage(), e);
                
                queuedExecution.setStatus(InvestmentExecution.ExecutionStatus.TRADING_FAILED);
                queuedExecution.setErrorMessage("Failed to process queued execution: " + e.getMessage());
                executionRepository.save(queuedExecution);
            }
        }
    }
    
    /**
     * Restore the original investment amount for a batched execution
     * This is needed because the primary execution amount was modified to include the batch total
     */
    private void restoreOriginalInvestmentAmount(InvestmentExecution execution) {
        // Check if this execution has its original amount stored in the error message
        if (execution.getErrorMessage() != null && 
            execution.getErrorMessage().contains("Primary execution for batch ACH transfer")) {
            
            // Extract the original amount from the error message
            // Format: "Primary execution for batch ACH transfer $800.00. Original amount: $500.00"
            String errorMessage = execution.getErrorMessage();
            int originalAmountIndex = errorMessage.indexOf("Original amount: $");
            
            if (originalAmountIndex != -1) {
                try {
                    String amountStr = errorMessage.substring(originalAmountIndex + 18); // Skip "Original amount: $"
                    int endIndex = amountStr.indexOf(".");
                    if (endIndex != -1) {
                        endIndex += 3; // Include ".00"
                        String originalAmountStr = amountStr.substring(0, endIndex);
                        BigDecimal originalAmount = new BigDecimal(originalAmountStr);
                        
                        logger.info("Restoring original amount ${} for primary execution {} (was ${})", 
                                   originalAmount, execution.getId(), execution.getAmount());
                        
                        execution.setAmount(originalAmount);
                        
                    }
                } catch (Exception e) {
                    logger.error("Failed to parse original amount from error message for execution {}: {}", 
                               execution.getId(), e.getMessage());
                }
            } else {
                logger.warn("Primary batch execution {} does not have original amount in error message", 
                           execution.getId());
            }
        }
    }
    
    /**
     * Initiate trading for a funded execution
     */
    private void initiateTradingForExecution(InvestmentExecution execution) {
        logger.info("Initiating trading for execution {}", execution.getId());
        
        // Check if market is open before placing trades
        if (!isMarketOpen()) {
            logger.info("Market is closed, delaying trading for execution {} until market opens", execution.getId());
            // Keep status as FUNDING_COMPLETED - trading will be picked up when market opens
            return;
        }
        
        User user = execution.getUser();
        
        execution.setStatus(InvestmentExecution.ExecutionStatus.TRADING_INITIATED);
        executionRepository.save(execution);
        
        boolean hasFailures = false;
        
        // Handle different investment types
        String investmentType = execution.getInvestmentType() != null ? execution.getInvestmentType() : "portfolio";
        
        if ("stock".equals(investmentType)) {
            // Individual stock investment
            String targetSymbol = execution.getTargetSymbol();
            if (targetSymbol == null || targetSymbol.trim().isEmpty()) {
                execution.setStatus(InvestmentExecution.ExecutionStatus.TRADING_FAILED);
                execution.setErrorMessage("Missing target symbol for stock investment");
                executionRepository.save(execution);
                
                notifyUserOfFailure(execution, "Trading Failed", "Missing stock symbol information");
                return;
            }
            
            logger.info("Creating individual stock trade for symbol {} with amount {}", targetSymbol, execution.getAmount());
            
            try {
                // Create single trade for the target stock
                InvestmentTrade trade = new InvestmentTrade(execution, targetSymbol, execution.getAmount());
                trade = tradeRepository.save(trade);
                
                // Place order with Alpaca
                AlpacaService.AlpacaOrderResponse orderResponse = alpacaService.placeBuyOrder(
                    execution.getAlpacaAccountId(), targetSymbol, execution.getAmount()
                );
                
                if (orderResponse.isSuccess()) {
                    trade.setAlpacaOrderId(orderResponse.id);
                    trade.setStatus(InvestmentTrade.TradeStatus.SUBMITTED);
                    trade.setSubmittedAt(LocalDateTime.now());
                    tradeRepository.save(trade);
                    
                    logger.info("Successfully placed order {} for stock {} with amount {}", 
                        orderResponse.id, targetSymbol, execution.getAmount());
                } else {
                    trade.setStatus(InvestmentTrade.TradeStatus.FAILED);
                    trade.setErrorMessage(orderResponse.errorMessage);
                    trade.setFailedAt(LocalDateTime.now());
                    tradeRepository.save(trade);
                    
                    hasFailures = true;
                    logger.error("Failed to place order for stock {}: {}", targetSymbol, orderResponse.errorMessage);
                }
                
            } catch (Exception e) {
                logger.error("Error placing trade for stock {} in execution {}", targetSymbol, execution.getId(), e);
                hasFailures = true;
            }
            
        } else {
            // Portfolio investment (default behavior)
            logger.info("Creating portfolio trades based on user's allocation");
            
            Map<String, BigDecimal> portfolioAllocation = getUserPortfolioAllocation(user);
            
            // Create trades for each allocation
            for (Map.Entry<String, BigDecimal> allocation : portfolioAllocation.entrySet()) {
                String symbol = allocation.getKey();
                BigDecimal percentage = allocation.getValue();
                BigDecimal amount = execution.getAmount().multiply(percentage).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                
                try {
                    // Create trade record
                    InvestmentTrade trade = new InvestmentTrade(execution, symbol, amount);
                    trade = tradeRepository.save(trade);
                    
                    // Place order with Alpaca
                    AlpacaService.AlpacaOrderResponse orderResponse = alpacaService.placeBuyOrder(
                        execution.getAlpacaAccountId(), symbol, amount
                    );
                    
                    if (orderResponse.isSuccess()) {
                        trade.setAlpacaOrderId(orderResponse.id);
                        trade.setStatus(InvestmentTrade.TradeStatus.SUBMITTED);
                        trade.setSubmittedAt(LocalDateTime.now());
                        tradeRepository.save(trade);
                        
                        logger.info("Successfully placed order {} for symbol {} with amount {}", 
                            orderResponse.id, symbol, amount);
                    } else {
                        trade.setStatus(InvestmentTrade.TradeStatus.FAILED);
                        trade.setErrorMessage(orderResponse.errorMessage);
                        trade.setFailedAt(LocalDateTime.now());
                        tradeRepository.save(trade);
                        
                        hasFailures = true;
                        logger.error("Failed to place order for symbol {}: {}", symbol, orderResponse.errorMessage);
                    }
                    
                } catch (Exception e) {
                    logger.error("Error placing trade for symbol {} in execution {}", symbol, execution.getId(), e);
                    hasFailures = true;
                }
            }
        }
        
        if (hasFailures) {
            execution.setStatus(InvestmentExecution.ExecutionStatus.TRADING_FAILED);
            execution.setErrorMessage("Some trades failed to execute");
            executionRepository.save(execution);
            
            notifyUserOfFailure(execution, "Trading Issues", 
                "Some of your investment orders could not be placed. Please check your investment history.");
        }
    }
    
    /**
     * Check trading status for executions
     */
    public void checkTradingStatus() {
        logger.info("Checking trading status for pending executions");
        
        // First, initiate trading for any funded executions waiting for market to open
        if (isMarketOpen()) {
            initiateDelayedTrading();
        }
        
        // Check executions that have been in trading state for at least 5 minutes
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(5);
        List<InvestmentExecution> tradingExecutions = executionRepository
            .findExecutionsAwaitingTradingCheck(
                InvestmentExecution.ExecutionStatus.TRADING_INITIATED, 
                cutoffTime
            );
        
        logger.info("Found {} executions awaiting trading check", tradingExecutions.size());
        
        for (InvestmentExecution execution : tradingExecutions) {
            try {
                checkExecutionTradingStatus(execution);
            } catch (Exception e) {
                logger.error("Error checking trading status for execution {}", execution.getId(), e);
            }
        }
    }
    
    /**
     * Initiate trading for executions that completed funding but were waiting for market to open
     */
    private void initiateDelayedTrading() {
        logger.info("Checking for funded executions waiting for market to open");
        
        // Find all executions that are funded but haven't started trading yet
        List<InvestmentExecution> fundedExecutions = executionRepository
            .findByStatus(InvestmentExecution.ExecutionStatus.FUNDING_COMPLETED);
        
        logger.info("Found {} funded executions waiting to start trading", fundedExecutions.size());
        
        for (InvestmentExecution execution : fundedExecutions) {
            try {
                initiateTradingForExecution(execution);
            } catch (Exception e) {
                logger.error("Error initiating delayed trading for execution {}", execution.getId(), e);
            }
        }
    }
    
    /**
     * Check trading status for a specific execution
     */
    private void checkExecutionTradingStatus(InvestmentExecution execution) {
        logger.info("Checking trading status for execution {}", execution.getId());
        
        List<InvestmentTrade> trades = tradeRepository.findByInvestmentExecutionId(execution.getId());
        boolean allComplete = true;
        boolean hasFailures = false;
        
        for (InvestmentTrade trade : trades) {
            if (trade.getStatus() == InvestmentTrade.TradeStatus.SUBMITTED) {
                // Check order status
                AlpacaService.AlpacaOrderResponse orderStatus = alpacaService.checkOrderStatus(
                    execution.getAlpacaAccountId(), trade.getAlpacaOrderId()
                );
                
                if (orderStatus.isFilled()) {
                    trade.setStatus(InvestmentTrade.TradeStatus.FILLED);
                    trade.setFilledQuantity(orderStatus.filledQuantity);
                    trade.setFilledAvgPrice(orderStatus.filledAvgPrice);
                    trade.setFilledAt(LocalDateTime.now());
                    tradeRepository.save(trade);
                    
                } else if ("rejected".equalsIgnoreCase(orderStatus.status) || 
                          "canceled".equalsIgnoreCase(orderStatus.status)) {
                    trade.setStatus(InvestmentTrade.TradeStatus.FAILED);
                    trade.setErrorMessage("Order status: " + orderStatus.status);
                    trade.setFailedAt(LocalDateTime.now());
                    tradeRepository.save(trade);
                    hasFailures = true;
                    
                } else if (orderStatus.isPartiallyFilled()) {
                    trade.setStatus(InvestmentTrade.TradeStatus.PARTIALLY_FILLED);
                    trade.setFilledQuantity(orderStatus.filledQuantity);
                    trade.setFilledAvgPrice(orderStatus.filledAvgPrice);
                    tradeRepository.save(trade);
                    allComplete = false;
                }
            }
            
            if (trade.getStatus() != InvestmentTrade.TradeStatus.FILLED) {
                allComplete = false;
            }
            if (trade.getStatus() == InvestmentTrade.TradeStatus.FAILED) {
                hasFailures = true;
            }
        }
        
        // Update execution status
        if (allComplete && !hasFailures) {
            execution.setStatus(InvestmentExecution.ExecutionStatus.COMPLETED);
            execution.setTradingCompletedAt(LocalDateTime.now());
            executionRepository.save(execution);
            
            notifyUserOfSuccess(execution);
            
        } else if (hasFailures) {
            execution.setStatus(InvestmentExecution.ExecutionStatus.TRADING_FAILED);
            execution.setErrorMessage("Some trades failed");
            executionRepository.save(execution);
            
            notifyUserOfFailure(execution, "Trading Failed", 
                "Some of your investment orders could not be completed.");
        }
    }
    

    

    
    /**
     * Get user's portfolio allocation from their actual saved portfolio
     */
    private Map<String, BigDecimal> getUserPortfolioAllocation(User user) {
        Map<String, BigDecimal> allocation = new HashMap<>();
        
        logger.info("Getting portfolio allocation for user {}", user.getId());
        
        // Get user's actual portfolio from database
        Optional<Portfolio> portfolioOpt = portfolioRepository.findByUser(user);
        
        if (portfolioOpt.isPresent()) {
            Portfolio portfolio = portfolioOpt.get();
            logger.info("Found portfolio '{}' for user {} with {} items", 
                portfolio.getName(), user.getId(), portfolio.getPortfolioItems().size());
            
            // Convert portfolio items to allocation map
            for (PortfolioItem item : portfolio.getPortfolioItems()) {
                allocation.put(item.getSymbol(), item.getPercentage());
                logger.info("Portfolio item: {} = {}%", item.getSymbol(), item.getPercentage());
            }
            
            // Validate that percentages add up to 100%
            BigDecimal totalPercentage = allocation.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            if (totalPercentage.compareTo(new BigDecimal("100")) != 0) {
                logger.warn("Portfolio percentages for user {} do not add up to 100% (actual: {}%)", 
                    user.getId(), totalPercentage);
            }
            
        } else {
            // Fallback to default allocation if no portfolio found
            logger.warn("No portfolio found for user {}, using default balanced allocation", user.getId());
            allocation.put("VTI", new BigDecimal("50"));
            allocation.put("VXUS", new BigDecimal("20"));
            allocation.put("BND", new BigDecimal("30"));
        }
        
        logger.info("Final portfolio allocation for user {}: {}", user.getId(), allocation);
        return allocation;
    }
    
    private void notifyUserOfSuccess(InvestmentExecution execution) {
        try {
            String subject = "Investment Executed Successfully";
            String message = String.format(
                "Your investment of $%s has been successfully executed on %s.",
                execution.getAmount(),
                execution.getTradingCompletedAt().format(DateTimeFormatter.ofPattern("MMM dd, yyyy"))
            );
            
            emailService.sendEmail(execution.getUser().getEmail(), subject, message);
        } catch (Exception e) {
            logger.error("Failed to send success notification for execution {}", execution.getId(), e);
        }
    }
    
    private void notifyUserOfFailure(InvestmentExecution execution, String reason, String details) {
        try {
            String subject = "Investment Execution Failed";
            String message = String.format(
                "Your scheduled investment of $%s could not be executed.\n\nReason: %s\n\nDetails: %s\n\nPlease check your account settings and ensure sufficient funds are available.",
                execution.getAmount(),
                reason,
                details
            );
            
            emailService.sendEmail(execution.getUser().getEmail(), subject, message);
        } catch (Exception e) {
            logger.error("Failed to send failure notification for execution {}", execution.getId(), e);
        }
    }
}
