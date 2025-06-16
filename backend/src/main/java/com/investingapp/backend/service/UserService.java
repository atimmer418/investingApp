// src/main/java/com/investingapp/backend/service/UserService.java
package com.investingapp.backend.service;

import com.investingapp.backend.dto.RegisterRequest;
import com.investingapp.backend.model.PendingPlaidConnection;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class); // Added logger

    // ... (userRepository, passwordEncoder, plaidService fields and constructor) ...
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PlaidService plaidService;
    private final EncryptionService encryptionService;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, PlaidService plaidService, EncryptionService encryptionService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.plaidService = plaidService;
        this.encryptionService = encryptionService;
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }
    public User getUserById(Long id) { // Good to have for fetching full user after UserDetails
        return userRepository.findById(id).orElse(null);
    }

    @Transactional
    public User registerUser(RegisterRequest registerRequest) {
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            logger.warn("Registration attempt with existing email: {}", registerRequest.getEmail());
            throw new RuntimeException("Error: Email is already in use!");
        }

        User user = new User();
        user.setFirstName(registerRequest.getFirstName());
        user.setLastName(registerRequest.getLastName());
        user.setEmail(registerRequest.getEmail());
        // Default onboarding flags are set in User entity

        User savedUser = userRepository.save(user); // Save user first
        logger.info("User registered successfully with ID: {} and Email: {}", savedUser.getId(), savedUser.getEmail());


        if (registerRequest.getTemporaryUserId() != null && !registerRequest.getTemporaryUserId().isEmpty()) {
            PendingPlaidConnection pendingConnection = plaidService.retrieveAndRemovePendingConnection(registerRequest.getTemporaryUserId());
            if (pendingConnection != null) {
                logger.info("Associating pending Plaid connection (Item ID: {}) with new user ID: {}", pendingConnection.getPlaidItemId(), savedUser.getId());
                String encryptedAccessToken = encryptionService.encrypt(pendingConnection.getPlaidAccessToken());
                savedUser.setPlaidAccessToken(encryptedAccessToken); // TODO: Handle encryption/decryption
                savedUser.setPlaidItemId(pendingConnection.getPlaidItemId());
                savedUser.setPlaidLinked(true);
                savedUser = userRepository.save(savedUser); // Save again with Plaid info
                logger.info("Plaid info linked to user ID: {}", savedUser.getId());
            } else {
                logger.warn("No valid pending Plaid connection found for temporary ID: {} during registration for user {}.",
                            registerRequest.getTemporaryUserId(), savedUser.getEmail());
            }
        }
        return savedUser; // Return the fully saved user, potentially with Plaid info
    }
}