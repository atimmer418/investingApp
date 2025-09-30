// src/main/java/com/investingapp/backend/controller/WebAuthnController.java
package com.investingapp.backend.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;

// imports below are for simulating passkey
import com.investingapp.backend.model.User;
import org.springframework.http.HttpStatus;
import java.util.Map;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.fasterxml.jackson.databind.JsonNode;
import com.investingapp.backend.repository.UserRepository;  // Your UserRepository interface
import org.springframework.security.core.userdetails.UserDetailsService;
import com.investingapp.backend.security.jwt.JwtUtils;  // Your JWT helper class

import com.investingapp.backend.dto.RegistrationFinishRequest;
import com.investingapp.backend.dto.RegistrationFinishResponse; // <-- IMPORT YOUR DTO
import com.investingapp.backend.dto.RegistrationStartRequest;
import com.investingapp.backend.dto.RegistrationStartResponse;
import com.investingapp.backend.service.WebAuthnService;
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;
import com.yubico.webauthn.data.PublicKeyCredentialRequestOptions;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/passkey")
@CrossOrigin(origins = "*")
public class WebAuthnController {

    private static final Logger logger = LoggerFactory.getLogger(WebAuthnController.class);

    private final WebAuthnService webAuthnService;
    private final Cache<String, PublicKeyCredentialCreationOptions> challengeCache;
    
    // Cache for authentication challenges (email-less authentication)
    private final Cache<String, PublicKeyCredentialRequestOptions> authChallengeCache;
    
    // ObjectMapper for JSON serialization
    private final ObjectMapper objectMapper = new ObjectMapper();

    // these 3 injections are needed for simulating passkey registration
    @Autowired
    private UserRepository userRepository; // Your user repo interface

    @Autowired
    private UserDetailsService userDetailsService; // Usually your Spring Security user details service

    @Autowired
    private JwtUtils jwtUtils; // Your JWT utility/service class

    @Autowired
    public WebAuthnController(WebAuthnService webAuthnService,
            Cache<String, PublicKeyCredentialCreationOptions> challengeCache,
            Cache<String, PublicKeyCredentialRequestOptions> authChallengeCache) {
        this.webAuthnService = webAuthnService;
        this.challengeCache = challengeCache;
        this.authChallengeCache = authChallengeCache;
    }

    @PostMapping("/register/start")
    public ResponseEntity<?> startRegistration(@Valid @RequestBody RegistrationStartRequest registrationRequest,
            HttpServletRequest request) {
        logger.info("Received passkey registration start request for email: {}", registrationRequest.getEmail());
        String origin = request.getHeader("Origin");
        logger.info("Received request from ORIGIN: {}", origin);
        try {
            PublicKeyCredentialCreationOptions options = webAuthnService.startRegistrationFlow(
                    registrationRequest.getEmail(),
                    registrationRequest.getPlanId(),
                    registrationRequest.getTimeToFI(),
                    registrationRequest.getTargetPortfolio(),
                    registrationRequest.getRetirementIncome(),
                    registrationRequest.getMonthlyInvestment());
            challengeCache.put(registrationRequest.getEmail(), options);
            logger.info("Registration options stored in cache for user: {}", registrationRequest.getEmail());
            return ResponseEntity.ok(new RegistrationStartResponse(objectMapper.writeValueAsString(options)));
        } catch (IllegalArgumentException e) {
            logger.warn("Registration failed for email {}: {}", registrationRequest.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Email is already taken.");
        } catch (JsonProcessingException e) {
            logger.error("Failed to serialize options to JSON for user: {}", registrationRequest.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error generating registration options.");
        }
    }

    @PostMapping("/register/finish")
    public ResponseEntity<RegistrationFinishResponse> finishRegistration(
            @Valid @RequestBody RegistrationFinishRequest finishRequest) {
        logger.info("Received passkey registration finish request for email: {}", finishRequest.getEmail());
        String email = finishRequest.getEmail();

        JsonNode credential = finishRequest.getCredential();
        String attestationObject = credential.path("response").path("attestationObject").asText();

        if ("SIMULATED_ATTESTATION".equals(attestationObject)) {
            logger.warn("SIMULATED passkey registration used for email: {}", email);

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                user = new User(email); // Make sure constructor and fields fit your model
                userRepository.save(user);
            }

            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);

            String jwt = jwtUtils.generateJwtToken(authentication);

            return ResponseEntity.ok(new RegistrationFinishResponse(
                    true,
                    "Simulated registration success.",
                    jwt,
                    user.getId(),
                    user.getEmail()));
        }

        PublicKeyCredentialCreationOptions options = challengeCache.getIfPresent(email);
        challengeCache.invalidate(email); // Invalidate immediately

        if (options == null) {
            logger.warn("No registration challenge found or challenge expired for email: {}", email);
            RegistrationFinishResponse errorResponse = new RegistrationFinishResponse(
                    false,
                    "No registration challenge found or challenge expired. Please start over.",
                    null, null, email);
            return ResponseEntity.badRequest().body(errorResponse);
        }

        RegistrationFinishResponse serviceResponse = webAuthnService.finishRegistrationFlow(
                finishRequest.getEmail(),
                finishRequest.getCredential(),
                options);

        if (serviceResponse.isSuccess()) {
            logger.info("Passkey registration and login successful for: {}", email);
            return ResponseEntity.ok(serviceResponse);
        } else {
            logger.warn("Passkey registration or subsequent login failed for: {}. Reason: {}", email,
                    serviceResponse.getMessage());
            // serviceResponse already contains success=false and the message
            return ResponseEntity.badRequest().body(serviceResponse);
        }
    }

    // === PASSKEY AUTHENTICATION ENDPOINTS ===
    
    /**
     * Start passkey authentication - NO EMAIL REQUIRED!
     * Uses discoverable credentials to identify the user from the passkey itself
     */
    @PostMapping("/authenticate/start")
    public ResponseEntity<?> startAuthentication(HttpServletRequest request) {
        logger.info("Starting usernameless passkey authentication");
        String origin = request.getHeader("Origin");
        logger.info("Authentication request from ORIGIN: {}", origin);
        
        try {
            PublicKeyCredentialRequestOptions options = webAuthnService.startAuthenticationFlow();
            
            // Generate a temporary session ID to cache the challenge
            String sessionId = java.util.UUID.randomUUID().toString();
            authChallengeCache.put(sessionId, options);
            
            logger.info("Authentication challenge generated and cached with session ID: {}", sessionId);
            
            // Return both the options and session ID to frontend
            return ResponseEntity.ok(Map.of(
                "requestOptions", objectMapper.writeValueAsString(options),
                "sessionId", sessionId
            ));
            
        } catch (JsonProcessingException e) {
            logger.error("Failed to serialize authentication options to JSON: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error generating authentication options.");
        } catch (Exception e) {
            logger.error("Unexpected error during authentication start: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Authentication start failed.");
        }
    }

    /**
     * Finish passkey authentication - discovers user from passkey response
     */
    @PostMapping("/authenticate/finish")
    public ResponseEntity<?> finishAuthentication(@RequestBody Map<String, Object> request) {
        String sessionId = (String) request.get("sessionId");
        JsonNode credentialResponse = (JsonNode) request.get("credential");
        
        logger.info("Processing passkey authentication finish for session: {}", sessionId);
        
        if (sessionId == null || credentialResponse == null) {
            return ResponseEntity.badRequest().body("Missing sessionId or credential");
        }
        
        // Get original challenge from cache
        PublicKeyCredentialRequestOptions originalOptions = authChallengeCache.getIfPresent(sessionId);
        authChallengeCache.invalidate(sessionId); // Invalidate immediately
        
        if (originalOptions == null) {
            logger.warn("No authentication challenge found for session: {}", sessionId);
            return ResponseEntity.badRequest().body("Authentication challenge expired or not found");
        }
        
        try {
            // Convert PublicKeyCredentialRequestOptions to AssertionRequest
            com.yubico.webauthn.AssertionRequest assertionRequest =
                com.investingapp.backend.util.WebAuthnConversionUtil.toAssertionRequest(originalOptions);
            WebAuthnService.AuthenticationFinishResponse serviceResponse = 
                webAuthnService.finishAuthenticationFlow(credentialResponse, assertionRequest);
            
            if (serviceResponse.isSuccess()) {
                logger.info("Passkey authentication successful for user: {}", serviceResponse.getEmail());
                return ResponseEntity.ok(serviceResponse);
            } else {
                logger.warn("Passkey authentication failed: {}", serviceResponse.getMessage());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(serviceResponse);
            }
            
        } catch (Exception e) {
            logger.error("Unexpected error during authentication finish: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Authentication finish failed");
        }
    }
}