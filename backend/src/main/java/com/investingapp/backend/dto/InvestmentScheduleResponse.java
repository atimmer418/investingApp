package com.investingapp.backend.dto;

import com.investingapp.backend.model.InvestmentSchedule;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
    
    // Constructors
    public InvestmentScheduleResponse() {}
    
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
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public BigDecimal getMonthlyAmount() {
        return monthlyAmount;
    }
    
    public void setMonthlyAmount(BigDecimal monthlyAmount) {
        this.monthlyAmount = monthlyAmount;
    }
    
    public String getFrequency() {
        return frequency;
    }
    
    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }
    
    public BigDecimal getTargetPortfolio() {
        return targetPortfolio;
    }
    
    public void setTargetPortfolio(BigDecimal targetPortfolio) {
        this.targetPortfolio = targetPortfolio;
    }
    
    public Integer getTimeToFI() {
        return timeToFI;
    }
    
    public void setTimeToFI(Integer timeToFI) {
        this.timeToFI = timeToFI;
    }
    
    public String getAchRequestId() {
        return achRequestId;
    }
    
    public void setAchRequestId(String achRequestId) {
        this.achRequestId = achRequestId;
    }
    
    public Boolean getIsPaused() {
        return isPaused;
    }
    
    public void setIsPaused(Boolean isPaused) {
        this.isPaused = isPaused;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}