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
import java.util.UUID;

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

        // Generate unique JWT ID for each token
        String jwtId = UUID.randomUUID().toString();
        Date issuedAt = new Date();
        Date expiration = new Date(issuedAt.getTime() + jwtExpirationMs);
        
        logger.info("JwtUtils generateJwtToken - Generated JWT ID: {} for user: {}", jwtId, userPrincipal.getUsername());

        return Jwts.builder()
                .setSubject(userPrincipal.getUsername()) // User identifier (email)
                .setId(jwtId) // Unique JWT ID - makes each token unique
                .setIssuedAt(issuedAt) // When token was created
                .setExpiration(expiration) // When token expires
                .setIssuer("investingapp") // Optional: identify the issuer
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateTokenFromUsername(String username) {
        // Generate unique JWT ID for each token
        String jwtId = UUID.randomUUID().toString();
        Date issuedAt = new Date();
        Date expiration = new Date(issuedAt.getTime() + jwtExpirationMs);
        
        logger.info("JwtUtils generateTokenFromUsername - Generated JWT ID: {} for user: {}", jwtId, username);
        
        return Jwts.builder()
                .setSubject(username) // User identifier (email)
                .setId(jwtId) // Unique JWT ID - makes each token unique
                .setIssuedAt(issuedAt) // When token was created
                .setExpiration(expiration) // When token expires
                .setIssuer("investingapp") // Optional: identify the issuer
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
    
    /**
     * Extract the unique JWT ID from a token
     */
    public String getJwtIdFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getId();
    }
    
    /**
     * Extract the issued-at timestamp from a token
     */
    public Date getIssuedAtFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getIssuedAt();
    }
    
    /**
     * Extract the expiration timestamp from a token
     */
    public Date getExpirationFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration();
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(this.key) // Ensure it's using this.key
                .build()
                .parseClaimsJws(authToken);
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