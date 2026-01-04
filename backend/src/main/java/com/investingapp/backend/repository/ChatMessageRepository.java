package com.investingapp.backend.repository;

import com.investingapp.backend.model.ChatMessage;
// Correct
import org.springframework.data.jpa.repository.JpaRepository; // Correct
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // findTop10ByUserIdOrderByCreatedAtDesc usually works with Spring Data JPA
    // derived queries
    List<ChatMessage> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);

    List<ChatMessage> findByUserIdOrderByCreatedAtDesc(Long userId);

    // If query method name is too long or unsupported without explicit limit in
    // some versions:
    // @Query(...) or use Pageable
    // But TopN is standard.
}
