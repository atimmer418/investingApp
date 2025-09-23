package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
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

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Core investment schedule fields for cron processing
    @Column(name = "start_date", nullable = false, columnDefinition = "DATE")
    private LocalDate startDate;

    @Column(name = "next_investment_date", nullable = false, columnDefinition = "DATE")
    private LocalDate nextInvestmentDate;

    @Column(name = "investment_amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal investmentAmount; // Amount to invest per execution

    @Column(name = "monthly_amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal monthlyAmount; // Reference monthly amount user specified

    @Column(name = "frequency", length = 20, nullable = false)
    private String frequency; // "WEEKLY", "BIWEEKLY", "MONTHLY"

    @Column(name = "is_paused", nullable = false)
    private Boolean isPaused = true;

    // ACH and system fields
    @Column(name = "ach_request_id", length = 255)
    private String achRequestId; // This will be set when ACH linking is confirmed

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        
        // Set initial dates if not provided
        if (startDate == null) {
            startDate = LocalDate.now();
        }
        if (nextInvestmentDate == null) {
            nextInvestmentDate = calculateNextInvestmentDate(startDate);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Calculate the next investment date based on frequency
     */
    public LocalDate calculateNextInvestmentDate(LocalDate fromDate) {
        if (fromDate == null) fromDate = LocalDate.now();
        
        LocalDate nextDate = switch (frequency.toUpperCase()) {
            case "WEEKLY" -> fromDate.plusWeeks(1);
            case "BIWEEKLY" -> fromDate.plusWeeks(2);
            case "SEMI_MONTHLY" -> {
                // Semi-monthly: 1st and 15th of each month
                int dayOfMonth = fromDate.getDayOfMonth();
                if (dayOfMonth <= 15) {
                    yield fromDate.withDayOfMonth(15);
                } else {
                    yield fromDate.plusMonths(1).withDayOfMonth(1);
                }
            }
            case "MONTHLY" -> fromDate.plusMonths(1);
            default -> fromDate.plusWeeks(2); // Default to biweekly
        };
        
        System.out.println("calculateNextInvestmentDate: fromDate=" + fromDate + ", frequency=" + frequency + ", nextDate=" + nextDate);
        return nextDate;
    }

    /**
     * Update the next investment date after processing
     */
    public void advanceToNextInvestmentDate() {
        this.nextInvestmentDate = calculateNextInvestmentDate(this.nextInvestmentDate);
    }

    /**
     * Check if this schedule is ready for investment execution
     */
    public boolean isReadyForInvestment() {
        return !isPaused && 
               nextInvestmentDate != null && 
               !nextInvestmentDate.isAfter(LocalDate.now()) &&
               achRequestId != null; // ACH must be linked
    }

    /**
     * Calculate investment amount based on frequency relative to monthly amount
     */
    public BigDecimal calculateInvestmentAmountFromMonthly() {
        if (monthlyAmount == null) return BigDecimal.ZERO;
        
        return switch (frequency.toUpperCase()) {
            case "WEEKLY" -> monthlyAmount.divide(new BigDecimal("4.33"), 2, java.math.RoundingMode.HALF_UP);
            case "BIWEEKLY" -> monthlyAmount.divide(new BigDecimal("2.17"), 2, java.math.RoundingMode.HALF_UP);
            case "SEMI_MONTHLY" -> monthlyAmount.divide(new BigDecimal("2"), 2, java.math.RoundingMode.HALF_UP); // Exactly 2 times per month
            case "MONTHLY" -> monthlyAmount;
            default -> monthlyAmount;
        };
    }
}

