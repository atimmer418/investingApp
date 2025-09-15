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
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
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

    @GetMapping("/user-data")
    public ResponseEntity<?> getUserPlaidData(Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Optional<User> userOpt = userRepository.findByEmail(userDetails.getUsername());
            
            if (userOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("User not found");
            }
            
            User user = userOpt.get();
            
            // Create response with essential Plaid data for ACH creation
            Map<String, Object> plaidData = new HashMap<>();
            plaidData.put("accessToken", user.getPlaidAccessToken());
            plaidData.put("accountId", user.getPlaidAccountId());
            plaidData.put("institutionName", user.getPlaidInstitutionName());
            plaidData.put("hasValidToken", user.getPlaidAccessToken() != null && !user.getPlaidAccessToken().isEmpty());
            
            return ResponseEntity.ok(plaidData);
        } catch (Exception e) {
            logger.error("Error retrieving user Plaid data", e);
            return ResponseEntity.status(500).body("Error retrieving Plaid data");
        }
    }

    @GetMapping("/access-token")
    public ResponseEntity<String> getAccessToken(Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Optional<User> userOpt = userRepository.findByEmail(userDetails.getUsername());
            
            if (userOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("User not found");
            }
            
            User user = userOpt.get();
            String accessToken = user.getPlaidAccessToken();
            
            if (accessToken == null || accessToken.isEmpty()) {
                return ResponseEntity.badRequest().body("No Plaid access token found");
            }
            
            return ResponseEntity.ok(accessToken);
        } catch (Exception e) {
            logger.error("Error retrieving access token", e);
            return ResponseEntity.status(500).body("Error retrieving access token");
        }
    }

    @GetMapping("/primary-bank-account")
    public ResponseEntity<?> getPrimaryBankAccount(Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Optional<User> userOpt = userRepository.findByEmail(userDetails.getUsername());
            
            if (userOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("User not found");
            }
            
            User user = userOpt.get();
            
            // Create response with bank account info needed for ACH
            Map<String, Object> bankAccount = new HashMap<>();
            bankAccount.put("accountId", user.getPlaidAccountId());
            bankAccount.put("accessToken", user.getPlaidAccessToken());
            bankAccount.put("institutionName", user.getPlaidInstitutionName());
            bankAccount.put("accountName", user.getPlaidAccountName());
            bankAccount.put("accountType", user.getPlaidAccountType());
            bankAccount.put("accountSubtype", user.getPlaidAccountSubtype());
            
            return ResponseEntity.ok(bankAccount);
        } catch (Exception e) {
            logger.error("Error retrieving primary bank account", e);
            return ResponseEntity.status(500).body("Error retrieving bank account");
        }
    }

    @GetMapping("/bank-income")
    public ResponseEntity<?> getBankIncome(Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Optional<User> userOpt = userRepository.findByEmail(userDetails.getUsername());
            
            if (userOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("User not found");
            }
            
            User user = userOpt.get();
            String accessToken = user.getPlaidAccessToken();
            
            if (accessToken == null || accessToken.isEmpty()) {
                return ResponseEntity.badRequest().body("No Plaid access token found");
            }
            
            // Call Plaid service to get bank income data
            Map<String, Object> incomeData = plaidService.getBankIncomeData(accessToken);
            
            return ResponseEntity.ok(incomeData);
        } catch (Exception e) {
            logger.error("Error retrieving bank income data", e);
            return ResponseEntity.status(500).body("Error retrieving bank income data: " + e.getMessage());
        }
    }
}