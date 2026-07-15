package com.investingapp.backend.service;

import com.investingapp.backend.dto.EmailMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Default EmailSender: logs instead of dispatching. Active until a real
 * provider is configured via app.email.provider.
 */
@Service
@ConditionalOnProperty(name = "app.email.provider", havingValue = "logging", matchIfMissing = true)
public class LoggingEmailSender implements EmailSender {

    private static final Logger logger = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public void send(EmailMessage message) {
        logger.info("MOCK EMAIL - To: {}, From: {}, Subject: {}, html: {} chars, text: {} chars",
                message.getTo(), message.getFrom(), message.getSubject(),
                message.getHtmlBody() == null ? 0 : message.getHtmlBody().length(),
                message.getTextBody() == null ? 0 : message.getTextBody().length());
    }
}
