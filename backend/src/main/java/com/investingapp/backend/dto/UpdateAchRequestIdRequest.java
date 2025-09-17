package com.investingapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UpdateAchRequestIdRequest {
    
    @NotBlank(message = "ACH request ID is required")
    private String achRequestId;
    
}