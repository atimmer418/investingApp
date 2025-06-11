// src/main/java/com/investingapp/backend/controller/AuthController.java
package com.investingapp.backend.controller;

import com.investingapp.backend.dto.JwtResponse;
import com.investingapp.backend.dto.LoginRequest;
import com.investingapp.backend.dto.MessageResponse; // You created this earlier
import com.investingapp.backend.dto.OtpRequest;
import com.investingapp.backend.dto.OtpVerificationRequest;
import com.investingapp.backend.dto.RegisterRequest;
import com.investingapp.backend.model.User;
import com.investingapp.backend.security.jwt.JwtUtils;
import com.investingapp.backend.security.services.UserDetailsImpl;
import com.investingapp.backend.service.UserService;
import jakarta.validation.Valid;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
// import org.springframework.security.core.GrantedAuthority; // For roles later
import org.springframework.web.bind.annotation.*;

// import java.util.List; // For roles later
// import java.util.stream.Collectors; // For roles later

@CrossOrigin(origins = "*", maxAge = 3600) // Allow all origins for now (dev)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserService userService; // You already have this

    @Autowired
    JwtUtils jwtUtils;

    @GetMapping("/testuser")
    public ResponseEntity<String> userAccess() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalName = "N/A";
        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal().toString())) {
            currentPrincipalName = authentication.getName(); // This will be the email
        } else if (authentication != null) {
            currentPrincipalName = "Anonymous or not fully authenticated: " + authentication.getPrincipal().toString();
        }

        String responseMessage = ">>> User Contents! Accessed by: " + currentPrincipalName;
        System.out.println("[HelloController] /api/test/user accessed. Response: " + responseMessage); // Server-side
                                                                                                       // log
        return ResponseEntity.ok(responseMessage);
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            logger.info("Attempting to register user: {}", registerRequest.getEmail());
            User registeredUser = userService.registerUser(registerRequest);
            logger.info("User {} registered successfully. ID: {}. Prompting for 2FA setup.", registeredUser.getEmail(),
                    registeredUser.getId());

            // Respond with success and the user's email, so frontend knows who to setup 2FA
            // for.
            // No JWT is issued yet.
            return ResponseEntity.ok(Map.of(
                    "message", "Registration successful. Please proceed to Two-Factor Authentication setup.",
                    "email", registeredUser.getEmail(), // Send email back for frontend to use
                    "userId", registeredUser.getId() // Optional: send userId if useful for frontend state
            ));
        } catch (RuntimeException e) {
            logger.error("Registration failed for email {}: {}", registerRequest.getEmail(), e.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/setup-2fa/send-otp")
    public ResponseEntity<?> sendSetupOtp(@Valid @RequestBody OtpRequest otpRequest) {
        // This endpoint is called by the frontend after successful registration,
        // when the user provides their phone number for 2FA setup.
        try {
            logger.info("Request to send 2FA setup OTP to phone: {} for email: {}", otpRequest.getPhoneNumber(),
                    otpRequest.getEmail());
            boolean otpSent = userService.startPhoneNumberVerification(otpRequest.getEmail(),
                    otpRequest.getPhoneNumber());
            if (otpSent) {
                return ResponseEntity.status(HttpStatus.OK)
                        .body(new MessageResponse("OTP sent to " + otpRequest.getPhoneNumber() + " for 2FA setup."));
            } else {
                return ResponseEntity.badRequest().body(
                        new MessageResponse("Failed to send OTP. Please check the phone number or try again later."));
            }
        } catch (IllegalArgumentException e) {
            logger.error("Error sending setup OTP due to invalid argument: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error sending setup OTP: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("An error occurred while sending OTP."));
        }
    }

    @PostMapping("/setup-2fa/verify-otp")
    public ResponseEntity<?> verifySetupOtpAndEnable2FA(@Valid @RequestBody OtpVerificationRequest verificationRequest) {
        try {
            logger.info("Request to verify setup OTP for email: {}", verificationRequest.getEmail());
            User user = userService.getUserByEmail(verificationRequest.getEmail()); // Fetch user by email
            if (user == null || user.getPhoneNumber() == null) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("User or phone number not found for OTP verification."));
            }

            boolean verified = userService.checkPhoneNumberVerification(verificationRequest.getEmail(),
                    user.getPhoneNumber(), verificationRequest.getOtp());

            if (verified) {
                // 2FA is now enabled by userService.checkPhoneNumberVerification.
                // Now, log the user in by generating a JWT.

                UserDetailsImpl userDetails = UserDetailsImpl.build(user); // Build UserDetails from the User object
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities()); // Create Authentication object

                SecurityContextHolder.getContext().setAuthentication(authentication); // Set context

                String jwt = jwtUtils.generateJwtToken(authentication); // Generate JWT
                logger.info("2FA setup OTP verified. JWT generated for user: {}", verificationRequest.getEmail());

                // Return JwtResponse
                return ResponseEntity.ok(new JwtResponse(jwt,
                        userDetails.getId(),
                        userDetails.getUsername()
                /* , roles if you have them */ ));
            } else {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Invalid or expired OTP. 2FA setup failed."));
            }
        } catch (RuntimeException e) { // Catch specific exceptions from userService if defined
            logger.error("Error verifying setup OTP for {}: {}", verificationRequest.getEmail(), e.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage())); // e.g., "User not found..."
        } catch (Exception e) {
            logger.error("Generic error verifying setup OTP: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("An error occurred during OTP verification."));
        }
    }

    // --- LOGIN FLOW (Handles users with and without 2FA enabled) ---
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        // ... (existing login logic that checks if 2FA is enabled and returns 202
        // Accepted if so) ...
        // This was the refined version from before.
        logger.info("Attempting to authenticate user: {}", loginRequest.getEmail());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            User user = userService.getUserById(userDetails.getId()); // Fetch full User entity

            if (user != null && user.isTwoFactorEnabled()) {
                boolean otpSent = userService.startPhoneNumberVerification(user.getEmail(), user.getPhoneNumber());
                if (otpSent) {
                    logger.info("2FA enabled for user {}. OTP sent for login verification.", user.getEmail());
                    return ResponseEntity.status(HttpStatus.ACCEPTED)
                            .body(Map.of(
                                    "message", "2FA required. OTP sent to your phone.",
                                    "email", user.getEmail(), // Send email for frontend to use in next step
                                    "twoFactorRequired", true));
                } else {
                    /* ... error handling ... */ }
            } else {
                SecurityContextHolder.getContext().setAuthentication(authentication);
                String jwt = jwtUtils.generateJwtToken(authentication);
                logger.info("JWT generated for logged-in user (2FA not enabled): {}", loginRequest.getEmail());
                return ResponseEntity.ok(new JwtResponse(jwt, userDetails.getId(), userDetails.getUsername()));
            }
        } catch (Exception e) { /* ... error handling ... */
            logger.error("Login failed for {}: {}", loginRequest.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Login failed: " + e.getMessage()));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new MessageResponse("Login process error.")); // Should not reach here
    }

    @PostMapping("/login/verify-2fa")
    public ResponseEntity<?> verifyLoginOtpAndIssueJwt(@Valid @RequestBody OtpVerificationRequest verificationRequest) {
        // ... (existing login 2FA verification logic that issues JWT on success) ...
        try {
            logger.info("Attempting to verify login OTP for email: {}", verificationRequest.getEmail());
            User user = userService.getUserByEmail(verificationRequest.getEmail());
            if (user == null || user.getPhoneNumber() == null) {
                return ResponseEntity.badRequest().body(new MessageResponse("User or phone number not found."));
            }

            boolean otpVerified = userService.checkPhoneNumberVerification(verificationRequest.getEmail(),
                    user.getPhoneNumber(), verificationRequest.getOtp());

            if (otpVerified) {
                UserDetailsImpl userDetails = UserDetailsImpl.build(user); // Build UserDetails from the User object
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authentication);

                String jwt = jwtUtils.generateJwtToken(authentication);
                logger.info("Login 2FA OTP verified. JWT generated for user: {}", verificationRequest.getEmail());

                return ResponseEntity.ok(new JwtResponse(jwt, userDetails.getId(), userDetails.getUsername()));
            } else {
                /* ... error handling ... */ }
        } catch (Exception e) {
            /* ... error handling ... */ }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new MessageResponse("Invalid or expired OTP for login."));
    }
}