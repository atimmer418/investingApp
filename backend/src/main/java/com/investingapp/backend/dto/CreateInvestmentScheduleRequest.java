package com.investingapp.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor

public class CreateInvestmentScheduleRequest {
    
    @NotNull(message = "Investment amount is required")
    @DecimalMin(value = "1.0", message = "Investment amount must be at least $1.00")
    private BigDecimal investmentAmount;
    
    @NotBlank(message = "Frequency is required")
    private String frequency;
    
    @NotNull(message = "Start date is required")
    private LocalDate startDate;
    
}