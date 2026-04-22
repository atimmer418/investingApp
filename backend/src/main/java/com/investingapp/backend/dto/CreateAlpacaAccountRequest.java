package com.investingapp.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateAlpacaAccountRequest {

    // ── Contact ──────────────────────────────────────────────────────────────
    @NotBlank(message = "Email address is required")
    @Email(message = "Email address must be valid")
    private String emailAddress;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotBlank(message = "Street address is required")
    private String streetAddress;

    @NotBlank(message = "City is required")
    private String city;

    @NotBlank(message = "State is required")
    private String state;

    @NotBlank(message = "Postal code is required")
    private String postalCode;

    // ── Identity ─────────────────────────────────────────────────────────────
    @NotBlank(message = "Given name is required")
    private String givenName;

    @NotBlank(message = "Family name is required")
    private String familyName;

    @NotBlank(message = "Date of birth is required")
    private String dateOfBirth; // Format: YYYY-MM-DD

    @NotBlank(message = "Tax ID (SSN) is required")
    private String taxId;

    // Defaulted to USA_SSN; frontend may omit this field
    private String taxIdType = "USA_SSN";

    // Hardcoded server-side; included here for completeness
    private String countryOfTaxResidence = "USA";

    @NotNull(message = "Funding source is required")
    private List<String> fundingSource;

    // ── Disclosures ───────────────────────────────────────────────────────────
    @JsonProperty("isControlPerson")
    private boolean isControlPerson = false;

    @JsonProperty("isAffiliatedExchangeOrFinra")
    private boolean isAffiliatedExchangeOrFinra = false;

    @JsonProperty("isPoliticallyExposed")
    private boolean isPoliticallyExposed = false;

    @JsonProperty("immediateFamilyExposed")
    private boolean immediateFamilyExposed = false;
}
