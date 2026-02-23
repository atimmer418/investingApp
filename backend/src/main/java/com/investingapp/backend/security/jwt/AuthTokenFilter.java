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
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter; // Use OncePerRequestFilter

import java.io.IOException;

// AuthTokenFilter - processes JWT authentication for each request
public class AuthTokenFilter extends OncePerRequestFilter { // Extend OncePerRequestFilter
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private com.investingapp.backend.repository.UserSessionRepository userSessionRepository;

    private static final Logger logger = LoggerFactory.getLogger(AuthTokenFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        logger.debug("AuthTokenFilter: Processing request to {}", request.getRequestURI());

        // If already authenticated from a previous pass of this filter in the same
        // request, skip
        Authentication existingAuthentication = SecurityContextHolder.getContext().getAuthentication();
        if (existingAuthentication != null && existingAuthentication.isAuthenticated() &&
                !(existingAuthentication instanceof AnonymousAuthenticationToken)) {
            logger.debug(
                    "AuthTokenFilter: Already authenticated as '{}' for request {}. Skipping.",
                    existingAuthentication.getName(), request.getRequestURI());
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String jwt = parseJwt(request);

            if (jwt != null) {
                boolean isValid = jwtUtils.validateJwtToken(jwt);
                if (isValid) {
                    // Check for Session Revocation
                    Long sessionId = jwtUtils.getSessionIdFromJwtToken(jwt);
                    if (sessionId != null) {
                        boolean isSessionActive = userSessionRepository.findById(sessionId)
                                .map(com.investingapp.backend.model.UserSession::isActive)
                                .orElse(false);
                        
                        if (!isSessionActive) {
                            logger.warn("AuthTokenFilter: Session {} is revoked. Blocking request to {}.", sessionId, request.getRequestURI());
                            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Session has been revoked");
                            return;
                        }
                    }

                    String email = jwtUtils.getUserNameFromJwtToken(jwt);

                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    logger.debug("AuthTokenFilter: User '{}' authenticated for {}.", email, request.getRequestURI());
                } else {
                    logger.debug("AuthTokenFilter: Invalid JWT token for request {}.", request.getRequestURI());
                }
            } else {
                logger.debug("AuthTokenFilter: No JWT token in request to {}.", request.getRequestURI());
            }
        } catch (Exception e) {
            logger.error("AuthTokenFilter: Error processing JWT for {}: {}", request.getRequestURI(), e.getMessage());
        }

        filterChain.doFilter(request, response);
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