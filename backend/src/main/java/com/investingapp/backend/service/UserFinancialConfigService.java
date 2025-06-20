// src/main/java/com/investingapp/backend/service/UserFinancialConfigService.java
package com.investingapp.backend.service;

import com.investingapp.backend.dto.SelectedPaycheckDto;
import com.investingapp.backend.model.User;
import com.investingapp.backend.model.UserPaycheckConfig;
import com.investingapp.backend.repository.UserPaycheckConfigRepository;
import com.investingapp.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class UserFinancialConfigService {

    private static final Logger logger = LoggerFactory.getLogger(UserFinancialConfigService.class);

    private final UserPaycheckConfigRepository paycheckConfigRepository;
    private final UserRepository userRepository; // If needed to update User entity flags

    @Autowired
    public UserFinancialConfigService(UserPaycheckConfigRepository paycheckConfigRepository,
                                      UserRepository userRepository) {
        this.paycheckConfigRepository = paycheckConfigRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void saveUserPaycheckConfigurations(User user, List<SelectedPaycheckDto> selectedPaychecks) {
        logger.info("Saving paycheck configurations for user: {}", user.getEmail());

        // Option: Delete existing configs for this user first to replace them all
        paycheckConfigRepository.deleteByUser(user);
        logger.debug("Deleted existing paycheck configurations for user: {}", user.getEmail());

        for (SelectedPaycheckDto selectedDto : selectedPaychecks) {
            UserPaycheckConfig config = new UserPaycheckConfig();
            config.setUser(user);
            config.setAccountId(selectedDto.getAccountId());
            config.setName(selectedDto.getName());
            config.setWithdrawalPercentage(selectedDto.getWithdrawalPercentage());
            paycheckConfigRepository.save(config);
            logger.debug("Saved paycheck config: AccountId={}, Name='{}', Percentage={} for user {}",
                    selectedDto.getAccountId(), selectedDto.getName(), selectedDto.getWithdrawalPercentage(), user.getEmail());
        }

        // Example: Update a flag on the User entity if this completes a step
        // user.setPaycheckSelectionCompleted(true);
        // userRepository.save(user);

        logger.info("Successfully saved {} paycheck configurations for user: {}", selectedPaychecks.size(), user.getEmail());
    }
}