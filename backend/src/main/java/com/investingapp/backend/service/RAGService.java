package com.investingapp.backend.service;

import com.investingapp.backend.config.FredKnowledge;
import io.pinecone.clients.Pinecone;
import io.pinecone.unsigned_indices_model.VectorWithUnsignedIndices; // Correct import
import com.google.protobuf.Struct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RAGService {

    private static final Logger logger = LoggerFactory.getLogger(RAGService.class);

    private final Pinecone pinecone;
    private final LLMService llmService;

    @Value("${pinecone.index-name}")
    private String indexName;

    @Autowired
    public RAGService(Pinecone pinecone, LLMService llmService) {
        this.pinecone = pinecone;
        this.llmService = llmService;
    }

    /**
     * Retrieves relevant chunks for a given query.
     */
    /**
     * Retrieves relevant chunks for a given query.
     */
    public List<String> retrieveChunks(String query) {
        try {
            List<Float> queryEmbedding = llmService.getEmbedding(query);

            var indexConnection = pinecone.getIndexConnection(indexName);

            // Query standard (Fetch top 10 to allow for some filtering)
            // queryByVector(int topK, List<Float> vector, boolean includeValues, boolean
            // includeMetadata)
            var response = indexConnection.queryByVector(10, queryEmbedding, false, true);

            if (response == null || response.getMatchesList() == null) {
                return Collections.emptyList();
            }

            return response.getMatchesList().stream()
                    .filter(match -> {
                        Struct metadata = match.getMetadata();
                        if (metadata == null)
                            return false;
                        // Check active flag if present (Default to true if missing for legacy
                        // compatibility,
                        // but since we strictly upsert it now, we can check).
                        if (metadata.getFieldsMap().containsKey("active")) {
                            return metadata.getFieldsMap().get("active").getBoolValue();
                        }
                        return true; // Default active if not active flag set
                    })
                    .map(match -> {
                        Struct metadata = match.getMetadata();
                        if (metadata != null && metadata.getFieldsMap().containsKey("text")) {
                            return metadata.getFieldsMap().get("text").getStringValue();
                        }
                        return "";
                    })
                    .filter(s -> !s.isEmpty())
                    .limit(5) // Take top 5 closest active chunks
                    .collect(Collectors.toList());

        } catch (Exception e) {
            logger.error("Error generating retrieval results", e);
            return Collections.emptyList();
        }
    }

    /**
     * Bootstrap the canonical knowledge on startup.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void bootstrapKnowledge() {
        logger.info("Bootstrapping FRED canonical knowledge...");

        try {
            var indexConnection = pinecone.getIndexConnection(indexName);
            List<VectorWithUnsignedIndices> vectors = new ArrayList<>();

            for (FredKnowledge.CanonicalChunk chunk : FredKnowledge.CANONICAL_CHUNKS) {
                if (!chunk.active())
                    continue; // Skip inactive

                String title = chunk.title();
                String content = chunk.content();
                String id = chunk.id();

                List<Float> embedding = llmService.getEmbedding(content);

                Struct metadata = Struct.newBuilder()
                        .putFields("text", com.google.protobuf.Value.newBuilder().setStringValue(content).build())
                        .putFields("title", com.google.protobuf.Value.newBuilder().setStringValue(title).build())
                        .putFields("source",
                                com.google.protobuf.Value.newBuilder().setStringValue("fred_canonical").build())
                        .putFields("version",
                                com.google.protobuf.Value.newBuilder().setStringValue(chunk.version()).build())
                        .putFields("topic",
                                com.google.protobuf.Value.newBuilder().setStringValue(chunk.topic()).build())
                        .putFields("risk_level",
                                com.google.protobuf.Value.newBuilder().setStringValue(chunk.riskLevel()).build())
                        .putFields("active",
                                com.google.protobuf.Value.newBuilder().setBoolValue(chunk.active()).build())
                        .build();

                // Instantiate POJO
                VectorWithUnsignedIndices vector = new VectorWithUnsignedIndices();
                vector.setId(id);
                vector.setValues(embedding);
                vector.setMetadata(metadata);

                vectors.add(vector);
            }

            if (!vectors.isEmpty()) {
                indexConnection.upsert(vectors, "");
                logger.info("Successfully upserted {} canonical chunks.", vectors.size());
            }

        } catch (Exception e) {
            logger.error("Failed to bootstrap knowledge. Ensure API keys are set and Index exists.", e);
        }
    }
}
