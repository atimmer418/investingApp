package com.investingapp.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

/**
 * Request body for PATCH /api/alpaca/account/kyc
 * All fields are optional — only non-null fields are included in the Alpaca PATCH payload.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateKycRequest {

    // Contact fields
    private String emailAddress;
    private String phoneNumber;
    private String streetAddress;
    private String city;
    private String state;
    private String postalCode;

    // Identity fields
    private String givenName;
    private String familyName;
    private String dateOfBirth; // YYYY-MM-DD
    private List<String> fundingSource;

    // Disclosures
    @JsonProperty("isControlPerson")
    private Boolean isControlPerson;

    @JsonProperty("isAffiliatedExchangeOrFinra")
    private Boolean isAffiliatedExchangeOrFinra;

    @JsonProperty("isPoliticallyExposed")
    private Boolean isPoliticallyExposed;

    @JsonProperty("immediateFamilyExposed")
    private Boolean immediateFamilyExposed;
}
