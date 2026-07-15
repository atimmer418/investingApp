package com.investingapp.backend.service;

import com.investingapp.backend.dto.EmailMessage;

/**
 * Provider port for outbound email. Exactly one implementation is active,
 * selected by the app.email.provider property (default "logging").
 * When a real provider is chosen (Resend, SES, Postmark, ...), add one class
 * implementing this interface with @ConditionalOnProperty(havingValue = "<name>")
 * and set app.email.provider=<name> — nothing else changes.
 */
public interface EmailSender {

    /** Dispatch the message. Throw on failure — EmailService records the outcome. */
    void send(EmailMessage message);
}
