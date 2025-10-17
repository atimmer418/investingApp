package com.investingapp.backend.controller;

import com.investingapp.backend.model.User;
import com.investingapp.backend.service.PortfolioDashboardService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/portfolio")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PortfolioDashboardController {
    
    private static final Logger logger = LoggerFactory.getLogger(PortfolioDashboardController.class);
    
    @Autowired
    private PortfolioDashboardService portfolioDashboardService;
    
    /**
     * Get comprehensive portfolio dashboard data
     */
    @GetMapping("/dashboard")
    public ResponseEntity<?> getPortfolioDashboard(Authentication authentication) {
        try {
            User user = (User) authentication.getPrincipal();
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
            @RequestParam(defaultValue = "1M") String period,
            Authentication authentication) {
        try {
            User user = (User) authentication.getPrincipal();
            logger.info("Fetching portfolio history for user: {} with period: {}", user.getEmail(), period);
            
            // Validate period parameter
            if (!isValidPeriod(period)) {
                return ResponseEntity.badRequest().body("{\"error\":\"Invalid period. Use 1D, 1W, 1M, 3M, 1Y, or ALL\"}");
            }
            
            if (user.getAlpacaAccountId() == null) {
                return ResponseEntity.badRequest().body("{\"error\":\"User does not have an Alpaca account\"}");
            }
            
            PortfolioDashboardService.PortfolioDashboardData dashboardData = 
                portfolioDashboardService.getPortfolioDashboard(user);
            
            // Return just the history portion
            Map<String, Object> result = new HashMap<>();
            result.put("history", dashboardData.history);
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
    public ResponseEntity<?> getCurrentPositions(Authentication authentication) {
        try {
            User user = (User) authentication.getPrincipal();
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
    public ResponseEntity<?> getPerformanceMetrics(Authentication authentication) {
        try {
            User user = (User) authentication.getPrincipal();
            logger.info("Fetching performance metrics for user: {}", user.getEmail());
            
            if (user.getAlpacaAccountId() == null) {
                return ResponseEntity.badRequest().body("{\"error\":\"User does not have an Alpaca account\"}");
            }
            
            PortfolioDashboardService.PortfolioDashboardData dashboardData = 
                portfolioDashboardService.getPortfolioDashboard(user);
            
            // Return performance-focused data
            Map<String, Object> result = new HashMap<>();
            result.put("totalInvested", dashboardData.totalInvested);
            result.put("currentValue", dashboardData.summary.portfolioValue);
            result.put("totalGainLoss", dashboardData.totalGainLoss);
            result.put("totalGainLossPercent", dashboardData.totalGainLossPercent);
            result.put("todayChange", dashboardData.summary.todayChange);
            result.put("todayChangePercent", dashboardData.summary.todayChangePercent);
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            logger.error("Error fetching performance metrics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"error\":\"Failed to fetch performance metrics\"}");
        }
    }
    
    private boolean isValidPeriod(String period) {
        return period.matches("^(1D|1W|1M|3M|6M|1Y|ALL)$");
    }
}
