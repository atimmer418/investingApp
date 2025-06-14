// FinishAuthenticationRequest.java
package com.investingapp.backend.dto;
import lombok.Data;
@Data
public class FinishAuthenticationRequest {
    // userHandle might be sent if not discoverable, or extracted from credential on server
    // private String userHandle;
    private String credential; // JSON string from navigator.credentials.get()
    private String requestOptionsJson; // JSON string of AssertionRequest from start
}