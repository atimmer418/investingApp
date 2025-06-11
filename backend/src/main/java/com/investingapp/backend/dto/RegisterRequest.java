// src/main/java/com/investingapp/backend/dto/RegisterRequest.java
package com.investingapp.backend.dto; // Ensure this package name is correct

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data; // If you are using Lombok
// If not using Lombok, you'll need getters and setters for these fields

@Data // Lombok: Generates getters, setters, toString, equals, hashCode
public class RegisterRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 1, max = 50, message = "First name must be between 1 and 50 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 1, max = 50, message = "Last name must be between 1 and 50 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    // Note: Max length 100 is for the raw password from user.
    // The hashed password in the User entity can be longer.
    private String password;

    @NotBlank(message = "Last name is required")
    @Size(min = 1, max = 50, message = "Last name must be between 1 and 50 characters")
    private String temporaryUserId;

    // If not using Lombok, you need to add:
    // public RegisterRequest() {} // No-arg constructor
    // Getters and Setters for all fields:
    // public String getFirstName() { return firstName; }
    // public void setFirstName(String firstName) { this.firstName = firstName; }
    // ... and so on for lastName, email, password
}