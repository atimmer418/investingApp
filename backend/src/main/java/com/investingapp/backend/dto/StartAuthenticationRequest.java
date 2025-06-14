// StartAuthenticationRequest.java
package com.investingapp.backend.dto;
import lombok.Data;
@Data
public class StartAuthenticationRequest {
    private String email; // Optional for discoverable credentials (passkeys)
}