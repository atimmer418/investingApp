package com.investingapp.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaycheckDetectionStatusDto {
    private Long configId;
    private String name;
    private String accountId;
    private String employerName;
    private BigDecimal expectedAmount;
    private String frequency;
    private boolean paycheckDetected;
    private boolean webhookConfigured;
    private String plaidStreamId;
    private LocalDateTime lastDetectionAttempt;
    private LocalDateTime paycheckDetectedAt;
    private LocalDateTime webhookConfiguredAt;
}
