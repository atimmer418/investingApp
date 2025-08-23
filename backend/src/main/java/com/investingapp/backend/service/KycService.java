// src/main/java/com/investingapp/backend/service/KycService.java
package com.investingapp.backend.service;

import com.investingapp.backend.dto.KycVerificationRequest;
import com.investingapp.backend.model.KycVerification;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.KycVerificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class KycService {
    
    private static final Logger logger = LoggerFactory.getLogger(KycService.class);
    
    @Autowired
    private KycVerificationRepository kycVerificationRepository;
    
    @Autowired
    private UserService userService;
    
    /**
     * Generate a unique reference ID for a new KYC verification
     */
    public String generateReferenceId() {
        return "KYC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }
    
    /**
     * Create a new KYC verification record for a user
     */
    @Transactional
    public KycVerification createVerification(User user) {
        String referenceId = generateReferenceId();
        
        // Ensure reference ID is unique
        while (kycVerificationRepository.findByReferenceId(referenceId).isPresent()) {
            referenceId = generateReferenceId();
        }
        
        KycVerification verification = new KycVerification(user, referenceId);
        KycVerification saved = kycVerificationRepository.save(verification);
        
        logger.info("Created new KYC verification with reference ID {} for user {}", 
                   referenceId, user.getEmail());
        
        return saved;
    }
    
    /**
     * Process verification results from frontend/Persona
     */
    @Transactional
    public KycVerification processVerificationResult(KycVerificationRequest request) {
        logger.info("Processing KYC verification result for reference ID: {}", request.getReferenceId());
        
        Optional<KycVerification> optionalVerification = 
                kycVerificationRepository.findByReferenceId(request.getReferenceId());
        
        if (optionalVerification.isEmpty()) {
            logger.error("KYC verification not found for reference ID: {}", request.getReferenceId());
            throw new RuntimeException("Verification not found for reference ID: " + request.getReferenceId());
        }
        
        KycVerification verification = optionalVerification.get();
        
        // Update verification with results
        verification.setPersonaInquiryId(request.getPersonaInquiryId());
        verification.setStatus(request.getStatus());
        verification.setVerificationResult(request.getVerificationResult());
        verification.setPersonaResponse(request.getPersonaResponse());
        verification.setFailureReason(request.getFailureReason());
        verification.setIdentityVerified(Boolean.TRUE.equals(request.getIdentityVerified()));
        verification.setAddressVerified(Boolean.TRUE.equals(request.getAddressVerified()));
        verification.setPepScreeningPassed(Boolean.TRUE.equals(request.getPepScreeningPassed()));
        
        if ("completed".equals(request.getStatus())) {
            verification.setCompletedAt(LocalDateTime.now());
        }
        
        KycVerification saved = kycVerificationRepository.save(verification);
        
        // Update user's KYC status if verification passed
        if ("completed".equals(request.getStatus()) && "passed".equals(request.getVerificationResult())) {
            User user = verification.getUser();
            user.setKycVerificationCompleted(true);
            userService.updateUser(user);
            
            logger.info("Updated user {} KYC status to completed", user.getEmail());
        }
        
        logger.info("Updated KYC verification {} with status: {}, result: {}", 
                   request.getReferenceId(), request.getStatus(), request.getVerificationResult());
        
        // Log for audit purposes
        if ("completed".equals(request.getStatus()) && "passed".equals(request.getVerificationResult())) {
            logger.info("KYC verification PASSED for user {} (reference: {})", 
                       verification.getUser().getEmail(), request.getReferenceId());
        } else if ("completed".equals(request.getStatus()) && "failed".equals(request.getVerificationResult())) {
            logger.warn("KYC verification FAILED for user {} (reference: {}): {}", 
                       verification.getUser().getEmail(), request.getReferenceId(), request.getFailureReason());
        }
        
        return saved;
    }
    
    /**
     * Get verification status for a user
     */
    public Optional<KycVerification> getLatestVerificationForUser(User user) {
        List<KycVerification> verifications = kycVerificationRepository.findByUserOrderByCreatedAtDesc(user);
        return verifications.isEmpty() ? Optional.empty() : Optional.of(verifications.get(0));
    }
    
    /**
     * Check if user has a successful KYC verification
     */
    public boolean hasSuccessfulVerification(User user) {
        return kycVerificationRepository.findSuccessfulVerificationByUser(user).isPresent();
    }
    
    /**
     * Get verification by reference ID
     */
    public Optional<KycVerification> getVerificationByReferenceId(String referenceId) {
        return kycVerificationRepository.findByReferenceId(referenceId);
    }
}