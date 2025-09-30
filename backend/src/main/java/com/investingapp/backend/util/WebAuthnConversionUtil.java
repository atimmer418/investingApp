// Utility to convert PublicKeyCredentialRequestOptions to AssertionRequest for WebAuthnController
package com.investingapp.backend.util;

import com.yubico.webauthn.AssertionRequest;
import com.yubico.webauthn.data.PublicKeyCredentialRequestOptions;

public class WebAuthnConversionUtil {
    public static AssertionRequest toAssertionRequest(PublicKeyCredentialRequestOptions options) {
        // AssertionRequest is a wrapper for PublicKeyCredentialRequestOptions
        // The relyingPartyEntity and username are not required for usernameless flows
        return AssertionRequest.builder()
                .publicKeyCredentialRequestOptions(options)
                .build();
    }
}
