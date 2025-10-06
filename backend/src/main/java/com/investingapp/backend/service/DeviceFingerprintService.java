package com.investingapp.backend.service;

import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpServletRequest;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

@Service
public class DeviceFingerprintService {
    
    /**
     * Generate a device fingerprint that's more stable than IP alone
     * Combines User-Agent, Accept headers, and network info
     */
    public String generateDeviceFingerprint(HttpServletRequest request) {
        StringBuilder fingerprint = new StringBuilder();
        
        // User-Agent (fairly stable on mobile)
        String userAgent = request.getHeader("User-Agent");
        if (userAgent != null) {
            fingerprint.append(userAgent);
        }
        
        // Accept headers (browser/app specific)
        String acceptLang = request.getHeader("Accept-Language");
        if (acceptLang != null) {
            fingerprint.append("|").append(acceptLang);
        }
        
        String acceptEncoding = request.getHeader("Accept-Encoding");
        if (acceptEncoding != null) {
            fingerprint.append("|").append(acceptEncoding);
        }
        
        // Screen resolution if available (mobile specific)
        String screenRes = request.getHeader("X-Screen-Resolution");
        if (screenRes != null) {
            fingerprint.append("|").append(screenRes);
        }
        
        // Network info (less precise than full IP)
        String networkPrefix = getNetworkPrefix(getClientIpAddress(request));
        fingerprint.append("|").append(networkPrefix);
        
        // Hash the fingerprint for privacy and consistent length
        return hashFingerprint(fingerprint.toString());
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
    
    private String getNetworkPrefix(String ip) {
        if (ip != null && ip.contains(":")) {
            // IPv6 - use /64 prefix
            String[] parts = ip.split(":");
            if (parts.length >= 4) {
                return parts[0] + ":" + parts[1] + ":" + parts[2] + ":" + parts[3] + "::/64";
            }
        }
        return ip; // IPv4 or fallback
    }
    
    private String hashFingerprint(String fingerprint) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(fingerprint.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString().substring(0, 16); // First 16 chars for storage
        } catch (Exception e) {
            return fingerprint.hashCode() + ""; // Fallback
        }
    }
}
