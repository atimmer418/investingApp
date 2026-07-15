package com.investingapp.backend.repository;

import com.investingapp.backend.model.MarketBreakdown;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MarketBreakdownRepository extends JpaRepository<MarketBreakdown, Long> {

    Optional<MarketBreakdown> findByPeriodKey(String periodKey);
}
