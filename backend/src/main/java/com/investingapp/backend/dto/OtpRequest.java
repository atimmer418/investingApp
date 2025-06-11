package com.investingapp.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import lombok.NoArgsConstructor; // Optional: if needed for some frameworks/libraries
import lombok.AllArgsConstructor; // Optional: for convenience

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OtpRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$", message = "Phone number must be in E.164 format (e.g., +12223334444)")
    private String phoneNumber;

    // Lombok's @Data will generate getters and setters.
    // If not using Lombok, you need to add them manually.
}