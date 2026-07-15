# Monthly Market Breakdown (Piggy Plus) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monthly plain-English market-summary email for plus/pro tier members, fully functional behind a provider-agnostic email layer (logged, not dispatched, until a real provider is configured).

**Architecture:** Three backend layers — (1) an `EmailSender` port with a logging implementation plus an `EmailService` facade that records every send in a new `email_log` table; (2) a `MarketBreakdownService` that once per month fetches real ETF monthly returns from Alpaca, generates a compliance-gated narrative via one web-search-grounded Claude call, and stores it in a `market_breakdown` table; (3) a scheduler (1st/2nd/3rd @ 9am ET) that merges each user's real portfolio numbers into an HTML template and sends idempotently. No frontend changes.

**Tech Stack:** Java 17 / Spring Boot, MySQL (`ddl-auto=update` — entities auto-create tables), Anthropic Java SDK 2.48.0 (`WebSearchTool20250305`), Alpaca Market Data API, JUnit 5 + Mockito (from spring-boot-starter-test).

**Spec:** `docs/superpowers/specs/2026-07-15-monthly-market-breakdown-design.md`

## Global Constraints

- All code in `backend/` — package `com.investingapp.backend.*`. No frontend changes.
- Tests are plain JUnit 5 (+ Mockito for collaborators). NEVER `@SpringBootTest` — tests must run without a DB.
- Run tests selectively: `cd backend && ./gradlew test --tests '<FullyQualifiedClass>'`. Never the whole suite.
- Subject line exactly: `FRED's Monthly Market Breakdown - {MMMM yyyy}` e.g. `FRED's Monthly Market Breakdown - June 2026`.
- Eligible tiers: `selectedTier` in `"plus"`, `"pro"`.
- Email bodies are NEVER stored in the DB.
- Generated narrative may contain ONLY tags `<p> <strong> <em> <h3> <ul> <li> <br>` — no links, no attributes.
- No advice/recommendation language may survive the compliance gate.
- DTOs use Lombok; services use SLF4J `LoggerFactory` loggers; controllers use the `SecurityContextHolder` + `UserDetailsImpl` idiom.
- Default portfolio constants: VTI 75%, VXUS 20%, VBR 5%; SPY is market context only.
- Existing `EmailService.sendEmail(String to, String subject, String text)` signature must keep working (4 callers: PaydayNotificationService, InvestmentExecutionService, ReferralService, AccountStatusService).
- Commit after every task with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Email foundation types (EmailMessage, EmailSender port, LoggingEmailSender, EmailLog entity + repository)

Pure types — no behavior to TDD. Gate is compilation.

**Files:**
- Create: `backend/src/main/java/com/investingapp/backend/dto/EmailMessage.java`
- Create: `backend/src/main/java/com/investingapp/backend/service/EmailSender.java`
- Create: `backend/src/main/java/com/investingapp/backend/service/LoggingEmailSender.java`
- Create: `backend/src/main/java/com/investingapp/backend/model/EmailLog.java`
- Create: `backend/src/main/java/com/investingapp/backend/repository/EmailLogRepository.java`

**Interfaces:**
- Consumes: nothing new.
- Produces: `EmailMessage(String to, String from, String subject, String htmlBody, String textBody)` Lombok DTO; `EmailSender.send(EmailMessage)`; `EmailLog` entity with `STATUS_SENT/STATUS_MOCKED/STATUS_FAILED` constants and constructor `EmailLog(Long userId, String recipient, String subject, String emailType, String periodKey, String status, String errorMessage)`; `EmailLogRepository.findByEmailTypeAndUserIdAndPeriodKey(String, Long, String)` → `Optional<EmailLog>`.

- [ ] **Step 1: Create `EmailMessage` DTO**

```java
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
```

- [ ] **Step 2: Create `EmailSender` interface**

```java
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
```

- [ ] **Step 3: Create `LoggingEmailSender`**

```java
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
```

- [ ] **Step 4: Create `EmailLog` entity**

Explicit snake_case `@Column` names on the three uniqueness columns so the `@UniqueConstraint` physical names are stable under Hibernate's naming strategy.

```java
package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Audit row for every outbound email attempt. Bodies are never stored.
 * The unique index on (email_type, user_id, period_key) makes recurring
 * emails (e.g. MARKET_BREAKDOWN for "2026-06") physically unable to
 * double-send; rows with NULL period_key (one-off emails) may repeat freely
 * (MySQL unique indexes permit repeated NULLs).
 * Retries after FAILED update the existing row (see EmailService.record).
 */
@Entity
@Table(name = "email_log", uniqueConstraints = @UniqueConstraint(
        name = "uq_email_type_user_period",
        columnNames = { "email_type", "user_id", "period_key" }))
@Data
@NoArgsConstructor
public class EmailLog {

    public static final String STATUS_SENT = "SENT";
    public static final String STATUS_MOCKED = "MOCKED";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId; // nullable — legacy/system emails have no user context

    @Column(nullable = false, length = 100)
    private String recipient;

    @Column(length = 200)
    private String subject;

    @Column(name = "email_type", nullable = false, length = 40)
    private String emailType; // e.g. MARKET_BREAKDOWN, LEGACY

    @Column(name = "period_key", length = 10)
    private String periodKey; // e.g. "2026-06"; null for one-off emails

    @Column(nullable = false, length = 10)
    private String status; // SENT | MOCKED | FAILED

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    private LocalDateTime sentAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public EmailLog(Long userId, String recipient, String subject, String emailType,
            String periodKey, String status, String errorMessage) {
        this.userId = userId;
        this.recipient = recipient;
        this.subject = subject;
        this.emailType = emailType;
        this.periodKey = periodKey;
        this.status = status;
        this.errorMessage = errorMessage;
    }
}
```

- [ ] **Step 5: Create `EmailLogRepository`**

```java
package com.investingapp.backend.repository;

import com.investingapp.backend.model.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    // Single row per (type, user, period) — enforced by uq_email_type_user_period
    Optional<EmailLog> findByEmailTypeAndUserIdAndPeriodKey(String emailType, Long userId, String periodKey);
}
```

- [ ] **Step 6: Verify compilation**

Run: `cd backend && ./gradlew compileJava -q`
Expected: BUILD SUCCESSFUL (no test yet — types only)

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/dto/EmailMessage.java backend/src/main/java/com/investingapp/backend/service/EmailSender.java backend/src/main/java/com/investingapp/backend/service/LoggingEmailSender.java backend/src/main/java/com/investingapp/backend/model/EmailLog.java backend/src/main/java/com/investingapp/backend/repository/EmailLogRepository.java
git commit -m "feat(email): EmailSender port, logging impl, EmailLog audit entity"
```

---

### Task 2: EmailService facade (records every send, idempotency, backward compatible)

**Files:**
- Modify: `backend/src/main/java/com/investingapp/backend/service/EmailService.java` (full rewrite, 29 lines today)
- Test: `backend/src/test/java/com/investingapp/backend/service/EmailServiceTest.java`

**Interfaces:**
- Consumes: Task 1 types.
- Produces: `EmailService.sendEmail(String to, String subject, String text)` (unchanged legacy); `sendEmail(EmailMessage message, Long userId, String emailType, String periodKey)` (never throws); `boolean hasBeenSent(String emailType, Long userId, String periodKey)` (true only for SENT/MOCKED); `void recordFailedAttempt(Long userId, String recipient, String emailType, String periodKey, String error)`; constant `EmailService.TYPE_LEGACY = "LEGACY"`.

- [ ] **Step 1: Write the failing test**

```java
package com.investingapp.backend.service;

import com.investingapp.backend.dto.EmailMessage;
import com.investingapp.backend.model.EmailLog;
import com.investingapp.backend.repository.EmailLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EmailServiceTest {

    private EmailLogRepository repo;
    private EmailSender sender;

    @BeforeEach
    void setUp() {
        repo = mock(EmailLogRepository.class);
        sender = mock(EmailSender.class);
        when(repo.findByEmailTypeAndUserIdAndPeriodKey(any(), any(), any())).thenReturn(Optional.empty());
    }

    private EmailService service(boolean enabled) {
        return new EmailService(repo, sender, enabled, "noreply@fredvested.com");
    }

    private static EmailMessage msg() {
        return new EmailMessage("andy@fredvested.com", null, "Subject", "<p>hi</p>", "hi");
    }

    @Test
    void disabledRecordsMockedAndNeverDispatches() {
        service(false).sendEmail(msg(), 7L, "MARKET_BREAKDOWN", "2026-06");

        verify(sender, never()).send(any());
        ArgumentCaptor<EmailLog> cap = ArgumentCaptor.forClass(EmailLog.class);
        verify(repo).save(cap.capture());
        assertEquals(EmailLog.STATUS_MOCKED, cap.getValue().getStatus());
        assertEquals("MARKET_BREAKDOWN", cap.getValue().getEmailType());
        assertEquals("2026-06", cap.getValue().getPeriodKey());
        assertEquals(7L, cap.getValue().getUserId());
    }

    @Test
    void enabledDispatchesAndRecordsSentWithFromFilled() {
        EmailMessage m = msg();
        service(true).sendEmail(m, 7L, "MARKET_BREAKDOWN", "2026-06");

        verify(sender).send(m);
        assertEquals("noreply@fredvested.com", m.getFrom());
        ArgumentCaptor<EmailLog> cap = ArgumentCaptor.forClass(EmailLog.class);
        verify(repo).save(cap.capture());
        assertEquals(EmailLog.STATUS_SENT, cap.getValue().getStatus());
    }

    @Test
    void senderFailureRecordsFailedAndDoesNotThrow() {
        doThrow(new RuntimeException("smtp boom")).when(sender).send(any());

        assertDoesNotThrow(() -> service(true).sendEmail(msg(), 7L, "MARKET_BREAKDOWN", "2026-06"));

        ArgumentCaptor<EmailLog> cap = ArgumentCaptor.forClass(EmailLog.class);
        verify(repo).save(cap.capture());
        assertEquals(EmailLog.STATUS_FAILED, cap.getValue().getStatus());
        assertTrue(cap.getValue().getErrorMessage().contains("smtp boom"));
    }

    @Test
    void retryAfterFailureUpdatesExistingRowInsteadOfInserting() {
        EmailLog failed = new EmailLog(7L, "andy@fredvested.com", "Subject",
                "MARKET_BREAKDOWN", "2026-06", EmailLog.STATUS_FAILED, "old error");
        when(repo.findByEmailTypeAndUserIdAndPeriodKey("MARKET_BREAKDOWN", 7L, "2026-06"))
                .thenReturn(Optional.of(failed));

        service(false).sendEmail(msg(), 7L, "MARKET_BREAKDOWN", "2026-06");

        // Same entity instance updated — no second row for the unique index to reject
        verify(repo).save(failed);
        assertEquals(EmailLog.STATUS_MOCKED, failed.getStatus());
        assertNull(failed.getErrorMessage());
    }

    @Test
    void legacySignatureRecordsLegacyTypeWithNullUser() {
        service(false).sendEmail("andy@fredvested.com", "Hello", "Body text");

        verify(sender, never()).send(any());
        ArgumentCaptor<EmailLog> cap = ArgumentCaptor.forClass(EmailLog.class);
        verify(repo).save(cap.capture());
        assertEquals(EmailService.TYPE_LEGACY, cap.getValue().getEmailType());
        assertNull(cap.getValue().getUserId());
        assertNull(cap.getValue().getPeriodKey());
        assertEquals(EmailLog.STATUS_MOCKED, cap.getValue().getStatus());
    }

    @Test
    void hasBeenSentTrueOnlyForSentOrMocked() {
        EmailService svc = service(false);

        when(repo.findByEmailTypeAndUserIdAndPeriodKey("T", 1L, "2026-06"))
                .thenReturn(Optional.of(new EmailLog(1L, "a@b.c", "s", "T", "2026-06", EmailLog.STATUS_SENT, null)));
        assertTrue(svc.hasBeenSent("T", 1L, "2026-06"));

        when(repo.findByEmailTypeAndUserIdAndPeriodKey("T", 1L, "2026-06"))
                .thenReturn(Optional.of(new EmailLog(1L, "a@b.c", "s", "T", "2026-06", EmailLog.STATUS_MOCKED, null)));
        assertTrue(svc.hasBeenSent("T", 1L, "2026-06"));

        when(repo.findByEmailTypeAndUserIdAndPeriodKey("T", 1L, "2026-06"))
                .thenReturn(Optional.of(new EmailLog(1L, "a@b.c", "s", "T", "2026-06", EmailLog.STATUS_FAILED, "x")));
        assertFalse(svc.hasBeenSent("T", 1L, "2026-06"));

        when(repo.findByEmailTypeAndUserIdAndPeriodKey("T", 1L, "2026-06")).thenReturn(Optional.empty());
        assertFalse(svc.hasBeenSent("T", 1L, "2026-06"));
    }

    @Test
    void recordFailedAttemptWritesFailedRow() {
        service(false).recordFailedAttempt(7L, "andy@fredvested.com", "MARKET_BREAKDOWN", "2026-06", "numbers unresolved");

        ArgumentCaptor<EmailLog> cap = ArgumentCaptor.forClass(EmailLog.class);
        verify(repo).save(cap.capture());
        assertEquals(EmailLog.STATUS_FAILED, cap.getValue().getStatus());
        assertEquals("numbers unresolved", cap.getValue().getErrorMessage());
        verify(sender, never()).send(any());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.service.EmailServiceTest'`
Expected: FAIL — compilation error, `constructor EmailService(...)` / `TYPE_LEGACY` / `hasBeenSent` cannot find symbol.

- [ ] **Step 3: Rewrite `EmailService`**

```java
package com.investingapp.backend.service;

import com.investingapp.backend.dto.EmailMessage;
import com.investingapp.backend.model.EmailLog;
import com.investingapp.backend.repository.EmailLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Facade for all outbound email. Every attempt is recorded in email_log
 * (bodies never stored). Dispatch goes through the active EmailSender;
 * with app.email.enabled=false (current state) sends are MOCKED — logged
 * and recorded, never dispatched — so the whole pipeline is exercisable
 * before a real provider exists.
 */
@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    public static final String TYPE_LEGACY = "LEGACY";

    private final EmailLogRepository emailLogRepository;
    private final EmailSender emailSender;
    private final boolean emailEnabled;
    private final String fromEmail;

    public EmailService(EmailLogRepository emailLogRepository,
            EmailSender emailSender,
            @Value("${app.email.enabled:false}") boolean emailEnabled,
            @Value("${app.email.from:noreply@investingapp.com}") String fromEmail) {
        this.emailLogRepository = emailLogRepository;
        this.emailSender = emailSender;
        this.emailEnabled = emailEnabled;
        this.fromEmail = fromEmail;
    }

    /** Legacy plain-text path — existing callers keep this exact signature. */
    public void sendEmail(String to, String subject, String text) {
        sendEmail(new EmailMessage(to, null, subject, null, text), null, TYPE_LEGACY, null);
    }

    /**
     * Send (or mock-send) an email and record the outcome. Never throws —
     * failures are recorded as FAILED rows and callers rely on hasBeenSent /
     * catch-up jobs for retry semantics.
     */
    public void sendEmail(EmailMessage message, Long userId, String emailType, String periodKey) {
        if (message.getFrom() == null) {
            message.setFrom(fromEmail);
        }
        if (!emailEnabled) {
            logger.info("Email disabled. Would send to {}: '{}' [type={}, period={}]",
                    message.getTo(), message.getSubject(), emailType, periodKey);
            record(userId, message.getTo(), message.getSubject(), emailType, periodKey,
                    EmailLog.STATUS_MOCKED, null);
            return;
        }
        try {
            emailSender.send(message);
            record(userId, message.getTo(), message.getSubject(), emailType, periodKey,
                    EmailLog.STATUS_SENT, null);
        } catch (Exception e) {
            logger.error("Email send failed to {} [type={}]: {}", message.getTo(), emailType, e.getMessage());
            record(userId, message.getTo(), message.getSubject(), emailType, periodKey,
                    EmailLog.STATUS_FAILED, e.getMessage());
        }
    }

    /** True when a SENT or MOCKED row exists for this (type, user, period). */
    public boolean hasBeenSent(String emailType, Long userId, String periodKey) {
        return emailLogRepository.findByEmailTypeAndUserIdAndPeriodKey(emailType, userId, periodKey)
                .map(l -> EmailLog.STATUS_SENT.equals(l.getStatus()) || EmailLog.STATUS_MOCKED.equals(l.getStatus()))
                .orElse(false);
    }

    /** Record a FAILED attempt that never reached dispatch (e.g. compose/data errors). */
    public void recordFailedAttempt(Long userId, String recipient, String emailType,
            String periodKey, String error) {
        record(userId, recipient, null, emailType, periodKey, EmailLog.STATUS_FAILED, error);
    }

    /**
     * Upsert the audit row. For period emails a FAILED row is updated in place on
     * retry — the unique index would reject a second insert for the same
     * (type, user, period). One-off emails (null periodKey) always insert.
     */
    private void record(Long userId, String recipient, String subject, String emailType,
            String periodKey, String status, String errorMessage) {
        try {
            EmailLog log = null;
            if (periodKey != null && userId != null) {
                Optional<EmailLog> existing =
                        emailLogRepository.findByEmailTypeAndUserIdAndPeriodKey(emailType, userId, periodKey);
                if (existing.isPresent()) {
                    log = existing.get();
                    log.setStatus(status);
                    log.setErrorMessage(errorMessage);
                    if (subject != null) {
                        log.setSubject(subject);
                    }
                }
            }
            if (log == null) {
                log = new EmailLog(userId, recipient, subject, emailType, periodKey, status, errorMessage);
            }
            emailLogRepository.save(log);
        } catch (Exception e) {
            // Auditing must never break the send path (or a scheduler batch)
            logger.error("Failed to record email_log row [type={}, user={}, period={}]: {}",
                    emailType, userId, periodKey, e.getMessage());
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.service.EmailServiceTest'`
Expected: PASS (7 tests)

- [ ] **Step 5: Verify the 4 legacy callers still compile**

Run: `cd backend && ./gradlew compileJava -q`
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/service/EmailService.java backend/src/test/java/com/investingapp/backend/service/EmailServiceTest.java
git commit -m "feat(email): EmailService facade — audit log, idempotency, mock mode"
```

---

### Task 3: MarketBreakdown entity + repository

Pure types — gate is compilation.

**Files:**
- Create: `backend/src/main/java/com/investingapp/backend/model/MarketBreakdown.java`
- Create: `backend/src/main/java/com/investingapp/backend/repository/MarketBreakdownRepository.java`

**Interfaces:**
- Produces: `MarketBreakdown` entity (Lombok `@Data`, setters used by service) with `STATUS_GENERATED/STATUS_FAILED`; `MarketBreakdownRepository.findByPeriodKey(String)` → `Optional<MarketBreakdown>`.

- [ ] **Step 1: Create `MarketBreakdown` entity**

```java
package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * One row per month: the generated Monthly Market Breakdown narrative plus the
 * exact inputs (ETF returns) and web-search citations used — the compliance
 * audit trail. Every recipient of a month gets this identical narrative;
 * regeneration after FAILED updates the row in place (periodKey is unique).
 */
@Entity
@Table(name = "market_breakdown")
@Data
@NoArgsConstructor
public class MarketBreakdown {

    public static final String STATUS_GENERATED = "GENERATED";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "period_key", nullable = false, unique = true, length = 10)
    private String periodKey; // "2026-06"

    @Column(nullable = false, length = 30)
    private String periodLabel; // "June 2026"

    @Column(columnDefinition = "LONGTEXT")
    private String narrativeHtml; // validated fragment: <p> <strong> <em> <h3> <ul> <li> <br> only

    @Column(columnDefinition = "TEXT")
    private String etfReturnsJson; // numbers fed to Claude — audit

    @Column(columnDefinition = "TEXT")
    private String sourcesJson; // web-search citations — audit

    @Column(length = 60)
    private String model; // e.g. claude-sonnet-5

    @Column(nullable = false, length = 12)
    private String status; // GENERATED | FAILED

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime generatedAt; // touched on every (re)generation attempt
}
```

- [ ] **Step 2: Create `MarketBreakdownRepository`**

```java
package com.investingapp.backend.repository;

import com.investingapp.backend.model.MarketBreakdown;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MarketBreakdownRepository extends JpaRepository<MarketBreakdown, Long> {

    Optional<MarketBreakdown> findByPeriodKey(String periodKey);
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd backend && ./gradlew compileJava -q`
Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/model/MarketBreakdown.java backend/src/main/java/com/investingapp/backend/repository/MarketBreakdownRepository.java
git commit -m "feat(market-breakdown): monthly snapshot entity + repository"
```

---

### Task 4: Monthly ETF returns — fetch from Alpaca + pure extraction math

**Files:**
- Create: `backend/src/main/java/com/investingapp/backend/service/MarketBreakdownService.java` (first slice: constants, `SymbolMonthlyReturn`, `fetchMonthlyReturns`, static `extractMonthlyReturns`)
- Test: `backend/src/test/java/com/investingapp/backend/service/MarketBreakdownServiceReturnsTest.java`

**Interfaces:**
- Consumes: `MarketBreakdownRepository`, `LLMService` (constructor deps — LLM used in Task 8).
- Produces: `MarketBreakdownService.SymbolMonthlyReturn` (public fields `symbol, priorClose, endClose, returnPct`); `protected List<SymbolMonthlyReturn> fetchMonthlyReturns(YearMonth)`; `static List<SymbolMonthlyReturn> extractMonthlyReturns(JsonNode root, YearMonth target, List<String> symbols)`; constants `PORTFOLIO_SYMBOLS = [VTI, VXUS, VBR]`, `MARKET_CONTEXT_SYMBOL = "SPY"`, `PORTFOLIO_WEIGHTS`.

- [ ] **Step 1: Write the failing test**

```java
package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MarketBreakdownServiceReturnsTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static JsonNode bars(String json) throws Exception {
        return MAPPER.readTree(json);
    }

    // Alpaca GET /v2/stocks/bars?timeframe=1Month shape: {"bars": {"SYM": [{t,o,h,l,c,v}, ...]}}
    private static final String TWO_MONTHS = """
            {"bars": {
              "VTI":  [{"t":"2026-05-01T04:00:00Z","c":250.10},{"t":"2026-06-01T04:00:00Z","c":255.40}],
              "SPY":  [{"t":"2026-05-01T04:00:00Z","c":530.00},{"t":"2026-06-01T04:00:00Z","c":524.70}]
            }, "next_page_token": null}
            """;

    @Test
    void computesMonthOverMonthCloseReturn() throws Exception {
        List<MarketBreakdownService.SymbolMonthlyReturn> out =
                MarketBreakdownService.extractMonthlyReturns(
                        bars(TWO_MONTHS), YearMonth.of(2026, 6), List.of("VTI", "SPY"));

        assertEquals(2, out.size());
        MarketBreakdownService.SymbolMonthlyReturn vti = out.get(0);
        assertEquals("VTI", vti.symbol);
        assertEquals(new BigDecimal("250.10"), vti.priorClose);
        assertEquals(new BigDecimal("255.40"), vti.endClose);
        assertEquals(new BigDecimal("2.12"), vti.returnPct); // (255.40-250.10)/250.10*100 = 2.1191 -> 2.12

        MarketBreakdownService.SymbolMonthlyReturn spy = out.get(1);
        assertEquals(new BigDecimal("-1.00"), spy.returnPct); // (524.70-530.00)/530.00*100 = -1.0
    }

    @Test
    void unsortedBarsAreSortedByTimestamp() throws Exception {
        String reversed = """
                {"bars": {"VTI": [
                  {"t":"2026-06-01T04:00:00Z","c":255.40},
                  {"t":"2026-05-01T04:00:00Z","c":250.10}
                ]}}
                """;
        List<MarketBreakdownService.SymbolMonthlyReturn> out =
                MarketBreakdownService.extractMonthlyReturns(
                        bars(reversed), YearMonth.of(2026, 6), List.of("VTI"));
        assertEquals(new BigDecimal("2.12"), out.get(0).returnPct);
    }

    @Test
    void missingSymbolThrows() throws Exception {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                MarketBreakdownService.extractMonthlyReturns(
                        bars(TWO_MONTHS), YearMonth.of(2026, 6), List.of("VTI", "VXUS")));
        assertTrue(ex.getMessage().contains("VXUS"));
    }

    @Test
    void missingPriorMonthBarThrows() throws Exception {
        String oneBar = """
                {"bars": {"VTI": [{"t":"2026-06-01T04:00:00Z","c":255.40}]}}
                """;
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                MarketBreakdownService.extractMonthlyReturns(
                        bars(oneBar), YearMonth.of(2026, 6), List.of("VTI")));
        assertTrue(ex.getMessage().contains("VTI"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.service.MarketBreakdownServiceReturnsTest'`
Expected: FAIL — compilation error, `MarketBreakdownService` cannot find symbol.

- [ ] **Step 3: Create `MarketBreakdownService` (first slice)**

```java
package com.investingapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.repository.MarketBreakdownRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.*;

/**
 * Generates and stores the once-per-month Market Breakdown narrative.
 * Numbers come from Alpaca Market Data (real monthly closes); the narrative
 * comes from one web-search-grounded Claude call and must pass the
 * deterministic compliance gate before it can be stored as GENERATED.
 */
@Service
public class MarketBreakdownService {

    private static final Logger logger = LoggerFactory.getLogger(MarketBreakdownService.class);

    /** FRED default portfolio (see PortfolioService default allocation). */
    static final List<String> PORTFOLIO_SYMBOLS = List.of("VTI", "VXUS", "VBR");
    static final Map<String, Integer> PORTFOLIO_WEIGHTS = Map.of("VTI", 75, "VXUS", 20, "VBR", 5);
    /** Included for "the market" context in the narrative — not in the portfolio. */
    static final String MARKET_CONTEXT_SYMBOL = "SPY";

    private final MarketBreakdownRepository repository;
    private final LLMService llmService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${alpaca.market.key:}")
    private String marketDataKey;

    @Value("${alpaca.market.secret:}")
    private String marketDataSecret;

    @Value("${alpaca.market.base-url:https://data.alpaca.markets/v2}")
    private String marketDataBaseUrl;

    @Autowired
    public MarketBreakdownService(MarketBreakdownRepository repository, LLMService llmService) {
        this.repository = repository;
        this.llmService = llmService;
    }

    private static List<String> allSymbols() {
        List<String> symbols = new ArrayList<>(PORTFOLIO_SYMBOLS);
        symbols.add(MARKET_CONTEXT_SYMBOL);
        return symbols;
    }

    /**
     * Fetch monthly bars for the target month and the month before it, and
     * compute close-to-close monthly returns. Protected so orchestration tests
     * can stub the HTTP hop.
     */
    protected List<SymbolMonthlyReturn> fetchMonthlyReturns(YearMonth target) {
        YearMonth prior = target.minusMonths(1);
        String url = String.format(
                "%s/stocks/bars?symbols=%s&timeframe=1Month&start=%s&end=%s&limit=1000",
                marketDataBaseUrl, String.join(",", allSymbols()),
                prior.atDay(1), target.atEndOfMonth());

        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", marketDataKey);
        headers.set("APCA-API-SECRET-KEY", marketDataSecret);
        headers.set("Accept", "application/json");

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                throw new IllegalStateException("Alpaca bars request returned HTTP " + response.getStatusCode());
            }
            return extractMonthlyReturns(objectMapper.readTree(response.getBody()), target, allSymbols());
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to fetch monthly bars: " + e.getMessage(), e);
        }
    }

    /**
     * Pure math: month-over-month close returns from an Alpaca multi-symbol
     * 1Month bars response. Throws IllegalStateException when any requested
     * symbol is missing either month's bar — a partial narrative must never
     * generate from partial numbers.
     */
    static List<SymbolMonthlyReturn> extractMonthlyReturns(JsonNode root, YearMonth target,
            List<String> symbols) {
        YearMonth prior = target.minusMonths(1);
        JsonNode bars = root.path("bars");
        List<SymbolMonthlyReturn> out = new ArrayList<>();

        for (String symbol : symbols) {
            JsonNode symbolBars = bars.path(symbol);
            if (!symbolBars.isArray() || symbolBars.isEmpty()) {
                throw new IllegalStateException("No bars returned for symbol " + symbol);
            }
            // Defensive sort by timestamp (ISO strings sort lexicographically)
            List<JsonNode> sorted = new ArrayList<>();
            symbolBars.forEach(sorted::add);
            sorted.sort(Comparator.comparing(b -> b.path("t").asText()));

            BigDecimal priorClose = closeForMonth(sorted, prior);
            BigDecimal endClose = closeForMonth(sorted, target);
            if (priorClose == null || endClose == null
                    || priorClose.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalStateException("Missing monthly close for symbol " + symbol
                        + " (prior=" + priorClose + ", end=" + endClose + ")");
            }
            BigDecimal returnPct = endClose.subtract(priorClose)
                    .divide(priorClose, 6, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);
            out.add(new SymbolMonthlyReturn(symbol, priorClose, endClose, returnPct));
        }
        return out;
    }

    private static BigDecimal closeForMonth(List<JsonNode> sortedBars, YearMonth month) {
        String prefix = month.toString(); // "2026-06" matches "2026-06-01T04:00:00Z"
        for (JsonNode bar : sortedBars) {
            if (bar.path("t").asText().startsWith(prefix) && bar.has("c")) {
                return new BigDecimal(bar.path("c").asText());
            }
        }
        return null;
    }

    /** Monthly close-to-close result for one symbol. */
    public static class SymbolMonthlyReturn {
        public final String symbol;
        public final BigDecimal priorClose;
        public final BigDecimal endClose;
        public final BigDecimal returnPct;

        public SymbolMonthlyReturn(String symbol, BigDecimal priorClose, BigDecimal endClose,
                BigDecimal returnPct) {
            this.symbol = symbol;
            this.priorClose = priorClose;
            this.endClose = endClose;
            this.returnPct = returnPct;
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.service.MarketBreakdownServiceReturnsTest'`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/service/MarketBreakdownService.java backend/src/test/java/com/investingapp/backend/service/MarketBreakdownServiceReturnsTest.java
git commit -m "feat(market-breakdown): Alpaca monthly bars fetch + close-to-close return math"
```

---

### Task 5: Prompt builders + LLMService grounded summary method

**Files:**
- Modify: `backend/src/main/java/com/investingapp/backend/service/MarketBreakdownService.java` (add prompt builders)
- Modify: `backend/src/main/java/com/investingapp/backend/service/LLMService.java` (add `generateGroundedMarketSummary` + `GroundedSummary`)
- Test: `backend/src/test/java/com/investingapp/backend/service/MarketBreakdownPromptTest.java`

**Interfaces:**
- Consumes: `SymbolMonthlyReturn` (Task 4).
- Produces: `static String buildSystemPrompt()`; `static String buildUserPrompt(YearMonth month, List<SymbolMonthlyReturn> returns)` on MarketBreakdownService; `LLMService.generateGroundedMarketSummary(String systemPrompt, String userPrompt)` → `LLMService.GroundedSummary { String text; String model; List<Source> sources }`, `Source { String url; String title }`.

- [ ] **Step 1: Write the failing test (prompt builders only — the LLM call itself is not unit-testable)**

```java
package com.investingapp.backend.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MarketBreakdownPromptTest {

    private static MarketBreakdownService.SymbolMonthlyReturn ret(String symbol, String pct) {
        return new MarketBreakdownService.SymbolMonthlyReturn(
                symbol, new BigDecimal("100.00"), new BigDecimal("102.00"), new BigDecimal(pct));
    }

    @Test
    void systemPromptContainsComplianceRules() {
        String system = MarketBreakdownService.buildSystemPrompt();
        String lower = system.toLowerCase();
        assertTrue(lower.contains("never recommend"));
        assertTrue(lower.contains("never predict"));
        assertTrue(lower.contains("only the"), "must pin numbers to provided data");
        assertTrue(lower.contains("<p>"), "must constrain output tags");
    }

    @Test
    void userPromptContainsMonthNumbersAndWeights() {
        String prompt = MarketBreakdownService.buildUserPrompt(YearMonth.of(2026, 6),
                List.of(ret("VTI", "2.12"), ret("VXUS", "-0.80"), ret("VBR", "1.05"), ret("SPY", "1.90")));

        assertTrue(prompt.contains("June 2026"));
        assertTrue(prompt.contains("VTI"));
        assertTrue(prompt.contains("2.12"));
        assertTrue(prompt.contains("-0.80"));
        assertTrue(prompt.contains("75%"));
        assertTrue(prompt.contains("context only"), "SPY must be marked as not in the portfolio");
        assertTrue(prompt.toLowerCase().contains("search the web"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.service.MarketBreakdownPromptTest'`
Expected: FAIL — compilation error, `buildSystemPrompt` cannot find symbol.

- [ ] **Step 3: Add prompt builders to `MarketBreakdownService`**

Add these methods (plus imports `java.time.format.DateTimeFormatter`, `java.util.Locale`):

```java
    static final DateTimeFormatter MONTH_LABEL =
            DateTimeFormatter.ofPattern("MMMM yyyy", Locale.US);

    /** Voice + hard compliance rules for the narrative generation call. */
    static String buildSystemPrompt() {
        return """
                You are FRED, a calm, plain-English investing companion for everyday long-term \
                investors. You write the market recap section of FRED's Monthly Market Breakdown email.

                Hard rules — violating any of these makes the output unusable:
                - NEVER recommend any action. No changes to allocation, contributions, or strategy. \
                Never tell the reader to buy, sell, hold, wait, or "consider" anything. You explain what \
                happened; you do not advise.
                - NEVER predict future performance and never imply outcomes are guaranteed.
                - Use ONLY the portfolio numbers provided in the request. Never invent, estimate, or \
                round differently any figure. Facts about news events must come from your web search results.
                - Voice: calm, clear, friendly, jargon-free. If a term like "yield" or "index" is needed, \
                explain it in a few plain words. Never salesy, never urgent.
                - Output: an HTML fragment using ONLY <p>, <strong>, <em>, <h3>, <ul>, <li>, <br> tags. \
                No other tags, no attributes, no links, no markdown, no code fences.
                """;
    }

    /** The month's real numbers + the grounded task. */
    static String buildUserPrompt(YearMonth month, List<SymbolMonthlyReturn> returns) {
        String label = month.format(MONTH_LABEL);
        StringBuilder numbers = new StringBuilder();
        for (SymbolMonthlyReturn r : returns) {
            Integer weight = PORTFOLIO_WEIGHTS.get(r.symbol);
            String role = weight != null
                    ? weight + "% of the FRED default portfolio"
                    : "S&P 500, market context only — NOT in the portfolio";
            numbers.append(String.format(Locale.US,
                    "- %s (%s): %s%% for %s (closed the prior month at $%s, %s at $%s)%n",
                    r.symbol, role, r.returnPct, label, r.priorClose, label, r.endClose));
        }
        return String.format(Locale.US, """
                Write the market recap for FRED's Monthly Market Breakdown for %1$s.

                The FRED default portfolio holds three ETFs: VTI (Vanguard Total US Stock Market, 75%%), \
                VXUS (Vanguard Total International Stock, 20%%), VBR (Vanguard Small-Cap Value, 5%%).

                Actual %1$s monthly results (month-end close to month-end close):
                %2$s
                Search the web for the major market-moving events of %1$s — for example Federal Reserve \
                decisions, inflation reports, jobs data, notable earnings themes, and world events — and \
                explain in plain English what happened and why these funds likely moved the way they did.

                Structure exactly:
                <h3>What happened in %1$s</h3> followed by 2-4 short <p> paragraphs, then
                <h3>Why your funds moved</h3> followed by a <ul> with one <li> per portfolio fund \
                (VTI, VXUS, VBR), each mentioning that fund's actual return from the numbers above.

                Length: 300-500 words. Remember: explain only — no advice, no predictions, no invented numbers.
                """, label, numbers);
    }
```

- [ ] **Step 4: Run prompt test to verify it passes**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.service.MarketBreakdownPromptTest'`
Expected: PASS (2 tests)

- [ ] **Step 5: Add `generateGroundedMarketSummary` to `LLMService`**

Add imports to `LLMService.java`:

```java
import com.anthropic.models.messages.ToolUnion;
import com.anthropic.models.messages.WebSearchTool20250305;
import com.anthropic.models.messages.WebSearchResultBlock;
import java.util.LinkedHashSet;
import java.util.Set;
```

Add constant near `CHAT_MAX_TOKENS`:

```java
    private static final long GROUNDED_SUMMARY_MAX_TOKENS = 4096L;
    private static final long GROUNDED_SUMMARY_MAX_SEARCHES = 5L;
```

Add method + nested classes (near `generateChatResponse`):

```java
    /**
     * One-shot, non-streaming completion grounded with the Anthropic server-side
     * web search tool. Used by the Monthly Market Breakdown — the model searches
     * for real events (Claude alone cannot know last month's news) and the
     * citations are returned for the audit trail. No thinking: utility path.
     */
    public GroundedSummary generateGroundedMarketSummary(String systemPrompt, String userPrompt) {
        MessageCreateParams params = MessageCreateParams.builder()
                .model(anthropicChatModel)
                .maxTokens(GROUNDED_SUMMARY_MAX_TOKENS)
                .system(systemPrompt)
                .addUserMessage(userPrompt)
                .addTool(ToolUnion.ofWebSearchTool20250305(WebSearchTool20250305.builder()
                        .maxUses(GROUNDED_SUMMARY_MAX_SEARCHES)
                        .build()))
                .build();

        Message message = anthropic().messages().create(params);

        String text = message.content().stream()
                .flatMap(block -> block.text().stream())
                .map(TextBlock::text)
                .collect(Collectors.joining());

        List<GroundedSummary.Source> sources = new ArrayList<>();
        Set<String> seenUrls = new LinkedHashSet<>();
        for (ContentBlock block : message.content()) {
            block.webSearchToolResult().ifPresent(result ->
                    result.content().resultBlocks().ifPresent(list -> {
                        for (WebSearchResultBlock res : list) {
                            if (seenUrls.add(res.url())) {
                                sources.add(new GroundedSummary.Source(res.url(), res.title()));
                            }
                        }
                    }));
        }

        String stopReason = message.stopReason().map(Object::toString).orElse("none");
        if (text.isBlank()) {
            throw new RuntimeException("Grounded summary came back empty (stop_reason: " + stopReason + ")");
        }
        logger.info("Grounded market summary generated: {} chars, {} sources", text.length(), sources.size());
        return new GroundedSummary(text, anthropicChatModel, sources);
    }

    /** Result of a grounded generation: narrative text + the searched sources. */
    public static class GroundedSummary {
        public final String text;
        public final String model;
        public final List<Source> sources;

        public GroundedSummary(String text, String model, List<Source> sources) {
            this.text = text;
            this.model = model;
            this.sources = sources;
        }

        public static class Source {
            public final String url;
            public final String title;

            public Source(String url, String title) {
                this.url = url;
                this.title = title;
            }
        }
    }
```

- [ ] **Step 6: Verify compilation (SDK accessor names are the risk here)**

Run: `cd backend && ./gradlew compileJava -q`
Expected: BUILD SUCCESSFUL. If `block.webSearchToolResult()` does not exist on `ContentBlock`, run `javap -cp ~/.gradle/caches/modules-2/files-2.1/com.anthropic/anthropic-java-core/2.48.0/*/anthropic-java-core-2.48.0.jar com.anthropic.models.messages.ContentBlock | grep -i webSearch` and use the accessor it shows (verified present in SDK 2.48.0: `ToolUnion.ofWebSearchTool20250305`, `WebSearchTool20250305.builder().maxUses(long)`, `WebSearchResultBlock.url()/title()`, `WebSearchToolResultBlockContent.resultBlocks()`).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/service/MarketBreakdownService.java backend/src/main/java/com/investingapp/backend/service/LLMService.java backend/src/test/java/com/investingapp/backend/service/MarketBreakdownPromptTest.java
git commit -m "feat(market-breakdown): compliance-pinned prompts + web-search-grounded LLM call"
```

---

### Task 6: MarketNarrativeValidator — the deterministic compliance gate

**Files:**
- Create: `backend/src/main/java/com/investingapp/backend/util/MarketNarrativeValidator.java`
- Test: `backend/src/test/java/com/investingapp/backend/util/MarketNarrativeValidatorTest.java`

**Interfaces:**
- Produces: `static ValidationResult validate(String html)`; `ValidationResult { boolean valid; List<String> violations }`.

- [ ] **Step 1: Write the failing test**

```java
package com.investingapp.backend.util;

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
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.util.MarketNarrativeValidatorTest'`
Expected: FAIL — compilation error, `MarketNarrativeValidator` cannot find symbol.

- [ ] **Step 3: Implement the validator**

```java
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
    private static final Pattern EVENT_ATTR = Pattern.compile("on[a-z]+\\s*=", Pattern.CASE_INSENSITIVE);

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

        String lower = html.toLowerCase(Locale.US);
        for (String phrase : FORBIDDEN_PHRASES) {
            if (lower.contains(phrase)) {
                violations.add("forbidden phrase: \"" + phrase + "\"");
            }
        }
        if (lower.contains("javascript:")) {
            violations.add("javascript: URI present");
        }

        Matcher tags = TAG.matcher(html);
        while (tags.find()) {
            String name = tags.group(1).toLowerCase(Locale.US);
            if (!ALLOWED_TAGS.contains(name)) {
                violations.add("disallowed tag: <" + name + ">");
            }
            String attrs = tags.group(2);
            if (attrs != null && !attrs.isBlank()
                    && (EVENT_ATTR.matcher(attrs).find() || attrs.contains("href"))) {
                violations.add("disallowed attribute on <" + name + ">: " + attrs.trim());
            }
        }

        return new ValidationResult(violations);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.util.MarketNarrativeValidatorTest'`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/util/MarketNarrativeValidator.java backend/src/test/java/com/investingapp/backend/util/MarketNarrativeValidatorTest.java
git commit -m "feat(market-breakdown): deterministic compliance gate for generated narrative"
```

---

### Task 7: Email templates + EmailTemplateRenderer

**Files:**
- Create: `backend/src/main/resources/templates/email/market-breakdown.html`
- Create: `backend/src/main/resources/templates/email/market-breakdown-numbers.html`
- Create: `backend/src/main/resources/templates/email/market-breakdown-change-rows.html`
- Create: `backend/src/main/resources/templates/email/market-breakdown-empty.html`
- Create: `backend/src/main/java/com/investingapp/backend/util/EmailTemplateRenderer.java`
- Test: `backend/src/test/java/com/investingapp/backend/util/EmailTemplateRendererTest.java`

**Interfaces:**
- Produces: `static String render(String templateName, Map<String, String> values)` (throws `IllegalStateException` on unresolved `{{placeholder}}`); `static String stripHtml(String html)`.
- Template slots: shell → `periodLabel, narrativeHtml, portfolioSection, unsubscribeUrl`; numbers → `periodLabel, endValue, contributions, changeRows`; change-rows → `changeLabel, changeValue, changeColor, marketReturnPct`; empty → none.

- [ ] **Step 1: Write the failing test**

```java
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
                "marketReturnPct", "+1.4%"));
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.util.EmailTemplateRendererTest'`
Expected: FAIL — compilation error, `EmailTemplateRenderer` cannot find symbol.

- [ ] **Step 3: Implement the renderer**

```java
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
```

- [ ] **Step 4: Create the shell template `market-breakdown.html`**

Email-safe (single column, inline CSS, system font stack), FRED-branded (#2563EB header, #111827 text, calm voice), CAN-SPAM-ready footer.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FRED's Monthly Market Breakdown - {{periodLabel}}</title>
</head>
<body style="margin:0; padding:0; background-color:#F3F4F6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#FFFFFF; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="background-color:#2563EB; padding:28px 32px;">
              <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:22px; font-weight:800; color:#FFFFFF; letter-spacing:0.5px;">FRED</span>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; color:#BFDBFE; margin-top:6px;">Monthly Market Breakdown &mdash; {{periodLabel}}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#111827;">
              {{narrativeHtml}}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px 32px;">
              {{portfolioSection}}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px; background-color:#F9FAFB; border-top:1px solid #E5E7EB;">
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.5; color:#6B7280; margin:0 0 8px 0;">
                This update is for your information only and is not investment advice or a recommendation
                to change your portfolio, contributions, or strategy. Past performance does not guarantee
                future results. Investing involves risk, including possible loss of principal.
              </p>
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.5; color:#6B7280; margin:0;">
                Questions? <a href="mailto:help@fredvested.com" style="color:#2563EB; text-decoration:none;">help@fredvested.com</a>
                &nbsp;&middot;&nbsp; <a href="{{unsubscribeUrl}}" style="color:#6B7280;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

- [ ] **Step 5: Create the numbers partial `market-breakdown-numbers.html`**

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB; border:1px solid #E5E7EB; border-radius:12px;">
  <tr>
    <td style="padding:20px 24px;">
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; font-weight:700; letter-spacing:0.4px; text-transform:uppercase; color:#6B7280; margin-bottom:12px;">Your portfolio in {{periodLabel}}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; color:#111827;">
        <tr>
          <td style="padding:6px 0; color:#6B7280;">Ended the month at</td>
          <td style="padding:6px 0; text-align:right; font-weight:700;">{{endValue}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0; color:#6B7280;">You contributed</td>
          <td style="padding:6px 0; text-align:right; font-weight:700;">{{contributions}}</td>
        </tr>
        {{changeRows}}
      </table>
    </td>
  </tr>
</table>
```

- [ ] **Step 6: Create the change-rows partial `market-breakdown-change-rows.html`**

Rendered only when the user has a resolvable month-start value (funded before the month began).

```html
<tr>
  <td style="padding:6px 0; color:#6B7280;">{{changeLabel}}</td>
  <td style="padding:6px 0; text-align:right; font-weight:700; color:{{changeColor}};">{{changeValue}}</td>
</tr>
<tr>
  <td style="padding:6px 0; color:#6B7280;">Market-driven return (excludes your deposits)</td>
  <td style="padding:6px 0; text-align:right; font-weight:700; color:{{changeColor}};">{{marketReturnPct}}</td>
</tr>
```

- [ ] **Step 7: Create the empty-portfolio partial `market-breakdown-empty.html`**

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB; border:1px solid #E5E7EB; border-radius:12px;">
  <tr>
    <td style="padding:20px 24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; color:#111827;">
      <div style="font-size:13px; font-weight:700; letter-spacing:0.4px; text-transform:uppercase; color:#6B7280; margin-bottom:8px;">Your portfolio</div>
      Once your account is funded and invested, this is where your month-by-month numbers will appear &mdash; your balance, what you put in, and what the market did.
    </td>
  </tr>
</table>
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.util.EmailTemplateRendererTest'`
Expected: PASS (6 tests)

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/resources/templates/email/ backend/src/main/java/com/investingapp/backend/util/EmailTemplateRenderer.java backend/src/test/java/com/investingapp/backend/util/EmailTemplateRendererTest.java
git commit -m "feat(market-breakdown): FRED-branded email templates + fail-loud renderer"
```

---

### Task 8: MarketBreakdownService.getOrGenerate — orchestration + persistence

**Files:**
- Modify: `backend/src/main/java/com/investingapp/backend/service/MarketBreakdownService.java`
- Test: `backend/src/test/java/com/investingapp/backend/service/MarketBreakdownServiceGenerateTest.java`

**Interfaces:**
- Consumes: `fetchMonthlyReturns` (Task 4), prompts (Task 5), `LLMService.generateGroundedMarketSummary` (Task 5), `MarketNarrativeValidator` (Task 6), `MarketBreakdownRepository` (Task 3).
- Produces: `MarketBreakdown getOrGenerate(YearMonth month)` — returns the stored GENERATED row (existing or fresh); persists FAILED + throws `IllegalStateException` on any failure; throws `IllegalArgumentException` for a not-yet-complete month.

- [ ] **Step 1: Write the failing test**

```java
package com.investingapp.backend.service;

import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.repository.MarketBreakdownRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class MarketBreakdownServiceGenerateTest {

    private MarketBreakdownRepository repo;
    private LLMService llm;
    private MarketBreakdownService service; // spy — fetchMonthlyReturns stubbed

    private static final YearMonth JUNE = YearMonth.of(2026, 6);

    @BeforeEach
    void setUp() {
        repo = mock(MarketBreakdownRepository.class);
        llm = mock(LLMService.class);
        service = spy(new MarketBreakdownService(repo, llm));
        when(repo.findByPeriodKey(anyString())).thenReturn(Optional.empty());
        when(repo.save(any(MarketBreakdown.class))).thenAnswer(inv -> inv.getArgument(0));
        doReturn(List.of(new MarketBreakdownService.SymbolMonthlyReturn(
                "VTI", new BigDecimal("250.10"), new BigDecimal("255.40"), new BigDecimal("2.12"))))
                .when(service).fetchMonthlyReturns(JUNE);
    }

    /** Valid narrative: long enough, allowed tags only, no advice. */
    private static String validNarrative() {
        StringBuilder sb = new StringBuilder("<h3>What happened in June 2026</h3>");
        for (int i = 0; i < 6; i++) {
            sb.append("<p>Stocks drifted higher as inflation cooled and the Federal Reserve held ")
              .append("rates steady, lifting <strong>VTI</strong> by month end.</p>");
        }
        return sb.toString();
    }

    private void llmReturns(String text) {
        when(llm.generateGroundedMarketSummary(anyString(), anyString()))
                .thenReturn(new LLMService.GroundedSummary(text, "claude-sonnet-5",
                        List.of(new LLMService.GroundedSummary.Source("https://x.com/a", "Article"))));
    }

    @Test
    void happyPathPersistsGeneratedRowWithAuditJson() {
        llmReturns(validNarrative());

        MarketBreakdown out = service.getOrGenerate(JUNE);

        assertEquals(MarketBreakdown.STATUS_GENERATED, out.getStatus());
        assertEquals("2026-06", out.getPeriodKey());
        assertEquals("June 2026", out.getPeriodLabel());
        assertTrue(out.getNarrativeHtml().contains("VTI"));
        assertTrue(out.getEtfReturnsJson().contains("VTI"));
        assertTrue(out.getEtfReturnsJson().contains("2.12"));
        assertTrue(out.getSourcesJson().contains("https://x.com/a"));
        assertEquals("claude-sonnet-5", out.getModel());
        verify(repo).save(out);
    }

    @Test
    void existingGeneratedRowShortCircuits() {
        MarketBreakdown existing = new MarketBreakdown();
        existing.setPeriodKey("2026-06");
        existing.setStatus(MarketBreakdown.STATUS_GENERATED);
        when(repo.findByPeriodKey("2026-06")).thenReturn(Optional.of(existing));

        MarketBreakdown out = service.getOrGenerate(JUNE);

        assertSame(existing, out);
        verify(llm, never()).generateGroundedMarketSummary(anyString(), anyString());
        verify(repo, never()).save(any());
    }

    @Test
    void complianceRejectionPersistsFailedAndThrows() {
        llmReturns(validNarrative() + "<p>You should buy more before prices rise.</p>");

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> service.getOrGenerate(JUNE));

        assertTrue(ex.getMessage().contains("compliance"));
        ArgumentCaptor<MarketBreakdown> cap = ArgumentCaptor.forClass(MarketBreakdown.class);
        verify(repo).save(cap.capture());
        assertEquals(MarketBreakdown.STATUS_FAILED, cap.getValue().getStatus());
        assertTrue(cap.getValue().getErrorMessage().contains("you should"));
        assertNull(cap.getValue().getNarrativeHtml(), "rejected narrative must not be stored as sendable");
    }

    @Test
    void failedRowIsRegeneratedInPlace() {
        MarketBreakdown failed = new MarketBreakdown();
        failed.setPeriodKey("2026-06");
        failed.setStatus(MarketBreakdown.STATUS_FAILED);
        failed.setErrorMessage("old");
        when(repo.findByPeriodKey("2026-06")).thenReturn(Optional.of(failed));
        llmReturns(validNarrative());

        MarketBreakdown out = service.getOrGenerate(JUNE);

        assertSame(failed, out, "must update the existing row — periodKey is unique");
        assertEquals(MarketBreakdown.STATUS_GENERATED, out.getStatus());
        assertNull(out.getErrorMessage());
    }

    @Test
    void incompleteMonthIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> service.getOrGenerate(YearMonth.now()));
        assertThrows(IllegalArgumentException.class, () -> service.getOrGenerate(YearMonth.now().plusMonths(1)));
        verify(repo, never()).save(any());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.service.MarketBreakdownServiceGenerateTest'`
Expected: FAIL — compilation error, `getOrGenerate` cannot find symbol.

- [ ] **Step 3: Add `getOrGenerate` to `MarketBreakdownService`**

Add imports: `com.investingapp.backend.util.MarketNarrativeValidator`, `java.time.ZoneId`.

```java
    static final ZoneId MARKET_ZONE = ZoneId.of("America/New_York");

    /**
     * Return the month's breakdown, generating and persisting it if needed.
     * Idempotent: an existing GENERATED row is returned as-is (every recipient
     * gets identical narrative text, and retries never regenerate mid-batch).
     * A FAILED row is regenerated in place. On any failure a FAILED row is
     * persisted and IllegalStateException is thrown — callers (scheduler
     * catch-up runs, manual endpoint) retry by calling again.
     */
    public MarketBreakdown getOrGenerate(YearMonth month) {
        if (!month.isBefore(YearMonth.now(MARKET_ZONE))) {
            throw new IllegalArgumentException(
                    "Market breakdown can only be generated for completed months, got " + month);
        }
        String periodKey = month.toString();
        Optional<MarketBreakdown> existing = repository.findByPeriodKey(periodKey);
        if (existing.isPresent() && MarketBreakdown.STATUS_GENERATED.equals(existing.get().getStatus())) {
            return existing.get();
        }

        MarketBreakdown row = existing.orElseGet(MarketBreakdown::new);
        row.setPeriodKey(periodKey);
        row.setPeriodLabel(month.format(MONTH_LABEL));

        try {
            List<SymbolMonthlyReturn> returns = fetchMonthlyReturns(month);
            row.setEtfReturnsJson(objectMapper.writeValueAsString(returns));

            LLMService.GroundedSummary summary = llmService.generateGroundedMarketSummary(
                    buildSystemPrompt(), buildUserPrompt(month, returns));

            MarketNarrativeValidator.ValidationResult check =
                    MarketNarrativeValidator.validate(summary.text);
            if (!check.valid) {
                throw new IllegalStateException(
                        "Narrative failed compliance validation: " + String.join("; ", check.violations));
            }

            row.setNarrativeHtml(summary.text.trim());
            row.setSourcesJson(objectMapper.writeValueAsString(summary.sources));
            row.setModel(summary.model);
            row.setStatus(MarketBreakdown.STATUS_GENERATED);
            row.setErrorMessage(null);
            logger.info("Market breakdown generated for {} ({} chars, {} sources)",
                    periodKey, row.getNarrativeHtml().length(), summary.sources.size());
            return repository.save(row);
        } catch (Exception e) {
            row.setNarrativeHtml(null); // never leave a rejected/partial narrative sendable
            row.setStatus(MarketBreakdown.STATUS_FAILED);
            row.setErrorMessage(e.getMessage() == null ? e.getClass().getSimpleName()
                    : e.getMessage().substring(0, Math.min(e.getMessage().length(), 2000)));
            try {
                repository.save(row);
            } catch (Exception persistError) {
                logger.error("Could not persist FAILED market_breakdown row for {}: {}",
                        periodKey, persistError.getMessage());
            }
            throw new IllegalStateException(
                    "Market breakdown generation failed for " + periodKey + ": " + e.getMessage(), e);
        }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.service.MarketBreakdownServiceGenerateTest'`
Expected: PASS (5 tests)

- [ ] **Step 5: Re-run the earlier suites (same file touched)**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.service.MarketBreakdownServiceReturnsTest' --tests 'com.investingapp.backend.service.MarketBreakdownPromptTest'`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/service/MarketBreakdownService.java backend/src/test/java/com/investingapp/backend/service/MarketBreakdownServiceGenerateTest.java
git commit -m "feat(market-breakdown): getOrGenerate orchestration with compliance gate + FAILED persistence"
```

---

### Task 9: MarketBreakdownEmailComposer — per-user numbers + email assembly

**Files:**
- Create: `backend/src/main/java/com/investingapp/backend/service/MarketBreakdownEmailComposer.java`
- Test: `backend/src/test/java/com/investingapp/backend/service/MarketBreakdownEmailComposerTest.java`

**Interfaces:**
- Consumes: `PortfolioDashboardService.getPortfolioHistoryForPeriod(User, "3M")` + `PortfolioHistory` (public `timestamps`/`values` fields); package-private `PerformancePeriodCalculator.findStartValue(List<String>, List<BigDecimal>, LocalDate)` (same package — reuse, don't copy); `InvestmentExecutionRepository.sumCompletedAmountsByUserAndDateRange(Long, LocalDateTime, LocalDateTime)`; templates (Task 7); `MarketBreakdown` (Task 3).
- Produces: `UserMonthlyNumbers resolveNumbers(User user, YearMonth month)` (null → market-only variant; throws when a funded user's history fetch fails); `ComposedEmail compose(MarketBreakdown breakdown, UserMonthlyNumbers numbers)` with `ComposedEmail { String subject; String htmlBody; String textBody }`; `UserMonthlyNumbers { BigDecimal startEquity; BigDecimal endEquity; BigDecimal contributions }`.

- [ ] **Step 1: Write the failing test**

```java
package com.investingapp.backend.service;

import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.InvestmentExecutionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class MarketBreakdownEmailComposerTest {

    private PortfolioDashboardService dashboard;
    private InvestmentExecutionRepository executions;
    private MarketBreakdownEmailComposer composer;

    private static final YearMonth JUNE = YearMonth.of(2026, 6);

    @BeforeEach
    void setUp() {
        dashboard = mock(PortfolioDashboardService.class);
        executions = mock(InvestmentExecutionRepository.class);
        composer = new MarketBreakdownEmailComposer(dashboard, executions);
    }

    private static User activeUser() {
        User user = new User();
        user.setId(7L);
        user.setEmail("andy@fredvested.com");
        user.setAccountStatus("ACTIVE");
        user.setAlpacaAccountId("ENC:abc");
        return user;
    }

    private static MarketBreakdown juneBreakdown() {
        MarketBreakdown b = new MarketBreakdown();
        b.setPeriodKey("2026-06");
        b.setPeriodLabel("June 2026");
        b.setStatus(MarketBreakdown.STATUS_GENERATED);
        b.setNarrativeHtml("<h3>What happened in June 2026</h3><p>Markets rose.</p>");
        return b;
    }

    private void historyReturns(List<String> dates, List<BigDecimal> values) {
        when(dashboard.getPortfolioHistoryForPeriod(any(User.class), eq("3M")))
                .thenReturn(new PortfolioDashboardService.PortfolioHistory(dates, values));
    }

    // ── resolveNumbers ───────────────────────────────────────────────────────

    @Test
    void nonActiveUserGetsNullNumbers() {
        User user = activeUser();
        user.setAccountStatus("SUBMITTED");
        assertNull(composer.resolveNumbers(user, JUNE));

        User noAlpaca = activeUser();
        noAlpaca.setAlpacaAccountId(null);
        assertNull(composer.resolveNumbers(noAlpaca, JUNE));

        verify(dashboard, never()).getPortfolioHistoryForPeriod(any(), any());
    }

    @Test
    void fundedUserGetsStartEndAndContributions() {
        historyReturns(
                List.of("2026-05-29", "2026-06-15", "2026-06-30"),
                List.of(new BigDecimal("5000.00"), new BigDecimal("5400.00"), new BigDecimal("5930.10")));
        when(executions.sumCompletedAmountsByUserAndDateRange(eq(7L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(new BigDecimal("400.00"));

        MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                composer.resolveNumbers(activeUser(), JUNE);

        assertNotNull(numbers);
        assertEquals(new BigDecimal("5000.00"), numbers.startEquity); // last point <= Jun 1
        assertEquals(new BigDecimal("5930.10"), numbers.endEquity);   // last point <= Jun 30
        assertEquals(new BigDecimal("400.00"), numbers.contributions);
    }

    @Test
    void userFundedMidMonthHasZeroStartEquity() {
        historyReturns(
                List.of("2026-06-15", "2026-06-30"),
                List.of(new BigDecimal("500.00"), new BigDecimal("510.00")));
        when(executions.sumCompletedAmountsByUserAndDateRange(anyLong(), any(), any()))
                .thenReturn(new BigDecimal("500.00"));

        MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                composer.resolveNumbers(activeUser(), JUNE);

        assertNotNull(numbers);
        assertEquals(BigDecimal.ZERO, numbers.startEquity);
        assertEquals(new BigDecimal("510.00"), numbers.endEquity);
    }

    @Test
    void noHistoryPointsMeansMarketOnlyVariant() {
        historyReturns(List.of(), List.of());
        assertNull(composer.resolveNumbers(activeUser(), JUNE));
    }

    @Test
    void historyFetchFailurePropagates() {
        when(dashboard.getPortfolioHistoryForPeriod(any(User.class), eq("3M")))
                .thenThrow(new RuntimeException("alpaca down"));
        assertThrows(RuntimeException.class, () -> composer.resolveNumbers(activeUser(), JUNE));
    }

    // ── compose ──────────────────────────────────────────────────────────────

    @Test
    void composeFullVariantMergesRealNumbers() {
        MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                new MarketBreakdownEmailComposer.UserMonthlyNumbers(
                        new BigDecimal("5000.00"), new BigDecimal("5930.10"), new BigDecimal("400.00"));

        MarketBreakdownEmailComposer.ComposedEmail email = composer.compose(juneBreakdown(), numbers);

        assertEquals("FRED's Monthly Market Breakdown - June 2026", email.subject);
        assertTrue(email.htmlBody.contains("<p>Markets rose.</p>"));
        assertTrue(email.htmlBody.contains("$5,930.10"));
        assertTrue(email.htmlBody.contains("$400.00"));
        // delta = 930.10 (+18.6%); market-driven = (930.10-400)/5000 = +10.6%
        assertTrue(email.htmlBody.contains("+$930.10 (+18.6%)"));
        assertTrue(email.htmlBody.contains("+10.6%"));
        assertTrue(email.htmlBody.contains("#16A34A"), "positive change renders green");
        assertFalse(email.htmlBody.contains("{{"));
        assertTrue(email.textBody.contains("Markets rose."));
        assertTrue(email.textBody.contains("5,930.10"));
    }

    @Test
    void composeNegativeMonthRendersRedAndMinus() {
        MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                new MarketBreakdownEmailComposer.UserMonthlyNumbers(
                        new BigDecimal("5000.00"), new BigDecimal("4800.00"), new BigDecimal("100.00"));

        MarketBreakdownEmailComposer.ComposedEmail email = composer.compose(juneBreakdown(), numbers);

        // delta = -200.00 (-4.0%); market-driven = (-200-100)/5000 = -6.0%
        assertTrue(email.htmlBody.contains("-$200.00 (-4.0%)"));
        assertTrue(email.htmlBody.contains("-6.0%"));
        assertTrue(email.htmlBody.contains("#DC2626"), "negative change renders red");
    }

    @Test
    void composeMidMonthFundedOmitsChangeRows() {
        MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                new MarketBreakdownEmailComposer.UserMonthlyNumbers(
                        BigDecimal.ZERO, new BigDecimal("510.00"), new BigDecimal("500.00"));

        MarketBreakdownEmailComposer.ComposedEmail email = composer.compose(juneBreakdown(), numbers);

        assertTrue(email.htmlBody.contains("$510.00"));
        assertFalse(email.htmlBody.contains("Market-driven"), "no % rows without a month-start value");
        assertFalse(email.htmlBody.contains("{{"));
    }

    @Test
    void composeMarketOnlyVariantUsesEmptyPartial() {
        MarketBreakdownEmailComposer.ComposedEmail email = composer.compose(juneBreakdown(), null);

        assertTrue(email.htmlBody.toLowerCase().contains("once your account is funded"));
        assertFalse(email.htmlBody.contains("Market-driven"));
        assertFalse(email.htmlBody.contains("{{"));
        assertEquals("FRED's Monthly Market Breakdown - June 2026", email.subject);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.service.MarketBreakdownEmailComposerTest'`
Expected: FAIL — compilation error, `MarketBreakdownEmailComposer` cannot find symbol.

- [ ] **Step 3: Implement the composer**

```java
package com.investingapp.backend.service;

import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.InvestmentExecutionRepository;
import com.investingapp.backend.util.EmailTemplateRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Assembles one user's Monthly Market Breakdown email: the month's shared
 * narrative + that user's real numbers merged into fixed template slots.
 * Numbers are always deterministic (never LLM-generated) so they cannot be
 * hallucinated.
 */
@Service
public class MarketBreakdownEmailComposer {

    private static final Logger logger = LoggerFactory.getLogger(MarketBreakdownEmailComposer.class);

    private static final String GREEN = "#16A34A";
    private static final String RED = "#DC2626";
    private static final String NEUTRAL = "#6B7280";

    private final PortfolioDashboardService portfolioDashboardService;
    private final InvestmentExecutionRepository investmentExecutionRepository;

    @Autowired
    public MarketBreakdownEmailComposer(PortfolioDashboardService portfolioDashboardService,
            InvestmentExecutionRepository investmentExecutionRepository) {
        this.portfolioDashboardService = portfolioDashboardService;
        this.investmentExecutionRepository = investmentExecutionRepository;
    }

    /**
     * Resolve the user's real numbers for the month. Returns null when the user
     * should get the market-only variant (never funded / no history yet).
     * THROWS when a funded user's history cannot be fetched — a funded user must
     * never receive an email with wrong or missing numbers; the scheduler records
     * FAILED and the catch-up run retries.
     */
    public UserMonthlyNumbers resolveNumbers(User user, YearMonth month) {
        if (!"ACTIVE".equals(user.getAccountStatus()) || user.getAlpacaAccountId() == null) {
            return null;
        }
        PortfolioDashboardService.PortfolioHistory history =
                portfolioDashboardService.getPortfolioHistoryForPeriod(user, "3M");

        LocalDate monthStart = month.atDay(1);
        LocalDate monthEnd = month.atEndOfMonth();
        BigDecimal startEquity = PerformancePeriodCalculator
                .findStartValue(history.timestamps, history.values, monthStart)
                .orElse(BigDecimal.ZERO);
        BigDecimal endEquity = PerformancePeriodCalculator
                .findStartValue(history.timestamps, history.values, monthEnd)
                .orElse(BigDecimal.ZERO);

        if (endEquity.compareTo(BigDecimal.ZERO) == 0) {
            // Account is ACTIVE but no equity history in the window — treat as not
            // yet invested rather than erroring
            logger.info("User {} is ACTIVE but has no {} history — market-only variant",
                    user.getId(), month);
            return null;
        }

        BigDecimal contributions = investmentExecutionRepository.sumCompletedAmountsByUserAndDateRange(
                user.getId(), monthStart.atStartOfDay(), monthEnd.atTime(23, 59, 59));
        if (contributions == null) {
            contributions = BigDecimal.ZERO;
        }
        return new UserMonthlyNumbers(startEquity, endEquity, contributions);
    }

    /** Build the final email for one user. numbers == null → market-only variant. */
    public ComposedEmail compose(MarketBreakdown breakdown, UserMonthlyNumbers numbers) {
        String periodLabel = breakdown.getPeriodLabel();
        String subject = "FRED's Monthly Market Breakdown - " + periodLabel;

        String portfolioSection;
        String numbersText = "";
        if (numbers == null) {
            portfolioSection = EmailTemplateRenderer.render("market-breakdown-empty.html", Map.of());
        } else {
            NumberFormat money = NumberFormat.getCurrencyInstance(Locale.US);
            String changeRows = "";
            if (numbers.startEquity.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal delta = numbers.endEquity.subtract(numbers.startEquity);
                BigDecimal deltaPct = pct(delta, numbers.startEquity);
                BigDecimal marketDriven = pct(delta.subtract(numbers.contributions), numbers.startEquity);
                String color = delta.compareTo(BigDecimal.ZERO) > 0 ? GREEN
                        : delta.compareTo(BigDecimal.ZERO) < 0 ? RED : NEUTRAL;
                changeRows = EmailTemplateRenderer.render("market-breakdown-change-rows.html", Map.of(
                        "changeLabel", "Change in " + periodLabel,
                        "changeValue", signedMoney(delta, money) + " (" + signedPct(deltaPct) + ")",
                        "changeColor", color,
                        "marketReturnPct", signedPct(marketDriven)));
            }
            Map<String, String> slots = new HashMap<>();
            slots.put("periodLabel", periodLabel);
            slots.put("endValue", money.format(numbers.endEquity));
            slots.put("contributions", money.format(numbers.contributions));
            slots.put("changeRows", changeRows);
            portfolioSection = EmailTemplateRenderer.render("market-breakdown-numbers.html", slots);
            numbersText = String.format(Locale.US,
                    "%nYour portfolio in %s: ended at %s, you contributed %s.%n",
                    periodLabel, money.format(numbers.endEquity), money.format(numbers.contributions));
        }

        String html = EmailTemplateRenderer.render("market-breakdown.html", Map.of(
                "periodLabel", periodLabel,
                "narrativeHtml", breakdown.getNarrativeHtml(),
                "portfolioSection", portfolioSection,
                "unsubscribeUrl", "#")); // real provider substitutes its unsubscribe link

        String text = subject + "\n\n"
                + EmailTemplateRenderer.stripHtml(breakdown.getNarrativeHtml())
                + numbersText
                + "\nThis update is informational only and is not investment advice. "
                + "Past performance does not guarantee future results.\n"
                + "Questions? help@fredvested.com";

        return new ComposedEmail(subject, html, text);
    }

    private static BigDecimal pct(BigDecimal part, BigDecimal whole) {
        return part.divide(whole, 6, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"))
                .setScale(1, RoundingMode.HALF_UP);
    }

    private static String signedMoney(BigDecimal value, NumberFormat money) {
        return value.compareTo(BigDecimal.ZERO) < 0
                ? "-" + money.format(value.abs())
                : "+" + money.format(value);
    }

    private static String signedPct(BigDecimal value) {
        return (value.compareTo(BigDecimal.ZERO) < 0 ? "" : "+") + value.toPlainString() + "%";
    }

    /** The user's deterministic month numbers. */
    public static class UserMonthlyNumbers {
        public final BigDecimal startEquity;   // ZERO when funded mid-month
        public final BigDecimal endEquity;
        public final BigDecimal contributions;

        public UserMonthlyNumbers(BigDecimal startEquity, BigDecimal endEquity,
                BigDecimal contributions) {
            this.startEquity = startEquity;
            this.endEquity = endEquity;
            this.contributions = contributions;
        }
    }

    /** Fully assembled email, ready for EmailService. */
    public static class ComposedEmail {
        public final String subject;
        public final String htmlBody;
        public final String textBody;

        public ComposedEmail(String subject, String htmlBody, String textBody) {
            this.subject = subject;
            this.htmlBody = htmlBody;
            this.textBody = textBody;
        }
    }
}
```

Note: `signedPct(-4.0)` renders "-4.0%" because `toPlainString()` already carries the minus sign — the ternary only prepends "+" for zero/positive.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.service.MarketBreakdownEmailComposerTest'`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/service/MarketBreakdownEmailComposer.java backend/src/test/java/com/investingapp/backend/service/MarketBreakdownEmailComposerTest.java
git commit -m "feat(market-breakdown): per-user email composer with deterministic numbers"
```

---

### Task 10: MarketBreakdownScheduler + UserRepository tier finder

**Files:**
- Modify: `backend/src/main/java/com/investingapp/backend/repository/UserRepository.java` (add one finder)
- Create: `backend/src/main/java/com/investingapp/backend/scheduler/MarketBreakdownScheduler.java`
- Test: `backend/src/test/java/com/investingapp/backend/scheduler/MarketBreakdownSchedulerTest.java`

**Interfaces:**
- Consumes: `MarketBreakdownService.getOrGenerate` (Task 8), `MarketBreakdownEmailComposer` (Task 9), `EmailService.sendEmail/hasBeenSent/recordFailedAttempt` (Task 2), `EmailMessage` (Task 1).
- Produces: `UserRepository.findBySelectedTierIn(Collection<String>)`; `MarketBreakdownScheduler.runForMonth(YearMonth)`; constant `MarketBreakdownScheduler.EMAIL_TYPE = "MARKET_BREAKDOWN"`; cron `0 0 9 1,2,3 * *` zone `America/New_York`.

- [ ] **Step 1: Add the tier finder to `UserRepository`**

Add after `findActiveUsersNeedingAchSetup()`:

```java
    // Paid-tier members eligible for the Monthly Market Breakdown email
    List<User> findBySelectedTierIn(java.util.Collection<String> tiers);
```

- [ ] **Step 2: Write the failing scheduler test**

```java
package com.investingapp.backend.scheduler;

import com.investingapp.backend.dto.EmailMessage;
import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.service.EmailService;
import com.investingapp.backend.service.MarketBreakdownEmailComposer;
import com.investingapp.backend.service.MarketBreakdownService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MarketBreakdownSchedulerTest {

    private UserRepository userRepository;
    private MarketBreakdownService breakdownService;
    private MarketBreakdownEmailComposer composer;
    private EmailService emailService;
    private MarketBreakdownScheduler scheduler;

    private static final YearMonth JUNE = YearMonth.of(2026, 6);

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        breakdownService = mock(MarketBreakdownService.class);
        composer = mock(MarketBreakdownEmailComposer.class);
        emailService = mock(EmailService.class);
        scheduler = new MarketBreakdownScheduler(userRepository, breakdownService, composer, emailService);

        MarketBreakdown breakdown = new MarketBreakdown();
        breakdown.setPeriodKey("2026-06");
        breakdown.setPeriodLabel("June 2026");
        breakdown.setStatus(MarketBreakdown.STATUS_GENERATED);
        breakdown.setNarrativeHtml("<p>ok</p>");
        when(breakdownService.getOrGenerate(JUNE)).thenReturn(breakdown);

        when(composer.compose(any(), any())).thenReturn(
                new MarketBreakdownEmailComposer.ComposedEmail("Subject", "<html></html>", "text"));
        when(emailService.hasBeenSent(anyString(), anyLong(), anyString())).thenReturn(false);
    }

    private static User user(long id, String email, String tier) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setSelectedTier(tier);
        return u;
    }

    @Test
    void queriesPlusAndProTiersOnly() {
        when(userRepository.findBySelectedTierIn(anyCollection())).thenReturn(List.of());

        scheduler.runForMonth(JUNE);

        verify(userRepository).findBySelectedTierIn(List.of("plus", "pro"));
    }

    @Test
    void sendsToEligibleUserWithTypeAndPeriod() {
        when(userRepository.findBySelectedTierIn(anyCollection()))
                .thenReturn(List.of(user(7L, "andy@fredvested.com", "plus")));
        when(composer.resolveNumbers(any(), eq(JUNE))).thenReturn(null);

        scheduler.runForMonth(JUNE);

        ArgumentCaptor<EmailMessage> msg = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailService).sendEmail(msg.capture(), eq(7L),
                eq(MarketBreakdownScheduler.EMAIL_TYPE), eq("2026-06"));
        assertEquals("andy@fredvested.com", msg.getValue().getTo());
        assertEquals("Subject", msg.getValue().getSubject());
        assertEquals("<html></html>", msg.getValue().getHtmlBody());
        assertEquals("text", msg.getValue().getTextBody());
    }

    @Test
    void alreadySentUserIsSkipped() {
        when(userRepository.findBySelectedTierIn(anyCollection()))
                .thenReturn(List.of(user(7L, "andy@fredvested.com", "pro")));
        when(emailService.hasBeenSent(MarketBreakdownScheduler.EMAIL_TYPE, 7L, "2026-06"))
                .thenReturn(true);

        scheduler.runForMonth(JUNE);

        verify(composer, never()).resolveNumbers(any(), any());
        verify(emailService, never()).sendEmail(any(), anyLong(), anyString(), anyString());
    }

    @Test
    void oneUserFailureIsIsolatedAndRecorded() {
        User failing = user(1L, "fail@fredvested.com", "plus");
        User healthy = user(2L, "ok@fredvested.com", "pro");
        when(userRepository.findBySelectedTierIn(anyCollection())).thenReturn(List.of(failing, healthy));
        when(composer.resolveNumbers(eq(failing), eq(JUNE)))
                .thenThrow(new RuntimeException("alpaca down"));
        when(composer.resolveNumbers(eq(healthy), eq(JUNE)))
                .thenReturn(new MarketBreakdownEmailComposer.UserMonthlyNumbers(
                        new BigDecimal("100"), new BigDecimal("110"), BigDecimal.ZERO));

        scheduler.runForMonth(JUNE);

        verify(emailService).recordFailedAttempt(eq(1L), eq("fail@fredvested.com"),
                eq(MarketBreakdownScheduler.EMAIL_TYPE), eq("2026-06"), contains("alpaca down"));
        verify(emailService).sendEmail(any(EmailMessage.class), eq(2L),
                eq(MarketBreakdownScheduler.EMAIL_TYPE), eq("2026-06"));
    }

    @Test
    void generationFailureAbortsWithoutTouchingUsers() {
        // any(YearMonth.class): runMonthlyBreakdownJob derives "prior month" from
        // the real clock — pinning JUNE would make this test time-dependent
        when(breakdownService.getOrGenerate(any(YearMonth.class)))
                .thenThrow(new IllegalStateException("llm down"));

        assertDoesNotThrow(() -> scheduler.runMonthlyBreakdownJob());

        verify(userRepository, never()).findBySelectedTierIn(anyCollection());
    }

    @Test
    void blankEmailUserIsSkippedNotFailed() {
        User noEmail = user(3L, "  ", "plus");
        when(userRepository.findBySelectedTierIn(anyCollection())).thenReturn(List.of(noEmail));

        scheduler.runForMonth(JUNE);

        verify(emailService, never()).sendEmail(any(), anyLong(), anyString(), anyString());
        verify(emailService, never()).recordFailedAttempt(anyLong(), anyString(), anyString(), anyString(), anyString());
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.scheduler.MarketBreakdownSchedulerTest'`
Expected: FAIL — compilation error, `MarketBreakdownScheduler` cannot find symbol.

- [ ] **Step 4: Implement the scheduler**

```java
package com.investingapp.backend.scheduler;

import com.investingapp.backend.dto.EmailMessage;
import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.service.EmailService;
import com.investingapp.backend.service.MarketBreakdownEmailComposer;
import com.investingapp.backend.service.MarketBreakdownService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;

/**
 * Sends the Monthly Market Breakdown to plus/pro members. Runs on the 1st
 * (the real send) plus catch-up passes on the 2nd and 3rd — idempotency via
 * EmailService.hasBeenSent makes catch-ups no-ops unless something failed
 * (server down on the 1st, generation failure, per-user Alpaca hiccups).
 */
@Component
public class MarketBreakdownScheduler {

    private static final Logger logger = LoggerFactory.getLogger(MarketBreakdownScheduler.class);

    public static final String EMAIL_TYPE = "MARKET_BREAKDOWN";
    private static final List<String> ELIGIBLE_TIERS = List.of("plus", "pro");
    private static final ZoneId ET = ZoneId.of("America/New_York");

    private final UserRepository userRepository;
    private final MarketBreakdownService marketBreakdownService;
    private final MarketBreakdownEmailComposer composer;
    private final EmailService emailService;

    public MarketBreakdownScheduler(UserRepository userRepository,
            MarketBreakdownService marketBreakdownService,
            MarketBreakdownEmailComposer composer,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.marketBreakdownService = marketBreakdownService;
        this.composer = composer;
        this.emailService = emailService;
    }

    /** 9am ET on the 1st, with catch-up passes on the 2nd and 3rd. */
    @Scheduled(cron = "0 0 9 1,2,3 * *", zone = "America/New_York")
    public void runMonthlyBreakdownJob() {
        YearMonth priorMonth = YearMonth.now(ET).minusMonths(1);
        logger.info("Starting Monthly Market Breakdown job for {}", priorMonth);
        try {
            runForMonth(priorMonth);
            logger.info("Completed Monthly Market Breakdown job for {}", priorMonth);
        } catch (Exception e) {
            // Generation failure — FAILED row persisted by the service; the
            // catch-up cron on the 2nd/3rd retries.
            logger.error("Monthly Market Breakdown job failed for {}", priorMonth, e);
        }
    }

    public void runForMonth(YearMonth month) {
        MarketBreakdown breakdown = marketBreakdownService.getOrGenerate(month);
        String periodKey = breakdown.getPeriodKey();

        List<User> eligible = userRepository.findBySelectedTierIn(ELIGIBLE_TIERS);
        int sent = 0, skipped = 0, failed = 0;

        for (User user : eligible) {
            try {
                if (user.getEmail() == null || user.getEmail().isBlank()) {
                    skipped++;
                    continue;
                }
                if (emailService.hasBeenSent(EMAIL_TYPE, user.getId(), periodKey)) {
                    skipped++;
                    continue;
                }
                MarketBreakdownEmailComposer.UserMonthlyNumbers numbers =
                        composer.resolveNumbers(user, month); // throws for funded users with data issues
                MarketBreakdownEmailComposer.ComposedEmail email = composer.compose(breakdown, numbers);
                emailService.sendEmail(
                        new EmailMessage(user.getEmail(), null, email.subject, email.htmlBody, email.textBody),
                        user.getId(), EMAIL_TYPE, periodKey);
                sent++;
            } catch (Exception e) {
                // One user's failure never kills the batch; FAILED row → catch-up retries
                failed++;
                logger.error("Market breakdown failed for user {}: {}", user.getId(), e.getMessage());
                emailService.recordFailedAttempt(user.getId(), user.getEmail(), EMAIL_TYPE,
                        periodKey, e.getMessage());
            }
        }
        logger.info("Market breakdown {}: {} sent, {} skipped, {} failed of {} eligible",
                periodKey, sent, skipped, failed, eligible.size());
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.scheduler.MarketBreakdownSchedulerTest'`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/repository/UserRepository.java backend/src/main/java/com/investingapp/backend/scheduler/MarketBreakdownScheduler.java backend/src/test/java/com/investingapp/backend/scheduler/MarketBreakdownSchedulerTest.java
git commit -m "feat(market-breakdown): monthly scheduler with catch-up runs + per-user isolation"
```

---

### Task 11: MarketBreakdownController (preview + gated generate), config, final verification

**Files:**
- Create: `backend/src/main/java/com/investingapp/backend/controller/MarketBreakdownController.java`
- Modify: `backend/src/main/resources/application.properties` (2 new keys)
- Modify: `backend/src/main/resources/application-local.properties` (1 new key)
- Modify: `backend/src/main/resources/application-dev.properties` (1 new key)
- Test: `backend/src/test/java/com/investingapp/backend/controller/MarketBreakdownControllerTest.java`

**Interfaces:**
- Consumes: `MarketBreakdownRepository.findByPeriodKey` (Task 3), `MarketBreakdownService.getOrGenerate` (Task 8), `MarketBreakdownEmailComposer` (Task 9), `MessageResponse` DTO (existing), `UserDetailsImpl` (existing, package `com.investingapp.backend.security.services`).
- Produces: `GET /api/market-breakdown/preview?month=YYYY-MM` (text/html, authed user's own rendering); `POST /api/market-breakdown/generate?month=YYYY-MM` (gated by `app.market-breakdown.manual-generate-enabled`).

- [ ] **Step 1: Write the failing test**

```java
package com.investingapp.backend.controller;

import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.MarketBreakdownRepository;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.services.UserDetailsImpl;
import com.investingapp.backend.service.MarketBreakdownEmailComposer;
import com.investingapp.backend.service.MarketBreakdownService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MarketBreakdownControllerTest {

    private MarketBreakdownRepository repo;
    private MarketBreakdownService service;
    private MarketBreakdownEmailComposer composer;
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        repo = mock(MarketBreakdownRepository.class);
        service = mock(MarketBreakdownService.class);
        composer = mock(MarketBreakdownEmailComposer.class);
        userRepository = mock(UserRepository.class);

        User user = new User();
        user.setId(7L);
        user.setEmail("andy@fredvested.com");
        UserDetailsImpl principal = mock(UserDetailsImpl.class);
        when(principal.getId()).thenReturn(7L);
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(principal);
        SecurityContextHolder.getContext().setAuthentication(auth);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MarketBreakdownController controller(boolean manualGenerateEnabled) {
        return new MarketBreakdownController(repo, service, composer, userRepository, manualGenerateEnabled);
    }

    @Test
    void previewReturns404WhenNotGenerated() {
        when(repo.findByPeriodKey("2026-06")).thenReturn(Optional.empty());

        ResponseEntity<?> response = controller(false).preview("2026-06");

        assertEquals(404, response.getStatusCode().value());
    }

    @Test
    void previewRendersHtmlForRequestingUser() {
        MarketBreakdown row = new MarketBreakdown();
        row.setPeriodKey("2026-06");
        row.setPeriodLabel("June 2026");
        row.setStatus(MarketBreakdown.STATUS_GENERATED);
        row.setNarrativeHtml("<p>ok</p>");
        when(repo.findByPeriodKey("2026-06")).thenReturn(Optional.of(row));
        when(composer.resolveNumbers(any(User.class), any())).thenReturn(null);
        when(composer.compose(any(), any())).thenReturn(
                new MarketBreakdownEmailComposer.ComposedEmail("s", "<html>x</html>", "t"));

        ResponseEntity<?> response = controller(false).preview("2026-06");

        assertEquals(200, response.getStatusCode().value());
        assertEquals("<html>x</html>", response.getBody());
    }

    @Test
    void previewRejectsBadMonth() {
        ResponseEntity<?> response = controller(false).preview("junk");
        assertEquals(400, response.getStatusCode().value());
    }

    @Test
    void generateIsForbiddenWhenFlagOff() {
        ResponseEntity<?> response = controller(false).generate("2026-06");
        assertEquals(403, response.getStatusCode().value());
        verify(service, never()).getOrGenerate(any());
    }

    @Test
    void generateRunsWhenFlagOn() {
        MarketBreakdown row = new MarketBreakdown();
        row.setPeriodKey("2026-06");
        row.setStatus(MarketBreakdown.STATUS_GENERATED);
        when(service.getOrGenerate(java.time.YearMonth.of(2026, 6))).thenReturn(row);

        ResponseEntity<?> response = controller(true).generate("2026-06");

        assertEquals(200, response.getStatusCode().value());
        verify(service).getOrGenerate(java.time.YearMonth.of(2026, 6));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.controller.MarketBreakdownControllerTest'`
Expected: FAIL — compilation error, `MarketBreakdownController` cannot find symbol.

- [ ] **Step 3: Implement the controller**

```java
package com.investingapp.backend.controller;

import com.investingapp.backend.dto.MessageResponse;
import com.investingapp.backend.model.MarketBreakdown;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.MarketBreakdownRepository;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.services.UserDetailsImpl;
import com.investingapp.backend.service.MarketBreakdownEmailComposer;
import com.investingapp.backend.service.MarketBreakdownService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;

/**
 * Verification surface for the Monthly Market Breakdown while the emailer is
 * disabled: preview renders the requesting user's own email HTML; generate is
 * config-gated (local/dev only) so production LLM calls can't be triggered
 * ad hoc.
 */
@RestController
@RequestMapping("/api/market-breakdown")
@CrossOrigin(origins = "*", maxAge = 3600)
public class MarketBreakdownController {

    private static final Logger logger = LoggerFactory.getLogger(MarketBreakdownController.class);

    private final MarketBreakdownRepository marketBreakdownRepository;
    private final MarketBreakdownService marketBreakdownService;
    private final MarketBreakdownEmailComposer composer;
    private final UserRepository userRepository;
    private final boolean manualGenerateEnabled;

    @Autowired
    public MarketBreakdownController(MarketBreakdownRepository marketBreakdownRepository,
            MarketBreakdownService marketBreakdownService,
            MarketBreakdownEmailComposer composer,
            UserRepository userRepository,
            @Value("${app.market-breakdown.manual-generate-enabled:false}") boolean manualGenerateEnabled) {
        this.marketBreakdownRepository = marketBreakdownRepository;
        this.marketBreakdownService = marketBreakdownService;
        this.composer = composer;
        this.userRepository = userRepository;
        this.manualGenerateEnabled = manualGenerateEnabled;
    }

    /** Rendered email HTML for the requesting user. month defaults to the prior month. */
    @GetMapping(value = "/preview", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<?> preview(@RequestParam(required = false) String month) {
        try {
            User user = getCurrentUser();
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse("User not authenticated"));
            }
            YearMonth target = parseMonth(month);
            if (target == null) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("month must look like 2026-06"));
            }

            var row = marketBreakdownRepository.findByPeriodKey(target.toString());
            if (row.isEmpty() || !MarketBreakdown.STATUS_GENERATED.equals(row.get().getStatus())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("No market breakdown generated for " + target + " yet."));
            }

            // Preview degrades to the market-only variant if this user's numbers
            // can't resolve right now (the real send records FAILED and retries)
            MarketBreakdownEmailComposer.UserMonthlyNumbers numbers = null;
            try {
                numbers = composer.resolveNumbers(user, target);
            } catch (Exception e) {
                logger.warn("Preview numbers unresolved for user {}: {}", user.getId(), e.getMessage());
            }
            MarketBreakdownEmailComposer.ComposedEmail email = composer.compose(row.get(), numbers);
            return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(email.htmlBody);
        } catch (Exception e) {
            logger.error("Market breakdown preview failed", e);
            return ResponseEntity.internalServerError()
                    .body(new MessageResponse("Preview failed: " + e.getMessage()));
        }
    }

    /** On-demand narrative generation — config-gated (local/dev only). */
    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestParam(required = false) String month) {
        if (!manualGenerateEnabled) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new MessageResponse("Manual generation is disabled in this environment."));
        }
        try {
            User user = getCurrentUser();
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse("User not authenticated"));
            }
            YearMonth target = parseMonth(month);
            if (target == null) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("month must look like 2026-06"));
            }
            MarketBreakdown breakdown = marketBreakdownService.getOrGenerate(target);
            return ResponseEntity.ok(new MessageResponse(
                    "Market breakdown for " + target + " is " + breakdown.getStatus()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("Manual market breakdown generation failed", e);
            return ResponseEntity.internalServerError()
                    .body(new MessageResponse("Generation failed: " + e.getMessage()));
        }
    }

    /** Default month = prior month in ET, matching the scheduler's clock. */
    private YearMonth parseMonth(String month) {
        if (month == null || month.isBlank()) {
            return YearMonth.now(java.time.ZoneId.of("America/New_York")).minusMonths(1);
        }
        try {
            return YearMonth.parse(month);
        } catch (Exception e) {
            return null;
        }
    }

    private User getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl)) {
                return null;
            }
            UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
            return userRepository.findById(userDetails.getId()).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./gradlew test --tests 'com.investingapp.backend.controller.MarketBreakdownControllerTest'`
Expected: PASS (5 tests)

- [ ] **Step 5: Add config keys**

`backend/src/main/resources/application.properties` — extend the Email Configuration block (after `app.email.from`):

```properties
app.email.provider=${EMAIL_PROVIDER:logging}

# Market Breakdown (Piggy Plus monthly email)
app.market-breakdown.manual-generate-enabled=${MARKET_BREAKDOWN_MANUAL_GENERATE:false}
```

`backend/src/main/resources/application-local.properties` — append:

```properties
app.market-breakdown.manual-generate-enabled=true
```

`backend/src/main/resources/application-dev.properties` — append:

```properties
app.market-breakdown.manual-generate-enabled=true
```

- [ ] **Step 6: Full verification — compile + every new test class**

```bash
cd backend && ./gradlew compileJava compileTestJava -q && ./gradlew test \
  --tests 'com.investingapp.backend.service.EmailServiceTest' \
  --tests 'com.investingapp.backend.service.MarketBreakdownServiceReturnsTest' \
  --tests 'com.investingapp.backend.service.MarketBreakdownPromptTest' \
  --tests 'com.investingapp.backend.service.MarketBreakdownServiceGenerateTest' \
  --tests 'com.investingapp.backend.service.MarketBreakdownEmailComposerTest' \
  --tests 'com.investingapp.backend.scheduler.MarketBreakdownSchedulerTest' \
  --tests 'com.investingapp.backend.controller.MarketBreakdownControllerTest' \
  --tests 'com.investingapp.backend.util.MarketNarrativeValidatorTest' \
  --tests 'com.investingapp.backend.util.EmailTemplateRendererTest'
```

Expected: BUILD SUCCESSFUL, all green.

- [ ] **Step 7: Manual smoke test (optional but recommended, needs local backend + real keys)**

```bash
# Terminal 1: backend
cd backend && SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
# Terminal 2: generate June 2026 (real Alpaca + Claude call), then preview
# (JWT: log in via the app at localhost:8100, or use the devPage bypass user)
curl -s -X POST "http://localhost:8080/api/market-breakdown/generate?month=2026-06" -H "Authorization: Bearer $JWT"
curl -s "http://localhost:8080/api/market-breakdown/preview?month=2026-06" -H "Authorization: Bearer $JWT" > /tmp/breakdown.html && open /tmp/breakdown.html
```

Expected: generate returns `Market breakdown for 2026-06 is GENERATED`; preview opens a branded HTML email with narrative + portfolio card; backend log shows `MOCK EMAIL` lines if the scheduler path is exercised.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/controller/MarketBreakdownController.java backend/src/test/java/com/investingapp/backend/controller/MarketBreakdownControllerTest.java backend/src/main/resources/application.properties backend/src/main/resources/application-local.properties backend/src/main/resources/application-dev.properties
git commit -m "feat(market-breakdown): preview endpoint, gated manual generate, config keys"
```

---

## Post-plan checklist for the executor

- All 9 new test classes green; `compileJava` clean.
- `grep -rn "TODO" backend/src/main/java/com/investingapp/backend/{service,scheduler,controller,util,model,dto}/ | grep -i market` returns nothing.
- The 4 legacy EmailService callers were not modified.
- No frontend files touched.
