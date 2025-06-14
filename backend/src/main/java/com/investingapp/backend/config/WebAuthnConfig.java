// src/main/java/com/investingapp/backend/config/WebAuthnConfig.java
package com.investingapp.backend.config;

import com.investingapp.backend.service.WebAuthnService; // You'll need to inject this
import com.yubico.webauthn.CredentialRepository; // Import this
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.data.RelyingPartyIdentity;
import org.springframework.beans.factory.annotation.Autowired; // For injecting WebAuthnService
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy; // Import Lazy

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Configuration
public class WebAuthnConfig {

    @Value("${webauthn.relyingparty.id}")
    private String rpId;

    @Value("${webauthn.relyingparty.name}")
    private String rpName;

    @Value("${webauthn.relyingparty.origins}")
    private String rpOriginsString;

    // Inject your WebAuthnService which implements CredentialRepository
    // Use @Lazy to break potential circular dependency if WebAuthnService also needs RelyingParty
    private final CredentialRepository credentialRepository;

    @Autowired
    public WebAuthnConfig(@Lazy CredentialRepository credentialRepository) {
        this.credentialRepository = credentialRepository;
    }

    @Bean
    public RelyingParty relyingParty() {
        RelyingPartyIdentity identity = RelyingPartyIdentity.builder()
                .id(rpId)
                .name(rpName)
                .build();

        Set<String> effectiveOrigins = Arrays.stream(rpOriginsString.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());

        if (effectiveOrigins.isEmpty()) {
            // Consider throwing a configuration error in production if origins are mandatory
            effectiveOrigins.add("http://localhost:8100"); // Example development fallback
            System.err.println("Warning: webauthn.relyingparty.origins was empty or invalid, falling back to default dev origin.");
        }

        return RelyingParty.builder()
                .identity(identity)
                .credentialRepository(this.credentialRepository) // Provide your repository implementation
                .origins(effectiveOrigins) // Set origins on the main builder
                .allowUntrustedAttestation(true) // For development. Review for production.
                .allowOriginPort(true)
                // .attestationConveyancePreference(AttestationConveyancePreference.NONE) // Optional: set preference
                // .allowOriginPort(true) // If your origins include non-standard ports
                // .allowOriginSubdomain(true) // If you need to allow subdomains of your origins
                .build();
    }
}