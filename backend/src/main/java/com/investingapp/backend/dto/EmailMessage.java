package com.investingapp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Outbound email value passed to the EmailSender port.
 * htmlBody may be null (plain-text-only legacy emails); textBody is the
 * plain-text fallback and should always be set.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class EmailMessage {
    private String to;
    private String from;      // filled by EmailService when null
    private String subject;
    private String htmlBody;  // nullable
    private String textBody;
}
