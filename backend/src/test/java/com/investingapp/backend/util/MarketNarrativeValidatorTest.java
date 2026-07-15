package com.investingapp.backend.util;

import java.util.Locale;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MarketNarrativeValidatorTest {

    /** ~600 chars of clean, tag-legal narrative. */
    private static String clean() {
        StringBuilder sb = new StringBuilder("<h3>What happened in June 2026</h3>");
        for (int i = 0; i < 6; i++) {
            sb.append("<p>Markets moved through the month as the Federal Reserve held rates steady ")
              .append("and inflation cooled slightly. A sell-off in early June faded by month end, ")
              .append("with <strong>VTI</strong> finishing higher.</p>");
        }
        sb.append("<h3>Why your funds moved</h3><ul><li>VTI rose 2.12% as US stocks recovered.</li></ul>");
        return sb.toString();
    }

    @Test
    void cleanNarrativePasses() {
        MarketNarrativeValidator.ValidationResult r = MarketNarrativeValidator.validate(clean());
        assertTrue(r.valid, () -> String.join("; ", r.violations));
    }

    @Test
    void adviceLanguageFails() {
        assertFalse(MarketNarrativeValidator.validate(clean() + "<p>You should buy more VTI.</p>").valid);
        assertFalse(MarketNarrativeValidator.validate(clean() + "<p>We recommend holding tight.</p>").valid);
        assertFalse(MarketNarrativeValidator.validate(clean() + "<p>Now is the time to buy.</p>").valid);
        assertFalse(MarketNarrativeValidator.validate(clean() + "<p>Gains are guaranteed.</p>").valid);
    }

    @Test
    void sellOffIsNotFlaggedAsAdvice() {
        assertTrue(MarketNarrativeValidator.validate(clean()).valid,
                "'sell-off' is market vocabulary, not advice");
    }

    @Test
    void disallowedTagsFail() {
        assertFalse(MarketNarrativeValidator.validate(clean() + "<script>alert(1)</script>").valid);
        assertFalse(MarketNarrativeValidator.validate(clean() + "<a href=\"https://x.com\">link</a>").valid);
        assertFalse(MarketNarrativeValidator.validate(clean() + "<img src=x onerror=alert(1)>").valid);
    }

    @Test
    void inlineEventHandlersAndTemplateArtifactsFail() {
        assertFalse(MarketNarrativeValidator.validate(clean() + "<p onclick=\"x()\">hi</p>").valid);
        assertFalse(MarketNarrativeValidator.validate(clean() + "<p>{{leftover}}</p>").valid);
    }

    @Test
    void lengthBoundsEnforced() {
        assertFalse(MarketNarrativeValidator.validate("<p>too short</p>").valid);
        assertFalse(MarketNarrativeValidator.validate(clean().repeat(30)).valid);
        assertFalse(MarketNarrativeValidator.validate(null).valid);
        assertFalse(MarketNarrativeValidator.validate("  ").valid);
    }

    /** Asserts rejection AND that some violation message identifies the cause. */
    private static void assertRejectedFor(String html, String causeFragment) {
        MarketNarrativeValidator.ValidationResult r = MarketNarrativeValidator.validate(html);
        assertFalse(r.valid, () -> "expected rejection, but narrative passed: " + html);
        String joined = String.join("; ", r.violations).toLowerCase(Locale.US);
        assertTrue(joined.contains(causeFragment),
                () -> "expected a violation mentioning '" + causeFragment + "' but got: " + joined);
    }

    @Test
    void whitespaceVariantAdviceRejected() {
        assertRejectedFor(clean() + "<p>You  should buy more VTI.</p>", "you should");
        assertRejectedFor(clean() + "<p>You\nshould buy more VTI.</p>", "you should");
    }

    @Test
    void markupSplitAdviceRejected() {
        assertRejectedFor(clean() + "<p>you <strong>should</strong> buy more VTI</p>", "you should");
    }

    @Test
    void quoteDesyncHrefRejected() {
        assertRejectedFor(
                clean() + "<p title=\"x>\" href=\"https://phishing.example.com\">click here</p>",
                "href");
    }

    @Test
    void upperCaseHrefRejected() {
        assertRejectedFor(clean() + "<p HREF=\"https://phishing.example.com\">click</p>", "href");
    }

    @Test
    void anyAttributeRejected() {
        assertRejectedFor(clean() + "<p title=\"hi\">hello</p>", "attribute");
    }
}
