// src/main/java/com/investingapp/backend/repository/UserProgressRepository.java
package com.investingapp.backend.repository;

import com.investingapp.backend.model.UserProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserProgressRepository extends JpaRepository<UserProgress, Long> {
    
    /**
     * Find UserProgress by associated User's email
     */
    @Query("SELECT up FROM UserProgress up JOIN up.user u WHERE u.email = :email")
    Optional<UserProgress> findByUserEmail(@Param("email") String email);
    
    /**
     * Find UserProgress by associated User's ID
     */
    @Query("SELECT up FROM UserProgress up JOIN up.user u WHERE u.id = :userId")
    Optional<UserProgress> findByUserId(@Param("userId") Long userId);
    
    /**
     * Count users who have completed onboarding
     */
    @Query("SELECT COUNT(up) FROM UserProgress up WHERE " +
           "up.getStartedCompleted = true AND " +
           "up.surveyInitialCompleted = true AND " +
           "up.fiPlanResultsCompleted = true AND " +
           "up.authFinalizeCompleted = true AND " +
           "up.kycVerificationCompleted = true AND " +
           "up.linkPlaidCompleted = true AND " +
           "up.investmentScheduleCompleted = true AND " +
           "up.investmentConfirmationCompleted = true")
    long countCompletedOnboarding();
    
    /**
     * Find users at a specific step in the onboarding process
     */
    @Query("SELECT up FROM UserProgress up WHERE " +
           "up.getStartedCompleted = :getStarted AND " +
           "up.surveyInitialCompleted = :surveyInitial AND " +
           "up.fiPlanResultsCompleted = :fiPlanResults AND " +
           "up.authFinalizeCompleted = :authFinalize AND " +
           "up.kycVerificationCompleted = :kycVerification AND " +
           "up.linkPlaidCompleted = :linkPlaid AND " +
           "up.investmentScheduleCompleted = :investmentSchedule AND " +
           "up.investmentConfirmationCompleted = :investmentConfirmation")
    java.util.List<UserProgress> findUsersAtStep(
            @Param("getStarted") boolean getStarted,
            @Param("surveyInitial") boolean surveyInitial,
            @Param("fiPlanResults") boolean fiPlanResults,
            @Param("authFinalize") boolean authFinalize,
            @Param("kycVerification") boolean kycVerification,
            @Param("linkPlaid") boolean linkPlaid,
            @Param("investmentSchedule") boolean investmentSchedule,
            @Param("investmentConfirmation") boolean investmentConfirmation
    );
}