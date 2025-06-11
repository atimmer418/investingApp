// src/main/java/com/investingapp/backend/service/UserService.java
package com.investingapp.backend.service;

import com.investingapp.backend.dto.RegisterRequest;
import com.investingapp.backend.model.PendingPlaidConnection;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.twilio.Twilio;
import com.twilio.exception.ApiException;
// Import classes from Twilio Verify SDK
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;

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

    @Value("${twilio.account.sid}")
    private String twilioAccountSid; // Still needed for Twilio.init()

    @Value("${twilio.auth.token}")
    private String twilioAuthToken; // Still needed for Twilio.init()

    // THIS IS THE VERIFY SERVICE SID from your Twilio Console
    @Value("${twilio.verify.service.sid}")
    private String twilioVerifyServiceSid;

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

    @jakarta.annotation.PostConstruct
    public void initTwilio() {
        if (twilioAccountSid != null && !twilioAccountSid.isEmpty() &&
            twilioAuthToken != null && !twilioAuthToken.isEmpty()) {
            Twilio.init(twilioAccountSid, twilioAuthToken);
            logger.info("Twilio SDK initialized for basic API calls.");
            if (twilioVerifyServiceSid == null || twilioVerifyServiceSid.isEmpty()) {
                logger.warn("Twilio Verify Service SID is not configured. Verify API functionality will be disabled.");
            }
        } else { /* ... */ }
    }

    // Method to START a verification (sends OTP via Twilio Verify)
    @Transactional
    public boolean startPhoneNumberVerification(String userEmail, String phoneNumber) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found for OTP generation: " + userEmail));

        if (phoneNumber == null || !phoneNumber.matches("^\\+[1-9]\\d{1,14}$")) {
            logger.error("Invalid phone number format for OTP: {}", phoneNumber);
            throw new IllegalArgumentException("Invalid phone number format. Please use E.164 format (e.g., +12223334444).");
        }
        if (twilioVerifyServiceSid == null || twilioVerifyServiceSid.isEmpty()) {
             logger.error("Twilio Verify Service SID not configured. Cannot send verification.");
             return false; // Or throw configuration exception
        }

        try {
            if (!phoneNumber.equals(user.getPhoneNumber())) {
                user.setPhoneNumber(phoneNumber);
                userRepository.save(user);
            }

            Verification verification = Verification.creator(
                    twilioVerifyServiceSid,
                    phoneNumber,
                    "sms")
                    .create();

            logger.info("Twilio Verify: Verification sent to {}. SID: {}, Status: {}",
                        phoneNumber, verification.getSid(), verification.getStatus());
            return "pending".equalsIgnoreCase(verification.getStatus());
        } catch (ApiException e) { // Catch Twilio's ApiException
            logger.error("Twilio Verify: API Exception - Failed to send verification to {}: Code={}, Message={}",
                         phoneNumber, e.getCode(), e.getMessage());
            return false;
        } catch (Exception e) {
            logger.error("Twilio Verify: Generic Exception - Failed to send verification to {}: {}",
                         phoneNumber, e.getMessage());
            return false;
        }
    }

    // Method to CHECK a verification (verifies OTP with Twilio Verify) - CORRECTED
    @Transactional
    public boolean checkPhoneNumberVerification(String userEmail, String phoneNumber, String otpCode) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found for OTP verification: " + userEmail));

        // Phone number validation is good to have here too, or ensure it matches the user's stored number
        if (phoneNumber == null || !phoneNumber.matches("^\\+[1-9]\\d{1,14}$")) {
            logger.error("Invalid phone number format for OTP check: {}", phoneNumber);
            throw new IllegalArgumentException("Invalid phone number format for OTP check.");
        }
        if (twilioVerifyServiceSid == null || twilioVerifyServiceSid.isEmpty()) {
             logger.error("Twilio Verify Service SID not configured. Cannot check verification.");
             return false; // Or throw configuration exception
        }
        if (otpCode == null || otpCode.trim().isEmpty()) {
            logger.warn("OTP code is empty for user {}", userEmail);
            return false;
        }


        try {
            // The VerificationCheck creator typically takes the Service SID.
            // The 'to' (phone number) and 'code' are set using builder methods.
            VerificationCheck verificationCheck = VerificationCheck.creator(
                    twilioVerifyServiceSid) // Path Service SID
                    .setTo(phoneNumber)     // Set the phone number the code was sent to
                    .setCode(otpCode)       // Set the code entered by the user
                    .create();

            logger.info("Twilio Verify: Verification check for phone {} with code {} - API Status: {}, Valid: {}",
                        phoneNumber, otpCode, verificationCheck.getStatus(), verificationCheck.getValid());

            if ("approved".equalsIgnoreCase(verificationCheck.getStatus()) && verificationCheck.getValid()) {
                // Only update 2FA status if it's not already enabled,
                // or if this check is part of re-authentication.
                // For initial setup, this is correct.
                if (!user.isTwoFactorEnabled()) {
                    user.setTwoFactorEnabled(true);
                    userRepository.save(user);
                    logger.info("2FA enabled successfully for user {}", userEmail);
                } else {
                    logger.info("2FA already enabled for user {}. OTP check successful for login/action.", userEmail);
                }
                return true;
            } else {
                logger.warn("Twilio Verify: OTP check failed for user {}. API Status: {}, Valid: {}",
                            userEmail, verificationCheck.getStatus(), verificationCheck.getValid());
                return false;
            }
        } catch (ApiException e) { // Catch Twilio's ApiException
            logger.error("Twilio Verify: API Exception - Failed to check verification for {}: Code={}, Message={}",
                         phoneNumber, e.getCode(), e.getMessage());
            // Example: if code is 20404 (Not Found), it means the verification SID or phone/code combo wasn't found or expired
            // You might want to return specific error messages based on e.getCode()
            return false;
        } catch (Exception e) {
            logger.error("Twilio Verify: Generic Exception - Failed to check verification for {}: {}",
                         phoneNumber, e.getMessage());
            return false;
        }
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
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
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