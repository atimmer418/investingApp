// src/main/java/com/investingapp/backend/service/UserService.java
package com.investingapp.backend.service;

import com.investingapp.backend.dto.RegisterRequest;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service // Marks this as a Spring service component
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired // Constructor injection (recommended)
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User registerUser(RegisterRequest registerRequest) {
        // Check if email already exists
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            // In a real app, throw a custom exception here (e.g., EmailAlreadyExistsException)
            // For now, we can return null or throw a simple RuntimeException for brevity
            throw new RuntimeException("Error: Email is already in use!");
        }

        // Create new user's account
        User user = new User();
        user.setFirstName(registerRequest.getFirstName());
        user.setLastName(registerRequest.getLastName());
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword())); // Hash the password

        // Set default onboarding statuses (already defaulted in User entity, but can be explicit)
        user.setInitialSurveyCompleted(false);
        user.setPlaidLinked(false);
        // ... set other flags to false

        return userRepository.save(user);
    }

    // We will add more methods here later (e.g., findByEmail for login)
}