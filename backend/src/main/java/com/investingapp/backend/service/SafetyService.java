package com.investingapp.backend.service;

import com.investingapp.backend.dto.SafetyReason;
import com.investingapp.backend.dto.SafetyResult;
import com.investingapp.backend.dto.SafetyVerdict;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class SafetyService {

    // Regex patterns for detection
    // \b ensures word boundaries to avoid false positives (e.g., "analysis"
    // containing "anal")

    // Stock Picking: Tickers, "buy", "sell", "pump"
    private static final Pattern STOCK_PICKING_PATTERN = Pattern.compile(
            "(?i)\\b(buy|sell|short|long|pump|dump|stock|share|ticker|symbol)\\b.*\\b(nvda|tsla|aapl|msft|goog|amzn|meta|btc|eth|crypto|bitcoin)\\b|\\b(recommend|pick)\\b.*\\b(stock|crypto)",
            Pattern.CASE_INSENSITIVE);

    // Market Timing: "crash", "correction", "bottom", "peak", "now"
    private static final Pattern TIMING_PATTERN = Pattern.compile(
            "(?i)\\b(market crash|collapse|recession|timing|bottom|peak|correction|sell now|buy now|too late)\\b",
            Pattern.CASE_INSENSITIVE);

    // Specific Amounts: "invest $X", "put $X"
    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
            "(?i)\\b(how much|what amount|dollar amount|invest \\$|put \\$)\\b",
            Pattern.CASE_INSENSITIVE);

    // Leverage: "margin", "sbloc", "borrow", "loan" combined with usage questions
    private static final Pattern LEVERAGE_PATTERN = Pattern.compile(
            "(?i)\\b(margin|sbloc|leverage|borrow against|loan)\\b.*\\b(should i|when to|how to)\\b",
            Pattern.CASE_INSENSITIVE);

    // Comparisons: "better than", "vs", "versus"
    private static final Pattern COMPARISON_PATTERN = Pattern.compile(
            "(?i)\\b(better than|worse than|vs|versus|compared to)\\b.*\\b(roth|401k|ira|traditional|vanguard|fidelity|schwab|robinhood)\\b",
            Pattern.CASE_INSENSITIVE);

    // Toxic: Swearing, hate speech (Basic list, can be expanded via external lib or
    // API later)
    private static final Pattern TOXIC_PATTERN = Pattern.compile(
            "(?i)\\b(hate|kill|stupid|idiot|scam|fuck|shit)\\b",
            Pattern.CASE_INSENSITIVE);

    public SafetyResult check(String message) {
        if (message == null || message.trim().isEmpty()) {
            return new SafetyResult(SafetyVerdict.SAFE, SafetyReason.NONE);
        }

        // Check Toxic first (Harmful)
        if (TOXIC_PATTERN.matcher(message).find()) {
            return new SafetyResult(SafetyVerdict.BLOCK_HARMFUL, SafetyReason.TOXIC);
        }

        // Check specific Advice categories (Block)
        if (STOCK_PICKING_PATTERN.matcher(message).find()) {
            return new SafetyResult(SafetyVerdict.BLOCK_ADVICE, SafetyReason.STOCK_PICKING);
        }

        if (TIMING_PATTERN.matcher(message).find()) {
            return new SafetyResult(SafetyVerdict.BLOCK_ADVICE, SafetyReason.MARKET_TIMING);
        }

        if (AMOUNT_PATTERN.matcher(message).find()) {
            return new SafetyResult(SafetyVerdict.BLOCK_ADVICE, SafetyReason.SPECIFIC_AMOUNT);
        }

        if (LEVERAGE_PATTERN.matcher(message).find()) {
            // Leverage is nuanced. If they ask "What is an SBLOC", it's safe.
            // If they ask "Should I use margin", it's advice.
            // Our regex tries to capture "Should I/When".
            // If it matches, treat as redirection (education), not hard block advice, but
            // for v1 we treat as advice if it's "Should I".
            // Actually, per instructions, user wants "Should I use leverage" to likely be a
            // redirection to principles.
            // Let's create a specific refusal logic for this.
            return new SafetyResult(SafetyVerdict.BLOCK_ADVICE, SafetyReason.LEVERAGE);
            // The Refusal map handles the "I can't advise..." text.
        }

        // Check Redirects (Pivot)
        if (COMPARISON_PATTERN.matcher(message).find()) {
            return new SafetyResult(SafetyVerdict.REDIRECT, SafetyReason.COMPARISON);
        }

        // Default Safe
        return new SafetyResult(SafetyVerdict.SAFE, SafetyReason.NONE);
    }
}
