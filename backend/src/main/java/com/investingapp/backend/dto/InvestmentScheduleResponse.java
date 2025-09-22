package com.investingapp.backend.dto;

import com.investingapp.backend.model.InvestmentSchedule;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor

public class InvestmentScheduleResponse {
    
    private Long id;
    private BigDecimal monthlyAmount;
    private String frequency;
    private BigDecimal targetPortfolio;
    private Integer timeToFI;
    private String achRequestId;
    private Boolean isPaused;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Custom constructor from entity
    public InvestmentScheduleResponse(InvestmentSchedule schedule) {
        this.id = schedule.getId();
        this.monthlyAmount = schedule.getMonthlyAmount();
        this.frequency = schedule.getFrequency();
        this.targetPortfolio = schedule.getTargetPortfolio();
        this.timeToFI = schedule.getTimeToFI();
        this.achRequestId = schedule.getAchRequestId();
        this.isPaused = schedule.getIsPaused();
        this.createdAt = schedule.getCreatedAt();
        this.updatedAt = schedule.getUpdatedAt();
    }
}