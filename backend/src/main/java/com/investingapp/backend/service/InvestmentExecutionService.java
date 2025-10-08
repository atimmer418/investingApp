package com.investingapp.backend.service;

import com.investingapp.backend.model.*;
import com.investingapp.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional
public class InvestmentExecutionService {
    
    private static final Logger logger = LoggerFactory.getLogger(InvestmentExecutionService.class);
    
    @Autowired
    private InvestmentExecutionRepository executionRepository;
    
    @Autowired
    private InvestmentTradeRepository tradeRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AlpacaService alpacaService;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private PortfolioRepository portfolioRepository;
    
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
    
    // US market holidays for 2025 (you should update this annually or fetch from an API)
    private static final Set<LocalDate> US_HOLIDAYS_2025 = Set.of(
        LocalDate.of(2025, 1, 1),   // New Year's Day
        LocalDate.of(2025, 1, 20),  // Martin Luther King Jr. Day
        LocalDate.of(2025, 2, 17),  // Presidents' Day
        LocalDate.of(2025, 4, 18),  // Good Friday
        LocalDate.of(2025, 5, 26),  // Memorial Day
        LocalDate.of(2025, 6, 19),  // Juneteenth
        LocalDate.of(2025, 7, 4),   // Independence Day
        LocalDate.of(2025, 9, 1),   // Labor Day
        LocalDate.of(2025, 11, 27), // Thanksgiving
        LocalDate.of(2025, 12, 25)  // Christmas
    );
    
    /**
     * Process all scheduled investments for today
     */
    public void processScheduledInvestments() {
        logger.info("Starting scheduled investment processing for {}", LocalDate.now());
        
        LocalDateTime today = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        List<InvestmentExecution> scheduledExecutions = executionRepository
            .findScheduledExecutionsForDate(today, InvestmentExecution.ExecutionStatus.SCHEDULED);
        
        logger.info("Found {} scheduled executions for today", scheduledExecutions.size());
        
        for (InvestmentExecution execution : scheduledExecutions) {
            try {
                processInvestmentExecution(execution);
            } catch (Exception e) {
                logger.error("Error processing investment execution {}", execution.getId(), e);
                execution.setStatus(InvestmentExecution.ExecutionStatus.FAILED);
                execution.setErrorMessage("Error during processing: " + e.getMessage());
                executionRepository.save(execution);
                
                // Notify user of failure
                notifyUserOfFailure(execution, "Processing Error", e.getMessage());
            }
        }
        
        logger.info("Completed scheduled investment processing");
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
        
        // Schedule next investment
        scheduleNextInvestment(user);
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
        
        // Get user's portfolio allocation (you'll need to implement this based on your User model)
        Map<String, BigDecimal> portfolioAllocation = getUserPortfolioAllocation(user);
        
        execution.setStatus(InvestmentExecution.ExecutionStatus.TRADING_INITIATED);
        executionRepository.save(execution);
        
        boolean hasFailures = false;
        
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
     * Schedule the next investment for a user
     */
    private void scheduleNextInvestment(User user) {
        // Calculate next investment date based on pay frequency
        LocalDate nextDate = calculateNextInvestmentDate(
            LocalDate.now(), 
            user.getPayFrequency()
        );
        
        // Update user's next investment date
        user.setNextInvestmentDate(nextDate);
        userRepository.save(user);
        
        logger.info("Scheduled next investment for user {} on {}", user.getId(), nextDate);
    }
    
    /**
     * Calculate next investment date based on pay frequency, skipping weekends and holidays
     */
    private LocalDate calculateNextInvestmentDate(LocalDate currentDate, String payFrequency) {
        LocalDate nextDate;
        
        switch (payFrequency.toLowerCase()) {
            case "weekly":
                nextDate = currentDate.plusWeeks(1);
                break;
            case "biweekly":
                nextDate = currentDate.plusWeeks(2);
                break;
            case "monthly":
                nextDate = currentDate.plusMonths(1);
                break;
            case "semimonthly":
                // 15th and last day of month
                if (currentDate.getDayOfMonth() <= 15) {
                    nextDate = currentDate.withDayOfMonth(
                        Math.min(15, currentDate.lengthOfMonth())
                    );
                } else {
                    nextDate = currentDate.plusMonths(1).withDayOfMonth(1);
                }
                break;
            default:
                // Default to monthly
                nextDate = currentDate.plusMonths(1);
        }
        
        // Ensure it's a business day
        return adjustToBusinessDay(nextDate);
    }
    
    /**
     * Adjust date to next business day if it falls on weekend or holiday
     */
    private LocalDate adjustToBusinessDay(LocalDate date) {
        while (date.getDayOfWeek() == DayOfWeek.SATURDAY || 
               date.getDayOfWeek() == DayOfWeek.SUNDAY || 
               US_HOLIDAYS_2025.contains(date)) {
            date = date.plusDays(1);
        }
        return date;
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
