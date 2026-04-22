package com.investingapp.backend.dto;

import lombok.Data;

@Data
public class RecoveryVerifyRequest {
    private String email;
    private String otp;
}
