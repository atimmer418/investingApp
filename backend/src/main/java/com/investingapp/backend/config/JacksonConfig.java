package com.investingapp.backend.config;

import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Jackson configuration to handle Java 8 Optional types and time types
 * Required for WebAuthn library which uses Optional<Long> in PublicKeyCredentialRequestOptions
 * and for DTOs that use LocalDate, LocalDateTime, etc.
 */
@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        return JsonMapper.builder()
                .addModule(new Jdk8Module())
                .addModule(new JavaTimeModule())
                .disable(MapperFeature.REQUIRE_HANDLERS_FOR_JAVA8_OPTIONALS)
                .build();
    }
}
