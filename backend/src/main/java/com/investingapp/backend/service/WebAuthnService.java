// src/main/java/com/investingapp/backend/service/WebAuthnService.java
package com.investingapp.backend.service;

import com.investingapp.backend.model.PasskeyCredential;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.PasskeyCredentialRepository;
import com.investingapp.backend.repository.UserRepository;

import com.yubico.webauthn.AssertionRequest;
import com.yubico.webauthn.AssertionResult;
import com.yubico.webauthn.CredentialRepository;
import com.yubico.webauthn.FinishAssertionOptions;
import com.yubico.webauthn.FinishRegistrationOptions;
import com.yubico.webauthn.RegisteredCredential;
import com.yubico.webauthn.RegistrationResult;
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.StartAssertionOptions;
import com.yubico.webauthn.StartRegistrationOptions;
import com.yubico.webauthn.data.AttestationConveyancePreference; // For attestation preference
import com.yubico.webauthn.data.AuthenticatorAssertionResponse;
import com.yubico.webauthn.data.AuthenticatorAttestationResponse;
import com.yubico.webauthn.data.AuthenticatorSelectionCriteria;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.ClientRegistrationExtensionOutputs; // This should exist
import com.yubico.webauthn.data.PublicKeyCredential;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import com.yubico.webauthn.data.UserIdentity;
import com.yubico.webauthn.data.UserVerificationRequirement;
import com.yubico.webauthn.data.ResidentKeyRequirement; // For discoverable credentials
import com.yubico.webauthn.exception.AssertionFailedException;
import com.yubico.webauthn.exception.RegistrationFailedException;
import com.yubico.webauthn.extension. algumas. algumas.data.AuthenticationExtensionsClientOutputs; // This is the correct one from the library for assertion extensions

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Collection;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class WebAuthnService implements CredentialRepository {

    private static final Logger logger = LoggerFactory.getLogger(WebAuthnService.class);
    private final SecureRandom random = new SecureRandom();

    private final RelyingParty relyingParty; // This will be configured with this CredentialRepository
    private final UserRepository userRepository;
    private final PasskeyCredentialRepository passkeyCredentialRepository;

    @Autowired
    public WebAuthnService(RelyingParty relyingParty, UserRepository userRepository, PasskeyCredentialRepository passkeyCredentialRepository) {
        this.relyingParty = relyingParty;
        this.userRepository = userRepository;
        this.passkeyCredentialRepository = passkeyCredentialRepository;
    }

    // --- Passkey Registration Start ---
    public PublicKeyCredentialCreationOptions startRegistrationFlow(String email, String displayName) {
        logger.info("Starting passkey registration flow for email: {}", email);
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User(displayName, "", email); // Assuming displayName is firstName
            byte[] handleBytes = new byte[16];
            random.nextBytes(handleBytes);
            newUser.setUserHandle(Base64.getUrlEncoder().withoutPadding().encodeToString(handleBytes));
            return userRepository.save(newUser);
        });

        if (user.getUserHandle() == null || user.getUserHandle().isEmpty()) {
            byte[] handleBytes = new byte[16];
            random.nextBytes(handleBytes);
            user.setUserHandle(Base64.getUrlEncoder().withoutPadding().encodeToString(handleBytes));
            user = userRepository.save(user);
        }

        UserIdentity userIdentity = UserIdentity.builder()
                .name(user.getEmail())
                .displayName(displayName)
                .id(PasskeyCredential.base64UrlToByteArray(user.getUserHandle()))
                .build();

        Set<PublicKeyCredentialDescriptor> excludeCredentials = this.getCredentialIdsForUsername(user.getEmail());

        StartRegistrationOptions registrationOptions = StartRegistrationOptions.builder()
            .user(userIdentity)
            .authenticatorSelection(AuthenticatorSelectionCriteria.builder()
                .residentKey(ResidentKeyRequirement.PREFERRED) // Crucial for passkeys (discoverable credentials)
                .userVerification(UserVerificationRequirement.PREFERRED)
                .build())
            .excludeCredentials(Optional.ofNullable(excludeCredentials.isEmpty() ? null : excludeCredentials))
            // .attestation(AttestationConveyancePreference.NONE) // Example: Be explicit about attestation preference
            .build();

        return relyingParty.startRegistration(registrationOptions);
    }

    // --- Passkey Registration Finish ---
    @Transactional
    public boolean finishRegistrationFlow(String userEmail, String registrationJsonFromClient, PublicKeyCredentialCreationOptions requestOptionsFromServer) {
        logger.info("Finishing passkey registration for email: {}", userEmail);
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RegistrationFailedException("User not found: " + userEmail));

        try {
            // For registration, the client extension output type is ClientRegistrationExtensionOutputs
            PublicKeyCredential<AuthenticatorAttestationResponse, ClientRegistrationExtensionOutputs> pkc;
            try {
                 pkc = PublicKeyCredential.parseRegistrationResponseJson(registrationJsonFromClient);
            } catch (IOException e) {
                logger.error("Could not parse registration response JSON for user {}: {}", userEmail, e.getMessage());
                throw new RegistrationFailedException("Invalid registration response format.", e);
            }

            RegistrationResult registrationResult = relyingParty.finishRegistration(FinishRegistrationOptions.builder()
                    .request(requestOptionsFromServer) // The options generated by startRegistrationFlow
                    .response(pkc)
                    .build());

            // isSuccess() is not on RegistrationResult. Success is implied if no exception.
            // We can check registrationResult.isAttestationTrusted() if relevant to our policy.

            String attestationType = registrationResult.getAttestationType()
                                        .map(com.yubico.webauthn.data.AttestationType::name) // Use fully qualified or ensure import
                                        .orElse("none");

            PasskeyCredential newCredential = new PasskeyCredential(
                    user,
                    PasskeyCredential.byteArrayToBase64Url(registrationResult.getKeyId().getId()),
                    PasskeyCredential.byteArrayToBase64Url(registrationResult.getPublicKeyCose()),
                    registrationResult.getSignatureCount(),
                    attestationType
            );
            newCredential.setFriendlyName("Passkey - " + LocalDateTime.now().withNano(0)); // Default name
            newCredential.setLastUsedDate(LocalDateTime.now());
            passkeyCredentialRepository.save(newCredential);

            logger.info("Passkey successfully registered for user {} with credential ID: {}", userEmail, newCredential.getExternalId());
            return true;

        } catch (RegistrationFailedException e) {
            logger.error("Passkey registration failed for user {}: {}", userEmail, e.getMessage(), e);
            return false;
        } catch (Exception e) { // Catch other unexpected errors
            logger.error("Unexpected error finishing passkey registration for user {}: {}", userEmail, e.getMessage(), e);
            return false;
        }
    }

    // --- Passkey Authentication Start ---
    public AssertionRequest startAuthenticationFlow(String userEmail) { // userEmail is optional for discoverable credentials
        logger.info("Starting passkey authentication, userEmail hint: {}", userEmail);

        StartAssertionOptions.Builder optionsBuilder = StartAssertionOptions.builder()
            .timeout(Optional.of(60000L)); // Timeout in milliseconds

        if (userEmail != null && !userEmail.isEmpty()) {
            optionsBuilder.username(Optional.of(userEmail));
        }
        // For passkeys (discoverable credentials), the authenticator suggests credentials for the RP ID.
        // Providing username here can help if allowCredentials list is used by the library.

        return relyingParty.startAssertion(optionsBuilder.build());
    }

    // --- Passkey Authentication Finish ---
    @Transactional
    public Optional<User> finishAuthenticationFlow(String assertionJsonFromClient, AssertionRequest requestOptionsFromServer) {
        logger.info("Finishing passkey authentication.");
        try {
            // For assertion, the client extension output type is AuthenticationExtensionsClientOutputs
            PublicKeyCredential<AuthenticatorAssertionResponse, AuthenticationExtensionsClientOutputs> pkc;
            try {
                pkc = PublicKeyCredential.parseAssertionResponseJson(assertionJsonFromClient);
            } catch (IOException e) {
                logger.error("Could not parse assertion response JSON: {}", e.getMessage());
                throw new AssertionFailedException("Invalid assertion response format.");
            }

            AssertionResult assertionResult = relyingParty.finishAssertion(FinishAssertionOptions.builder()
                    .request(requestOptionsFromServer) // The options generated by startAuthenticationFlow
                    .response(pkc)
                    .build());

            if (assertionResult.isSuccess()) { // AssertionResult DOES have isSuccess()
                ByteArray userHandle = assertionResult.getUserHandle(); // Get user handle from assertion result
                String userHandleStr = PasskeyCredential.byteArrayToBase64Url(userHandle);

                User user = userRepository.findByUserHandle(userHandleStr)
                    .orElseThrow(() -> new AssertionFailedException("User for handle " + userHandleStr + " not found."));

                String externalIdStr = PasskeyCredential.byteArrayToBase64Url(assertionResult.getCredential().getCredentialId());

                PasskeyCredential credential = passkeyCredentialRepository.findByExternalId(externalIdStr)
                    .filter(c -> c.getUser().getId().equals(user.getId())) // Ensure credential belongs to this user
                    .orElseThrow(() -> new AssertionFailedException("Authenticated credential " + externalIdStr + " not found for user " + user.getEmail()));

                credential.setSignatureCount(assertionResult.getSignatureCount()); // CRITICAL: Update signature count
                credential.setLastUsedDate(LocalDateTime.now());
                passkeyCredentialRepository.save(credential);

                logger.info("Passkey authentication successful for user: {} with credential ID: {}",
                        user.getEmail(), credential.getExternalId());
                return Optional.of(user);
            } else {
                logger.warn("Passkey authentication failed (AssertionResult.isSuccess() was false).");
                return Optional.empty();
            }
        } catch (AssertionFailedException e) {
            logger.error("Passkey assertion failed: {}", e.getMessage(), e);
            return Optional.empty();
        } catch (Exception e) { // Catch other unexpected errors
            logger.error("Unexpected error finishing passkey authentication: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }

    // --- Implementation of Yubico's CredentialRepository ---
    @Override
    public Optional<ByteArray> getUserHandleForUsername(String username) {
        logger.debug("CredentialRepository.getUserHandleForUsername for: {}", username);
        return userRepository.findByEmail(username)
            .map(user -> {
                if (user.getUserHandle() == null || user.getUserHandle().isEmpty()) {
                    logger.warn("User {} has no userHandle set.", username);
                    return null;
                }
                return PasskeyCredential.base64UrlToByteArray(user.getUserHandle());
            })
            .flatMap(Optional::ofNullable); // Ensure Optional.empty() if map returns null
    }

    @Override
    public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
        String userHandleStr = PasskeyCredential.byteArrayToBase64Url(userHandle);
        logger.debug("CredentialRepository.getUsernameForUserHandle for: {}", userHandleStr);
        return userRepository.findByUserHandle(userHandleStr).map(User::getEmail);
    }

    @Override
    public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
        logger.debug("CredentialRepository.getCredentialIdsForUsername for: {}", username);
        return userRepository.findByEmail(username)
            .map(user -> passkeyCredentialRepository.findAllByUser(user).stream()
                    .map(cred -> PublicKeyCredentialDescriptor.builder()
                            .id(PasskeyCredential.base64UrlToByteArray(cred.getExternalId()))
                            .transports(Optional.empty()) // You can fill this if you store transports
                            .build())
                    .collect(Collectors.toSet()))
            .orElseGet(Collections::emptySet);
    }

    @Override
    public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {
        String externalId = PasskeyCredential.byteArrayToBase64Url(credentialId);
        String userHandleStr = PasskeyCredential.byteArrayToBase64Url(userHandle);
        logger.debug("CredentialRepository.lookup for credentialId (ext): {} and userHandle (str): {}", externalId, userHandleStr);

        return passkeyCredentialRepository.findByExternalId(externalId)
            .filter(cred -> userHandleStr.equals(cred.getUser().getUserHandle()))
            .map(cred -> RegisteredCredential.builder()
                    .credentialId(credentialId)
                    .userHandle(userHandle)
                    .publicKeyCose(PasskeyCredential.base64UrlToByteArray(cred.getPublicKeyCose()))
                    .signatureCount(cred.getSignatureCount())
                    .build());
    }

    @Override
    public Set<RegisteredCredential> lookupAll(ByteArray userHandle) { // Corrected signature
        String userHandleStr = PasskeyCredential.byteArrayToBase64Url(userHandle);
        logger.debug("CredentialRepository.lookupAll for userHandle (str): {}", userHandleStr);

        return userRepository.findByUserHandle(userHandleStr)
                .map(user -> passkeyCredentialRepository.findAllByUser(user).stream()
                        .map(cred -> RegisteredCredential.builder()
                                .credentialId(PasskeyCredential.base64UrlToByteArray(cred.getExternalId()))
                                .userHandle(userHandle) // use the passed userHandle
                                .publicKeyCose(PasskeyCredential.base64UrlToByteArray(cred.getPublicKeyCose()))
                                .signatureCount(cred.getSignatureCount())
                                .build())
                        .collect(Collectors.toSet()))
                .orElseGet(Collections::emptySet);
    }
}