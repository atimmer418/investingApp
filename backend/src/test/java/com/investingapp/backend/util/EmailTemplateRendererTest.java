package com.investingapp.backend.util;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class EmailTemplateRendererTest {

    @Test
    void rendersShellWithAllSlots() {
        String html = EmailTemplateRenderer.render("market-breakdown.html", Map.of(
                "periodLabel", "June 2026",
                "narrativeHtml", "<p>Markets rose.</p>",
                "portfolioSection", "<p>Your numbers</p>",
                "unsubscribeUrl", "#"));

        assertTrue(html.contains("June 2026"));
        assertTrue(html.contains("<p>Markets rose.</p>"));
        assertTrue(html.contains("<p>Your numbers</p>"));
        assertTrue(html.contains("not investment advice"), "disclaimer footer must be present");
        assertTrue(html.contains("help@fredvested.com"));
        assertFalse(html.contains("{{"), "no unresolved placeholders");
    }

    @Test
    void unresolvedPlaceholderThrows() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                EmailTemplateRenderer.render("market-breakdown.html", Map.of(
                        "periodLabel", "June 2026")));
        assertTrue(ex.getMessage().contains("{{"));
    }

    @Test
    void missingTemplateThrows() {
        assertThrows(IllegalStateException.class, () ->
                EmailTemplateRenderer.render("nope.html", Map.of()));
    }

    @Test
    void rendersNumbersPartialWithChangeRows() {
        String changeRows = EmailTemplateRenderer.render("market-breakdown-change-rows.html", Map.of(
                "changeLabel", "Change in June",
                "changeValue", "+$120.50 (+2.1%)",
                "changeColor", "#16A34A",
                "marketReturnPct", "+1.4%",
                "marketReturnColor", "#DC2626"));
        String html = EmailTemplateRenderer.render("market-breakdown-numbers.html", Map.of(
                "periodLabel", "June 2026",
                "endValue", "$5,930.10",
                "contributions", "$400.00",
                "changeRows", changeRows));

        assertTrue(html.contains("$5,930.10"));
        assertTrue(html.contains("+$120.50 (+2.1%)"));
        assertTrue(html.contains("#16A34A"));
        assertFalse(html.contains("{{"));
    }

    @Test
    void rendersEmptyPartial() {
        String html = EmailTemplateRenderer.render("market-breakdown-empty.html", Map.of());
        assertTrue(html.toLowerCase().contains("once your account is funded"));
        assertFalse(html.contains("{{"));
    }

    @Test
    void stripHtmlCollapsesToPlainText() {
        assertEquals("Markets rose. VTI gained.",
                EmailTemplateRenderer.stripHtml("<p>Markets rose.</p> <p><strong>VTI</strong> gained.</p>"));
    }
}
