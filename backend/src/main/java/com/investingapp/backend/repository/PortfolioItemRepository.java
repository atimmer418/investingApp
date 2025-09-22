package com.investingapp.backend.repository;

import com.investingapp.backend.model.Portfolio;
import com.investingapp.backend.model.PortfolioItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, Long> {
    
    /**
     * Find all portfolio items for a portfolio
     */
    List<PortfolioItem> findByPortfolio(Portfolio portfolio);
    
    /**
     * Find portfolio item by portfolio and symbol
     */
    PortfolioItem findByPortfolioAndSymbol(Portfolio portfolio, String symbol);
    
    /**
     * Delete all portfolio items for a portfolio
     */
    void deleteByPortfolio(Portfolio portfolio);
}