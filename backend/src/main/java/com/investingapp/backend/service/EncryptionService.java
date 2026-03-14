// src/main/java/com/investingapp/backend/security/service/EncryptionService.java
package com.investingapp.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class EncryptionService {

    private static final Logger logger = LoggerFactory.getLogger(EncryptionService.class);

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final String KEY_ALGORITHM = "AES";
    private static final int GCM_IV_LENGTH = 12;  // 96-bit IV recommended for GCM
    private static final int GCM_TAG_LENGTH = 128; // 128-bit auth tag
    private static final String ENC_PREFIX = "ENC:";

    @Value("${encryption.secret-key}")
    private String secretKey;

    private final Environment environment;

    public EncryptionService(Environment environment) {
        this.environment = environment;
    }

    private SecretKey getKey() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        // AES supports 128-bit (16 bytes), 192-bit (24 bytes), or 256-bit (32 bytes) keys.
        // Non-local profiles should always use a 32-byte key (AES-256).
        if (keyBytes.length != 16 && keyBytes.length != 24 && keyBytes.length != 32) {
            throw new IllegalStateException(
                "encryption.secret-key must be 16, 24, or 32 bytes for AES. Current length: " + keyBytes.length
            );
        }
        if (keyBytes.length < 32) {
            String[] activeProfiles = environment.getActiveProfiles();
            boolean isLocalProfile = false;
            for (String profile : activeProfiles) {
                if ("local".equals(profile)) {
                    isLocalProfile = true;
                    break;
                }
            }
            if (!isLocalProfile) {
                logger.warn("encryption.secret-key is {} bytes — AES-256 (32 bytes) is required for non-local profiles.", keyBytes.length);
            }
        }
        return new SecretKeySpec(keyBytes, KEY_ALGORITHM);
    }

    /**
     * Encrypts data using AES-256/GCM/NoPadding.
     * Output format: ENC:<base64(iv + ciphertext)>
     */
    public String encrypt(String data) {
        try {
            SecureRandom random = new SecureRandom();
            byte[] iv = new byte[GCM_IV_LENGTH];
            random.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, getKey(), parameterSpec);

            byte[] ciphertext = cipher.doFinal(data.getBytes("UTF-8"));

            // Prepend IV to ciphertext
            byte[] ivAndCiphertext = new byte[GCM_IV_LENGTH + ciphertext.length];
            System.arraycopy(iv, 0, ivAndCiphertext, 0, GCM_IV_LENGTH);
            System.arraycopy(ciphertext, 0, ivAndCiphertext, GCM_IV_LENGTH, ciphertext.length);

            return ENC_PREFIX + Base64.getEncoder().encodeToString(ivAndCiphertext);
        } catch (Exception e) {
            logger.error("Error encrypting data", e);
            throw new RuntimeException("Error encrypting data", e);
        }
    }

    /**
     * Decrypts data encrypted by {@link #encrypt(String)}.
     *
     * <ul>
     *   <li>If value starts with {@code ENC:} — strip prefix, decode base64, extract IV
     *       (first 12 bytes), decrypt the rest.</li>
     *   <li>If value does NOT start with {@code ENC:} and active profile is {@code dev}
     *       or {@code local} — return the raw value (legacy plaintext fallback).</li>
     *   <li>If value does NOT start with {@code ENC:} and active profile is {@code prod}
     *       or {@code test} — throw {@link IllegalStateException}.</li>
     * </ul>
     */
    public String decrypt(String encryptedData) {
        if (encryptedData == null) {
            return null;
        }

        if (!encryptedData.startsWith(ENC_PREFIX)) {
            return handleLegacyPlaintext(encryptedData);
        }

        try {
            String base64Payload = encryptedData.substring(ENC_PREFIX.length());
            byte[] ivAndCiphertext = Base64.getDecoder().decode(base64Payload);

            byte[] iv = Arrays.copyOfRange(ivAndCiphertext, 0, GCM_IV_LENGTH);
            byte[] ciphertext = Arrays.copyOfRange(ivAndCiphertext, GCM_IV_LENGTH, ivAndCiphertext.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, getKey(), parameterSpec);

            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, "UTF-8");
        } catch (Exception e) {
            logger.error("Error decrypting data", e);
            throw new RuntimeException("Error decrypting data", e);
        }
    }

    /**
     * Compute a SHA-256 hex digest of the raw SSN for deterministic DB lookup.
     * The hash is not reversible — it only enables lookup without exposing the plaintext SSN.
     */
    public String hashSsn(String rawSsn) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawSsn.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (Exception e) {
            throw new RuntimeException("Error hashing SSN", e);
        }
    }

    private String handleLegacyPlaintext(String rawValue) {
        String[] activeProfiles = environment.getActiveProfiles();
        boolean isRelaxedProfile = false;
        for (String profile : activeProfiles) {
            if ("dev".equals(profile) || "local".equals(profile)) {
                isRelaxedProfile = true;
                break;
            }
        }

        if (isRelaxedProfile) {
            logger.warn("Decrypting legacy plaintext value (no ENC: prefix) in non-production profile — " +
                        "re-encrypt this value at rest.");
            return rawValue;
        }

        throw new IllegalStateException(
            "Encountered an unencrypted value in a production/test profile. " +
            "All sensitive fields must be encrypted with the ENC: prefix."
        );
    }
}
