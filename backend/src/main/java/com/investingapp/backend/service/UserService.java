// src/main/java/com/investingapp/backend/service/UserService.java
package com.investingapp.backend.service;

import com.investingapp.backend.dto.RegisterRequest;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;

import java.security.SecureRandom;
import java.util.Optional;

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
    private final SecureRandom random = new SecureRandom();
    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int CODE_LENGTH = 8;

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

    // @Transactional
    // public User registerUser(RegisterRequest registerRequest) {
    //     if (userRepository.existsByEmail(registerRequest.getEmail())) {
    //         logger.warn("Registration attempt with existing email: {}", registerRequest.getEmail());
    //         throw new RuntimeException("Error: Email is already in use!");
    //     }

    //     User user = new User();
    //     user.setFirstName(registerRequest.getFirstName());
    //     user.setLastName(registerRequest.getLastName());
    //     user.setEmail(registerRequest.getEmail());
    //     // Default onboarding flags are set in User entity

    //     User savedUser = userRepository.save(user); // Save user first
    //     logger.info("User registered successfully with ID: {} and Email: {}", savedUser.getId(), savedUser.getEmail());


    //     savedUser = userRepository.save(savedUser); // Save again with Plaid info
    //     logger.info("Plaid info linked to user ID: {}", savedUser.getId());
    //     return savedUser; // Return the fully saved user, potentially with Plaid info
    // }

    public String generateUniqueReferralCode(String email) {
        String base = generateBaseFromEmail(email);
        String code;
        int attempts = 0;
        
        do {
            // Generate 2 digit number (00-99)
            String suffix = String.format("%02d", random.nextInt(100));
            code = base + suffix;
            attempts++;
            
            // Safety break to prevent infinite loops if all 100 combinations are taken (highly unlikely for a specific base)
            // If we hit this limit, we can fallback to the old random method or add more digits
            if (attempts > 500) {
                 return generateRandomCode();
            }
        } while (userRepository.existsByReferralCode(code));
        
        return code;
    }

    private String generateBaseFromEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "REFCODE"; 
        }
        // Use local part to avoid domain collisions (e.g. everyone having 'COM' or 'NET')
        String localPart = email.split("@")[0].replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
        
        if (localPart.length() < 3) {
            // If extremely short, just use what we have duplicated or padded
            // e.g. "me" -> "MEME"
             return localPart + localPart;
        }

        String first3 = localPart.substring(0, 3);
        String last3 = localPart.substring(localPart.length() - 3);
        
        return first3 + last3;
    }

    private String generateRandomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CHARACTERS.charAt(random.nextInt(CHARACTERS.length())));
        }
        return sb.toString();
    }

    @Transactional
    public boolean applyReferralCode(Long userId, String code) {
        User user = getUserById(userId);
        if (user == null) {
            throw new RuntimeException("User not found");
        }
        
        if (Boolean.TRUE.equals(user.getHasAppliedReferral())) {
            throw new RuntimeException("User has already applied a referral code.");
        }

        if (user.getReferralCode() != null && user.getReferralCode().equalsIgnoreCase(code)) {
             throw new RuntimeException("User cannot apply their own referral code.");
        }

        Optional<User> referrerOpt = userRepository.findByReferralCode(code);
        if (referrerOpt.isEmpty()) {
            throw new RuntimeException("Invalid referral code.");
        }

        User referrer = referrerOpt.get();
        if (referrer.getId().equals(user.getId())) {
             throw new RuntimeException("User cannot apply their own referral code.");
        }
        
        user.setHasAppliedReferral(true);
        int currentCount = referrer.getReferralCount() != null ? referrer.getReferralCount() : 0;
        referrer.setReferralCount(currentCount + 1);
        
        userRepository.save(user);
        userRepository.save(referrer);
        return true;
    }
}