package com.investingapp.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    
    @Value("${app.email.from:noreply@investingapp.com}")
    private String fromEmail;
    
    @Value("${app.email.enabled:false}")
    private boolean emailEnabled;
    
    public void sendEmail(String to, String subject, String text) {
        if (!emailEnabled) {
            logger.info("Email disabled. Would send to {}: {} - {}", to, subject, text);
            return;
        }
        
        // TODO: Implement actual email sending when mail dependencies are added
        // For now, just log the email content
        logger.info("MOCK EMAIL - To: {}, Subject: {}, Body: {}", to, subject, text);
    }
}
