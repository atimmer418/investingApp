// src/main/java/com/investingapp/backend/repository/KycVerificationRepository.java
package com.investingapp.backend.repository;

import com.investingapp.backend.model.KycVerification;
import com.investingapp.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KycVerificationRepository extends JpaRepository<KycVerification, Long> {
    
    Optional<KycVerification> findByReferenceId(String referenceId);
    
    Optional<KycVerification> findByPersonaInquiryId(String personaInquiryId);
    
    List<KycVerification> findByUser(User user);
    
    List<KycVerification> findByUserOrderByCreatedAtDesc(User user);
    
    @Query("SELECT k FROM KycVerification k WHERE k.user = :user AND k.status = 'completed' AND k.verificationResult = 'passed'")
    Optional<KycVerification> findSuccessfulVerificationByUser(@Param("user") User user);
    
    boolean existsByUserAndStatusAndVerificationResult(User user, String status, String verificationResult);
}