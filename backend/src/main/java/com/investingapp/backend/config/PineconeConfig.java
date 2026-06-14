package com.investingapp.backend.config;

import io.pinecone.clients.Pinecone;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!ci") // Skip the real Pinecone client in CI (offline boot). A ci stub bean is provided in CiStubConfig.
public class PineconeConfig {

    @Value("${pinecone.api-key}")
    private String apiKey;

    @Bean
    public Pinecone pineconeClient() {
        return new Pinecone.Builder(apiKey).build();
    }
}
