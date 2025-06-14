// FinishRegistrationRequest.java
package com.investingapp.backend.dto;
import lombok.Data;
@Data
public class FinishRegistrationRequest {
    private String email; // To associate with the user
    private String credential; // JSON string from navigator.credentials.create()
    private String requestOptionsJson; // JSON string of PublicKeyCredentialCreationOptions from start
}