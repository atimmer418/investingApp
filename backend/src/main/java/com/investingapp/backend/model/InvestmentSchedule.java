package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "investment_schedules")
public class InvestmentSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "monthly_amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal monthlyAmount;

    @Column(name = "frequency", length = 50)
    private String frequency; // e.g., "MONTHLY", "BIWEEKLY", "WEEKLY"

    @Column(name = "target_portfolio", precision = 15, scale = 2)
    private BigDecimal targetPortfolio;

    @Column(name = "time_to_fi")
    private Integer timeToFI; // in years

    @Column(name = "ach_request_id", length = 255)
    private String achRequestId; // This will be set when ACH linking is confirmed

    @Column(name = "is_paused", nullable = false)
    private Boolean isPaused = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

