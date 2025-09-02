package com.investingapp.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.util.JwtUtils;
import com.investingapp.backend.dto.AuthResponse;

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

    /**
     * 🧪 DEV ONLY: Authenticate as any existing user from the database
     * POST /api/dev/authenticate-as-user
     * Body: { "email": "user@example.com" } OR { "userHandle": "handle123" }
     */
    @PostMapping("/authenticate-as-user")
    public ResponseEntity<AuthResponse> authenticateAsUser(@RequestBody AuthAsUserRequest request) {
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
                return ResponseEntity.ok(new AuthResponse(false, message, null, null, null));
            }
            
            // Generate JWT for this user
            String jwt = jwtUtils.generateToken(user.getEmail(), user.getId());
            logger.info("[DevAuthController] ✅ Successfully generated JWT for user: {} (ID: {})", user.getEmail(), user.getId());
            
            return ResponseEntity.ok(new AuthResponse(
                true, 
                "Successfully authenticated as user", 
                jwt, 
                user.getId(), 
                user.getEmail()
            ));
            
        } catch (Exception e) {
            logger.error("[DevAuthController] ❌ Error authenticating as user: {}", e.getMessage(), e);
            return ResponseEntity.ok(new AuthResponse(false, "Error: " + e.getMessage(), null, null, null));
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
                return new Object() {
                    public final Long id = user.getId();
                    public final String email = user.getEmail();
                    public final String userHandle = user.getUserHandle();
                    public final boolean initialSurveyCompleted = user.isInitialSurveyCompleted();
                    public final boolean plaidLinked = user.isPlaidLinked();
                    public final boolean investmentSurveyCompleted = user.isInvestmentSurveyCompleted();
                    public final boolean choseToPickStocks = user.isChoseToPickStocks();
                    public final boolean stockSelectionCompleted = user.isStockSelectionCompleted();
                    public final boolean investmentConfirmationCompleted = user.isInvestmentConfirmationCompleted();
                };
            }).toList();
            
            return ResponseEntity.ok(userList);
            
        } catch (Exception e) {
            logger.error("[DevAuthController] ❌ Error listing users: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}
