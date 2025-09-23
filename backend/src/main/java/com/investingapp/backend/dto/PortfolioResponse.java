package com.investingapp.backend.dto;

import com.investingapp.backend.model.Portfolio;
import com.investingapp.backend.model.PortfolioItem;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PortfolioResponse {
    
    private Long id;
    private String name;
    private BigDecimal totalPercentage;
    private Boolean isDefault;
    private List<PortfolioItemResponse> portfolioItems;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Custom constructor from entity
    public PortfolioResponse(Portfolio portfolio) {
        this.id = portfolio.getId();
        this.name = portfolio.getName();
        this.totalPercentage = portfolio.getTotalPercentage();
        this.isDefault = portfolio.getIsDefault();
        this.portfolioItems = portfolio.getPortfolioItems().stream()
                .map(PortfolioItemResponse::new)
                .collect(Collectors.toList());
        this.createdAt = portfolio.getCreatedAt();
        this.updatedAt = portfolio.getUpdatedAt();
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PortfolioItemResponse {
        private Long id;
        private String symbol;
        private String name;
        private BigDecimal percentage;
        private String assetType;

        // Custom constructor from entity
        public PortfolioItemResponse(PortfolioItem item) {
            this.id = item.getId();
            this.symbol = item.getSymbol();
            this.name = item.getName();
            this.percentage = item.getPercentage();
            this.assetType = item.getAssetType();
        }
    }
}