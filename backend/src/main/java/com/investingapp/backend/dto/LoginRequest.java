// src/main/java/com/investingapp/backend/dto/LoginRequest.java
package com.investingapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    private String email;

    @NotBlank
    private String password;
}