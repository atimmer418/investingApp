// src/main/java/com/investingapp/backend/repository/UserRepository.java
package com.investingapp.backend.repository; // Make sure this package name matches

import com.investingapp.backend.model.User; // Import your User entity
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Spring Data JPA will automatically implement methods based on their names:

    // Find a user by their email address
    // Returns an Optional, which can be empty if no user is found
    Optional<User> findByEmail(String email);

    // Check if a user exists with the given email address
    Boolean existsByEmail(String email);

    // Find a user by their WebAuthn user handle (for passkey authentication)
    Optional<User> findByUserHandle(String userHandle);

    // Find a user by their Plaid item ID for webhook processing
    User findByPlaidItemId(String plaidItemId);
    
    // Find users by registration IP who have completed auth-finalize (for passkey re-auth prompting)
    @Query("SELECT u FROM User u JOIN u.userProgress up WHERE u.registrationIpAddress = :ipAddress AND up.authFinalizeCompleted = :completed")
    List<User> findByRegistrationIpAddressAndAuthFinalizeCompleted(@Param("ipAddress") String registrationIpAddress, @Param("completed") boolean authFinalizeCompleted);

    // Find users by device ID who have completed auth-finalize (more reliable than IP for mobile)
    @Query("SELECT u FROM User u JOIN u.userProgress up WHERE u.deviceId = :deviceId AND up.authFinalizeCompleted = :completed")
    List<User> findByDeviceIdAndAuthFinalizeCompleted(@Param("deviceId") String deviceId, @Param("completed") boolean authFinalizeCompleted);

    // You can add more custom query methods here as needed following Spring Data JPA conventions
    // e.g., List<User> findByLastName(String lastName);
}