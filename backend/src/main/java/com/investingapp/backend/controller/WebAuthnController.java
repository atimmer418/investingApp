// src/main/java/com/investingapp/backend/controller/WebAuthnController.java
package com.investingapp.backend.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.github.benmanes.caffeine.cache.Cache;

// imports below are for simulating passkey
import com.investingapp.backend.model.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.fasterxml.jackson.databind.JsonNode;

import com.investingapp.backend.dto.RegistrationFinishRequest;
import com.investingapp.backend.dto.RegistrationFinishResponse; // <-- IMPORT YOUR DTO
import com.investingapp.backend.dto.RegistrationStartRequest;
import com.investingapp.backend.dto.RegistrationStartResponse;
import com.investingapp.backend.service.WebAuthnService;
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;

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

    // these 3 injections are needed for simulating passkey registration
    @Autowired
    private UserRepository userRepository; // Your user repo interface

    @Autowired
    private UserDetailsService userDetailsService; // Usually your Spring Security user details service

    @Autowired
    private JwtUtils jwtUtils; // Your JWT utility/service class

    @Autowired
    public WebAuthnController(WebAuthnService webAuthnService,
            Cache<String, PublicKeyCredentialCreationOptions> challengeCache) {
        this.webAuthnService = webAuthnService;
        this.challengeCache = challengeCache;
    }

    @PostMapping("/register/start")
    public ResponseEntity<?> startRegistration(@Valid @RequestBody RegistrationStartRequest registrationRequest,
            HttpServletRequest request) {
        // ... (existing logic is fine) ...
        logger.info("Received passkey registration start request for email: {}", registrationRequest.getEmail());
        String origin = request.getHeader("Origin");
        logger.info("Received request from ORIGIN: {}", origin);
        try {
            PublicKeyCredentialCreationOptions options = webAuthnService.startRegistrationFlow(
                    registrationRequest.getEmail(),
                    registrationRequest.getTemporaryUserId());
            challengeCache.put(registrationRequest.getEmail(), options);
            logger.info("Registration options stored in cache for user: {}", registrationRequest.getEmail());
            return ResponseEntity.ok(new RegistrationStartResponse(options.toJson()));
        } catch (JsonProcessingException e) {
            logger.error("Failed to serialize options to JSON for user: {}", registrationRequest.getEmail(), e);
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
                finishRequest.getTemporaryUserId(),
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
}