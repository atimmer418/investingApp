package com.investingapp.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.investingapp.backend.model.User;
import com.investingapp.backend.model.UserProgress;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.jwt.JwtUtils;
import com.investingapp.backend.dto.JwtResponse;

/**
 * 🧪 DEVELOPMENT ONLY: Controller for simulating login as existing users
 * This allows developers to quickly test the app by logging in as any user from the database
 */
@RestController
@RequestMapping("/api/dev")
@CrossOrigin(origins = "*")
public class DevAuthController {
    
    private static final Logger logger = LoggerFactory.getLogger(DevAuthController.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private JwtUtils jwtUtils;

    public static class AuthAsUserRequest {
        private String email;
        private String userHandle;
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getUserHandle() { return userHandle; }
        public void setUserHandle(String userHandle) { this.userHandle = userHandle; }
    }

    public static class DevAuthResponse {
        private boolean success;
        private String message;
        private String jwtToken;
        private Long id;
        private String email;
        
        public DevAuthResponse(boolean success, String message, String jwtToken, Long id, String email) {
            this.success = success;
            this.message = message;
            this.jwtToken = jwtToken;
            this.id = id;
            this.email = email;
        }
        
        // Getters
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public String getJwtToken() { return jwtToken; }
        public Long getId() { return id; }
        public String getEmail() { return email; }
    }

    /**
     * 🧪 DEV ONLY: Authenticate as any existing user from the database
     * POST /api/dev/authenticate-as-user
     * Body: { "email": "user@example.com" } OR { "userHandle": "handle123" }
     */
    @PostMapping("/authenticate-as-user")
    public ResponseEntity<DevAuthResponse> authenticateAsUser(@RequestBody AuthAsUserRequest request) {
        try {
            logger.info("[DevAuthController] 🧪 Attempting to authenticate as user: email={}, userHandle={}", 
                       request.getEmail(), request.getUserHandle());
            
            User user = null;
            
            // Find user by email or userHandle
            if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
                user = userRepository.findByEmail(request.getEmail()).orElse(null);
                logger.info("[DevAuthController] Looking up user by email: {}", request.getEmail());
            } else if (request.getUserHandle() != null && !request.getUserHandle().trim().isEmpty()) {
                user = userRepository.findByUserHandle(request.getUserHandle()).orElse(null);
                logger.info("[DevAuthController] Looking up user by userHandle: {}", request.getUserHandle());
            }
            
            if (user == null) {
                String message = "User not found with " + 
                    (request.getEmail() != null ? "email: " + request.getEmail() : "userHandle: " + request.getUserHandle());
                logger.warn("[DevAuthController] {}", message);
                return ResponseEntity.ok(new DevAuthResponse(false, message, null, null, null));
            }
            
            // Generate JWT for this user
            String jwt = jwtUtils.generateTokenFromUsername(user.getEmail());
            logger.info("[DevAuthController] ✅ Successfully generated JWT for user: {} (ID: {})", user.getEmail(), user.getId());
            
            return ResponseEntity.ok(new DevAuthResponse(
                true, 
                "Successfully authenticated as user", 
                jwt, 
                user.getId(), 
                user.getEmail()
            ));
            
        } catch (Exception e) {
            logger.error("[DevAuthController] ❌ Error authenticating as user: {}", e.getMessage(), e);
            return ResponseEntity.ok(new DevAuthResponse(false, "Error: " + e.getMessage(), null, null, null));
        }
    }
    
    /**
     * 🧪 DEV ONLY: List all users in database for easy reference
     * GET /api/dev/list-users
     */
    @GetMapping("/list-users")
    public ResponseEntity<?> listUsers() {
        try {
            var users = userRepository.findAll();
            logger.info("[DevAuthController] 📋 Listing {} users from database", users.size());
            
            // Return simplified user info for easy reference
            var userList = users.stream().map(user -> {
                UserProgress progress = user.getUserProgress();
                return new Object() {
                    public final Long id = user.getId();
                    public final String email = user.getEmail();
                    public final String userHandle = user.getUserHandle();
                    public final boolean getStartedCompleted = progress != null ? progress.isGetStartedCompleted() : false;
                    public final boolean surveyInitialCompleted = progress != null ? progress.isSurveyInitialCompleted() : false;
                    public final boolean fiPlanResultsCompleted = progress != null ? progress.isFiPlanResultsCompleted() : false;
                    public final boolean authFinalizeCompleted = progress != null ? progress.isAuthFinalizeCompleted() : false;
                    public final boolean kycVerificationCompleted = progress != null ? progress.isKycVerificationCompleted() : false;
                    public final boolean linkPlaidCompleted = progress != null ? progress.isLinkPlaidCompleted() : false;
                    public final boolean investmentScheduleCompleted = progress != null ? progress.isInvestmentScheduleCompleted() : false;
                    public final boolean investmentConfirmationCompleted = progress != null ? progress.isInvestmentConfirmationCompleted() : false;
                };
            }).toList();
            
            return ResponseEntity.ok(userList);
            
        } catch (Exception e) {
            logger.error("[DevAuthController] ❌ Error listing users: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}
