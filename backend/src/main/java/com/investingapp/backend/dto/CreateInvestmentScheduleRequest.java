package com.investingapp.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class CreateInvestmentScheduleRequest {
    
    @NotNull(message = "Monthly amount is required")
    @DecimalMin(value = "1.0", message = "Monthly amount must be at least $1.00")
    private BigDecimal monthlyAmount;
    
    @NotBlank(message = "Frequency is required")
    private String frequency;
    
    private BigDecimal targetPortfolio;
    
    private Integer timeToFI;
    
    // Constructors
    public CreateInvestmentScheduleRequest() {}
    
    public CreateInvestmentScheduleRequest(BigDecimal monthlyAmount, String frequency) {
        this.monthlyAmount = monthlyAmount;
        this.frequency = frequency;
    }
    
    // Getters and Setters
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
    
    @Override
    public String toString() {
        return "CreateInvestmentScheduleRequest{" +
                "monthlyAmount=" + monthlyAmount +
                ", frequency='" + frequency + '\'' +
                ", targetPortfolio=" + targetPortfolio +
                ", timeToFI=" + timeToFI +
                '}';
    }
}