package com.investingapp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RecoveryResponse {
    private boolean success;
    private String message;
    private String token; // Temporary token for re-enrollment
}
