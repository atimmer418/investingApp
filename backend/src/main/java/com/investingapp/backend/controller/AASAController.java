// src/main/java/com/investingapp/backend/controller/AASAController.java
package com.investingapp.backend.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class AASAController {

    // This endpoint MUST be available without any authentication
    @GetMapping(path = "/.well-known/apple-app-site-association", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> getAASA() {
        // Replace with your actual Team ID and Bundle ID from Apple Developer Portal
        String appIdentifier = "9G59L97KRT.com.fredvested.Fred";

        // This is the only part required for Passkeys and AutoFill
        Map<String, Object> webcredentials = Map.of(
            "apps", List.of(appIdentifier)
        );

        // The entire response body only needs to contain webcredentials
        Map<String, Object> responseBody = Map.of(
            "webcredentials", webcredentials
            // You can completely remove the "applinks" key for now
        );

        return ResponseEntity.ok(responseBody);
    }
}