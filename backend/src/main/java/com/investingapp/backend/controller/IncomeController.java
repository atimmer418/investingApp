// src/main/java/com/investingapp/backend/controller/IncomeController.java
package com.investingapp.backend.controller;

import com.investingapp.backend.dto.MessageResponse;
import com.investingapp.backend.dto.PaycheckSourceDto;
import com.investingapp.backend.dto.SelectedPaycheckDto;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.services.UserDetailsImpl;
import com.investingapp.backend.service.EncryptionService;
import com.investingapp.backend.service.PlaidService;
// You'll need a service to handle saving paycheck configurations, let's call it UserFinancialConfigService
import com.investingapp.backend.service.UserFinancialConfigService; 

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600) // Adjust for production
@RestController
@RequestMapping("/api/income") // Changed from /api/plaid to /api/income for this controller
public class IncomeController {

    private static final Logger logger = LoggerFactory.getLogger(IncomeController.class);

    private final PlaidService plaidService;
    private final UserRepository userRepository;
    private final EncryptionService encryptionService;
    private final UserFinancialConfigService userFinancialConfigService; // New service

    @Autowired
    public IncomeController(PlaidService plaidService,
                            UserRepository userRepository,
                            EncryptionService encryptionService,
                            UserFinancialConfigService userFinancialConfigService) {
        this.plaidService = plaidService;
        this.userRepository = userRepository;
        this.encryptionService = encryptionService;
        this.userFinancialConfigService = userFinancialConfigService;
    }

    @GetMapping("/paycheck_sources")
    public ResponseEntity<?> getPaycheckSources() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        // Ensure principal is UserDetailsImpl before casting
        if (!(authentication.getPrincipal() instanceof UserDetailsImpl)) {
            logger.warn("/income/paycheck_sources: Authentication principal is not an instance of UserDetailsImpl.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Invalid authentication details."));
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        User appUser = userRepository.findById(userDetails.getId()).orElse(null);

        if (appUser == null) {
            logger.warn("/income/paycheck_sources: User ID {} not found from authenticated principal.", userDetails.getId());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new MessageResponse("User not found."));
        }
        if (!appUser.isPlaidLinked() || appUser.getPlaidAccessToken() == null || appUser.getPlaidAccessToken().isEmpty()) {
            logger.warn("/income/paycheck_sources: User {} Plaid not linked or access token missing.", userDetails.getUsername());
            return ResponseEntity.badRequest().body(new MessageResponse("Plaid account not linked or access token missing. Please link your bank account."));
        }

        try {
            String decryptedAccessToken = encryptionService.decrypt(appUser.getPlaidAccessToken());
            List<PaycheckSourceDto> paycheckSources = plaidService.getRecurringIncome(decryptedAccessToken);
            return ResponseEntity.ok(paycheckSources);
        } catch (IOException e) {
            logger.error("Error fetching paycheck sources for user {}: {}", appUser.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error fetching paycheck information: " + e.getMessage()));
        } catch (Exception e) { // Catch decryption or other errors
            logger.error("Error processing request for paycheck sources for user {}: {}", appUser.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error processing request. Please try again."));
        }
    }

    @PostMapping("/paycheck_configurations") // Changed endpoint name
    public ResponseEntity<?> savePaycheckConfigurations(@Valid @RequestBody List<SelectedPaycheckDto> selectedPaychecks) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication.getPrincipal() instanceof UserDetailsImpl)) {
            logger.warn("/income/paycheck_configurations: Authentication principal is not an instance of UserDetailsImpl.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Invalid authentication details."));
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User appUser = userRepository.findById(userDetails.getId()).orElse(null);

        if (appUser == null) {
            logger.warn("/income/paycheck_configurations: User ID {} not found from authenticated principal.", userDetails.getId());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new MessageResponse("User not found."));
        }

        try {
            userFinancialConfigService.saveUserPaycheckConfigurations(appUser, selectedPaychecks);
            // Consider updating user's survey progress here if this completes a step
            // appUser.setPaycheckConfigCompleted(true); // Example flag on User entity
            // userRepository.save(appUser);
            return ResponseEntity.ok(new MessageResponse("Paycheck configurations saved successfully."));
        } catch (Exception e) {
            logger.error("Error saving paycheck configurations for user {}: {}", appUser.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error saving paycheck configurations: " + e.getMessage()));
        }
    }
}