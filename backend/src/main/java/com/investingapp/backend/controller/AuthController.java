// src/main/java/com/investingapp/backend/controller/AuthController.java
package com.investingapp.backend.controller;

import com.investingapp.backend.dto.FinishAuthenticationRequest;
import com.investingapp.backend.dto.FinishRegistrationRequest;
import com.investingapp.backend.dto.JwtResponse;
import com.investingapp.backend.dto.LoginRequest;
import com.investingapp.backend.dto.MessageResponse; // You created this earlier
import com.investingapp.backend.dto.OtpRequest;
import com.investingapp.backend.dto.OtpVerificationRequest;
import com.investingapp.backend.dto.RegisterRequest;
import com.investingapp.backend.dto.StartAuthenticationRequest;
import com.investingapp.backend.dto.StartRegistrationRequest;
import com.investingapp.backend.model.User;
import com.investingapp.backend.security.jwt.JwtUtils;
import com.investingapp.backend.security.services.UserDetailsImpl;
import com.investingapp.backend.service.UserService;
import com.yubico.webauthn.AssertionRequest;

import jakarta.validation.Valid;

import java.util.Map;
import java.util.Optional;

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
import com.investingapp.backend.service.WebAuthnService;
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;
import com.yubico.webauthn.AssertionRequest;
import com.yubico.webauthn.data.AuthenticatorAssertionResponse; // For parsing client response
import com.yubico.webauthn.data.AuthenticatorAttestationResponse; // For parsing client response
import com.yubico.webauthn.data.ClientRegistrationExtensionOutputs;
import com.yubico.webauthn.data.PublicKeyCredential;
import com.fasterxml.jackson.databind.ObjectMapper; // For parsing JSON from client if needed
import org.springframework.web.bind.annotation.RequestBody; // Make sure this is used for complex objects


// import java.util.List; // For roles later
// import java.util.stream.Collectors; // For roles later

@CrossOrigin(origins = "*", maxAge = 3600) // Allow all origins for now (dev)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    private WebAuthnService webAuthnService;
    
    @Autowired // For parsing JSON string from client if not automatically mapped
    private ObjectMapper objectMapper;

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

            if (user != null) {
                boolean otpSent = true;
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

    // --- Passkey Registration Endpoints ---
    @PostMapping("/passkey/register/start")
    public ResponseEntity<?> startPasskeyRegistration(@RequestBody StartRegistrationRequest request) {
        // In a real app, ensure user is partially authenticated or has a valid
        // session/token
        // if this isn't the absolute first step after providing an email.
        // For the "AuthFinalize" flow, the user isn't fully logged in yet.
        // The 'email' would come from the previous step (Plaid linking -> AuthFinalize
        // form).
        try {
            logger.info("Starting passkey registration for email: {}", request.getEmail());
            PublicKeyCredentialCreationOptions creationOptions = webAuthnService.startRegistration(
                    request.getEmail(),
                    request.getDisplayName(),
                    request.getTemporaryPlaidIdentifier() // Pass this along if it's part of this flow
            );
            // The frontend needs to store these options (e.g., in sessionStorage)
            // because they are needed for finishRegistration.
            // We send them as JSON. The Yubico library can serialize/deserialize them.
            return ResponseEntity.ok(creationOptions.toJson());
        } catch (Exception e) {
            logger.error("Error starting passkey registration for {}: {}", request.getEmail(), e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error starting passkey registration: " + e.getMessage()));
        }
    }

    @PostMapping("/passkey/register/finish")
    public ResponseEntity<?> finishPasskeyRegistration(@RequestBody FinishRegistrationRequest request) {
        try {
            logger.info("Finishing passkey registration for email: {}", request.getEmail());
            // Deserialize requestOptionsJson back to PublicKeyCredentialCreationOptions
            PublicKeyCredentialCreationOptions requestOptions = PublicKeyCredentialCreationOptions
                    .fromJson(request.getRequestOptionsJson());

            boolean success = webAuthnService.finishRegistration(
                    request.getEmail(),
                    request.getCredential(), // This is the JSON string from navigator.credentials.create()
                    requestOptions);

            if (success) {
                // Registration successful. Now user needs to "log in" with their new passkey
                // to get a JWT, or you can issue one here.
                // For simplicity, let's assume they will now log in.
                // Or, better yet, log them in here and issue a JWT.
                User user = userService.getUserByEmail(request.getEmail());
                if (user == null)
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(new MessageResponse("User not found after passkey registration."));

                UserDetailsImpl userDetails = UserDetailsImpl.build(user);
                Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null,
                        userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authentication);
                String jwt = jwtUtils.generateJwtToken(authentication);

                logger.info("Passkey registration successful and user {} logged in.", request.getEmail());
                return ResponseEntity.ok(new JwtResponse(jwt, user.getId(), user.getEmail()));
            } else {
                return ResponseEntity.badRequest().body(new MessageResponse("Passkey registration failed."));
            }
        } catch (Exception e) {
            logger.error("Error finishing passkey registration for {}: {}", request.getEmail(), e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error finishing passkey registration: " + e.getMessage()));
        }
    }

    // --- Passkey Login Endpoints ---
    @PostMapping("/passkey/login/start")
    public ResponseEntity<?> startPasskeyAuthentication(
            @RequestBody(required = false) StartAuthenticationRequest request) {
        // 'request' can be null or empty for discoverable credentials (passkeys)
        // If email is provided, it can help narrow down credentials, but it's optional
        // for passkeys.
        String email = (request != null) ? request.getEmail() : null;
        try {
            logger.info("Starting passkey authentication, email hint: {}", email);
            AssertionRequest assertionRequest = webAuthnService.startAuthentication(email);
            // Frontend needs to store assertionRequest (e.g., in sessionStorage) for
            // finishAuthentication
            return ResponseEntity.ok(assertionRequest.toJson());
        } catch (Exception e) {
            logger.error("Error starting passkey authentication: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error starting passkey authentication: " + e.getMessage()));
        }
    }

    @PostMapping("/passkey/login/finish")
    public ResponseEntity<?> finishPasskeyAuthentication(@RequestBody FinishAuthenticationRequest request) {
        try {
            logger.info("Finishing passkey authentication.");
            // Deserialize requestOptionsJson back to AssertionRequest
            AssertionRequest requestOptions = AssertionRequest.fromJson(request.getRequestOptionsJson());

            Optional<User> userOptional = webAuthnService.finishAuthentication(
                    request.getCredential(), // This is the JSON string from navigator.credentials.get()
                    requestOptions);

            if (userOptional.isPresent()) {
                User user = userOptional.get();
                UserDetailsImpl userDetails = UserDetailsImpl.build(user);
                Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null,
                        userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authentication);
                String jwt = jwtUtils.generateJwtToken(authentication);

                logger.info("Passkey login successful for user {}.", user.getEmail());
                return ResponseEntity.ok(new JwtResponse(jwt, user.getId(), user.getEmail()));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse("Passkey authentication failed."));
            }
        } catch (Exception e) {
            logger.error("Error finishing passkey authentication: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Error finishing passkey authentication: " + e.getMessage()));
        }
    }
}