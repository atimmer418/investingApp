package com.investingapp.backend.controller;

import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.services.UserDetailsImpl;
import com.investingapp.backend.service.AlpacaApiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DocumentsController {

    private static final Logger logger = LoggerFactory.getLogger(DocumentsController.class);

    @Autowired
    private AlpacaApiService alpacaApiService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @GetMapping("/tax")
    public ResponseEntity<?> getTaxDocuments(
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end) {
        try {
            User user = getCurrentUser();
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated"));
            }

            if (user.getAlpacaAccountId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "User does not have an Alpaca account"));
            }

            logger.info("Fetching documents for account: {}", user.getAlpacaAccountId());
            String documentsJson = alpacaApiService.getAccountDocuments(user.getAlpacaAccountId(), start, end);
            
            // Parse the JSON string to an Object to ensure correct serialization in the response
            Object documents = objectMapper.readValue(documentsJson, Object.class);
            
            return ResponseEntity.ok(documents);

        } catch (Exception e) {
            logger.error("Error fetching tax documents: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch tax documents"));
        }
    }

    @GetMapping("/tax/{documentId}/download")
    public ResponseEntity<?> downloadDocument(@PathVariable String documentId) {
        try {
            User user = getCurrentUser();
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            if (user.getAlpacaAccountId() == null) {
                return ResponseEntity.badRequest().build();
            }

            byte[] document = alpacaApiService.downloadDocument(user.getAlpacaAccountId(), documentId);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "document_" + documentId + ".pdf");
            
            return new ResponseEntity<>(document, headers, HttpStatus.OK);

        } catch (Exception e) {
            logger.error("Error downloading document {}: {}", documentId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl)) {
            return null;
        }
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Optional<User> userOpt = userRepository.findById(userDetails.getId());
        
        return userOpt.orElse(null);
    }
}
