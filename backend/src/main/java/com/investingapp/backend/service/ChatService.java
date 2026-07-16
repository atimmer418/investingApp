package com.investingapp.backend.service;

import com.investingapp.backend.dto.ChatRequest;
import com.investingapp.backend.dto.ChatResponse;
import com.investingapp.backend.config.FredConstitution; // Restore Import
import com.investingapp.backend.dto.SafetyResult; // Import
// Import
import com.investingapp.backend.dto.SafetyVerdict; // Import
import com.investingapp.backend.config.FredRedirections; // Import
import com.investingapp.backend.model.ChatMessage; // Import
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.ChatMessageRepository; // Import
import com.investingapp.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.Collections; // Import
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Service
public class ChatService {

    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);

    private final UserRepository userRepository;
    private final ChatMessageRepository chatMessageRepository; // Inject
    private final RAGService ragService;
    private final LLMService llmService;
    private final SafetyService safetyService; // Inject
    private final ConversationAnalyticsService analyticsService; // NEW: Phase 2A
    private final FredChatToolsService fredChatToolsService; // Phase A agentic: read-only chat tools
    private final FredChatActionService fredChatActionService; // Phase B agentic: confirmed mutations

    private static final String TOOLS_UNAVAILABLE_NOTE =
            "Note: your data-lookup tools are NOT available on this request. Do not claim you can "
            + "look up the user's portfolio or schedule — guide them to the relevant app tab instead.";

    public ChatService(UserRepository userRepository, ChatMessageRepository chatMessageRepository,
            RAGService ragService, LLMService llmService, SafetyService safetyService,
            ConversationAnalyticsService analyticsService, FredChatToolsService fredChatToolsService,
            FredChatActionService fredChatActionService) {
        this.userRepository = userRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.ragService = ragService;
        this.llmService = llmService;
        this.safetyService = safetyService;
        this.analyticsService = analyticsService; // NEW: Phase 2A
        this.fredChatToolsService = fredChatToolsService;
        this.fredChatActionService = fredChatActionService;
    }

    /**
     * Phase B: execute a FRED-proposed action after the user's Confirm tap.
     * The outcome is also persisted as an assistant message so the next model
     * turn (and a reloaded chat) sees what actually happened.
     */
    public FredChatActionService.ActionResult executeChatAction(Long userId, String sessionId,
            String action, com.fasterxml.jackson.databind.JsonNode params) {
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
        if (user == null) {
            return new FredChatActionService.ActionResult(false, "User not found");
        }
        FredChatActionService.ActionResult result = fredChatActionService.execute(user, action, params, sessionId);
        if (sessionId != null && !sessionId.isBlank()) {
            try {
                // ✅/⚠️ prefix marks this as a SYSTEM outcome record — the
                // constitution tells the model these are not its own words, so
                // history can't teach it to claim executions itself
                String prefix = result.success() ? "✅ " : "⚠️ ";
                chatMessageRepository.save(new ChatMessage(userId, sessionId, "assistant", prefix + result.message()));
            } catch (Exception e) {
                logger.error("Failed to persist action outcome for session {}", sessionId, e);
            }
        }
        return result;
    }

    public ChatResponse processChat(ChatRequest request) {
        // 0. Safety Check
        SafetyResult safety = safetyService.check(request.message());

        // Log Safety Decision
        logger.info("Safety Check - User: {}, Verdict: {}, Reason: {}, Query: \"{}\"",
                request.userId(), safety.verdict(), safety.reason(), request.message());

        if (safety.verdict() != com.investingapp.backend.dto.SafetyVerdict.SAFE) {
            String redirectionContent = FredRedirections.get(safety.reason());

            // Persist the user message and the redirection response so history stays in
            // sync
            chatMessageRepository
                    .save(new ChatMessage(request.userId(), request.sessionId(), "user", request.message()));
            chatMessageRepository
                    .save(new ChatMessage(request.userId(), request.sessionId(), "assistant", redirectionContent));

            return new ChatResponse(redirectionContent, null);
        }

        // 1. Persist user message
        chatMessageRepository.save(new ChatMessage(request.userId(), request.sessionId(), "user", request.message()));

        // 2. NEW Phase 2B: Track follow-up patterns (before logging question)
        if (request.userId() != null && request.sessionId() != null) {
            try {
                analyticsService.trackFollowUpPattern(request.sessionId(), request.message());
            } catch (Exception e) {
                logger.error("Failed to track follow-up pattern", e);
                // Continue even if follow-up tracking fails
            }
        }

        // 2. Load User (guard null userId for guest/anonymous, matching streamChat)
        User user = request.userId() != null ? userRepository.findById(request.userId()).orElse(null) : null;

        // 3. Load System Prompt
        String systemPrompt = FredConstitution.SYSTEM_PROMPT;

        // 4. Build User Context
        String userContext = buildUserContext(user);

        // 5. Retrieve RAG Chunks
        List<String> ragChunks = ragService.retrieveChunks(request.message());
        String ragContext = formatRagChunks(ragChunks);

        // 6. Load History (Top 10 most recent)
        List<ChatMessage> historyEntities = chatMessageRepository
                .findTop10BySessionIdOrderByCreatedAtDesc(request.sessionId());
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

        // This non-streaming fallback path never binds tools — keep Claude honest
        messages.add(new LLMService.ChatMessage("system", TOOLS_UNAVAILABLE_NOTE));

        // 8. Call LLM
        String response = llmService.generateChatResponse(messages);

        // 8.5 SMART INTERCEPT FOR FRED STORY
        if (response != null && response.contains(FredConstitution.FRED_STORY_ORIGIN_TRIGGER)) {
            logger.info("Smart Trigger: Detected FRED_STORY_ORIGIN_TRIGGER. Swapping with canonical text.");
            response = FredConstitution.FRED_STORY_ORIGIN
                    + "\n\nDo you want me to tell you about my master strategist retirement plan?";
        }

        if (response != null && response.contains(FredConstitution.FRED_STORY_STRATEGY_TRIGGER)) {
            logger.info("Smart Trigger: Detected FRED_STORY_STRATEGY_TRIGGER. Swapping with canonical text.");
            response = FredConstitution.FRED_STORY_STRATEGY;
        }

        // NEW: Phase 2A - Log conversation analytics
        if (request.userId() != null && response != null) {
            try {
                analyticsService.logUserQuestion(
                        request.userId(),
                        request.sessionId(),
                        request.message(),
                        response.length());
            } catch (Exception e) {
                logger.error("Failed to log conversation analytics", e);
                // Continue with chat response even if analytics fails
            }
        }

        // 9. Persistence (Assistant Response)
        chatMessageRepository.save(new ChatMessage(request.userId(), request.sessionId(), "assistant", response));

        // 10. Log interaction (Basic logging for now)
        logger.info("Chat interaction - User: {}, Query: {}, RAG Chunks Used: {}",
                request.userId(), request.message(), ragChunks.size());

        // 11. Generate Title if requested
        String title = null;
        if (request.generateTitle()) {
            title = generateTitle(request.message());
        }

        return new ChatResponse(response, title);
    }

    public SseEmitter streamChat(ChatRequest request) {
        SseEmitter emitter = new SseEmitter(300_000L);
        ObjectMapper mapper = new ObjectMapper();

        // 0. Safety Check
        SafetyResult safety = safetyService.check(request.message());
        logger.info("Safety Check (stream) - User: {}, Verdict: {}, Reason: {}, Query: \"{}\"",
                request.userId(), safety.verdict(), safety.reason(), request.message());

        if (safety.verdict() != SafetyVerdict.SAFE) {
            String redirectionContent = FredRedirections.get(safety.reason());
            chatMessageRepository.save(new ChatMessage(request.userId(), request.sessionId(), "user", request.message()));
            chatMessageRepository.save(new ChatMessage(request.userId(), request.sessionId(), "assistant", redirectionContent));
            try {
                emitter.send(SseEmitter.event().data(mapper.writeValueAsString(Map.of("token", redirectionContent))));
                emitter.send(SseEmitter.event().data(mapper.writeValueAsString(Map.of("done", true))));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        // 1. Persist user message
        chatMessageRepository.save(new ChatMessage(request.userId(), request.sessionId(), "user", request.message()));

        // 2. Track follow-up patterns
        if (request.userId() != null && request.sessionId() != null) {
            try {
                analyticsService.trackFollowUpPattern(request.sessionId(), request.message());
            } catch (Exception e) {
                logger.error("Failed to track follow-up pattern", e);
            }
        }

        // 3. Load User
        User user = request.userId() != null ? userRepository.findById(request.userId()).orElse(null) : null;

        // 4. Build prompt
        String systemPrompt = FredConstitution.SYSTEM_PROMPT;
        String userContext = buildUserContext(user);
        List<String> ragChunks = ragService.retrieveChunks(request.message());
        String ragContext = formatRagChunks(ragChunks);

        List<ChatMessage> historyEntities = chatMessageRepository
                .findTop10BySessionIdOrderByCreatedAtDesc(request.sessionId());
        List<ChatMessage> chronologicalHistory = new ArrayList<>(historyEntities);
        Collections.reverse(chronologicalHistory);

        List<LLMService.ChatMessage> messages = new ArrayList<>();
        messages.add(new LLMService.ChatMessage("system", systemPrompt));
        if (!userContext.isEmpty()) {
            messages.add(new LLMService.ChatMessage("system", userContext));
        }
        if (!ragContext.isEmpty()) {
            messages.add(new LLMService.ChatMessage("system", "Relevant FRED knowledge:\n" + ragContext));
        }
        for (ChatMessage h : chronologicalHistory) {
            messages.add(new LLMService.ChatMessage(h.getRole(), h.getContent()));
        }

        // 5. Stream on async thread — with read-only tools bound to this user
        FredChatToolsService.BoundTools boundTools = (user != null) ? fredChatToolsService.forUser(user) : null;
        if (boundTools == null) {
            // The constitution advertises tools; make sure Claude doesn't promise
            // lookups it can't perform on this request
            messages.add(new LLMService.ChatMessage("system", TOOLS_UNAVAILABLE_NOTE));
        }
        CompletableFuture.runAsync(() -> {
            StringBuilder fullResponse = new StringBuilder();
            try {
                llmService.streamChatResponse(messages, token -> {
                    try {
                        fullResponse.append(token);
                        emitter.send(SseEmitter.event().data(mapper.writeValueAsString(Map.of("token", token))));
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                }, boundTools);

                // 6. Apply smart intercepts to the assembled response
                String assembled = fullResponse.toString();
                if (assembled.contains(FredConstitution.FRED_STORY_ORIGIN_TRIGGER)) {
                    logger.info("Smart Trigger (stream): Detected FRED_STORY_ORIGIN_TRIGGER.");
                    assembled = FredConstitution.FRED_STORY_ORIGIN
                            + "\n\nDo you want me to tell you about my master strategist retirement plan?";
                }
                if (assembled.contains(FredConstitution.FRED_STORY_STRATEGY_TRIGGER)) {
                    logger.info("Smart Trigger (stream): Detected FRED_STORY_STRATEGY_TRIGGER.");
                    assembled = FredConstitution.FRED_STORY_STRATEGY;
                }

                // 7. Persist assistant response
                chatMessageRepository.save(new ChatMessage(request.userId(), request.sessionId(), "assistant", assembled));

                // 8. Analytics
                if (request.userId() != null) {
                    try {
                        analyticsService.logUserQuestion(request.userId(), request.sessionId(),
                                request.message(), assembled.length());
                    } catch (Exception e) {
                        logger.error("Failed to log conversation analytics", e);
                    }
                }

                logger.info("Stream chat interaction - User: {}, Query: {}, RAG Chunks Used: {}",
                        request.userId(), request.message(), ragChunks.size());

                // 9. Generate title if requested — a title failure must never
                // kill the stream (the done event still has to reach the client)
                String title = null;
                if (request.generateTitle()) {
                    try {
                        title = generateTitle(request.message());
                    } catch (Exception e) {
                        logger.error("Title generation failed — sending done without title", e);
                    }
                }

                // 10. Send done event
                Map<String, Object> donePayload = title != null
                        ? Map.of("done", true, "title", title)
                        : Map.of("done", true);
                emitter.send(SseEmitter.event().data(mapper.writeValueAsString(donePayload)));
                emitter.complete();

            } catch (Exception e) {
                logger.error("Stream chat error", e);
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    private String generateTitle(String userMessage) {
        List<LLMService.ChatMessage> messages = new ArrayList<>();
        messages.add(new LLMService.ChatMessage("system",
                "Generate a concise 3-5 word title for the following user question. "
                + "Respond with the title only, in plain text: no quotes, no markdown, no asterisks, no trailing punctuation."));
        messages.add(new LLMService.ChatMessage("user", userMessage));
        String title = llmService.generateChatResponse(messages);
        // Belt-and-suspenders: strip any markdown/quote characters the model adds anyway
        title = title.replaceAll("[*_`\"'#]", "").trim();
        if (title.length() > 60) {
            title = title.substring(0, 60).trim();
        }
        return title;
    }

    public List<ChatMessage> getChatHistory(String sessionId) {
        if (sessionId == null || sessionId.trim().isEmpty()) {
            return Collections.emptyList();
        }
        List<ChatMessage> history = chatMessageRepository.findBySessionIdOrderByCreatedAtDesc(sessionId);
        Collections.reverse(history); // Return in chronological order
        return history;
    }

    /**
     * SECURITY: session-scoped history restricted to the requesting user —
     * session IDs are client-generated and must not act as bearer tokens for
     * another user's conversation.
     */
    public List<ChatMessage> getChatHistoryForUser(String sessionId, Long userId) {
        if (userId == null) {
            return Collections.emptyList();
        }
        return getChatHistory(sessionId).stream()
                .filter(m -> userId.equals(m.getUserId()))
                .toList();
    }

    public List<ChatMessage> getRecentSessionHistory(Long userId) {
        if (userId == null)
            return Collections.emptyList();

        // 1. Find the MOST RECENT message for this user to get the latest sessionId
        Optional<ChatMessage> latestMsg = chatMessageRepository.findTopByUserIdOrderByCreatedAtDesc(userId);

        if (latestMsg.isPresent()) {
            String lastSessionId = latestMsg.get().getSessionId();
            return getChatHistory(lastSessionId);
        }

        return Collections.emptyList();
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
                • This profile contains no dollar figures — never invent or infer them from it. Real figures come only from your tools (when available).
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
