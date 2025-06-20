// src/main/java/com/investingapp/backend/repository/UserPaycheckConfigRepository.java
package com.investingapp.backend.repository;

import com.investingapp.backend.model.User;
import com.investingapp.backend.model.UserPaycheckConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserPaycheckConfigRepository extends JpaRepository<UserPaycheckConfig, Long> {
    List<UserPaycheckConfig> findByUser(User user);
    void deleteByUser(User user); // For easily replacing all configs
}