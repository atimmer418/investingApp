// src/main/java/com/investingapp/backend/service/WebAuthnService.java
package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.investingapp.backend.dto.RegistrationFinishResponse;
import com.investingapp.backend.model.PasskeyCredential;
import com.investingapp.backend.model.PendingPlaidConnection;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.PasskeyCredentialRepository;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.jwt.JwtUtils;
import com.investingapp.backend.security.services.UserDetailsServiceImpl;
import com.yubico.webauthn.*;
import com.yubico.webauthn.data.*;
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
    public PublicKeyCredentialCreationOptions startRegistrationFlow(String email, String temporaryPlaidUserIdFromClient) {
        logger.info("Starting passkey registration for email: {}, temporaryPlaidUserIdFromClient: {}", email, temporaryPlaidUserIdFromClient);

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            logger.info("User with email {} not found, creating a new user.", email);
            User newUser = new User(email); // Assumes User constructor takes email
            byte[] handleBytes = new byte[16];
            random.nextBytes(handleBytes);
            newUser.setUserHandle(Base64.getUrlEncoder().withoutPadding().encodeToString(handleBytes));

            // --- Link Plaid connection using PendingPlaidConnection ---
            if (temporaryPlaidUserIdFromClient != null && !temporaryPlaidUserIdFromClient.isEmpty()) {
                PendingPlaidConnection pendingConnection = plaidService.retrieveAndRemovePendingConnection(temporaryPlaidUserIdFromClient);
                if (pendingConnection != null) {
                    logger.info("Associating pending Plaid connection (Item ID: {}) with new user (Email: {}) during passkey registration start.",
                                pendingConnection.getPlaidItemId(), newUser.getEmail());
                    
                    String rawPlaidAccessToken = pendingConnection.getPlaidAccessToken(); // Assumes this is raw/decrypted from PlaidService
                    
                    newUser.setPlaidAccessToken(encryptionService.encrypt(rawPlaidAccessToken)); // Encrypt for User entity
                    newUser.setPlaidItemId(pendingConnection.getPlaidItemId());
                    newUser.setPlaidLinked(true);
                    logger.info("Plaid info linked to new user {}.", newUser.getEmail());
                } else {
                    logger.warn("No valid pending Plaid connection found for temporary ID: {} during passkey registration start for new user {}.",
                                temporaryPlaidUserIdFromClient, newUser.getEmail());
                }
            }
            return userRepository.save(newUser);
        });

        // Ensure existing users or newly created user has a user handle
        if (user.getUserHandle() == null || user.getUserHandle().isEmpty()) {
            byte[] handleBytes = new byte[16];
            random.nextBytes(handleBytes);
            user.setUserHandle(Base64.getUrlEncoder().withoutPadding().encodeToString(handleBytes));
            user = userRepository.save(user); 
        }

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
    public RegistrationFinishResponse finishRegistrationFlow(String userEmail, JsonNode registrationJsonFromClient, String temporaryUserId, PublicKeyCredentialCreationOptions requestOptionsFromServer) {
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
}