// src/main/java/com/investingapp/backend/service/WebAuthnService.java
package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.investingapp.backend.dto.RegistrationFinishResponse;
import com.investingapp.backend.model.PasskeyCredential;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.PasskeyCredentialRepository;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.jwt.JwtUtils;
import com.investingapp.backend.security.services.UserDetailsServiceImpl;
import com.yubico.webauthn.*;
import com.yubico.webauthn.data.*;
import com.yubico.webauthn.exception.AssertionFailedException;
import com.yubico.webauthn.exception.RegistrationFailedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class WebAuthnService {

    private static final Logger logger = LoggerFactory.getLogger(WebAuthnService.class);
    private final SecureRandom random = new SecureRandom();

    private final RelyingParty relyingParty;
    private final UserRepository userRepository;
    private final PasskeyCredentialRepository passkeyCredentialRepository;
    private final JwtUtils jwtUtils;
    private final UserDetailsServiceImpl userDetailsService;
    private final PlaidService plaidService;
    private final EncryptionService encryptionService;

    @Autowired
    public WebAuthnService(RelyingParty relyingParty,
                           UserRepository userRepository,
                           PasskeyCredentialRepository passkeyCredentialRepository,
                           JwtUtils jwtUtils,
                           UserDetailsServiceImpl userDetailsService,
                           PlaidService plaidService,
                           EncryptionService encryptionService) {
        this.relyingParty = relyingParty;
        this.userRepository = userRepository;
        this.passkeyCredentialRepository = passkeyCredentialRepository;
        this.jwtUtils = jwtUtils;
        this.userDetailsService = userDetailsService;
        this.plaidService = plaidService;
        this.encryptionService = encryptionService;
    }

    @Transactional
    public PublicKeyCredentialCreationOptions startRegistrationFlow(String email, String planId, String timeToFI, Double targetPortfolio, Double retirementIncome, Double monthlyInvestment) {
        logger.info("Starting passkey registration for email: {}, planId: {}, timeToFI: {}, targetPortfolio: {}, retirementIncome: {}, monthlyInvestment: {}", email, planId, timeToFI, targetPortfolio, retirementIncome, monthlyInvestment);

        // Check if user already exists
        if (userRepository.findByEmail(email).isPresent()) {
            logger.warn("Registration attempt failed - email already exists: {}", email);
            throw new IllegalArgumentException("Email is already taken");
        }
        
        // Create new user since email is available
        logger.info("Email available, creating new user for: {}", email);
        User user = new User(email);
        
        // Generate user handle
        byte[] handleBytes = new byte[16];
        random.nextBytes(handleBytes);
        user.setUserHandle(Base64.getUrlEncoder().withoutPadding().encodeToString(handleBytes));
        
        // Store FI plan data (add these fields to your User model)
        user.setPlanId(planId);
        user.setTimeToFI(timeToFI);
        user.setTargetPortfolio(targetPortfolio);
        user.setRetirementIncome(retirementIncome);
        user.setMonthlyInvestment(monthlyInvestment);
        
        user = userRepository.save(user);
        logger.info("New user created successfully for email: {}", email);

        UserIdentity userIdentity = UserIdentity.builder()
                .name(user.getEmail())
                .displayName(user.getEmail())
                .id(PasskeyCredential.base64UrlToByteArray(user.getUserHandle()))
                .build();

        StartRegistrationOptions optionsToPassToRp = StartRegistrationOptions.builder()
            .user(userIdentity)
            .authenticatorSelection(AuthenticatorSelectionCriteria.builder()
                .residentKey(ResidentKeyRequirement.PREFERRED)
                .userVerification(UserVerificationRequirement.PREFERRED)
                .build())
            .build();
        
        return relyingParty.startRegistration(optionsToPassToRp);
    }

    @Transactional
    public RegistrationFinishResponse finishRegistrationFlow(String userEmail, JsonNode registrationJsonFromClient, PublicKeyCredentialCreationOptions requestOptionsFromServer) {
        logger.info("Finishing passkey registration for email: {}", userEmail);
        RegistrationResult registrationResult; 

        try {
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RegistrationFailedException(new IllegalArgumentException("User not found during finish flow: " + userEmail)));

            PublicKeyCredential<AuthenticatorAttestationResponse, ClientRegistrationExtensionOutputs> pkc =
                PublicKeyCredential.parseRegistrationResponseJson(registrationJsonFromClient.toString());

            // If relyingParty.finishRegistration() completes without throwing an exception,
            // the cryptographic checks and registration process are considered successful by the Yubico library.
            registrationResult = relyingParty.finishRegistration(FinishRegistrationOptions.builder()
                    .request(requestOptionsFromServer)
                    .response(pkc)
                    .build());

            // --- If we reach here, Yubico library considers the registration successful. ---
            // The RegistrationResult object now contains details of the *successful* registration.
            // No need to check an "isSuccess()" method on registrationResult for this primary success determination.
            // The fact that no exception was thrown is the key indicator from the Yubico library.

            PasskeyCredential newCredential = new PasskeyCredential(
                    user,
                    PasskeyCredential.byteArrayToBase64Url(registrationResult.getKeyId().getId()),
                    PasskeyCredential.byteArrayToBase64Url(registrationResult.getPublicKeyCose()),
                    registrationResult.getSignatureCount(),
                    "public-key" // Type or description
            );
            newCredential.setFriendlyName("Passkey - " + LocalDateTime.now().withNano(0));
            newCredential.setLastUsedDate(LocalDateTime.now());
            passkeyCredentialRepository.save(newCredential);
            logger.info("Passkey successfully registered for user {} with credential ID: {}", userEmail, newCredential.getExternalId());

            // --- User is registered with passkey, now generate JWT ---
            UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);
            logger.info("User {} authenticated via passkey registration and set in SecurityContext.", userEmail);

            String jwt = jwtUtils.generateJwtToken(authentication);
            logger.info("JWT generated for user {}.", userEmail);

            return new RegistrationFinishResponse(
                    true, // Success is true because no exception was thrown and we saved the credential
                    "Passkey registration successful. User logged in.",
                    jwt,
                    user.getId(),
                    user.getEmail()
            );

        } catch (RegistrationFailedException | IOException e) {
            // This catches exceptions from relyingParty.finishRegistration(), JSON parsing, or user not found.
            logger.error("Passkey registration failed for user {}: {}", userEmail, e.getMessage(), e);
            // Optionally, you could provide more specific error messages based on the exception type if needed.
            return new RegistrationFinishResponse(false, "Passkey registration failed: " + e.getMessage(), null, null, userEmail);
        } catch (Exception e) { // Catch any other unexpected errors during the process
            logger.error("Unexpected error during passkey registration finish for user {}: {}", userEmail, e.getMessage(), e);
            return new RegistrationFinishResponse(false, "An unexpected error occurred during registration.", null, null, userEmail);
        }
    }

    /**
     * Start authentication flow - NO EMAIL REQUIRED!
     * WebAuthn with discoverable credentials can identify the user from the passkey itself
     */
    public PublicKeyCredentialRequestOptions startAuthenticationFlow() {
        logger.info("Starting usernameless passkey authentication flow");
        
        StartAssertionOptions options = StartAssertionOptions.builder()
            .userVerification(UserVerificationRequirement.PREFERRED)
            // No allowCredentials - this enables usernameless/discoverable credential authentication
            .build();
            
        AssertionRequest assertionRequest = relyingParty.startAssertion(options);
        PublicKeyCredentialRequestOptions requestOptions = assertionRequest.getPublicKeyCredentialRequestOptions();
        logger.info("Authentication challenge generated for usernameless login");
        
        return requestOptions;
    }

    /**
     * Finish authentication flow - discovers user from passkey response
     */
    @Transactional
    public AuthenticationFinishResponse finishAuthenticationFlow(JsonNode credentialResponse, AssertionRequest originalRequestOptions) {
        logger.info("Processing passkey authentication finish");
        
        try {
            PublicKeyCredential<AuthenticatorAssertionResponse, ClientAssertionExtensionOutputs> credential =
                PublicKeyCredential.parseAssertionResponseJson(credentialResponse.toString());
            
            FinishAssertionOptions options = FinishAssertionOptions.builder()
                .request(originalRequestOptions)
                .response(credential)
                .build();
            
            AssertionResult result = relyingParty.finishAssertion(options);
            
            if (result.isSuccess()) {
                // Get user handle from the assertion to identify the user
                ByteArray userHandle = result.getUserHandle();
                String userHandleStr = userHandle.getBase64Url();
                
                logger.info("Passkey authentication successful for user handle: {}", userHandleStr);
                
                // Find user by userHandle
                User user = userRepository.findByUserHandle(userHandleStr).orElse(null);
                if (user == null) {
                    logger.warn("User not found for user handle: {}", userHandleStr);
                    return new AuthenticationFinishResponse(false, "User not found", null, null, null);
                }
                
                logger.info("User identified from passkey: {}", user.getEmail());
                
                // Create authentication and set in security context
                UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                // Generate JWT token
                String jwt = jwtUtils.generateJwtToken(authentication);
                logger.info("JWT generated for authenticated user: {}", user.getEmail());
                
                return new AuthenticationFinishResponse(
                    true,
                    "Passkey authentication successful",
                    jwt,
                    user.getId(),
                    user.getEmail()
                );
                
            } else {
                logger.warn("Passkey authentication failed - assertion verification failed");
                return new AuthenticationFinishResponse(false, "Authentication failed", null, null, null);
            }
            
        } catch (AssertionFailedException e) {
            logger.error("Passkey authentication failed: {}", e.getMessage(), e);
            return new AuthenticationFinishResponse(false, "Authentication failed: " + e.getMessage(), null, null, null);
        } catch (Exception e) {
            logger.error("Unexpected error during passkey authentication: {}", e.getMessage(), e);
            return new AuthenticationFinishResponse(false, "An unexpected error occurred", null, null, null);
        }
    }
    
    /**
     * Response class for authentication finish
     */
    public static class AuthenticationFinishResponse {
        private boolean success;
        private String message;
        private String jwtToken;
        private Long userId;
        private String email;
        
        public AuthenticationFinishResponse(boolean success, String message, String jwtToken, Long userId, String email) {
            this.success = success;
            this.message = message;
            this.jwtToken = jwtToken;
            this.userId = userId;
            this.email = email;
        }
        
        // Getters
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public String getJwtToken() { return jwtToken; }
        public Long getUserId() { return userId; }
        public String getEmail() { return email; }
    }
}