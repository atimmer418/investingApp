package com.investingapp.backend.dto;

import org.junit.jupiter.api.Test;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class RegistrationStartRequestTest {

    private final ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
    private final Validator validator = factory.getValidator();

    @Test
    void testValidRegistrationStartRequestWithoutTemporaryUserId() {
        // Test new user flow - account creation without Plaid temporary user ID
        RegistrationStartRequest request = new RegistrationStartRequest();
        request.setEmail("test@example.com");
        // temporaryUserId is intentionally left null/empty for new flow

        Set<ConstraintViolation<RegistrationStartRequest>> violations = validator.validate(request);
        
        // Should have no validation errors (temporaryUserId is now optional)
        assertTrue(violations.isEmpty(), "RegistrationStartRequest should be valid without temporaryUserId");
    }

    @Test
    void testValidRegistrationStartRequestWithTemporaryUserId() {
        // Test old user flow - account creation after Plaid bank linking
        RegistrationStartRequest request = new RegistrationStartRequest();
        request.setEmail("test@example.com");
        request.setTemporaryUserId("anon_12345");

        Set<ConstraintViolation<RegistrationStartRequest>> violations = validator.validate(request);
        
        // Should have no validation errors
        assertTrue(violations.isEmpty(), "RegistrationStartRequest should be valid with temporaryUserId");
    }

    @Test
    void testInvalidEmailStillFails() {
        // Test that email validation still works
        RegistrationStartRequest request = new RegistrationStartRequest();
        request.setEmail("invalid-email");
        // temporaryUserId is null - should still be valid

        Set<ConstraintViolation<RegistrationStartRequest>> violations = validator.validate(request);
        
        // Should have email validation error
        assertFalse(violations.isEmpty(), "RegistrationStartRequest should be invalid with bad email");
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("email")));
    }
}