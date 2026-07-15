package com.investingapp.backend.util;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deterministic compliance gate for the LLM-generated Monthly Market Breakdown
 * narrative. The generation prompt forbids advice/predictions and constrains
 * tags — this class is the hard backstop: if anything slips through, the
 * narrative is rejected and NOTHING is emailed that month until a regeneration
 * passes. Financial content ships on a gate, not on vibes.
 *
 * <p>Bias is deliberately strict: a false negative is a compliance risk, while
 * a false positive only costs a regeneration.
 */
public final class MarketNarrativeValidator {

    private MarketNarrativeValidator() {
    }

    private static final int MIN_LENGTH = 400;    // chars — a real recap is never shorter
    private static final int MAX_LENGTH = 12000;  // chars — runaway output guard

    /** Lowercase advice/urgency phrases. Word-safe: "sell-off"/"selling pressure" don't match. */
    private static final List<String> FORBIDDEN_PHRASES = List.of(
            "you should", "we recommend", "we suggest", "we advise", "you must",
            "consider buying", "consider selling", "consider adding", "consider moving",
            "buy now", "sell now", "act now", "time to buy", "time to sell",
            "don't miss", "do not miss", "guaranteed", "can't lose", "cannot lose",
            "increase your contribution", "reduce your contribution", "change your allocation",
            "rebalance your");

    private static final Set<String> ALLOWED_TAGS = Set.of("p", "strong", "em", "h3", "ul", "li", "br");

    private static final Pattern TAG = Pattern.compile("<\\s*/?\\s*([a-zA-Z0-9]+)([^>]*)>");
    private static final Pattern TAG_STRIP = Pattern.compile("<[^>]+>");
    /** Defense-in-depth whole-string scans — calm financial prose never legitimately contains these. */
    private static final Pattern HREF_ANYWHERE = Pattern.compile("href\\s*=", Pattern.CASE_INSENSITIVE);
    private static final Pattern EVENT_ATTR_ANYWHERE = Pattern.compile("\\bon[a-z]+\\s*=", Pattern.CASE_INSENSITIVE);

    public static ValidationResult validate(String html) {
        List<String> violations = new ArrayList<>();

        if (html == null || html.isBlank()) {
            return new ValidationResult(List.of("narrative is empty"));
        }
        if (html.length() < MIN_LENGTH) {
            violations.add("narrative too short (" + html.length() + " < " + MIN_LENGTH + " chars)");
        }
        if (html.length() > MAX_LENGTH) {
            violations.add("narrative too long (" + html.length() + " > " + MAX_LENGTH + " chars)");
        }
        if (html.contains("{{") || html.contains("}}")) {
            violations.add("unresolved template artifact '{{' present");
        }

        // The phrase scan runs on two derived views of the input so neither
        // whitespace tricks ("you\nshould") nor markup splits
        // ("you <strong>should</strong>") can hide advice language. Length
        // checks above intentionally stay on the raw input.
        String lower = html.toLowerCase(Locale.US);
        String normalized = collapseWhitespace(lower);
        String tagStripped = collapseWhitespace(TAG_STRIP.matcher(lower).replaceAll(" "));
        for (String phrase : FORBIDDEN_PHRASES) {
            if (normalized.contains(phrase) || tagStripped.contains(phrase)) {
                violations.add("forbidden phrase: \"" + phrase + "\"");
            }
        }
        if (lower.contains("javascript:")) {
            violations.add("javascript: URI present");
        }
        // Whole-raw-string scans, independent of tag parsing, so quote-desync
        // or otherwise malformed markup can't smuggle these past the per-tag
        // attribute check below.
        if (HREF_ANYWHERE.matcher(html).find()) {
            violations.add("href attribute present");
        }
        if (EVENT_ATTR_ANYWHERE.matcher(html).find()) {
            violations.add("inline event handler attribute present");
        }

        Matcher tags = TAG.matcher(html);
        while (tags.find()) {
            String name = tags.group(1).toLowerCase(Locale.US);
            if (!ALLOWED_TAGS.contains(name)) {
                violations.add("disallowed tag: <" + name + ">");
            }
            // Output contract: NO attributes on any tag. Anything beyond pure
            // whitespace (and a trailing "/" on self-closing tags) is rejected
            // outright. This also defuses quote-desync smuggling: a '>' inside
            // a quoted attribute value truncates the match, but the truncated
            // match still carries attribute content and is rejected here.
            String attrs = tags.group(2) == null ? "" : tags.group(2).trim();
            if (attrs.endsWith("/")) {
                attrs = attrs.substring(0, attrs.length() - 1).trim();
            }
            if (!attrs.isEmpty()) {
                violations.add("disallowed attribute content on <" + name + ">: " + attrs);
            }
        }

        return new ValidationResult(violations);
    }

    private static String collapseWhitespace(String s) {
        return s.replaceAll("\\s+", " ");
    }

    public static final class ValidationResult {
        public final boolean valid;
        public final List<String> violations;

        ValidationResult(List<String> violations) {
            this.violations = violations;
            this.valid = violations.isEmpty();
        }
    }
}
