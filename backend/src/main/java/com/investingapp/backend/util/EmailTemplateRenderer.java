package com.investingapp.backend.util;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Minimal dependency-free {{placeholder}} renderer for email templates under
 * resources/templates/email/. Fails loudly on unresolved placeholders — a
 * half-rendered financial email must never leave the building.
 * Values are inserted literally and never re-scanned for placeholders.
 */
public final class EmailTemplateRenderer {

    private EmailTemplateRenderer() {
    }

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{([a-zA-Z0-9_]+)\\}\\}");
    private static final ConcurrentHashMap<String, String> CACHE = new ConcurrentHashMap<>();

    public static String render(String templateName, Map<String, String> values) {
        String template = CACHE.computeIfAbsent(templateName, EmailTemplateRenderer::load);
        StringBuilder out = new StringBuilder();
        Matcher m = PLACEHOLDER.matcher(template);
        while (m.find()) {
            String key = m.group(1);
            String value = values.get(key);
            if (value == null) {
                throw new IllegalStateException(
                        "Unresolved placeholder {{" + key + "}} in template " + templateName);
            }
            m.appendReplacement(out, Matcher.quoteReplacement(value));
        }
        m.appendTail(out);
        return out.toString();
    }

    /** Rough plain-text version of an HTML fragment (for textBody fallbacks). */
    public static String stripHtml(String html) {
        if (html == null) {
            return "";
        }
        return html.replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static String load(String name) {
        try (InputStream in = EmailTemplateRenderer.class
                .getResourceAsStream("/templates/email/" + name)) {
            if (in == null) {
                throw new IllegalStateException("Email template not found: " + name);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read email template " + name, e);
        }
    }
}
