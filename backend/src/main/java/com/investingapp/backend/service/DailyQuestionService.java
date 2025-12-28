package com.investingapp.backend.service;

import com.investingapp.backend.model.DailyQuestion;
import com.investingapp.backend.repository.DailyQuestionRepository;
import com.investingapp.backend.service.LLMService.ChatMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DailyQuestionService {

    private static final Logger logger = LoggerFactory.getLogger(DailyQuestionService.class);

    private final DailyQuestionRepository repository;
    private final LLMService llmService;

    @Autowired
    public DailyQuestionService(DailyQuestionRepository repository, LLMService llmService) {
        this.repository = repository;
        this.llmService = llmService;
    }

    /**
     * Retrieves today's questions. If not present, generates them synchronously
     * (lazy load fallback).
     */
    public List<String> getTodayQuestions() {
        LocalDate today = LocalDate.now();
        Optional<DailyQuestion> existing = repository.findByDate(today);

        if (existing.isPresent()) {
            return existing.get().getQuestions();
        }

        // If not found (e.g., scheduler failed or first run), generate now
        logger.info("No daily questions found for {}. Generating now...", today);
        return generateAndSaveQuestions(today);
    }

    /**
     * Scheduled task to generate questions for the NEXT day at 11:00 PM EST
     * (or midnight, but generating slightly ahead serves to ensure readiness).
     * Actually, user asked for "Trigger at 12am EST".
     * Cron: "0 0 0 * * *" in America/New_York
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "America/New_York")
    public void scheduleQuestionGeneration() {
        LocalDate today = LocalDate.now(); // Cron runs at midnight, so 'today' is the new day
        logger.info("Executing scheduled question generation for {}", today);
        if (repository.findByDate(today).isEmpty()) {
            generateAndSaveQuestions(today);
        }
    }

    private List<String> generateAndSaveQuestions(LocalDate date) {
        try {
            List<ChatMessage> messages = new ArrayList<>();
            List<String> allConcepts = Arrays.asList(
                    "Compound Interest", "Risk Tolerance", "ETF vs Mutual Fund",
                    "Inflation", "Market Cycles", "Dividends",
                    "Retirement Planning", "Tech Stocks", "Dollar Cost Averaging", "Emergency Funds");

            // Randomly select 3 concepts
            List<String> selectedConcepts = new ArrayList<>(allConcepts);
            java.util.Collections.shuffle(selectedConcepts);
            String concepts = String.join(", ", selectedConcepts.subList(0, 3));

            messages.add(new ChatMessage("system",
                    "You are an engaging financial educator for novices. " +
                            "Generate exactly 3 short, intriguing questions that a beginner investor might ask to learn about financial concepts. "
                            +
                            "Focus specifically on these concepts today: " + concepts + ". " // Force variety
                            +
                            "The questions should be written from the user's perspective (e.g., 'Why does inflation matter?'). "
                            +
                            "Output ONLY the 3 questions, separated by pipes (|). No numbering, no Intro."));

            messages.add(new ChatMessage("user", "Generate 3 unique questions for " + date));

            String response = llmService.generateChatResponse(messages);

            // Parse response (expecting "Q1 | Q2 | Q3")
            List<String> questions = Arrays.stream(response.split("\\|"))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .limit(3)
                    .collect(Collectors.toList());

            // Fallback if LLM format fails
            if (questions.size() < 3) {
                logger.warn("LLM failed to generate 3 valid questions. Using fallback.");
                questions = Arrays.asList(
                        "Why is compound interest called the 8th wonder of the world?",
                        "How do fees impact my long-term returns?",
                        "What should I do if the market crashes?");
            }

            DailyQuestion dq = new DailyQuestion(date, questions);
            repository.save(dq);
            logger.info("Saved daily questions for {}: {}", date, questions);
            return questions;

        } catch (Exception e) {
            logger.error("Failed to generate daily questions", e);
            // Return safe fallback
            return Arrays.asList(
                    "Why is compound interest called the 8th wonder of the world?",
                    "How do fees impact my long-term returns?",
                    "What should I do if the market crashes?");
        }
    }
}
