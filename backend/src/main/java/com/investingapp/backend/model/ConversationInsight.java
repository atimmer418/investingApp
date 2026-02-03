package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversation_insights", indexes = {
        @Index(name = "idx_user_created", columnList = "userId,createdAt"),
        @Index(name = "idx_topic_lastseen", columnList = "topicTag,lastSeenAt"),
        @Index(name = "idx_suggestion_score", columnList = "isGoodSuggestion,suggestionScore")
})
@Data
@NoArgsConstructor
public class ConversationInsight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Identifiers
    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String sessionId;

    // Question tracking
    @Column(nullable = false, length = 500)
    private String questionText; // User's original question

    @Column(length = 500)
    private String followUpQuestion; // What they asked next (if any)

    @Column(length = 200)
    private String topicTag; // LLM-extracted topic (e.g., "compound_interest")

    @Column
    private Integer responseLength; // Track response length for summary analysis

    // Suggestion pool flags
    @Column
    private Boolean isGoodSuggestion = false; // Suitable for daily suggestions?

    @Column
    private Integer suggestionScore = 1; // Popularity score (increments when similar questions asked)

    // Timestamps
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime lastSeenAt; // Track when this pattern last occurred

    // Constructor for basic logging (Phase 2A)
    public ConversationInsight(Long userId, String sessionId, String questionText, Integer responseLength) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.questionText = questionText;
        this.responseLength = responseLength;
        this.lastSeenAt = LocalDateTime.now();
    }

    // Full constructor (for Phase 2B when topic extraction is added)
    public ConversationInsight(Long userId, String sessionId, String questionText, String topicTag,
            Integer responseLength, Boolean isGoodSuggestion) {
        this(userId, sessionId, questionText, responseLength);
        this.topicTag = topicTag;
        this.isGoodSuggestion = isGoodSuggestion;
    }
}
