package com.investingapp.backend.controller;

import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.services.UserDetailsImpl;
import com.investingapp.backend.service.PortfolioDashboardService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/portfolio")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PortfolioDashboardController {
    
    private static final Logger logger = LoggerFactory.getLogger(PortfolioDashboardController.class);
    
    @Autowired
    private PortfolioDashboardService portfolioDashboardService;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Get comprehensive portfolio dashboard data
     */
    @GetMapping("/dashboard")
    public ResponseEntity<?> getPortfolioDashboard() {
        try {
            User user = getCurrentUser();
            
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not authenticated"));
            }
            
            logger.info("Fetching portfolio dashboard for user: {}", user.getEmail());
            
            PortfolioDashboardService.PortfolioDashboardData dashboardData = 
                portfolioDashboardService.getPortfolioDashboard(user);
            
            return ResponseEntity.ok(dashboardData);
            
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid request for portfolio dashboard: {}", e.getMessage());
            return ResponseEntity.badRequest().body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            logger.error("Error fetching portfolio dashboard", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"error\":\"Failed to fetch portfolio data\"}");
        }
    }
    
    /**
     * Get portfolio history for specific time period
     */
    @GetMapping("/history")
    public ResponseEntity<?> getPortfolioHistory(
            @RequestParam(defaultValue = "1M") String period) {
        try {
            User user = getCurrentUser();
            
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not authenticated"));
            }
            
            logger.info("Fetching portfolio history for user: {} with period: {}", user.getEmail(), period);
            
            // Validate period parameter
            if (!isValidPeriod(period)) {
                return ResponseEntity.badRequest().body("{\"error\":\"Invalid period. Use 1D, 1W, 1M, 3M, 1Y, or ALL\"}");
            }
            
            if (user.getAlpacaAccountId() == null) {
                return ResponseEntity.badRequest().body("{\"error\":\"User does not have an Alpaca account\"}");
            }
            
            // Get portfolio history for the specific period
            PortfolioDashboardService.PortfolioHistory portfolioHistory = 
                portfolioDashboardService.getPortfolioHistoryForPeriod(user, period);
            
            // Return the history with the requested period
            Map<String, Object> result = new HashMap<>();
            result.put("history", portfolioHistory);
            result.put("period", period);
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            logger.error("Error fetching portfolio history", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"error\":\"Failed to fetch portfolio history\"}");
        }
    }
    
    /**
     * Get current positions/holdings
     */
    @GetMapping("/positions")
    public ResponseEntity<?> getCurrentPositions() {
        try {
            User user = getCurrentUser();
            
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not authenticated"));
            }
            
            logger.info("Fetching current positions for user: {}", user.getEmail());
            
            if (user.getAlpacaAccountId() == null) {
                return ResponseEntity.badRequest().body("{\"error\":\"User does not have an Alpaca account\"}");
            }
            
            PortfolioDashboardService.PortfolioDashboardData dashboardData = 
                portfolioDashboardService.getPortfolioDashboard(user);
            
            // Return just the positions portion
            Map<String, Object> result = new HashMap<>();
            result.put("positions", dashboardData.positions);
            result.put("summary", dashboardData.summary);
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            logger.error("Error fetching current positions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"error\":\"Failed to fetch positions\"}");
        }
    }
    
    /**
     * Get performance metrics summary
     */
    @GetMapping("/performance")
    public ResponseEntity<?> getPerformanceMetrics() {
        try {
            User user = getCurrentUser();
            
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not authenticated"));
            }
            
            logger.info("Fetching performance metrics for user: {}", user.getEmail());
            
            if (user.getAlpacaAccountId() == null) {
                return ResponseEntity.badRequest().body("{\"error\":\"User does not have an Alpaca account\"}");
            }
            
            PortfolioDashboardService.PortfolioDashboardData dashboardData = 
                portfolioDashboardService.getPortfolioDashboard(user);
            
            // Return performance-focused data as an array of period-based metrics
            List<Map<String, Object>> performanceMetrics = new ArrayList<>();
            
            // Daily performance
            Map<String, Object> dailyPerf = new HashMap<>();
            dailyPerf.put("period", "Today");
            // For today's performance: yesterday's EOD close → current real-time value
            // portfolioValue is yesterday's EOD, current value = EOD + todayChange
            BigDecimal yesterdayEODValue = dashboardData.summary.portfolioValue;      // Yesterday's close
            BigDecimal currentRealTimeValue = dashboardData.summary.portfolioValue.add(dashboardData.summary.todayChange); // Current real-time
            
            dailyPerf.put("startValue", yesterdayEODValue);     // Yesterday's EOD closing value
            dailyPerf.put("endValue", currentRealTimeValue);   // Current real-time value  
            dailyPerf.put("totalReturn", dashboardData.summary.todayChange);
            dailyPerf.put("totalReturnPercent", dashboardData.summary.todayChangePercent);
            performanceMetrics.add(dailyPerf);
            
            // Overall performance since investment start
            Map<String, Object> totalPerf = new HashMap<>();
            totalPerf.put("period", "Total");
            totalPerf.put("startValue", dashboardData.totalInvested);
            totalPerf.put("endValue", dashboardData.summary.portfolioValue);
            totalPerf.put("totalReturn", dashboardData.totalGainLoss);
            totalPerf.put("totalReturnPercent", dashboardData.totalGainLossPercent);
            performanceMetrics.add(totalPerf);
            
            return ResponseEntity.ok(performanceMetrics);
            
        } catch (Exception e) {
            logger.error("Error fetching performance metrics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"error\":\"Failed to fetch performance metrics\"}");
        }
    }
    
    private boolean isValidPeriod(String period) {
        return period.matches("^(1D|1W|1M|3M|6M|1Y|ALL)$");
    }

    /**
     * Helper method to get current authenticated user
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (!(authentication.getPrincipal() instanceof UserDetailsImpl)) {
            logger.warn("Authentication principal is not an instance of UserDetailsImpl");
            return null;
        }
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Optional<User> userOpt = userRepository.findById(userDetails.getId());
        
        if (userOpt.isEmpty()) {
            logger.warn("User ID {} not found from authenticated principal", userDetails.getId());
            return null;
        }
        
        return userOpt.get();
    }
}
