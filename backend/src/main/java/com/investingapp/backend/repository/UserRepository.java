// src/main/java/com/investingapp/backend/repository/UserRepository.java
package com.investingapp.backend.repository; // Make sure this package name matches

import com.investingapp.backend.model.User; // Import your User entity
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.Optional;

@RepositoryRestResource
public interface UserRepository extends JpaRepository<User, Long> {
    // Spring Data JPA will automatically implement methods based on their names:

    // Find a user by their email address
    // Returns an Optional, which can be empty if no user is found
    Optional<User> findByEmail(String email);

    // Check if a user exists with the given email address
    Boolean existsByEmail(String email);

    // You can add more custom query methods here as needed following Spring Data JPA conventions
    // e.g., List<User> findByLastName(String lastName);
}