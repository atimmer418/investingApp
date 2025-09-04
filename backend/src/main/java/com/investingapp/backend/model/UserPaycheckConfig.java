// src/main/java/com/investingapp/backend/model/UserPaycheckConfig.java
package com.investingapp.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Entity
@Table(name = "user_paycheck_configs")
@Data
@NoArgsConstructor
public class UserPaycheckConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Column(nullable = false)
    private String accountId; // Plaid account_id for the income source

    @NotBlank
    @Column(nullable = false)
    private String name; // Name of the income source (e.g., paycheck name)

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    @DecimalMax(value = "1.0", inclusive = true) // Store as 0.0 to 1.0
    @Column(nullable = false, precision = 5, scale = 4) // e.g., 0.1000 for 10.00%
    private BigDecimal withdrawalPercentage;

    // Manual configuration fields for webhook matching
    private String employerName; // Company/employer name for transaction matching
    private BigDecimal expectedAmount; // Approximate expected amount for matching
    private String frequency; // Pay frequency for pattern matching (WEEKLY, BIWEEKLY, etc.)
    
    // Paycheck detection and webhook status
    private boolean paycheckDetected = false; // Whether this paycheck has been found in Plaid recurring transactions
    private boolean webhookConfigured = false; // Whether webhook is set up for this paycheck
    private String plaidStreamId; // The Plaid transaction stream ID if detected
    private java.time.LocalDateTime lastDetectionAttempt; // When we last tried to detect this paycheck
    private java.time.LocalDateTime paycheckDetectedAt; // When the paycheck was successfully detected
    private java.time.LocalDateTime webhookConfiguredAt; // When the webhook was set up

    // Add other fields if needed, e.g., fixed withdrawal amount, priority, status (active/paused)
}