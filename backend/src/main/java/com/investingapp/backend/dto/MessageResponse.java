// src/main/java/com/investingapp/backend/dto/MessageResponse.java
package com.investingapp.backend.dto; // Ensure package name is correct

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor; // Good to add for flexibility

@Data
@NoArgsConstructor // Add if not already there
@AllArgsConstructor
public class MessageResponse {
    private String message;
}