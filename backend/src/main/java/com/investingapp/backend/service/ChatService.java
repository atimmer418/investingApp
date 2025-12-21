package com.investingapp.backend.service;

import com.investingapp.backend.dto.ChatRequest;
import com.investingapp.backend.dto.ChatResponse;
import com.investingapp.backend.config.FredConstitution; // Restore Import
import com.investingapp.backend.dto.SafetyResult; // Import
import com.investingapp.backend.dto.SafetyResult; // Import
import com.investingapp.backend.dto.SafetyVerdict; // Import
import com.investingapp.backend.config.FredRedirections; // Import
import com.investingapp.backend.model.ChatMessage; // Import
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.ChatMessageRepository; // Import
import com.investingapp.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections; // Import
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors; // Import

@Service
public class ChatService {

    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);

    private final UserRepository userRepository;
    private final ChatMessageRepository chatMessageRepository; // Inject
    private final RAGService ragService;
    private final LLMService llmService;
    private final SafetyService safetyService; // Inject

    public ChatService(UserRepository userRepository, ChatMessageRepository chatMessageRepository,
            RAGService ragService, LLMService llmService, SafetyService safetyService) {
        this.userRepository = userRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.ragService = ragService;
        this.llmService = llmService;
        this.safetyService = safetyService;
    }

    public ChatResponse processChat(ChatRequest request) {
        // 0. Safety Check
        SafetyResult safety = safetyService.check(request.message());

        // Log Safety Decision
        logger.info("Safety Check - User: {}, Verdict: {}, Reason: {}, Query: \"{}\"",
                request.userId(), safety.verdict(), safety.reason(), request.message());

        // Handle Blocks & Redirects (Skip LLM)
        if (safety.verdict() != SafetyVerdict.SAFE) {
            String cannedResponse = FredRedirections.get(safety.reason());
            return new ChatResponse(cannedResponse);
        }

        // 1. Persistence (User Message) - SAVE FIRST
        chatMessageRepository.save(new ChatMessage(request.userId(), "user", request.message()));

        // 2. Load User
        Optional<User> userOpt = userRepository.findById(request.userId());
        // Handle guest/anonymous or error if needed. For now, assume user exists or
        // treat as generic.
        User user = userOpt.orElse(null);

        // 3. Load System Prompt
        String systemPrompt = FredConstitution.SYSTEM_PROMPT;

        // 4. Build User Context
        String userContext = buildUserContext(user);

        // 5. Retrieve RAG Chunks
        List<String> ragChunks = ragService.retrieveChunks(request.message());
        String ragContext = formatRagChunks(ragChunks);

        // 6. Load History (Top 10 most recent)
        List<ChatMessage> historyEntities = chatMessageRepository
                .findTop10ByUserIdOrderByCreatedAtDesc(request.userId());
        // Reverse to Chronological Order
        List<ChatMessage> chronologicalHistory = new ArrayList<>(historyEntities);
        Collections.reverse(chronologicalHistory);

        // 7. Assemble Prompt
        List<LLMService.ChatMessage> messages = new ArrayList<>();
        // System Layer
        messages.add(new LLMService.ChatMessage("system", systemPrompt));
        if (!userContext.isEmpty()) {
            messages.add(new LLMService.ChatMessage("system", userContext));
        }
        if (!ragContext.isEmpty()) {
            messages.add(new LLMService.ChatMessage("system", "Relevant FRED knowledge:\n" + ragContext));
        }

        // History + Current Message (Current message is likely in historyEntities if
        // saved first)
        // If save() was synchronous and fast, it might be in Top 10.
        // To be safe and deterministic, let's explicitly add the CURRENT message if
        // it's missing,
        // OR rely on history.
        // ISSUE: If user sends 11th message, history has 10. Does it have the current
        // one?
        // findTop10 Sort By Desc -> Current is #1.
        // So chronologicalHistory has [Oldest ... Current].
        // This is perfect.

        for (ChatMessage h : chronologicalHistory) {
            messages.add(new LLMService.ChatMessage(h.getRole(), h.getContent()));
        }

        // 8. Call LLM
        String response = llmService.generateChatResponse(messages);

        // 9. Persistence (Assistant Response)
        chatMessageRepository.save(new ChatMessage(request.userId(), "assistant", response));

        // 10. Log interaction (Basic logging for now)
        logger.info("Chat interaction - User: {}, Query: {}, RAG Chunks Used: {}",
                request.userId(), request.message(), ragChunks.size());

        return new ChatResponse(response);
    }

    private String buildUserContext(User user) {
        if (user == null) {
            return "User context: Anonymous/Guest (No personalization)";
        }

        // Logic to construct safe context
        String age = (user.getAge() != null) ? user.getAge().toString() : "Unknown";
        String payFreq = (user.getPayFrequency() != null) ? user.getPayFrequency() : "Unknown";
        String automated = (user.getNextInvestmentDate() != null
                || (user.getMonthlyInvestment() != null && user.getMonthlyInvestment() > 0)) ? "yes" : "no";
        String contribution = (user.getMonthlyInvestment() != null && user.getMonthlyInvestment() > 0) ? "consistent"
                : "not started";
        String timeHorizon = (user.getTimeToFI() != null) ? user.getTimeToFI() : "long-term";
        String risk = user.getRiskTolerance();

        return String.format("""
                User context:
                - Age range: %s
                - Paycheck frequency: %s
                - Investing automated: %s
                - Contribution rate: %s
                - Time horizon: %s
                - Risk tolerance: %s

                Rules:
                • No dollar amounts
                • No advice requests embedded
                • No speculative inference
                """, age, payFreq, automated, contribution, timeHorizon, risk);
    }

    private String formatRagChunks(List<String> chunks) {
        if (chunks.isEmpty())
            return "";
        StringBuilder sb = new StringBuilder();
        for (String chunk : chunks) {
            sb.append("[").append(chunk).append("]\n\n");
        }
        return sb.toString();
    }
}
