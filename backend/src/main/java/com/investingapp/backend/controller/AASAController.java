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
        // Replace with your actual Team ID and Bundle ID
        String appIdentifier = "9G59L97KRT.com.fredvested.Fred";

        Map<String, Object> webcredentials = Map.of(
            "apps", List.of(appIdentifier)
        );
        
        // This is for Universal Links, good to have but not strictly for passkeys
        Map<String, Object> applinks = Map.of(
            "apps", List.of(), // Can be empty if no applinks needed
            "details", List.of(
                Map.of(
                    "appID", appIdentifier,
                    "paths", List.of("/activate/*") // Example path
                )
            )
        );

        Map<String, Object> responseBody = Map.of(
            "webcredentials", webcredentials,
            "applinks", applinks
        );

        return ResponseEntity.ok(responseBody);
    }
}