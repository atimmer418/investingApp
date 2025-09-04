package com.investingapp.backend.controller;

import com.investingapp.backend.model.User;
import com.investingapp.backend.model.UserPaycheckConfig;
import com.investingapp.backend.repository.UserPaycheckConfigRepository;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.service.PaycheckDetectionService;
import com.investingapp.backend.security.services.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/paycheck")
public class PaycheckDetectionController {

    private static final Logger logger = LoggerFactory.getLogger(PaycheckDetectionController.class);

    @Autowired
    private PaycheckDetectionService paycheckDetectionService;

    @Autowired
    private UserPaycheckConfigRepository paycheckConfigRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Manually trigger paycheck detection for the authenticated user
     */
    @PostMapping("/detect")
    public ResponseEntity<Map<String, Object>> triggerPaycheckDetection(Authentication authentication) {
        try {
            if (!(authentication.getPrincipal() instanceof UserDetailsImpl)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid authentication"));
            }

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            logger.info("Manual paycheck detection triggered for user: {}", user.getId());
            paycheckDetectionService.detectPaychecksForUser(user.getId());

            return ResponseEntity.ok(Map.of(
                "message", "Paycheck detection completed",
                "userId", user.getId(),
                "timestamp", LocalDateTime.now().toString()
            ));

        } catch (Exception e) {
            logger.error("Error in manual paycheck detection: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to detect paychecks"));
        }
    }

    /**
     * Get paycheck detection status for the authenticated user
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getPaycheckDetectionStatus(Authentication authentication) {
        try {
            if (!(authentication.getPrincipal() instanceof UserDetailsImpl)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid authentication"));
            }

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            List<UserPaycheckConfig> allConfigs = paycheckConfigRepository.findByUser(user);
            List<UserPaycheckConfig> detectedConfigs = allConfigs.stream()
                .filter(UserPaycheckConfig::isPaycheckDetected)
                .toList();
            List<UserPaycheckConfig> webhookConfigs = allConfigs.stream()
                .filter(UserPaycheckConfig::isWebhookConfigured)
                .toList();

            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getId());
            response.put("totalConfigs", allConfigs.size());
            response.put("detectedConfigs", detectedConfigs.size());
            response.put("webhookConfigs", webhookConfigs.size());
            response.put("allConfigsDetected", allConfigs.size() > 0 && detectedConfigs.size() == allConfigs.size());
            response.put("allWebhooksConfigured", allConfigs.size() > 0 && webhookConfigs.size() == allConfigs.size());

            // Add details for each config
            response.put("configs", allConfigs.stream().map(config -> {
                Map<String, Object> configInfo = new HashMap<>();
                configInfo.put("id", config.getId());
                configInfo.put("name", config.getName());
                configInfo.put("accountId", config.getAccountId());
                configInfo.put("paycheckDetected", config.isPaycheckDetected());
                configInfo.put("webhookConfigured", config.isWebhookConfigured());
                configInfo.put("lastDetectionAttempt", config.getLastDetectionAttempt());
                configInfo.put("paycheckDetectedAt", config.getPaycheckDetectedAt());
                configInfo.put("webhookConfiguredAt", config.getWebhookConfiguredAt());
                configInfo.put("plaidStreamId", config.getPlaidStreamId());
                return configInfo;
            }).toList());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error getting paycheck detection status: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to get status"));
        }
    }

    /**
     * Admin endpoint to trigger paycheck detection for all users (can be called via cron job)
     */
    @PostMapping("/detect-all")
    public ResponseEntity<Map<String, Object>> triggerPaycheckDetectionForAll() {
        try {
            logger.info("Manual trigger for all users' paycheck detection");
            
            // This will call the same logic as the scheduled job
            paycheckDetectionService.detectPaychecksDaily();

            return ResponseEntity.ok(Map.of(
                "message", "Paycheck detection completed for all users",
                "timestamp", LocalDateTime.now().toString()
            ));

        } catch (Exception e) {
            logger.error("Error in bulk paycheck detection: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to detect paychecks for all users"));
        }
    }
}
