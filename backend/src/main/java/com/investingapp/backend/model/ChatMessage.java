package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Data
@NoArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String sessionId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 20)
    private String role; // "user" or "assistant"

    @CreationTimestamp
    private LocalDateTime createdAt;

    public ChatMessage(Long userId, String sessionId, String role, String content) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.role = role;
        this.content = content;
    }
}
