package com.investingapp.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class RegistrationStartRequest {

    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Email should be valid")
    private String email;

    @NotBlank(message = "Plan ID cannot be blank")
    private String planId;

    @NotBlank(message = "Time to FI cannot be blank")
    private String timeToFI;

    @NotNull(message = "Target portfolio cannot be null")
    @Positive(message = "Target portfolio must be positive")
    private Double targetPortfolio;

    @NotNull(message = "Retirement income cannot be null")
    @Positive(message = "Retirement income must be positive")
    private Double retirementIncome;

    @NotNull(message = "Monthly investment cannot be null")
    @Positive(message = "Monthly investment must be positive")
    private Double monthlyInvestment;
}