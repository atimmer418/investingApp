package com.investingapp.backend.repository;

import com.investingapp.backend.model.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    // Single row per (type, user, period) — enforced by uq_email_type_user_period
    Optional<EmailLog> findByEmailTypeAndUserIdAndPeriodKey(String emailType, Long userId, String periodKey);
}
