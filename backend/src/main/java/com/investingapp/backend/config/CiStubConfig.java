package com.investingapp.backend.config;

import com.plaid.client.ApiClient;
import com.plaid.client.request.PlaidApi;
import io.pinecone.clients.Pinecone;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.util.HashMap;
import java.util.Map;

/**
 * CI-profile stub beans for boot-time external clients.
 *
 * The real {@link PineconeConfig} and {@link PlaidConfig} are annotated
 * {@code @Profile("!ci")}, so they do not load under the {@code ci} profile.
 * However several services ({@code RAGService}, {@code PlaidService},
 * {@code PlaidToAlpacaService}) @Autowire the {@link Pinecone} and
 * {@link PlaidApi} bean types unconditionally. Without a bean of each type the
 * application context would fail to wire under {@code ci}.
 *
 * These stubs construct entirely offline:
 *   - {@code Pinecone.Builder.build()} only configures an OkHttp/ApiClient and a
 *     ManageIndexesApi; it performs NO network call at construction.
 *   - {@code apiClient.createService(PlaidApi.class)} returns a Retrofit proxy;
 *     no network call at construction.
 *
 * They are wired so the context starts, but are pointed at disabled/dummy
 * credentials — any actual call at runtime fails fast rather than reaching a
 * real endpoint. (RAGService's ApplicationReadyEvent bootstrap is already
 * wrapped in try/catch, so a failed call there does not crash boot.)
 */
@Configuration
@Profile("ci")
public class CiStubConfig {

    private static final Logger logger = LoggerFactory.getLogger(CiStubConfig.class);

    /**
     * Offline stub Pinecone client so RAGService can wire under the ci profile.
     */
    @Bean
    public Pinecone pineconeClient() {
        logger.info("[CI] Providing stub Pinecone client (offline; no network at boot).");
        return new Pinecone.Builder("ci-disabled").build();
    }

    /**
     * Offline stub PlaidApi (Retrofit proxy) so PlaidService /
     * PlaidToAlpacaService can wire under the ci profile.
     */
    @Bean
    public PlaidApi plaidApi() {
        logger.info("[CI] Providing stub PlaidApi client (offline; no network at boot).");
        Map<String, String> authCredentials = new HashMap<>();
        authCredentials.put("clientId", "ci-disabled");
        authCredentials.put("secret", "ci-disabled");
        ApiClient apiClient = new ApiClient(authCredentials);
        apiClient.setPlaidAdapter(ApiClient.Sandbox);
        return apiClient.createService(PlaidApi.class);
    }
}
