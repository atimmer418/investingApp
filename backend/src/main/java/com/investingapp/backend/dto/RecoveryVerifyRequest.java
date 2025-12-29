package com.investingapp.backend.dto;

import lombok.Data;

@Data
public class RecoveryVerifyRequest {
    private String ssn;
    private String otp;
}
