package com.investingapp.backend.controller;

import com.investingapp.backend.dto.ChatRequest;
import com.investingapp.backend.dto.ChatResponse;
import com.investingapp.backend.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.investingapp.backend.model.ChatMessage;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestAttribute;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final com.investingapp.backend.service.DailyQuestionService dailyQuestionService;

    public ChatController(ChatService chatService,
            com.investingapp.backend.service.DailyQuestionService dailyQuestionService) {
        this.chatService = chatService;
        this.dailyQuestionService = dailyQuestionService;
    }

    @PostMapping
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        ChatResponse response = chatService.processChat(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    public ResponseEntity<List<ChatMessage>> getHistory(
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) Long userId) {
        if (sessionId != null && !sessionId.trim().isEmpty()) {
            return ResponseEntity.ok(chatService.getChatHistory(sessionId));
        } else if (userId != null) {
            return ResponseEntity.ok(chatService.getRecentSessionHistory(userId));
        }
        return ResponseEntity.badRequest().build();
    }

    /**
     * Phase 3: Get personalized daily suggestions for authenticated user.
     * Blends: 1 LLM + 1 popular + 1 personalized (or "What's your story FRED?" for
     * first-time users).
     */
    @GetMapping("/suggestions")
    public ResponseEntity<List<String>> getSuggestions(@RequestParam Long userId) {
        return ResponseEntity.ok(dailyQuestionService.getTodayQuestionsForUser(userId));
    }
}
