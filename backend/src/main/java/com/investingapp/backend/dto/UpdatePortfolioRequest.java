package com.investingapp.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UpdatePortfolioRequest {
    
    @NotEmpty(message = "Portfolio items are required")
    @Valid
    private List<PortfolioItemDto> portfolioItems;
    
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PortfolioItemDto {
        
        @NotBlank(message = "Symbol is required")
        private String symbol;
        
        @NotBlank(message = "Name is required")
        private String name;
        
        @NotNull(message = "Percentage is required")
        @DecimalMin(value = "0.01", message = "Percentage must be at least 0.01%")
        @DecimalMax(value = "100.00", message = "Percentage cannot exceed 100%")
        private BigDecimal percentage;
        
        private String assetType = "STOCK";
    }
}