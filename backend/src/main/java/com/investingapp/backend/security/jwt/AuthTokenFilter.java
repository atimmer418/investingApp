// src/main/java/com/investingapp/backend/security/jwt/AuthTokenFilter.java
package com.investingapp.backend.security.jwt;

import com.investingapp.backend.security.services.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter; // Use OncePerRequestFilter

import java.io.IOException;

// @Component // Mark as a Spring component to be auto-detected
public class AuthTokenFilter extends OncePerRequestFilter { // Extend OncePerRequestFilter
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    private static final Logger logger = LoggerFactory.getLogger(AuthTokenFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        logger.info("AuthTokenFilter: Processing request to {}", request.getRequestURI());

        // If already authenticated from a previous pass of this filter in the same
        // request, skip
        Authentication existingAuthentication = SecurityContextHolder.getContext().getAuthentication();
        logger.info("{} && {} && {}", existingAuthentication != null, (existingAuthentication != null && existingAuthentication.isAuthenticated()), !(existingAuthentication instanceof AnonymousAuthenticationToken));
        if (existingAuthentication != null && existingAuthentication.isAuthenticated() &&
                !(existingAuthentication instanceof AnonymousAuthenticationToken)) {
            logger.info(
                    "AuthTokenFilter: Already authenticated as '{}' for request {}. Skipping further JWT processing.",
                    existingAuthentication.getName(), request.getRequestURI());
            filterChain.doFilter(request, response); // Pass to next filter
            logger.info("AuthTokenFilter: END (already authenticated) for request {}", request.getRequestURI());
            return; // <<<<----- CRUCIAL: Exit filter early
        }

        try {
            String jwt = parseJwt(request); // Ensure parseJwt is working (from your JwtUtils or locally)
            logger.info("AuthTokenFilter: Parsed JWT from header: {}", jwt);

            if (jwt != null) {
                boolean isValid = jwtUtils.validateJwtToken(jwt); // Explicitly store result
                logger.info("AuthTokenFilter: JWT validation result: {}", isValid);
                if (isValid) {
                    String username = jwtUtils.getUserNameFromJwtToken(jwt);
                    logger.info("AuthTokenFilter: Username from token: {}", username);

                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    logger.info("AuthTokenFilter: User '{}' authenticated and set in SecurityContext.", username);

                    logger.info("AuthTokenFilter: Authentication object set in SecurityContext. IsAuthenticated: {}",
                            SecurityContextHolder.getContext().getAuthentication().isAuthenticated());
                    logger.info("AuthTokenFilter: Principal: {}",
                            SecurityContextHolder.getContext().getAuthentication().getPrincipal());
                    logger.info("AuthTokenFilter: Authorities: {}",
                            SecurityContextHolder.getContext().getAuthentication().getAuthorities());
                } else {
                    logger.warn("AuthTokenFilter: JWT token is invalid and was not set in SecurityContext.");
                }
            } else {
                logger.info("AuthTokenFilter: No JWT token found in Authorization header.");
            }
        } catch (Exception e) {
            // This catch block might be too broad; specific exceptions are caught in
            // validateJwtToken
            // But good for unexpected errors during the filter process.
            logger.error("AuthTokenFilter: Error processing JWT authentication: {}", e.getMessage(), e);
        }
        logger.info("AuthTokenFilter START: Request Hash: {}, URI: {}", request.hashCode(), request.getRequestURI());
        filterChain.doFilter(request, response);
        logger.info("AuthTokenFilter END: Request Hash: {}, URI: {}", request.hashCode(), request.getRequestURI());
    }

    private String parseJwt(HttpServletRequest request) {
        // This method can be moved to JwtUtils if preferred, or kept here
        String headerAuth = request.getHeader("Authorization");

        if (headerAuth != null && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}