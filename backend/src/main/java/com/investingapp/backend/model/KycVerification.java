// src/main/java/com/investingapp/backend/model/KycVerification.java
package com.investingapp.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "kyc_verifications")
@Data
@NoArgsConstructor
public class KycVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Size(max = 255)
    @Column(nullable = false, unique = true)
    private String referenceId; // Generated reference ID for tracking

    @Size(max = 255)
    private String personaInquiryId; // Persona's inquiry ID

    @Size(max = 50)
    @Column(nullable = false)
    private String status; // pending, completed, failed, canceled

    @Size(max = 50)
    private String verificationResult; // passed, failed, needs_review

    @Column(columnDefinition = "TEXT")
    private String personaResponse; // Store full Persona response for audit

    @Column(columnDefinition = "TEXT")
    private String failureReason; // Reason for failure if applicable

    private boolean identityVerified = false;
    private boolean addressVerified = false;
    private boolean pepScreeningPassed = false;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column
    private LocalDateTime completedAt; // When verification was completed

    public KycVerification(User user, String referenceId) {
        this.user = user;
        this.referenceId = referenceId;
        this.status = "pending";
    }
}