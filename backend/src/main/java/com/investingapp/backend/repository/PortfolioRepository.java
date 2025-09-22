package com.investingapp.backend.repository;

import com.investingapp.backend.model.Portfolio;
import com.investingapp.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    
    /**
     * Find portfolio by user (one-to-one relationship)
     */
    Optional<Portfolio> findByUser(User user);
    
    /**
     * Find portfolio by user ID
     */
    Optional<Portfolio> findByUserId(Long userId);
    
    /**
     * Check if user has a portfolio
     */
    boolean existsByUser(User user);
    
    /**
     * Find default portfolio by user
     */
    Optional<Portfolio> findByUserAndIsDefaultTrue(User user);
}