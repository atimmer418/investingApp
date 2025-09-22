package com.investingapp.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor

public class CreateInvestmentScheduleRequest {
    
    @NotNull(message = "Monthly amount is required")
    @DecimalMin(value = "1.0", message = "Monthly amount must be at least $1.00")
    private BigDecimal monthlyAmount;
    
    @NotBlank(message = "Frequency is required")
    private String frequency;
    
    private BigDecimal targetPortfolio;
    
    private Integer timeToFI;
    
}