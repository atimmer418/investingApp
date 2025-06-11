package com.investingapp.backend.controller;

import com.investingapp.backend.dto.MessageResponse;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.services.UserDetailsImpl;
import com.investingapp.backend.service.PlaidService;
import com.plaid.client.model.ItemPublicTokenExchangeResponse; // Make sure this is imported
import com.plaid.client.model.LinkTokenCreateResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600) // For development, restrict in production
@RestController
@RequestMapping("/api/plaid")
public class PlaidController {

    private static final Logger logger = LoggerFactory.getLogger(PlaidController.class);

    @Autowired
    private PlaidService plaidService;

    @Autowired
    private UserRepository userRepository;

    // --- ANONYMOUS FLOW ENDPOINTS ---

    @PostMapping("/create_link_token_anonymous")
    public ResponseEntity<?> createLinkTokenAnonymous() {
        String temporaryUserId = "anon_" + UUID.randomUUID().toString();
        logger.info("Request received for /create_link_token_anonymous. Generated temp ID: {}", temporaryUserId);
        try {
            LinkTokenCreateResponse response = plaidService.createLinkTokenAnonymous(temporaryUserId);
            return ResponseEntity.ok(Map.of(
                    "link_token", response.getLinkToken(),
                    "expiration", response.getExpiration().toString(), // Ensure toString if not already string
                    "temporary_user_id", temporaryUserId
            ));
        } catch (IOException e) {
            logger.error("Error creating anonymous Plaid link token: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error creating Plaid link token: " + e.getMessage()));
        }
    }

    @PostMapping("/exchange_public_token_anonymous")
    public ResponseEntity<?> exchangePublicTokenAnonymous(@RequestBody Map<String, String> payload) {
        String publicToken = payload.get("public_token");
        String temporaryUserId = payload.get("temporary_user_id");
        logger.info("Request received for /exchange_public_token_anonymous. Temp ID: {}", temporaryUserId);


        if (publicToken == null || publicToken.isEmpty() || temporaryUserId == null || temporaryUserId.isEmpty()) {
            logger.warn("/exchange_public_token_anonymous: Missing public_token or temporary_user_id");
            return ResponseEntity.badRequest().body(new MessageResponse("public_token and temporary_user_id are required"));
        }

        try {
            plaidService.exchangePublicTokenAndStoreTemporarily(publicToken, temporaryUserId);
            return ResponseEntity.ok(new MessageResponse("Plaid connection pending account creation. Please create or link your account."));
        } catch (IOException e) {
            logger.error("Error exchanging anonymous Plaid public token for temp ID {}: {}", temporaryUserId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error exchanging Plaid public token: " + e.getMessage()));
        }
    }

    // --- AUTHENTICATED FLOW ENDPOINTS ---

    @PostMapping("/create_link_token") // No suffix, implies authenticated
    public ResponseEntity<?> createLinkTokenAuthenticated() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof UserDetailsImpl)) {
            logger.warn("/create_link_token: User not authenticated properly.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("User not authenticated"));
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String clientUserId = String.valueOf(userDetails.getId()); // Use your app's internal user ID
        logger.info("Request received for /create_link_token (authenticated). User ID: {}", clientUserId);

        try {
            LinkTokenCreateResponse response = plaidService.createLinkTokenForAuthenticatedUser(clientUserId);
            return ResponseEntity.ok(Map.of(
                    "link_token", response.getLinkToken(),
                    "expiration", response.getExpiration().toString() // Ensure toString
            ));
        } catch (IOException e) {
            logger.error("Error creating Plaid link token for authenticated user {}: {}", clientUserId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error creating Plaid link token: " + e.getMessage()));
        }
    }

    @PostMapping("/exchange_public_token") // No suffix, implies authenticated
    public ResponseEntity<?> exchangePublicTokenAuthenticated(@RequestBody Map<String, String> payload) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof UserDetailsImpl)) {
            logger.warn("/exchange_public_token: User not authenticated properly.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("User not authenticated"));
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User appUser = userRepository.findById(userDetails.getId())
                .orElse(null);

        if (appUser == null) {
            logger.error("/exchange_public_token: Authenticated user ID {} not found in database.", userDetails.getId());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new MessageResponse("User not found in database"));
        }
        logger.info("Request received for /exchange_public_token (authenticated). User ID: {}", appUser.getId());

        String publicToken = payload.get("public_token");
        if (publicToken == null || publicToken.isEmpty()) {
            logger.warn("/exchange_public_token: public_token is required for user ID {}.", appUser.getId());
            return ResponseEntity.badRequest().body(new MessageResponse("public_token is required"));
        }

        try {
            // This service method directly links to the authenticated appUser
            ItemPublicTokenExchangeResponse plaidResponse = plaidService.exchangePublicTokenAndLinkUser(publicToken, appUser);
            // The service method already updates the user and saves.

            return ResponseEntity.ok(new MessageResponse("Plaid public token exchanged successfully and linked to user."));
        } catch (IOException e) {
            logger.error("Error exchanging Plaid public token for user {}: {}", appUser.getId(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error exchanging Plaid public token: " + e.getMessage()));
        }
    }
}