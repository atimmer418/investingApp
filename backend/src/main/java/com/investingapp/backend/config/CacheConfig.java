package com.investingapp.backend.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Bean
    public Cache<String, PublicKeyCredentialCreationOptions> challengeCache() {
        // This cache will store the registration challenge options.
        // The key will be the user's email.
        // Entries will be automatically removed 5 minutes after they are written.
        return Caffeine.newBuilder()
                .expireAfterWrite(5, TimeUnit.MINUTES)
                .maximumSize(1000) // Max 1000 outstanding registration attempts
                .build();
    }
}