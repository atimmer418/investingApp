package com.investingapp.backend.dto;

public record ChatRequest(String message, Long userId, String sessionId, boolean generateTitle) {
}
