// src/main/java/com/investingapp/backend/model/UserProgress.java
package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_progress")
@Data
@NoArgsConstructor
public class UserProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // One-to-one mapping with User entity
    @OneToOne(mappedBy = "userProgress")
    private User user;

    // Onboarding status flags - tracking the complete user flow
    // Flow: get-started → surveyinitial → fi-plan-results → authfinalize → kyc-verification → linkplaid → investment-schedule → investmentconfirmation
    @Column(name = "get_started_completed", nullable = false)
    private boolean getStartedCompleted = false;
    
    @Column(name = "survey_initial_completed", nullable = false)
    private boolean surveyInitialCompleted = false;
    
    @Column(name = "fi_plan_results_completed", nullable = false)
    private boolean fiPlanResultsCompleted = false;
    
    @Column(name = "auth_finalize_completed", nullable = false)
    private boolean authFinalizeCompleted = false;
    
    @Column(name = "kyc_verification_completed", nullable = false)
    private boolean kycVerificationCompleted = false;
    
    @Column(name = "link_plaid_completed", nullable = false)
    private boolean linkPlaidCompleted = false;
    
    @Column(name = "investment_schedule_completed", nullable = false)
    private boolean investmentScheduleCompleted = false;
    
    @Column(name = "investment_confirmation_completed", nullable = false)
    private boolean investmentConfirmationCompleted = false;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public UserProgress(User user) {
        this.user = user;
        // All progress flags default to false
    }

    /**
     * Check if all onboarding steps are completed
     */
    public boolean isOnboardingComplete() {
        return getStartedCompleted && 
               surveyInitialCompleted && 
               fiPlanResultsCompleted && 
               authFinalizeCompleted && 
               kycVerificationCompleted && 
               linkPlaidCompleted && 
               investmentScheduleCompleted && 
               investmentConfirmationCompleted;
    }

    /**
     * Get the next step in the onboarding flow
     */
    public String getNextStep() {
        if (!getStartedCompleted) return "get-started";
        if (!surveyInitialCompleted) return "surveyinitial";
        if (!fiPlanResultsCompleted) return "fi-plan-results";
        if (!authFinalizeCompleted) return "authfinalize";
        if (!kycVerificationCompleted) return "kyc-verification";
        if (!linkPlaidCompleted) return "linkplaid";
        if (!investmentScheduleCompleted) return "investment-schedule";
        if (!investmentConfirmationCompleted) return "investmentconfirmation";
        return "complete"; // All steps done
    }

    /**
     * Calculate completion percentage (0-100)
     */
    public double getCompletionPercentage() {
        int completedSteps = 0;
        int totalSteps = 8;
        
        if (getStartedCompleted) completedSteps++;
        if (surveyInitialCompleted) completedSteps++;
        if (fiPlanResultsCompleted) completedSteps++;
        if (authFinalizeCompleted) completedSteps++;
        if (kycVerificationCompleted) completedSteps++;
        if (linkPlaidCompleted) completedSteps++;
        if (investmentScheduleCompleted) completedSteps++;
        if (investmentConfirmationCompleted) completedSteps++;
        
        return (double) completedSteps / totalSteps * 100;
    }
}