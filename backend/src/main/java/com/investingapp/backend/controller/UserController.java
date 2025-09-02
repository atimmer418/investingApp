package com.investingapp.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;

@RestController
@RequestMapping("/user")
@CrossOrigin(origins = "*")
public class UserController {
    
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);
    
    @Autowired
    private UserRepository userRepository;

    public static class UserProgressResponse {
        private boolean getStartedCompleted;
        private boolean initialSurveyCompleted;
        private boolean linkplaidCompleted;
        private boolean investmentSurveyCompleted;
        private boolean choseToPickStocks;
        private boolean stockSelectionCompleted;
        private boolean investmentConfirmationCompleted;
        
        public UserProgressResponse(User user) {
            this.getStartedCompleted = true; // If they have a user record, get-started is done
            this.initialSurveyCompleted = user.isInitialSurveyCompleted();
            this.linkplaidCompleted = user.isPlaidLinked();
            this.investmentSurveyCompleted = user.isInvestmentSurveyCompleted();
            this.choseToPickStocks = user.isChoseToPickStocks();
            this.stockSelectionCompleted = user.isStockSelectionCompleted();
            this.investmentConfirmationCompleted = user.isInvestmentConfirmationCompleted();
        }
        
        // Getters
        public boolean isGetStartedCompleted() { return getStartedCompleted; }
        public boolean isInitialSurveyCompleted() { return initialSurveyCompleted; }
        public boolean isLinkplaidCompleted() { return linkplaidCompleted; }
        public boolean isInvestmentSurveyCompleted() { return investmentSurveyCompleted; }
        public boolean isChoseToPickStocks() { return choseToPickStocks; }
        public boolean isStockSelectionCompleted() { return stockSelectionCompleted; }
        public boolean isInvestmentConfirmationCompleted() { return investmentConfirmationCompleted; }
    }

    /**
     * Get the current user's progress through the onboarding flow
     * GET /user/progress
     */
    @GetMapping("/progress")
    public ResponseEntity<UserProgressResponse> getUserProgress(Authentication authentication) {
        try {
            if (authentication == null || authentication.getPrincipal() == null) {
                logger.warn("[UserController] No authentication found for progress request");
                return ResponseEntity.unauthorized().build();
            }
            
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String email = userDetails.getUsername();
            
            logger.info("[UserController] Getting progress for user: {}", email);
            
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                logger.warn("[UserController] User not found: {}", email);
                return ResponseEntity.notFound().build();
            }
            
            UserProgressResponse progress = new UserProgressResponse(user);
            logger.info("[UserController] Returning progress for user {}: initialSurvey={}, plaidLinked={}, investmentSurvey={}", 
                       email, progress.isInitialSurveyCompleted(), progress.isLinkplaidCompleted(), progress.isInvestmentSurveyCompleted());
            
            return ResponseEntity.ok(progress);
            
        } catch (Exception e) {
            logger.error("[UserController] Error getting user progress: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
