// src/main/java/com/investingapp/backend/model/PendingPlaidConnection.java
package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Entity
@Table(name = "pending_plaid_connections")
@Data
@NoArgsConstructor
public class PendingPlaidConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String temporaryUserId;

    @Column(nullable = false, length = 512) // Increased length for encrypted token
    private String plaidAccessToken; // Store ENCRYPTED token

    @Column(nullable = false)
    private String plaidItemId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createDate;

    @Column(nullable = false)
    private LocalDateTime expireDate;

    @Enumerated(EnumType.STRING) // Store enum as string
    @Column(nullable = false)
    private Status status = Status.PENDING_ACCOUNT_CREATION;

    public enum Status {
        PENDING_ACCOUNT_CREATION,
        CLAIMED,
        EXPIRED
    }

    public PendingPlaidConnection(String temporaryUserId, String plaidAccessToken, String plaidItemId) {
        this.temporaryUserId = temporaryUserId;
        this.plaidAccessToken = plaidAccessToken; // Remember to encrypt this BEFORE saving via service
        this.plaidItemId = plaidItemId;
        // Expiry: Set createdAt and expiresAt in the service layer upon creation for more control
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expireDate);
    }

    // Lombok will generate getters and setters
}