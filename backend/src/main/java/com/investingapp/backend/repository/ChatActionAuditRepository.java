package com.investingapp.backend.repository;

import com.investingapp.backend.model.ChatActionAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatActionAuditRepository extends JpaRepository<ChatActionAudit, Long> {
    List<ChatActionAudit> findByUserIdOrderByCreatedAtDesc(Long userId);
}
