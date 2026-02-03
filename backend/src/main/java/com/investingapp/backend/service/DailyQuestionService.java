package com.investingapp.backend.service;

import com.investingapp.backend.model.DailyQuestion;
import com.investingapp.backend.repository.DailyQuestionRepository;
import com.investingapp.backend.service.LLMService.ChatMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Daily Question Service
 * 
 * Phase 3: Smart question blending
 * - 1 LLM-generated question (variety)
 * - 1 popular question (from analytics)
 * - 1 personalized question (based on user's unexplored topics)
 * 
 * Fallback: If analytics empty, generate all 3 via LLM
 */
@Service
public class DailyQuestionService {

    private static final Logger logger = LoggerFactory.getLogger(DailyQuestionService.class);

    private final DailyQuestionRepository repository;
    private final LLMService llmService;
    private final ConversationAnalyticsService analyticsService;

    @Autowired
    public DailyQuestionService(DailyQuestionRepository repository, LLMService llmService,
            ConversationAnalyticsService analyticsService) {
        this.repository = repository;
        this.llmService = llmService;
        this.analyticsService = analyticsService;
    }

    /**
     * Retrieves today's questions. If not present, generates them synchronously
     * (lazy load fallback).
     * 
     * NOTE: For Phase 3, we need userId for personalized questions.
     * This method stays generic (no userId) for backward compatibility.
     */
    public List<String> getTodayQuestions() {
        LocalDate today = LocalDate.now(ZoneId.of("America/New_York"));
        Optional<DailyQuestion> existing = repository.findByDate(today);

        if (existing.isPresent()) {
            return existing.get().getQuestions();
        }

        // If not found (e.g., scheduler failed or first run), generate now
        logger.info("No daily questions found for {}. Generating now...", today);
        return generateAndSaveQuestions(today, null); // No userId fallback
    }

    /**
     * Get today's questions with personalization for a specific user.
     * This is the new Phase 3 method that enables personalized questions.
     */
    public List<String> getTodayQuestionsForUser(Long userId) {
        LocalDate today = LocalDate.now(ZoneId.of("America/New_York"));

        // Check if we have base questions for today
        Optional<DailyQuestion> existing = repository.findByDate(today);

        if (existing.isEmpty()) {
            // Generate base questions first (includes 1 popular + 1 LLM-generated)
            logger.info("No daily questions found for {}. Generating now...", today);
            generateAndSaveQuestions(today, null);
            existing = repository.findByDate(today);
        }

        // Get all 3 base questions
        List<String> baseQuestions = new ArrayList<>(existing.get().getQuestions());

        // Check if user has ever asked "What's your story FRED?"
        List<String> userTopics = analyticsService.getUserTopics(userId);
        boolean hasAskedAboutFred = userTopics != null &&
                (userTopics.contains("fred_story") || userTopics.contains("fred_features"));

        // If user hasn't asked about FRED, replace question 3 with FRED story
        if (!hasAskedAboutFred && baseQuestions.size() >= 3) {
            baseQuestions.set(2, "What's your story FRED?");
            logger.info("Showing FRED story as question 3 for user {}", userId);
        }

        return baseQuestions;
    }

    /**
     * Scheduled task to generate base questions (LLM + popular) at midnight EST.
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "America/New_York")
    public void scheduleQuestionGeneration() {
        LocalDate today = LocalDate.now(ZoneId.of("America/New_York"));
        logger.info("Executing scheduled question generation for {}", today);
        if (repository.findByDate(today).isEmpty()) {
            generateAndSaveQuestions(today, null);
        }
    }

    /**
     * Simplified: Generate and save 3 unique LLM questions for the day.
     */
    private List<String> generateAndSaveQuestions(LocalDate date, Long userId) {
        try {
            // Generate 5 candidate questions to ensure we can get 3 unique ones
            List<String> candidateQuestions = generateLLMQuestions(5, date);

            // Deduplicate and take the first 3
            List<String> uniqueQuestions = candidateQuestions.stream()
                    .map(String::trim)
                    .filter(q -> !q.isEmpty())
                    .distinct()
                    .limit(3)
                    .collect(Collectors.toList());

            // Ensure we have exactly 3 questions using fallbacks if necessary
            if (uniqueQuestions.size() < 3) {
                List<String> fallbacks = Arrays.asList(
                        "What's the best way to start investing with a small amount of money?",
                        "How do I choose between different investment options?",
                        "What should I know about market risk?");
                for (String fallback : fallbacks) {
                    if (uniqueQuestions.size() >= 3)
                        break;
                    if (!uniqueQuestions.contains(fallback)) {
                        uniqueQuestions.add(fallback);
                    }
                }
            }

            List<String> finalQuestions = uniqueQuestions.subList(0, 3);

            // Save to database
            DailyQuestion dq = new DailyQuestion(date, finalQuestions);
            repository.save(dq);
            logger.info("✅ Saved 3 unique daily questions for {}: {}", date, finalQuestions);

            return finalQuestions;

        } catch (Exception e) {
            logger.error("Failed to generate daily questions", e);
            // Return safe fallback
            return Arrays.asList(
                    "Why is compound interest called the 8th wonder of the world?",
                    "How do fees impact my long-term returns?",
                    "What should I do if the market crashes?");
        }
    }

    /**
     * Generate questions using LLM with variety
     */
    private List<String> generateLLMQuestions(int count, LocalDate date) {
        try {
            List<ChatMessage> messages = new ArrayList<>();
            List<String> allConcepts = Arrays.asList(
                    "Compound Interest", "Risk Tolerance", "ETF vs Mutual Fund",
                    "Inflation", "Market Cycles", "Dividends", "Compound Growth", "Asset Allocation",
                    "Retirement Planning", "Tech Stocks", "Dollar Cost Averaging", "Emergency Funds");

            // Randomly select concepts for variety
            List<String> selectedConcepts = new ArrayList<>(allConcepts);
            java.util.Collections.shuffle(selectedConcepts);
            String concepts = String.join(", ", selectedConcepts.subList(0, Math.min(3, count)));

            messages.add(new ChatMessage("system",
                    "You are an engaging financial educator for novices. " +
                            "Generate exactly " + count
                            + " short, intriguing questions that a beginner investor might ask to learn about financial concepts. "
                            +
                            "Focus specifically on these concepts today: " + concepts + ". " +
                            "The questions should be written from the user's perspective (e.g., 'Why does inflation matter?'). "
                            +
                            "Output ONLY the " + count
                            + " questions, separated by pipes (|). No numbering, no intro."));

            messages.add(new ChatMessage("user", "Generate " + count + " unique questions for " + date));

            String response = llmService.generateChatResponse(messages);

            // Parse response
            List<String> questions = Arrays.stream(response.split("\\|"))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .limit(count)
                    .collect(Collectors.toList());

            logger.info("Generated {} LLM questions", questions.size());
            return questions;

        } catch (Exception e) {
            logger.error("Failed to generate LLM questions", e);
            return new ArrayList<>();
        }
    }

}
