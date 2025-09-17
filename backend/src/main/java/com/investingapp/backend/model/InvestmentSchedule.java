package com.investingapp.backend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "investment_schedules")
public class InvestmentSchedule {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(name = "monthly_amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal monthlyAmount;
    
    @Column(name = "frequency", length = 50)
    private String frequency; // e.g., "MONTHLY", "BIWEEKLY", "WEEKLY"
    
    @Column(name = "target_portfolio", precision = 15, scale = 2)
    private BigDecimal targetPortfolio;
    
    @Column(name = "time_to_fi")
    private Integer timeToFI; // in years
    
    @Column(name = "ach_request_id", length = 255)
    private String achRequestId; // This will be set when ACH linking is confirmed
    
    @Column(name = "is_paused", nullable = false)
    private Boolean isPaused = false;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Constructors
    public InvestmentSchedule() {}
    
    public InvestmentSchedule(User user, BigDecimal monthlyAmount, String frequency) {
        this.user = user;
        this.monthlyAmount = monthlyAmount;
        this.frequency = frequency;
        this.isPaused = false;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public BigDecimal getMonthlyAmount() {
        return monthlyAmount;
    }
    
    public void setMonthlyAmount(BigDecimal monthlyAmount) {
        this.monthlyAmount = monthlyAmount;
    }
    
    public String getFrequency() {
        return frequency;
    }
    
    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }
    
    public BigDecimal getTargetPortfolio() {
        return targetPortfolio;
    }
    
    public void setTargetPortfolio(BigDecimal targetPortfolio) {
        this.targetPortfolio = targetPortfolio;
    }
    
    public Integer getTimeToFI() {
        return timeToFI;
    }
    
    public void setTimeToFI(Integer timeToFI) {
        this.timeToFI = timeToFI;
    }
    
    public String getAchRequestId() {
        return achRequestId;
    }
    
    public void setAchRequestId(String achRequestId) {
        this.achRequestId = achRequestId;
    }
    
    public Boolean getIsPaused() {
        return isPaused;
    }
    
    public void setIsPaused(Boolean isPaused) {
        this.isPaused = isPaused;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    @Override
    public String toString() {
        return "InvestmentSchedule{" +
                "id=" + id +
                ", monthlyAmount=" + monthlyAmount +
                ", frequency='" + frequency + '\'' +
                ", targetPortfolio=" + targetPortfolio +
                ", timeToFI=" + timeToFI +
                ", achRequestId='" + achRequestId + '\'' +
                ", isPaused=" + isPaused +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}