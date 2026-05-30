package com.investingapp.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

@Service
public class LLMService {

    private static final Logger logger = LoggerFactory.getLogger(LLMService.class);
    private final RestClient restClient;

    @Value("${openai.api-key}")
    private String apiKey;

    @Value("${openai.chat-model:gpt-4o}")
    private String chatModel;

    @Value("${openai.embedding-model:text-embedding-3-large}")
    private String embeddingModel;

    public LLMService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder
                .baseUrl("https://api.openai.com/v1")
                .build();
    }

    public List<Float> getEmbedding(String text) {
        // Flatten newlines as recommended for embeddings
        String cleanText = text.replace("\n", " ");

        var request = Map.of(
                "model", embeddingModel,
                "input", cleanText);

        logger.debug("Generating embedding for text: {}",
                cleanText.substring(0, Math.min(cleanText.length(), 50)) + "...");

        EmbeddingResponse response = restClient.post()
                .uri("/embeddings")
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(EmbeddingResponse.class);

        if (response == null || response.data() == null || response.data().isEmpty()) {
            throw new RuntimeException("Failed to generate embedding");
        }

        return response.data().get(0).embedding();
    }

    public String generateChatResponse(List<ChatMessage> messages) {
        var request = Map.of(
                "model", chatModel,
                "messages", messages,
                "temperature", 0.0 // Deterministic output
        );

        ChatCompletionResponse response = restClient.post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(ChatCompletionResponse.class);

        if (response == null || response.choices() == null || response.choices().isEmpty()) {
            throw new RuntimeException("Failed to generate chat response");
        }

        return response.choices().get(0).message().content();
    }

    public void streamChatResponse(List<ChatMessage> messages, Consumer<String> tokenCallback) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        String bodyJson = mapper.writeValueAsString(Map.of(
                "model", chatModel,
                "messages", messages,
                "stream", true,
                "temperature", 0.0
        ));

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(java.net.URI.create("https://api.openai.com/v1/chat/completions"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();

        HttpResponse<java.io.InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.startsWith("data: ")) continue;
                String data = line.substring(6).trim();
                if ("[DONE]".equals(data)) break;
                try {
                    JsonNode node = mapper.readTree(data);
                    JsonNode content = node.at("/choices/0/delta/content");
                    if (!content.isMissingNode() && !content.isNull()) {
                        tokenCallback.accept(content.asText());
                    }
                } catch (Exception ignored) { /* skip malformed lines */ }
            }
        }
    }

    // DTOs
    public record ChatMessage(String role, String content) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record EmbeddingResponse(List<EmbeddingData> data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record EmbeddingData(List<Float> embedding) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatCompletionResponse(List<Choice> choices) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Choice(Message message) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Message(String content) {
    }
}
