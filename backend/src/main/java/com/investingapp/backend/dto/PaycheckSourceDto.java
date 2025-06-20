// src/main/java/com/investingapp/backend/dto/PaycheckSourceDto.java
package com.investingapp.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaycheckSourceDto {
    private String accountId; // Plaid account_id from which income/transactions are sourced
    private String name; // e.g., "Direct Deposit - Company XYZ" or user-defined
    private BigDecimal lastAmount; // Amount of the last detected deposit
    private String lastDate; // Date of the last detected deposit (ISO 8601 string)
    private String frequency; // e.g., "BI_WEEKLY", "MONTHLY", "UNKNOWN" (if detectable)
    // Add any other relevant fields Plaid might provide or you derive
}