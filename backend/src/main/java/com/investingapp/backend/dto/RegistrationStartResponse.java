package com.investingapp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegistrationStartResponse {

    // This will contain the JSON representation of PublicKeyCredentialCreationOptions
    private String options;
}