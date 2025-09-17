package com.investingapp.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class UpdateAchRequestIdRequest {
    
    @NotBlank(message = "ACH request ID is required")
    private String achRequestId;
    
    // Constructors
    public UpdateAchRequestIdRequest() {}
    
    public UpdateAchRequestIdRequest(String achRequestId) {
        this.achRequestId = achRequestId;
    }
    
    // Getters and Setters
    public String getAchRequestId() {
        return achRequestId;
    }
    
    public void setAchRequestId(String achRequestId) {
        this.achRequestId = achRequestId;
    }
    
    @Override
    public String toString() {
        return "UpdateAchRequestIdRequest{" +
                "achRequestId='" + achRequestId + '\'' +
                '}';
    }
}