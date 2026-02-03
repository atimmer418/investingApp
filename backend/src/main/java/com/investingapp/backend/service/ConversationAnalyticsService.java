package com.investingapp.backend.service;

import com.investingapp.backend.model.ConversationInsight;
import com.investingapp.backend.repository.ConversationInsightRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Conversation Analytics Service
 * 
 * Phase 2A: ✅ Basic logging, 90-day retention cleanup
 * Phase 2B: ✅ Topic extraction, follow-up tracking, suggestion scoring
 * Phase 2C: 🔜 Popular & personalized question suggestions
 */
@Service
public class ConversationAnalyticsService {

    private static final Logger logger = LoggerFactory.getLogger(ConversationAnalyticsService.class);

    private final ConversationInsightRepository repository;
    private final LLMService llmService;

    public ConversationAnalyticsService(ConversationInsightRepository repository, LLMService llmService) {
        this.repository = repository;
        this.llmService = llmService;
    }

    /**
     * Phase 2B: Enhanced logging with topic extraction and suggestion scoring.
     * 
     * @param userId         User ID
     * @param sessionId      Session ID
     * @param question       User's question text
     * @param responseLength Length of FRED's response (for summary analysis)
     */
    public void logUserQuestion(Long userId, String sessionId, String question, int responseLength) {
        try {
            // Phase 2B: Extract topic using LLM
            logger.info("ANALYTICS: Extracting topic for user {}", userId);
            String topic = extractTopic(question);
            logger.info("ANALYTICS: Extracted topic = '{}'", topic);

            // Phase 2B: Evaluate if this is a good candidate for daily suggestions
            boolean isGoodSuggestion = evaluateForDailySuggestion(question, responseLength);

            ConversationInsight insight = new ConversationInsight(
                    userId,
                    sessionId,
                    question,
                    topic,
                    responseLength,
                    isGoodSuggestion);

            repository.save(insight);
            logger.info("ANALYTICS: Saved insight - User: {}, Topic: '{}', GoodSuggestion: {}",
                    userId, topic, isGoodSuggestion);

        } catch (Exception e) {
            logger.error("Failed to log conversation insight", e);
            // Don't fail the chat request if analytics logging fails
        }
    }

    /**
     * Phase 2B: Extract topic from question using LLM categorization.
     * 
     * @param question User's question
     * @return Topic tag (e.g., "compound_interest", "risk_tolerance", "etf_basics")
     */
    private String extractTopic(String question) {
        if (question == null || question.trim().isEmpty()) {
            return "other";
        }

        // Deterministic check for the suggestion bubble to ensure sticky logic works
        String cleanQuestion = question.trim().toLowerCase();
        if (cleanQuestion.equals("what's your story fred?") ||
                cleanQuestion.equals("whats your story fred?")) {
            return "fred_story";
        }

        try {
            String prompt = """
                    You are a financial topic classifier. Categorize the following question into ONE specific topic tag.

                    Use ONLY these predefined topics:
                    - compound_interest
                    - risk_tolerance
                    - etf_basics
                    - stock_basics
                    - bond_basics
                    - diversification
                    - retirement_planning
                    - tax_strategy
                    - investment_goals
                    - dollar_cost_averaging
                    - portfolio_rebalancing
                    - market_volatility
                    - emergency_fund
                    - debt_management
                    - fred_story
                    - fred_features
                    - account_management
                    - other

                    Question: "%s"

                    Respond with ONLY the topic tag, nothing else.
                    """.formatted(question);

            List<LLMService.ChatMessage> messages = List.of(
                    new LLMService.ChatMessage("user", prompt));

            String response = llmService.generateChatResponse(messages);

            if (response != null) {
                String topic = response.trim().toLowerCase().replace(" ", "_");
                logger.debug("Extracted topic '{}' from question: {}", topic,
                        question.substring(0, Math.min(50, question.length())));
                return topic;
            }

        } catch (Exception e) {
            logger.warn("Failed to extract topic, using 'other'", e);
        }

        return "other";
    }

    /**
     * Phase 2B: Evaluate if a question is suitable for daily suggestions.
     * 
     * Criteria:
     * - Not too short (> 10 chars)
     * - Not too long (< 200 chars)
     * - Not FRED-specific (contains common investing terms)
     * - Response wasn't too short (indicates it was answerable)
     */
    private boolean evaluateForDailySuggestion(String question, int responseLength) {
        // Too short or too long
        if (question.length() < 10 || question.length() > 200) {
            return false;
        }

        // Response too short (likely blocked or error)
        if (responseLength < 50) {
            return false;
        }

        // Questions that are too specific/contextual
        String lowerQ = question.toLowerCase();
        if (lowerQ.contains("my portfolio") ||
                lowerQ.contains("my account") ||
                lowerQ.contains("i already") ||
                lowerQ.contains("you said") ||
                lowerQ.contains("earlier")) {
            return false;
        }

        // Looks good for suggestions!
        return true;
    }

    /**
     * Phase 2B: Track follow-up patterns by linking questions in a session.
     * 
     * @param sessionId        Current session ID
     * @param followUpQuestion The new question being asked
     */
    @Transactional
    public void trackFollowUpPattern(String sessionId, String followUpQuestion) {
        try {
            // Find the most recent question in this session (before current)
            List<ConversationInsight> recentInsights = repository
                    .findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
                            null, // We'll search by session instead
                            LocalDateTime.now().minusMinutes(30))
                    .stream()
                    .filter(insight -> insight.getSessionId().equals(sessionId))
                    .limit(2) // Get last 2 questions (previous + current)
                    .toList();

            // If we have a previous question, link it
            if (recentInsights.size() >= 2) {
                ConversationInsight previousInsight = recentInsights.get(1); // Second most recent
                previousInsight.setFollowUpQuestion(followUpQuestion);
                previousInsight.setLastSeenAt(LocalDateTime.now());
                repository.save(previousInsight);

                logger.debug("Tracked follow-up pattern in session {}: '{}' → '{}'",
                        sessionId,
                        previousInsight.getQuestionText().substring(0,
                                Math.min(30, previousInsight.getQuestionText().length())),
                        followUpQuestion.substring(0, Math.min(30, followUpQuestion.length())));
            }

        } catch (Exception e) {
            logger.error("Failed to track follow-up pattern", e);
            // Don't fail if follow-up tracking fails
        }
    }

    /**
     * Phase 2A: 90-day retention cleanup.
     * Runs daily at 3 AM to delete insights older than 90 days.
     */
    @Scheduled(cron = "0 0 3 * * *", zone = "America/New_York")
    @Transactional
    public void cleanupOldInsights() {
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(90);
            int deletedCount = repository.deleteOlderThan(cutoffDate);

            if (deletedCount > 0) {
                logger.info("Cleaned up {} conversation insights older than 90 days", deletedCount);
            }
        } catch (Exception e) {
            logger.error("Failed to cleanup old conversation insights", e);
        }
    }

    /**
     * Get total conversation count (for monitoring)
     */
    public long getTotalConversationCount() {
        return repository.count();
    }

    /**
     * Get recent conversation count (last 30 days)
     */
    public long getRecentConversationCount() {
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        return repository.countSince(since);
    }

    /**
     * Get all topics a user has explored (for first-time user detection)
     */
    public List<String> getUserTopics(Long userId) {
        try {
            return repository.findTopicsByUser(userId);
        } catch (Exception e) {
            logger.error("Failed to get user topics for user {}", userId, e);
            return Collections.emptyList();
        }
    }

    // ============================================================================
    // PHASE 2C: QUESTION SUGGESTION METHODS
    // Used by DailyQuestionService for smart daily question blending
    // ============================================================================

    /**
     * Phase 2C: Get popular questions for daily rotation.
     * Returns questions that are frequently asked and suitable for suggestions.
     * 
     * @param limit Maximum number of questions to return
     * @return List of popular question texts
     */
    public List<String> getPopularQuestions(int limit) {
        try {
            List<ConversationInsight> popularInsights = repository
                    .findTop20ByIsGoodSuggestionTrueOrderBySuggestionScoreDesc();

            // If we don't have enough from analytics, return empty list
            // (DailyQuestionService will handle fallback)
            if (popularInsights.isEmpty()) {
                logger.debug("No popular questions found in analytics yet");
                return Collections.emptyList();
            }

            // Take up to 'limit' questions and extract text
            List<String> questions = popularInsights.stream()
                    .limit(limit)
                    .map(ConversationInsight::getQuestionText)
                    .distinct() // Avoid duplicates
                    .collect(Collectors.toList());

            logger.debug("Retrieved {} popular questions from analytics", questions.size());
            return questions;

        } catch (Exception e) {
            logger.error("Failed to get popular questions", e);
            return Collections.emptyList();
        }
    }

    /**
     * Phase 2C: Get personalized questions for a user based on unexplored topics.
     * 
     * Strategy:
     * 1. Find all topics the user has already asked about
     * 2. Find good questions from topics they HAVEN'T explored
     * 3. Return those as personalized suggestions
     * 
     * @param userId User ID
     * @param limit  Maximum number of questions to return
     * @return List of personalized question texts
     */
    public List<String> getPersonalizedQuestions(Long userId, int limit) {
        try {
            // 1. Get topics the user has already explored
            List<String> userExploredTopics = repository.findTopicsByUser(userId);

            // Make effectively final for lambda
            final List<String> exploredTopics = (userExploredTopics != null)
                    ? userExploredTopics
                    : Collections.emptyList();

            logger.debug("User {} has explored {} topics: {}", userId, exploredTopics.size(), exploredTopics);

            // 2. Get all good suggestion questions
            List<ConversationInsight> allGoodQuestions = repository
                    .findTop20ByIsGoodSuggestionTrueOrderBySuggestionScoreDesc();

            // 3. Filter to only questions from UNexplored topics
            // Also exclude introductory topics (fred_story, fred_features)
            List<String> personalizedQuestions = allGoodQuestions.stream()
                    .filter(insight -> insight.getTopicTag() != null &&
                            !exploredTopics.contains(insight.getTopicTag()) &&
                            !insight.getTopicTag().equals("fred_story") &&
                            !insight.getTopicTag().equals("fred_features"))
                    .map(ConversationInsight::getQuestionText)
                    .distinct()
                    .limit(limit)
                    .collect(Collectors.toList());

            // 4. If user has explored all topics, just return popular questions from less
            // common topics (but still exclude introductory fred questions)
            if (personalizedQuestions.isEmpty()) {
                logger.debug(
                        "User {} has no unexplored topics, falling back to popular questions (excluding fred topics)",
                        userId);
                personalizedQuestions = allGoodQuestions.stream()
                        .filter(insight -> !insight.getTopicTag().equals("fred_story") &&
                                !insight.getTopicTag().equals("fred_features"))
                        .map(ConversationInsight::getQuestionText)
                        .distinct()
                        .limit(limit)
                        .collect(Collectors.toList());
            }

            logger.debug("Retrieved {} personalized questions for user {}", personalizedQuestions.size(), userId);
            return personalizedQuestions;

        } catch (Exception e) {
            logger.error("Failed to get personalized questions for user {}", userId, e);
            return Collections.emptyList();
        }
    }
}
