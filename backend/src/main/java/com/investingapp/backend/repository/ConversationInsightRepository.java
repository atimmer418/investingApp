package com.investingapp.backend.repository;

import com.investingapp.backend.model.ConversationInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ConversationInsightRepository extends JpaRepository<ConversationInsight, Long> {

    // Find follow-up patterns after a specific topic (Phase 2B)
    List<ConversationInsight> findByTopicTagAndFollowUpQuestionIsNotNull(String topicTag);

    // Get questions suitable for daily suggestions (Phase 2C)
    // Orders by score DESC to get most popular questions
    List<ConversationInsight> findTop20ByIsGoodSuggestionTrueOrderBySuggestionScoreDesc();

    // Find recent patterns for a user (Phase 2C - personalization)
    List<ConversationInsight> findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
            Long userId, LocalDateTime since);

    // Count questions by topic to identify popular topics (Phase 2B)
    @Query("SELECT c.topicTag, COUNT(c) as count FROM ConversationInsight c " +
            "WHERE c.createdAt > :since AND c.topicTag IS NOT NULL " +
            "GROUP BY c.topicTag ORDER BY count DESC")
    List<Object[]> findTopTopicsSince(@Param("since") LocalDateTime since);

    // Get topics a specific user has asked about (Phase 2C - personalization)
    @Query("SELECT DISTINCT c.topicTag FROM ConversationInsight c " +
            "WHERE c.userId = :userId AND c.topicTag IS NOT NULL")
    List<String> findTopicsByUser(@Param("userId") Long userId);

    // 90-day retention cleanup (Phase 2A)
    @Modifying
    @Query("DELETE FROM ConversationInsight c WHERE c.createdAt < :cutoffDate")
    int deleteOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);

    // Count total insights for analytics
    @Query("SELECT COUNT(c) FROM ConversationInsight c WHERE c.createdAt > :since")
    long countSince(@Param("since") LocalDateTime since);
}
