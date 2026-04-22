package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.InvestmentScheduleRepository;
import com.investingapp.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class AccountStatusService {

    private static final Logger logger = LoggerFactory.getLogger(AccountStatusService.class);

    private final UserRepository userRepository;
    private final InvestmentScheduleRepository investmentScheduleRepository;
    private final AlpacaApiService alpacaApiService;
    private final EncryptionService encryptionService;
    private final EmailService emailService;
    private final PlaidToAlpacaService plaidToAlpacaService;
    private final InvestmentScheduleService investmentScheduleService;
    private final ObjectMapper objectMapper;

    public AccountStatusService(
            UserRepository userRepository,
            InvestmentScheduleRepository investmentScheduleRepository,
            AlpacaApiService alpacaApiService,
            EncryptionService encryptionService,
            EmailService emailService,
            PlaidToAlpacaService plaidToAlpacaService,
            InvestmentScheduleService investmentScheduleService) {
        this.userRepository = userRepository;
        this.investmentScheduleRepository = investmentScheduleRepository;
        this.alpacaApiService = alpacaApiService;
        this.encryptionService = encryptionService;
        this.emailService = emailService;
        this.plaidToAlpacaService = plaidToAlpacaService;
        this.investmentScheduleService = investmentScheduleService;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Poll Alpaca for the current status of all users whose account is in a
     * non-terminal state (i.e., not ACTIVE or REJECTED). Called by the scheduler.
     */
    @Transactional
    public void checkAndUpdateAccountStatuses() {
        List<User> pendingUsers = userRepository.findUsersWithPendingAccountStatus();
        logger.info("Account status poll: {} user(s) with pending status", pendingUsers.size());

        for (User user : pendingUsers) {
            try {
                if (user.getAlpacaAccountId() == null) {
                    logger.warn("User {} has accountStatus={} but no Alpaca account ID — skipping",
                            user.getEmail(), user.getAccountStatus());
                    continue;
                }

                String alpacaAccountId = encryptionService.decrypt(user.getAlpacaAccountId());
                String rawResponse = alpacaApiService.getAccountStatus(alpacaAccountId);
                JsonNode responseNode = objectMapper.readTree(rawResponse);

                if (!responseNode.has("status")) {
                    logger.warn("No 'status' field in Alpaca response for account {} (user {})",
                            alpacaAccountId, user.getEmail());
                    continue;
                }

                String alpacaStatus = responseNode.get("status").asText().toUpperCase();

                if (alpacaStatus.equals(user.getAccountStatus())) {
                    // No change — nothing to do
                    continue;
                }

                logger.info("Account status changed for user {}: {} -> {}",
                        user.getEmail(), user.getAccountStatus(), alpacaStatus);

                switch (alpacaStatus) {
                    case "ACTIVE" -> handleActive(user);
                    case "REJECTED" -> handleRejected(user);
                    case "ACTION_REQUIRED" -> handleActionRequired(user);
                    default -> {
                        // Intermediate states (APPROVAL_PENDING, SUBMITTED, etc.) — just update
                        user.setAccountStatus(alpacaStatus);
                        userRepository.save(user);
                        logger.info("Updated accountStatus to {} for user {}", alpacaStatus, user.getEmail());
                    }
                }

            } catch (Exception e) {
                logger.error("Error checking account status for user {}: {}", user.getEmail(), e.getMessage(), e);
            }
        }
    }

    /**
     * Handle an account transitioning to ACTIVE.
     * Updates status in DB, then attempts ACH relationship creation if Plaid data is available.
     */
    @Transactional
    public void handleActive(User user) {
        user.setAccountStatus("ACTIVE");
        userRepository.save(user);
        logger.info("Account ACTIVE for user {} — investment schedule will now be eligible for execution",
                user.getEmail());
        // TODO: push notification to frontend — account is now active

        attemptAchCreation(user);
    }

    /**
     * Handle an account that has been REJECTED.
     * Sends a rejection email, deletes the user's InvestmentSchedule, then hard-deletes the user.
     * All cascade-deleted entities (passkeys, progress, etc.) are handled by JPA cascades.
     */
    @Transactional
    public void handleRejected(User user) {
        logger.warn("Account REJECTED for user {} — sending rejection email and deleting user record",
                user.getEmail());

        // Notify the user before deleting their record
        emailService.sendEmail(
                user.getEmail(),
                "Your FRED account application was not approved",
                "We're sorry, but we were unable to approve your FRED brokerage account application at this time. "
                + "If you have questions, please contact our support team.");

        // Delete InvestmentSchedule first (not covered by User cascades)
        investmentScheduleRepository.deleteAllByUser(user);
        logger.info("Deleted InvestmentSchedule(s) for rejected user {}", user.getEmail());

        // Hard delete the user — all @OneToMany cascade=ALL entities deleted by JPA
        userRepository.delete(user);
        logger.info("Hard-deleted user record for rejected user {}", user.getEmail());
    }

    /**
     * Handle an account that requires additional documentation (ACTION_REQUIRED).
     * Updates status in DB and logs. The frontend polls /api/alpaca/my-account-status to detect this.
     */
    @Transactional
    public void handleActionRequired(User user) {
        user.setAccountStatus("ACTION_REQUIRED");
        userRepository.save(user);
        logger.info("Account ACTION_REQUIRED for user {} — user must upload additional documents",
                user.getEmail());
        // TODO: push notification to frontend — action required, prompt user to upload documents
    }

    /**
     * Retry ACH setup for ACTIVE users who have Plaid data but no ACH relationship yet.
     * This covers the case where a user's account became ACTIVE before they linked their
     * bank account via Plaid. Called by the ACH retry scheduler.
     */
    @Transactional
    public void setupPendingAchRelationships() {
        List<User> users = userRepository.findActiveUsersNeedingAchSetup();
        logger.info("ACH setup retry: {} ACTIVE user(s) still need ACH relationship", users.size());

        for (User user : users) {
            try {
                attemptAchCreation(user);
            } catch (Exception e) {
                logger.error("Error during ACH setup retry for user {}: {}", user.getEmail(), e.getMessage(), e);
            }
        }
    }

    /**
     * Called when a user changes their linked bank account.
     * Resets the investment schedule and triggers a fresh ACH creation if the account is already ACTIVE.
     */
    @Transactional
    public void handleBankAccountChange(User user) {
        investmentScheduleService.resetForBankChange(user);

        if ("ACTIVE".equals(user.getAccountStatus())) {
            logger.info("Account ACTIVE for user {} — triggering ACH creation for new bank account", user.getEmail());
            attemptAchCreation(user);
        } else {
            logger.info("Account not yet ACTIVE for user {} — ACH will be created when account becomes active", user.getEmail());
        }
    }

    /**
     * Attempt to create an ACH relationship for a user using their stored Plaid data.
     * Silently skips if Plaid data is not yet available (the retry scheduler will pick it up).
     * Sends an error email if creation fails unexpectedly.
     */
    @Transactional
    public void attemptAchCreation(User user) {
        if (user.getPlaidAccessToken() == null || user.getPlaidAccountId() == null) {
            logger.info("Plaid data not yet available for user {} — ACH will be created by retry scheduler once bank is linked",
                    user.getEmail());
            return;
        }

        if (user.getAlpacaAccountId() == null) {
            logger.warn("Cannot create ACH for user {}: no Alpaca account ID on record", user.getEmail());
            return;
        }

        String firstName = user.getFirstName();
        String lastName = user.getLastName();
        if (firstName == null || firstName.isBlank() || lastName == null || lastName.isBlank()) {
            logger.warn("Cannot create ACH for user {}: first/last name not set — will retry after name is available",
                    user.getEmail());
            return;
        }

        // If an ACH relationship was already created (e.g., user linked bank during onboarding
        // before their account became ACTIVE), skip creation and use the existing ID to unpause.
        if (user.getAlpacaAchRelationshipId() != null) {
            try {
                String existingAchId = encryptionService.decrypt(user.getAlpacaAchRelationshipId());
                investmentScheduleService.updateWithAchRequestId(user, existingAchId);
                logger.info("ACH relationship already exists ({}) — investment schedule unpaused for user {}",
                        existingAchId, user.getEmail());
            } catch (Exception e) {
                logger.error("Error unpausing schedule with existing ACH relationship for user {}: {}",
                        user.getEmail(), e.getMessage(), e);
            }
            return;
        }

        // Guard against cases where Alpaca already has an active ACH relationship but our DB
        // never recorded it (e.g., a previous run crashed between Alpaca responding and the DB write).
        try {
            String alpacaAccountId = encryptionService.decrypt(user.getAlpacaAccountId());
            String existingRelationships = alpacaApiService.getAchRelationships(alpacaAccountId);
            JsonNode relationships = objectMapper.readTree(existingRelationships);
            if (relationships.isArray()) {
                for (JsonNode rel : relationships) {
                    String status = rel.has("status") ? rel.get("status").asText() : "";
                    if ("APPROVED".equals(status) || "QUEUED".equals(status)) {
                        String achId = rel.get("id").asText();
                        logger.info("Found existing active ACH relationship {} on Alpaca for user {} — saving and unpausing",
                                achId, user.getEmail());
                        investmentScheduleService.updateWithAchRequestId(user, achId);
                        return;
                    }
                }
            }
        } catch (Exception e) {
            logger.warn("Could not check existing ACH relationships for user {} — proceeding with creation: {}",
                    user.getEmail(), e.getMessage());
        }

        String ownerName = firstName + " " + lastName;

        try {
            String alpacaAccountId = encryptionService.decrypt(user.getAlpacaAccountId());

            Map<String, Object> achResult = plaidToAlpacaService.createAchRelationshipFromPlaid(
                    alpacaAccountId,
                    user.getPlaidAccountId(),
                    ownerName,
                    user);

            if (achResult.containsKey("error")) {
                String errorMsg = (String) achResult.get("error");
                logger.error("ACH creation failed for user {}: {}", user.getEmail(), errorMsg);
                emailService.sendEmail(
                        user.getEmail(),
                        "Action needed: bank account linking failed",
                        "We were unable to automatically link your bank account after your FRED account was approved. "
                        + "Please open the FRED app and link your bank account manually in Settings. "
                        + "Error: " + errorMsg);
                return;
            }

            String achId = (String) achResult.get("id");
            if (achId == null) {
                logger.warn("ACH creation for user {} returned no ID — cannot update investment schedule", user.getEmail());
                return;
            }

            // Save ACH ID to InvestmentSchedule and unpause it
            investmentScheduleService.updateWithAchRequestId(user, achId);
            logger.info("ACH relationship {} created and investment schedule unpaused for user {}",
                    achId, user.getEmail());

        } catch (Exception e) {
            logger.error("Unexpected error creating ACH relationship for user {}: {}", user.getEmail(), e.getMessage(), e);
        }
    }
}
