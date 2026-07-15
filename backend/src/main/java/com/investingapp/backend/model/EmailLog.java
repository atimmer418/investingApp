package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Audit row for every outbound email attempt. Bodies are never stored.
 * The unique index on (email_type, user_id, period_key) makes recurring
 * emails (e.g. MARKET_BREAKDOWN for "2026-06") physically unable to
 * double-send; rows with NULL period_key (one-off emails) may repeat freely
 * (MySQL unique indexes permit repeated NULLs).
 * Retries after FAILED update the existing row (see EmailService.record).
 */
@Entity
@Table(name = "email_log", uniqueConstraints = @UniqueConstraint(
        name = "uq_email_type_user_period",
        columnNames = { "email_type", "user_id", "period_key" }))
@Data
@NoArgsConstructor
public class EmailLog {

    public static final String STATUS_SENT = "SENT";
    public static final String STATUS_MOCKED = "MOCKED";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId; // nullable — legacy/system emails have no user context

    @Column(nullable = false, length = 100)
    private String recipient;

    @Column(length = 200)
    private String subject;

    @Column(name = "email_type", nullable = false, length = 40)
    private String emailType; // e.g. MARKET_BREAKDOWN, LEGACY

    @Column(name = "period_key", length = 10)
    private String periodKey; // e.g. "2026-06"; null for one-off emails

    @Column(nullable = false, length = 10)
    private String status; // SENT | MOCKED | FAILED

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    private LocalDateTime sentAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public EmailLog(Long userId, String recipient, String subject, String emailType,
            String periodKey, String status, String errorMessage) {
        this.userId = userId;
        this.recipient = recipient;
        this.subject = subject;
        this.emailType = emailType;
        this.periodKey = periodKey;
        this.status = status;
        this.errorMessage = errorMessage;
    }
}
