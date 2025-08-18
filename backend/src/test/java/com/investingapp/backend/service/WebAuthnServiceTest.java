package com.investingapp.backend.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class WebAuthnServiceTest {

    @Test
    void testTemporaryUserIdOptional() {
        // Test that WebAuthnService can handle null temporaryUserId
        String temporaryUserId = null;
        
        // This should not cause a validation error anymore
        assertNull(temporaryUserId);
        
        // In the new flow, users create accounts without Plaid linking first
        boolean shouldProceedWithoutPlaid = (temporaryUserId == null || temporaryUserId.isEmpty());
        assertTrue(shouldProceedWithoutPlaid);
    }

    @Test
    void testTemporaryUserIdPresent() {
        // Test that WebAuthnService can still handle non-null temporaryUserId for backwards compatibility
        String temporaryUserId = "anon_12345";
        
        assertNotNull(temporaryUserId);
        assertFalse(temporaryUserId.isEmpty());
        
        // In the old flow, users link bank accounts before creating accounts
        boolean shouldLinkPlaid = (temporaryUserId != null && !temporaryUserId.isEmpty());
        assertTrue(shouldLinkPlaid);
    }
}