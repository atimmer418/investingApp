package com.investingapp.backend.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.github.benmanes.caffeine.cache.Cache; // <-- IMPORT CACHE
import com.investingapp.backend.dto.RegistrationFinishRequest;
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
@CrossOrigin(origins = "*") // No need for allowCredentials with this stateless setup
public class WebAuthnController {

    private static final Logger logger = LoggerFactory.getLogger(WebAuthnController.class);

    private final WebAuthnService webAuthnService;
    private final Cache<String, PublicKeyCredentialCreationOptions> challengeCache;

    @Autowired
    public WebAuthnController(WebAuthnService webAuthnService, Cache<String, PublicKeyCredentialCreationOptions> challengeCache) {
        this.webAuthnService = webAuthnService;
        this.challengeCache = challengeCache;
    }

    @PostMapping("/register/start")
    public ResponseEntity<?> startRegistration(@Valid @RequestBody RegistrationStartRequest registrationRequest, HttpServletRequest request) {
        logger.info("Received passkey registration start request for email: {}", registrationRequest.getEmail());

        String origin = request.getHeader("Origin");
        logger.info("Received request from ORIGIN: {}", origin);
        try {
            PublicKeyCredentialCreationOptions options = webAuthnService.startRegistrationFlow(
                    registrationRequest.getEmail(),
                    registrationRequest.getTemporaryUserId()
            );

            // Store the challenge in the cache, keyed by the user's email.
            challengeCache.put(registrationRequest.getEmail(), options);
            logger.info("Registration options stored in cache for user: {}", registrationRequest.getEmail());

            return ResponseEntity.ok(new RegistrationStartResponse(options.toJson()));

        } catch (JsonProcessingException e) {
            logger.error("Failed to serialize options to JSON for user: {}", registrationRequest.getEmail(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error generating registration options.");
        }
    }

    @PostMapping("/register/finish")
    public ResponseEntity<String> finishRegistration(@Valid @RequestBody RegistrationFinishRequest finishRequest) {
        logger.info("Received passkey registration finish request for email: {}", finishRequest.getEmail());
        String email = finishRequest.getEmail();

        // Retrieve the challenge from the cache.
        PublicKeyCredentialCreationOptions options = challengeCache.getIfPresent(email);

        // Invalidate the cache entry immediately to prevent reuse.
        challengeCache.invalidate(email);

        if (options == null) {
            return ResponseEntity.badRequest().body("No registration challenge found or challenge expired. Please start over.");
        }

        boolean success = webAuthnService.finishRegistrationFlow(
                finishRequest.getEmail(),
                finishRequest.getCredential(),
                options
        );

        if (success) {
            logger.info("Passkey registration successfully completed for: {}", email);
            return ResponseEntity.ok("Registration successful.");
        } else {
            logger.warn("Passkey registration failed for: {}", email);
            return ResponseEntity.badRequest().body("Registration failed. Please try again.");
        }
    }
}