// src/main/java/com/investingapp/backend/security/jwt/JwtUtils.java
package com.investingapp.backend.security.jwt;

import io.jsonwebtoken.*; // Keep this
import io.jsonwebtoken.io.Decoders; // For decoding base64 secret
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException; // Keep this
import jakarta.annotation.PostConstruct; // Correct PostConstruct import
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey; // Standard Java crypto
import java.util.Date;

@Component
public class JwtUtils {
    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    @Value("${jwt.secret}")
    private String jwtSecretString; // This should be a Base64 encoded string or a very strong raw string

    @Value("${jwt.expiration.ms}")
    private int jwtExpirationMs;

    private SecretKey key;

    @PostConstruct
    public void init() {
        // CRITICAL LOGGING FOR DEBUGGING:
        logger.info("============================================================");
        logger.info("JwtUtils initializing with jwt.secret: '{}'", jwtSecretString); // Log the raw string
        logger.info("JwtUtils jwt.expiration.ms: {}", jwtExpirationMs);
        logger.info("============================================================");

        byte[] keyBytes;
        try {
            keyBytes = jwtSecretString.getBytes("UTF-8");
        } catch (Exception e) {
            logger.error("Error encoding JWT secret to UTF-8 bytes: {}", e.getMessage());
            keyBytes = "FallbackDefaultDevSecretKeyMustBeLongEnough32BytesPlus".getBytes();
            logger.warn("Using a default fallback JWT secret due to encoding error. THIS IS NOT SECURE.");
        }

        if (keyBytes.length < 32) { // HS256 requires at least 256 bits (32 bytes)
            logger.warn("WARNING: JWT secret key (after UTF-8 encoding) is shorter than 32 bytes ({} bytes). " +
                        "This is NOT SECURE for HS256. Please provide a stronger key in your properties.", keyBytes.length);
            // Consider throwing an error or using a securely generated default for dev if this happens
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        logger.info("JwtUtils SecretKey initialized successfully.");
    }

    public String generateJwtToken(Authentication authentication) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();

        logger.info("JwtUtils generateJwtToken - Using key object: {}", System.identityHashCode(this.key));
        logger.info("JwtUtils generateJwtToken - Current jwtSecretString value: '{}'", this.jwtSecretString);

        return Jwts.builder()
                .setSubject(userPrincipal.getUsername()) // Use setSubject
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key, SignatureAlgorithm.HS256) // Or another HS algorithm
                .compact();
    }

    public String generateTokenFromUsername(String username) {
        return Jwts.builder()
                .setSubject(username) // Use setSubject
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parserBuilder()      // Use parserBuilder()
                .setSigningKey(key)      // Use setSigningKey(Key)
                .build()
                .parseClaimsJws(token)   // Use parseClaimsJws for signed tokens
                .getBody()               // Use getBody() to get Claims
                .getSubject();
    }

    public boolean validateJwtToken(String authToken) {
        logger.info("JwtUtils validateJwtToken - Validating with key object: {}", System.identityHashCode(this.key));
        logger.info("JwtUtils validateJwtToken - Current jwtSecretString value (for reference): '{}'", this.jwtSecretString); // Should be the new one

        try {
            Jwts.parserBuilder()
                .setSigningKey(this.key) // Ensure it's using this.key
                .build()
                .parseClaimsJws(authToken);
            logger.info("JwtUtils validateJwtToken - Token validation successful for token: {}", authToken);
            return true;
        } catch (SignatureException e) {
            logger.error("JwtUtils validateJwtToken - Invalid JWT signature: {} for token: {}", e.getMessage(), authToken);
        } catch (MalformedJwtException e) {
            logger.error("JwtUtils validateJwtToken - Invalid JWT token: {} for token: {}", e.getMessage(), authToken);
        } catch (ExpiredJwtException e) {
            logger.error("JwtUtils validateJwtToken - JWT token is expired: {} for token: {}", e.getMessage(), authToken);
        } catch (UnsupportedJwtException e) {
            logger.error("JwtUtils validateJwtToken - JWT token is unsupported: {} for token: {}", e.getMessage(), authToken);
        } catch (IllegalArgumentException e) {
            logger.error("JwtUtils validateJwtToken - JWT claims string is empty or invalid: {} for token: {}", e.getMessage(), authToken);
        }
        return false;
    }

    public String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }
        return null;
    }
}