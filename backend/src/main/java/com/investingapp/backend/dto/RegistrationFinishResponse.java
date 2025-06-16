package com.investingapp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegistrationFinishResponse {
    private boolean success;
    private String message;
    private String jwtToken;
    private Long userId; // Or String, depending on your User ID type
    private String email;
}
