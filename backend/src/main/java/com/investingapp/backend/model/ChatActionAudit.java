package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Audit row for every FRED chat action a user confirmed (Phase B agentic).
 * One row per confirm tap — successes and failures alike — so every mutation
 * FRED proposed and the user executed is traceable.
 */
@Entity
@Table(name = "chat_action_audit")
@Data
@NoArgsConstructor
public class ChatActionAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(length = 100)
    private String sessionId;

    @Column(nullable = false, length = 60)
    private String action;

    @Column(columnDefinition = "TEXT")
    private String paramsJson;

    @Column(nullable = false, length = 20)
    private String status; // EXECUTED | FAILED | REJECTED

    @Column(columnDefinition = "TEXT")
    private String resultSummary;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public ChatActionAudit(Long userId, String sessionId, String action, String paramsJson,
            String status, String resultSummary) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.action = action;
        this.paramsJson = paramsJson;
        this.status = status;
        this.resultSummary = resultSummary;
    }
}
