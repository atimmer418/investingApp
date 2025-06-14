// StartRegistrationRequest.java
package com.investingapp.backend.dto;
import lombok.Data;
@Data
public class StartRegistrationRequest {
    private String email;
    private String displayName; // e.g., "John Doe"
    private String temporaryPlaidIdentifier; // If linking Plaid during this flow
}