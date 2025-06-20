// src/main/java/com/investingapp/backend/dto/SelectedPaycheckDto.java
package com.investingapp.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class SelectedPaycheckDto {
    @NotBlank(message = "Account ID cannot be blank")
    private String accountId;

    @NotBlank(message = "Paycheck name cannot be blank")
    private String name; // The name of the paycheck source

    @NotNull(message = "Withdrawal percentage cannot be null")
    @DecimalMin(value = "0.0", inclusive = true, message = "Percentage must be at least 0")
    @DecimalMax(value = "1.0", inclusive = true, message = "Percentage must be at most 1 (100%)") // Represent as 0.0 to 1.0
    private BigDecimal withdrawalPercentage;
}