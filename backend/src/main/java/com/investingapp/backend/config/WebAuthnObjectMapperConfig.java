package com.investingapp.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.yubico.webauthn.RelyingParty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.lang.reflect.Field;

/**
 * Configuration to ensure WebAuthn RelyingParty uses properly configured ObjectMapper
 * This addresses the issue where WebAuthn library fails to serialize Optional<Long> types
 */
@Configuration
public class WebAuthnObjectMapperConfig {

    @Autowired
    private RelyingParty relyingParty;

    @Autowired
    private ObjectMapper objectMapper;

    @PostConstruct
    public void configureWebAuthnObjectMapper() {
        try {
            // Ensure our ObjectMapper has the required modules
            objectMapper.registerModule(new Jdk8Module());
            objectMapper.registerModule(new JavaTimeModule());
            
            // Use reflection to set the ObjectMapper in RelyingParty if possible
            Field[] fields = RelyingParty.class.getDeclaredFields();
            for (Field field : fields) {
                if (field.getType().equals(ObjectMapper.class)) {
                    field.setAccessible(true);
                    field.set(relyingParty, objectMapper);
                    break;
                }
            }
        } catch (Exception e) {
            // Log the error but don't fail startup
            System.err.println("Warning: Could not configure WebAuthn ObjectMapper: " + e.getMessage());
        }
    }
}
