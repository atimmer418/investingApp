// src/main/java/com/investingapp/backend/service/WebAuthnService.java
package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.investingapp.backend.model.PasskeyCredential;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.PasskeyCredentialRepository;
import com.investingapp.backend.repository.UserRepository;
import com.yubico.webauthn.*;
import com.yubico.webauthn.data.*;
import com.yubico.webauthn.exception.RegistrationFailedException;
import com.yubico.webauthn.exception.AssertionFailedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

// This service NO LONGER implements CredentialRepository
@Service
public class WebAuthnService {

    private static final Logger logger = LoggerFactory.getLogger(WebAuthnService.class);
    private final SecureRandom random = new SecureRandom();

    private final RelyingParty relyingParty;
    private final UserRepository userRepository;
    private final PasskeyCredentialRepository passkeyCredentialRepository;

    @Autowired
    public WebAuthnService(RelyingParty relyingParty, UserRepository userRepository, PasskeyCredentialRepository passkeyCredentialRepository) {
        this.relyingParty = relyingParty;
        this.userRepository = userRepository;
        this.passkeyCredentialRepository = passkeyCredentialRepository;
    }

    /**
     * Starts the passkey registration flow.
     * Your controller will call this method.
     * The PublicKeyCredentialCreationOptions MUST be stored in the user's session temporarily.
     */
    @Transactional
    public PublicKeyCredentialCreationOptions startRegistrationFlow(String email, String temporaryPlaidUserId) {
        logger.info("Starting passkey registration for email: {}", email);

        // Find user or create a new one. This is where you create the user object right after Plaid linking.
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            logger.info("User with email {} not found, creating a new user.", email);
            User newUser = new User(email); // Use constructor that only takes email
            
            // Generate a persistent, unique, and non-PII handle for this user for WebAuthn
            byte[] handleBytes = new byte[16];
            random.nextBytes(handleBytes);
            newUser.setUserHandle(Base64.getUrlEncoder().withoutPadding().encodeToString(handleBytes));
            
            // At this point, the user is new. Link the Plaid temporary ID.
            // In a real app, you would fetch the real Plaid access_token using this temp ID and store it.
            // For now, we'll just mark the user as linked.
            // IMPORTANT: You should encrypt the real Plaid access token in your database.
            newUser.setPlaidItemId(temporaryPlaidUserId); // Or whatever mapping you use
            newUser.setPlaidLinked(true);

            return userRepository.save(newUser);
        });

        // Ensure existing users have a user handle if they were created before this logic was added
        if (user.getUserHandle() == null || user.getUserHandle().isEmpty()) {
            byte[] handleBytes = new byte[16];
            random.nextBytes(handleBytes);
            user.setUserHandle(Base64.getUrlEncoder().withoutPadding().encodeToString(handleBytes));
            user = userRepository.save(user);
        }

        UserIdentity userIdentity = UserIdentity.builder()
                .name(user.getEmail())
                .displayName(user.getEmail()) // Display name can be the email
                .id(PasskeyCredential.base64UrlToByteArray(user.getUserHandle()))
                .build();

        StartRegistrationOptions registrationOptions = StartRegistrationOptions.builder()
            .user(userIdentity)
            .authenticatorSelection(AuthenticatorSelectionCriteria.builder()
                .residentKey(ResidentKeyRequirement.PREFERRED) // Essential for passkeys
                .userVerification(UserVerificationRequirement.PREFERRED)
                .build())
            .build();

        // The returned options object must be stored server-side (e.g., in HttpSession)
        // to be retrieved in the finishRegistrationFlow step.
        return relyingParty.startRegistration(registrationOptions);
    }

    /**
     * Finishes the passkey registration flow.
     * Your controller will call this method.
     */
    @Transactional
    public boolean finishRegistrationFlow(String userEmail, JsonNode registrationJsonFromClient, PublicKeyCredentialCreationOptions requestOptionsFromServer) {
        logger.info("Finishing passkey registration for email: {}", userEmail);

        // THE FIX: The entire flow, including the user lookup, is now inside the try-catch block.
        try {
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RegistrationFailedException(new IllegalArgumentException("User not found during finish flow: " + userEmail)));

            PublicKeyCredential<AuthenticatorAttestationResponse, ClientRegistrationExtensionOutputs> pkc =
                PublicKeyCredential.parseRegistrationResponseJson(registrationJsonFromClient.toString());

            RegistrationResult registrationResult = relyingParty.finishRegistration(FinishRegistrationOptions.builder()
                    .request(requestOptionsFromServer)
                    .response(pkc)
                    .build());

            PasskeyCredential newCredential = new PasskeyCredential(
                    user,
                    PasskeyCredential.byteArrayToBase64Url(registrationResult.getKeyId().getId()),
                    PasskeyCredential.byteArrayToBase64Url(registrationResult.getPublicKeyCose()),
                    registrationResult.getSignatureCount(),
                    "public-key"
            );
            
            newCredential.setFriendlyName("Passkey - " + LocalDateTime.now().withNano(0));
            newCredential.setLastUsedDate(LocalDateTime.now());
            passkeyCredentialRepository.save(newCredential);

            logger.info("Passkey successfully registered for user {} with credential ID: {}", userEmail, newCredential.getExternalId());
            return true;

        } catch (RegistrationFailedException | IOException e) {
            // This block now correctly catches failures from user lookup or from the Yubico library.
            logger.error("Passkey registration failed for user {}: {}", userEmail, e.getMessage());
            // It's helpful to log the full stack trace for debugging when a registration truly fails.
            // logger.error("Detailed registration failure", e); 
            return false;
        }
    }

    // --- Authentication methods would go here, following the same pattern ---
}