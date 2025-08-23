// src/main/java/com/investingapp/backend/dto/KycVerificationRequest.java
package com.investingapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class KycVerificationRequest {
    
    @NotBlank(message = "Reference ID is required")
    @Size(max = 255)
    private String referenceId;
    
    @Size(max = 255)
    private String personaInquiryId;
    
    @NotBlank(message = "Status is required")
    @Size(max = 50)
    private String status; // completed, failed, canceled
    
    @Size(max = 50)
    private String verificationResult; // passed, failed, needs_review
    
    private String personaResponse; // Full Persona webhook/response data
    
    private String failureReason;
    
    private Boolean identityVerified = false;
    private Boolean addressVerified = false;
    private Boolean pepScreeningPassed = false;
}