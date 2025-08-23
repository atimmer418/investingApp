// src/main/java/com/investingapp/backend/controller/KycController.java
package com.investingapp.backend.controller;

import com.investingapp.backend.dto.KycVerificationRequest;
import com.investingapp.backend.dto.MessageResponse;
import com.investingapp.backend.model.KycVerification;
import com.investingapp.backend.model.User;
import com.investingapp.backend.security.services.UserDetailsImpl;
import com.investingapp.backend.service.KycService;
import com.investingapp.backend.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/kyc")
public class KycController {
    
    private static final Logger logger = LoggerFactory.getLogger(KycController.class);
    
    @Autowired
    private KycService kycService;
    
    @Autowired
    private UserService userService;
    
    /**
     * Initialize a new KYC verification for the authenticated user
     */
    @PostMapping("/start")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> startVerification(Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            User user = userService.getUserById(userDetails.getId());
            
            if (user == null) {
                logger.error("User not found: {}", userDetails.getId());
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("User not found"));
            }
            
            // Check if user already has a successful verification
            if (kycService.hasSuccessfulVerification(user)) {
                logger.info("User {} already has successful KYC verification", user.getEmail());
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("User already has successful KYC verification"));
            }
            
            KycVerification verification = kycService.createVerification(user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("referenceId", verification.getReferenceId());
            response.put("status", verification.getStatus());
            response.put("message", "KYC verification initiated successfully");
            
            logger.info("KYC verification started for user {} with reference ID {}", 
                       user.getEmail(), verification.getReferenceId());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error starting KYC verification: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new MessageResponse("Failed to start KYC verification: " + e.getMessage()));
        }
    }
    
    /**
     * Process verification results from frontend
     */
    @PostMapping("/verify")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> processVerificationResult(
            @Valid @RequestBody KycVerificationRequest request,
            Authentication authentication) {
        
        try {
            logger.info("Received KYC verification result for reference ID: {}", request.getReferenceId());
            
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            User user = userService.getUserById(userDetails.getId());
            
            if (user == null) {
                logger.error("User not found: {}", userDetails.getId());
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("User not found"));
            }
            
            // Verify the verification belongs to the authenticated user
            Optional<KycVerification> existingVerification = 
                    kycService.getVerificationByReferenceId(request.getReferenceId());
            
            if (existingVerification.isEmpty()) {
                logger.error("KYC verification not found for reference ID: {}", request.getReferenceId());
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("Verification not found"));
            }
            
            if (!existingVerification.get().getUser().getId().equals(user.getId())) {
                logger.error("KYC verification {} does not belong to user {}", 
                           request.getReferenceId(), user.getEmail());
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("Verification does not belong to authenticated user"));
            }
            
            KycVerification updatedVerification = kycService.processVerificationResult(request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("referenceId", updatedVerification.getReferenceId());
            response.put("status", updatedVerification.getStatus());
            response.put("verificationResult", updatedVerification.getVerificationResult());
            response.put("identityVerified", updatedVerification.isIdentityVerified());
            response.put("addressVerified", updatedVerification.isAddressVerified());
            response.put("pepScreeningPassed", updatedVerification.isPepScreeningPassed());
            response.put("completedAt", updatedVerification.getCompletedAt());
            response.put("message", "Verification result processed successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error processing KYC verification result: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new MessageResponse("Failed to process verification result: " + e.getMessage()));
        }
    }
    
    /**
     * Get verification status for the authenticated user
     */
    @GetMapping("/status")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getVerificationStatus(Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            User user = userService.getUserById(userDetails.getId());
            
            if (user == null) {
                logger.error("User not found: {}", userDetails.getId());
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("User not found"));
            }
            
            Optional<KycVerification> verification = kycService.getLatestVerificationForUser(user);
            
            if (verification.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("hasVerification", false);
                response.put("message", "No KYC verification found for user");
                return ResponseEntity.ok(response);
            }
            
            KycVerification kycVerification = verification.get();
            Map<String, Object> response = new HashMap<>();
            response.put("hasVerification", true);
            response.put("referenceId", kycVerification.getReferenceId());
            response.put("status", kycVerification.getStatus());
            response.put("verificationResult", kycVerification.getVerificationResult());
            response.put("identityVerified", kycVerification.isIdentityVerified());
            response.put("addressVerified", kycVerification.isAddressVerified());
            response.put("pepScreeningPassed", kycVerification.isPepScreeningPassed());
            response.put("createdAt", kycVerification.getCreatedAt());
            response.put("completedAt", kycVerification.getCompletedAt());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error getting KYC verification status: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new MessageResponse("Failed to get verification status: " + e.getMessage()));
        }
    }
}