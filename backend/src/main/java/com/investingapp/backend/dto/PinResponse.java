package com.investingapp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PinResponse {
    private boolean success;
    private String message;
    private boolean lockedOut;
    private Long lockoutDurationSeconds;
}
