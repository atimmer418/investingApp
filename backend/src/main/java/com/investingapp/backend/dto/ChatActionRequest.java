package com.investingapp.backend.dto;

import com.fasterxml.jackson.databind.JsonNode;

/** Confirm-tap payload for a FRED-proposed chat action (Phase B agentic). */
public record ChatActionRequest(String action, JsonNode params, String sessionId) {
}
