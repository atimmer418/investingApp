// src/main/java/com/investingapp/backend/repository/PendingPlaidConnectionRepository.java
package com.investingapp.backend.repository;

import com.investingapp.backend.model.PendingPlaidConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PendingPlaidConnectionRepository extends JpaRepository<PendingPlaidConnection, Long> {

    Optional<PendingPlaidConnection> findByTemporaryUserIdAndStatus(
            String temporaryUserId,
            PendingPlaidConnection.Status status
    );

    // Optional: For a cleanup job later
    List<PendingPlaidConnection> findAllByExpireDateBeforeAndStatus(
            LocalDateTime expiryThreshold,
            PendingPlaidConnection.Status status
    );

    // Optional: For cleanup
    void deleteAllByExpireDateBefore(LocalDateTime expiryThreshold);
}