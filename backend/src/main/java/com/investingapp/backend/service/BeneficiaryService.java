package com.investingapp.backend.service;

import com.investingapp.backend.model.Beneficiary;
import com.investingapp.backend.model.Beneficiary.BeneficiaryStatus;
import com.investingapp.backend.model.Beneficiary.BeneficiaryType;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.BeneficiaryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.List;
import java.util.Optional;

/**
 * Service for managing account beneficiaries and Transfer on Death (TOD) designations
 */
@Service
@Transactional
public class BeneficiaryService {
    
    private static final Logger logger = LoggerFactory.getLogger(BeneficiaryService.class);
    
    // Maximum number of beneficiaries per type (industry standard)
    private static final int MAX_PRIMARY_BENEFICIARIES = 10;
    private static final int MAX_CONTINGENT_BENEFICIARIES = 10;
    
    @Autowired
    private BeneficiaryRepository beneficiaryRepository;
    
    @Autowired
    private AlpacaService alpacaService; // For submitting beneficiaries to Alpaca
    
    /**
     * Get all beneficiaries for a user
     */
    @Transactional(readOnly = true)
    public List<Beneficiary> getBeneficiariesForUser(User user) {
        return beneficiaryRepository.findByUserIdOrderByBeneficiaryTypeAscPercentageAllocationDesc(user.getId());
    }
    
    /**
     * Get active beneficiaries for a user
     */
    @Transactional(readOnly = true)
    public List<Beneficiary> getActiveBeneficiariesForUser(User user) {
        return beneficiaryRepository.findByUserIdAndStatusOrderByBeneficiaryTypeAscPercentageAllocationDesc(
            user.getId(), BeneficiaryStatus.APPROVED);
    }
    
    /**
     * Get primary beneficiaries for a user
     */
    @Transactional(readOnly = true)
    public List<Beneficiary> getPrimaryBeneficiaries(User user) {
        return beneficiaryRepository.findPrimaryBeneficiariesByUserId(user.getId());
    }
    
    /**
     * Get contingent beneficiaries for a user
     */
    @Transactional(readOnly = true)
    public List<Beneficiary> getContingentBeneficiaries(User user) {
        return beneficiaryRepository.findContingentBeneficiariesByUserId(user.getId());
    }
    
    /**
     * Create a new beneficiary
     */
    public Beneficiary createBeneficiary(User user, Beneficiary beneficiary) {
        logger.info("Creating new beneficiary for user: {}", user.getEmail());
        
        // Validation
        validateBeneficiary(user, beneficiary);
        
        // Set user and initial status
        beneficiary.setUser(user);
        beneficiary.setStatus(BeneficiaryStatus.PENDING);
        beneficiary.setCreatedAt(LocalDateTime.now());
        beneficiary.setUpdatedAt(LocalDateTime.now());
        
        // Save to database
        Beneficiary savedBeneficiary = beneficiaryRepository.save(beneficiary);
        
        // Optionally submit to Alpaca immediately (or batch process later)
        // submitToAlpaca(savedBeneficiary);
        
        logger.info("Created beneficiary {} for user: {}", savedBeneficiary.getId(), user.getEmail());
        return savedBeneficiary;
    }
    
    /**
     * Update an existing beneficiary
     */
    public Beneficiary updateBeneficiary(User user, Long beneficiaryId, Beneficiary updatedBeneficiary) {
        logger.info("Updating beneficiary {} for user: {}", beneficiaryId, user.getEmail());
        
        Optional<Beneficiary> existingOpt = beneficiaryRepository.findById(beneficiaryId);
        if (existingOpt.isEmpty()) {
            throw new RuntimeException("Beneficiary not found with ID: " + beneficiaryId);
        }
        
        Beneficiary existing = existingOpt.get();
        
        // Security check - ensure beneficiary belongs to user
        if (!existing.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized access to beneficiary");
        }
        
        // Check if changes require re-submission to Alpaca BEFORE updating fields
        boolean hasSignificantChanges = hasSignificantChanges(existing, updatedBeneficiary);
        
        // Update fields
        updateBeneficiaryFields(existing, updatedBeneficiary);
        
        // Validation
        validateBeneficiary(user, existing);
        
        // Mark as pending if significant changes were made
        if (hasSignificantChanges) {
            existing.setStatus(BeneficiaryStatus.PENDING);
        }
        
        existing.setUpdatedAt(LocalDateTime.now());
        
        // Save to database
        Beneficiary savedBeneficiary = beneficiaryRepository.save(existing);
        
        logger.info("Updated beneficiary {} for user: {}", beneficiaryId, user.getEmail());
        return savedBeneficiary;
    }
    
    /**
     * Delete a beneficiary
     */
    public void deleteBeneficiary(User user, Long beneficiaryId) {
        logger.info("Deleting beneficiary {} for user: {}", beneficiaryId, user.getEmail());
        
        Optional<Beneficiary> beneficiaryOpt = beneficiaryRepository.findById(beneficiaryId);
        if (beneficiaryOpt.isEmpty()) {
            throw new RuntimeException("Beneficiary not found with ID: " + beneficiaryId);
        }
        
        Beneficiary beneficiary = beneficiaryOpt.get();
        
        // Security check
        if (!beneficiary.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized access to beneficiary");
        }
        
        // Mark as inactive instead of deleting (for audit trail)
        beneficiary.setStatus(BeneficiaryStatus.INACTIVE);
        beneficiary.setUpdatedAt(LocalDateTime.now());
        beneficiaryRepository.save(beneficiary);
        
        // Optionally notify Alpaca of removal
        // removeFromAlpaca(beneficiary);
        
        logger.info("Deleted (marked inactive) beneficiary {} for user: {}", beneficiaryId, user.getEmail());
    }
    
    /**
     * Submit beneficiaries to Alpaca broker system
     * Updates all beneficiaries for the user's account since Alpaca API replaces the entire beneficiaries array
     */
    public void submitToAlpaca(Long beneficiaryId) {
        Optional<Beneficiary> beneficiaryOpt = beneficiaryRepository.findById(beneficiaryId);
        if (beneficiaryOpt.isEmpty()) {
            throw new RuntimeException("Beneficiary not found with ID: " + beneficiaryId);
        }
        
        Beneficiary beneficiary = beneficiaryOpt.get();
        User user = beneficiary.getUser();
        
        // Check if user has an Alpaca account
        if (user.getAlpacaAccountId() == null || user.getAlpacaAccountId().trim().isEmpty()) {
            throw new RuntimeException("User does not have an Alpaca account ID: " + user.getEmail());
        }
        
        try {
            logger.info("Submitting beneficiaries to Alpaca for user: {} (account: {})", 
                user.getEmail(), user.getAlpacaAccountId());
            
            // Get all active beneficiaries for the user that should be submitted
            List<Beneficiary> activeBeneficiaries = beneficiaryRepository.findByUserIdAndStatusOrderByBeneficiaryTypeAscPercentageAllocationDesc(
                user.getId(), BeneficiaryStatus.APPROVED);
            
            // Also include the current beneficiary being submitted if it's not already approved
            if (beneficiary.getStatus() != BeneficiaryStatus.APPROVED) {
                activeBeneficiaries.add(beneficiary);
            }
            
            // Validate total allocation percentages before submitting
            BigDecimal totalPrimary = activeBeneficiaries.stream()
                .filter(b -> b.getBeneficiaryType() == BeneficiaryType.PRIMARY)
                .map(Beneficiary::getPercentageAllocation)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
            BigDecimal totalContingent = activeBeneficiaries.stream()
                .filter(b -> b.getBeneficiaryType() == BeneficiaryType.CONTINGENT)
                .map(Beneficiary::getPercentageAllocation)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            // Check allocation constraints
            if (totalPrimary.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new RuntimeException("Total primary beneficiary allocation exceeds 100%: " + totalPrimary);
            }
            if (totalContingent.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new RuntimeException("Total contingent beneficiary allocation exceeds 100%: " + totalContingent);
            }
            
            // Submit to Alpaca using the new API
            boolean success = alpacaService.updateAccountBeneficiaries(user.getAlpacaAccountId(), activeBeneficiaries);
            
            if (success) {
                // Update all submitted beneficiaries as approved
                for (Beneficiary b : activeBeneficiaries) {
                    b.setStatus(BeneficiaryStatus.APPROVED);
                    b.setSubmittedToAlpacaAt(LocalDateTime.now());
                    b.setUpdatedAt(LocalDateTime.now());
                    beneficiaryRepository.save(b);
                }
                
                logger.info("Successfully submitted {} beneficiaries to Alpaca for user: {}", 
                    activeBeneficiaries.size(), user.getEmail());
            } else {
                // Mark the specific beneficiary as rejected
                beneficiary.setStatus(BeneficiaryStatus.REJECTED);
                beneficiary.setNotes("Failed to submit to Alpaca");
                beneficiary.setUpdatedAt(LocalDateTime.now());
                beneficiaryRepository.save(beneficiary);
                
                throw new RuntimeException("Failed to submit beneficiaries to Alpaca");
            }
                
        } catch (Exception e) {
            logger.error("Failed to submit beneficiaries to Alpaca for user {}: {}", user.getEmail(), e.getMessage(), e);
            
            beneficiary.setStatus(BeneficiaryStatus.REJECTED);
            beneficiary.setNotes("Failed to submit to Alpaca: " + e.getMessage());
            beneficiary.setUpdatedAt(LocalDateTime.now());
            beneficiaryRepository.save(beneficiary);
            
            throw new RuntimeException("Failed to submit beneficiary to Alpaca: " + e.getMessage(), e);
        }
    }
    
    /**
     * Submit all beneficiaries for a user to Alpaca broker system
     * This is more efficient than submitting one by one since Alpaca replaces the entire beneficiaries array
     * @param user The user whose beneficiaries to submit
     */
    @Transactional
    public void submitAllBeneficiariesToAlpaca(User user) {
        // Check if user has an Alpaca account
        if (user.getAlpacaAccountId() == null || user.getAlpacaAccountId().trim().isEmpty()) {
            throw new RuntimeException("User does not have an Alpaca account ID: " + user.getEmail());
        }
        
        try {
            logger.info("Submitting all beneficiaries to Alpaca for user: {} (account: {})", 
                user.getEmail(), user.getAlpacaAccountId());
            
            // Get all beneficiaries for the user and filter for approved and pending
            List<Beneficiary> allBeneficiaries = beneficiaryRepository.findByUserIdOrderByBeneficiaryTypeAscPercentageAllocationDesc(user.getId());
            List<Beneficiary> activeBeneficiaries = allBeneficiaries.stream()
                .filter(b -> b.getStatus() == BeneficiaryStatus.APPROVED || b.getStatus() == BeneficiaryStatus.PENDING)
                .collect(Collectors.toList());
            
            if (activeBeneficiaries.isEmpty()) {
                logger.info("No approved or pending beneficiaries to submit for user: {}", user.getEmail());
                return;
            }
            
            // Validate total allocation percentages before submitting
            BigDecimal totalPrimary = activeBeneficiaries.stream()
                .filter(b -> b.getBeneficiaryType() == BeneficiaryType.PRIMARY)
                .map(Beneficiary::getPercentageAllocation)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
            BigDecimal totalContingent = activeBeneficiaries.stream()
                .filter(b -> b.getBeneficiaryType() == BeneficiaryType.CONTINGENT)
                .map(Beneficiary::getPercentageAllocation)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            // Check allocation constraints
            if (totalPrimary.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new RuntimeException("Total primary beneficiary allocation exceeds 100%: " + totalPrimary + "%");
            }
            if (totalContingent.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new RuntimeException("Total contingent beneficiary allocation exceeds 100%: " + totalContingent + "%");
            }
            
            // Submit to Alpaca using the new API
            boolean success = alpacaService.updateAccountBeneficiaries(user.getAlpacaAccountId(), activeBeneficiaries);
            
            if (success) {
                // Update all submitted beneficiaries with submission timestamp and approved status
                LocalDateTime submissionTime = LocalDateTime.now();
                for (Beneficiary b : activeBeneficiaries) {
                    b.setStatus(BeneficiaryStatus.APPROVED);
                    b.setSubmittedToAlpacaAt(submissionTime);
                    b.setUpdatedAt(submissionTime);
                    beneficiaryRepository.save(b);
                }
                
                // Force flush to ensure changes are persisted
                beneficiaryRepository.flush();
                
                logger.info("Successfully submitted {} beneficiaries to Alpaca for user: {}", 
                    activeBeneficiaries.size(), user.getEmail());
            } else {
                throw new RuntimeException("Failed to submit beneficiaries to Alpaca API");
            }
                
        } catch (Exception e) {
            logger.error("Failed to submit all beneficiaries to Alpaca for user {}: {}", user.getEmail(), e.getMessage(), e);
            throw new RuntimeException("Failed to submit beneficiaries to Alpaca: " + e.getMessage(), e);
        }
    }
    
    /**
     * Validate beneficiary data and business rules
     */
    private void validateBeneficiary(User user, Beneficiary beneficiary) {
        // Check allocation percentage limits
        BigDecimal totalAllocation = beneficiaryRepository.calculateTotalAllocationByUserAndType(
            user.getId(), beneficiary.getBeneficiaryType());
        
        // Exclude current beneficiary if updating
        if (beneficiary.getId() != null) {
            Optional<Beneficiary> existing = beneficiaryRepository.findById(beneficiary.getId());
            if (existing.isPresent()) {
                totalAllocation = totalAllocation.subtract(existing.get().getPercentageAllocation());
            }
        }
        
        BigDecimal newTotal = totalAllocation.add(beneficiary.getPercentageAllocation());
        if (newTotal.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new RuntimeException("Total allocation cannot exceed 100% for " + 
                beneficiary.getBeneficiaryType().name().toLowerCase() + " beneficiaries. " +
                "Current total: " + totalAllocation + "%, attempting to add: " + beneficiary.getPercentageAllocation() + "%");
        }
        
        // Check maximum number of beneficiaries
        long count = beneficiaryRepository.countByUserIdAndBeneficiaryType(
            user.getId(), beneficiary.getBeneficiaryType());
        
        // Exclude current beneficiary if updating
        if (beneficiary.getId() != null) {
            count--;
        }
        
        int maxAllowed = beneficiary.getBeneficiaryType() == BeneficiaryType.PRIMARY ? 
            MAX_PRIMARY_BENEFICIARIES : MAX_CONTINGENT_BENEFICIARIES;
        
        if (count >= maxAllowed) {
            throw new RuntimeException("Maximum of " + maxAllowed + " " + 
                beneficiary.getBeneficiaryType().name().toLowerCase() + " beneficiaries allowed");
        }
        
        // Check for duplicates
        if (beneficiary.getDateOfBirth() != null) {
            List<Beneficiary> duplicates = beneficiaryRepository.findDuplicateBeneficiaries(
                user.getId(), 
                beneficiary.getFirstName(), 
                beneficiary.getLastName(),
                beneficiary.getDateOfBirth(),
                beneficiary.getId() != null ? beneficiary.getId() : 0L
            );
            
            if (!duplicates.isEmpty()) {
                throw new RuntimeException("Beneficiary with same name and date of birth already exists");
            }
        }
    }
    
    /**
     * Update beneficiary fields from updated data
     */
    private void updateBeneficiaryFields(Beneficiary existing, Beneficiary updated) {
        existing.setBeneficiaryType(updated.getBeneficiaryType());
        existing.setFirstName(updated.getFirstName());
        existing.setLastName(updated.getLastName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setDateOfBirth(updated.getDateOfBirth());
        existing.setSocialSecurityNumber(updated.getSocialSecurityNumber());
        existing.setAddressLine1(updated.getAddressLine1());
        existing.setAddressLine2(updated.getAddressLine2());
        existing.setCity(updated.getCity());
        existing.setState(updated.getState());
        existing.setPostalCode(updated.getPostalCode());
        existing.setCountry(updated.getCountry());
        existing.setPercentageAllocation(updated.getPercentageAllocation());
        existing.setRelationship(updated.getRelationship());
        existing.setNotes(updated.getNotes());
    }
    
    /**
     * Check if changes require re-submission to Alpaca
     * This checks all fields that are sent to Alpaca and would affect the beneficiary designation
     */
    private boolean hasSignificantChanges(Beneficiary existing, Beneficiary updated) {
        return !Objects.equals(existing.getFirstName(), updated.getFirstName()) ||
               !Objects.equals(existing.getLastName(), updated.getLastName()) ||
               !Objects.equals(existing.getDateOfBirth(), updated.getDateOfBirth()) ||
               !Objects.equals(existing.getSocialSecurityNumber(), updated.getSocialSecurityNumber()) ||
               !Objects.equals(existing.getRelationship(), updated.getRelationship()) ||
               !Objects.equals(existing.getPercentageAllocation(), updated.getPercentageAllocation()) ||
               !Objects.equals(existing.getBeneficiaryType(), updated.getBeneficiaryType());
    }
    
    /**
     * Get beneficiary allocation summary for a user
     */
    @Transactional(readOnly = true)
    public BeneficiaryAllocationSummary getAllocationSummary(User user) {
        BigDecimal primaryTotal = beneficiaryRepository.calculateTotalAllocationByUserAndType(
            user.getId(), BeneficiaryType.PRIMARY);
        BigDecimal contingentTotal = beneficiaryRepository.calculateTotalAllocationByUserAndType(
            user.getId(), BeneficiaryType.CONTINGENT);
        
        long primaryCount = beneficiaryRepository.countByUserIdAndBeneficiaryType(
            user.getId(), BeneficiaryType.PRIMARY);
        long contingentCount = beneficiaryRepository.countByUserIdAndBeneficiaryType(
            user.getId(), BeneficiaryType.CONTINGENT);
        
        return new BeneficiaryAllocationSummary(
            primaryTotal, contingentTotal, 
            primaryCount, contingentCount,
            MAX_PRIMARY_BENEFICIARIES, MAX_CONTINGENT_BENEFICIARIES
        );
    }
    
    /**
     * DTO for beneficiary allocation summary
     */
    public static class BeneficiaryAllocationSummary {
        private final BigDecimal primaryTotalAllocation;
        private final BigDecimal contingentTotalAllocation;
        private final long primaryCount;
        private final long contingentCount;
        private final int maxPrimaryAllowed;
        private final int maxContingentAllowed;
        
        public BeneficiaryAllocationSummary(BigDecimal primaryTotalAllocation, BigDecimal contingentTotalAllocation,
                                          long primaryCount, long contingentCount, 
                                          int maxPrimaryAllowed, int maxContingentAllowed) {
            this.primaryTotalAllocation = primaryTotalAllocation;
            this.contingentTotalAllocation = contingentTotalAllocation;
            this.primaryCount = primaryCount;
            this.contingentCount = contingentCount;
            this.maxPrimaryAllowed = maxPrimaryAllowed;
            this.maxContingentAllowed = maxContingentAllowed;
        }
        
        // Getters
        public BigDecimal getPrimaryTotalAllocation() { return primaryTotalAllocation; }
        public BigDecimal getContingentTotalAllocation() { return contingentTotalAllocation; }
        public long getPrimaryCount() { return primaryCount; }
        public long getContingentCount() { return contingentCount; }
        public int getMaxPrimaryAllowed() { return maxPrimaryAllowed; }
        public int getMaxContingentAllowed() { return maxContingentAllowed; }
        
        public BigDecimal getPrimaryRemainingAllocation() { 
            return BigDecimal.valueOf(100).subtract(primaryTotalAllocation); 
        }
        
        public BigDecimal getContingentRemainingAllocation() { 
            return BigDecimal.valueOf(100).subtract(contingentTotalAllocation); 
        }
        
        public boolean isPrimaryAllocationComplete() { 
            return primaryTotalAllocation.compareTo(BigDecimal.valueOf(100)) == 0; 
        }
        
        public boolean isContingentAllocationComplete() { 
            return contingentTotalAllocation.compareTo(BigDecimal.valueOf(100)) == 0; 
        }
    }
}
