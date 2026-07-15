# Monthly Market Breakdown (Piggy Plus) — Design

**Date**: 2026-07-15
**Status**: Approved by Andy (sections 1–3 approved in brainstorming session)

## What we're building

A plain-English monthly email for Piggy Plus and Piggy Pro members (`User.selectedTier` in `"plus"`, `"pro"`) summarizing what happened in the markets over the prior calendar month and how it affected their portfolio. The content explains what happened; it **never recommends** any change in allocation, contribution, or strategy.

The real email provider is not set up yet. This feature ships fully functional behind a provider-agnostic email layer: today every send is logged and recorded (`MOCKED`); when a provider is chosen, one new class + one config value turns it live with no other changes.

## Decisions made (with Andy)

| Decision | Choice |
|---|---|
| Audience | Plus AND Pro tiers |
| Narrative generation | One Claude call per month, grounded with the Anthropic web search tool (real news context) |
| Personalization | Shared narrative + each user's real numbers merged into fixed template slots (deterministic, no per-user LLM) |
| Email service scope | `EmailSender` interface + logging impl + HTML support + `email_log` DB table (idempotency + audit) |
| Empty/unfunded portfolios | Still get the email, market-only variant (no numbers card) |
| Architecture | Stored monthly snapshot (`market_breakdown` table) + provider-port email service |
| Send timing | 1st of month 9am ET, catch-up runs on the 2nd and 3rd |

## Architecture

Three layers, all backend (no frontend changes):

```
MarketBreakdownScheduler (cron, 1st @ 9am ET + catch-up 2nd/3rd)
        │
        ├─► MarketBreakdownService.getOrGenerate(month)
        │       ├─ Alpaca Market Data: daily bars for VTI, VXUS, VBR, SPY → monthly returns
        │       ├─ LLMService.generateGroundedMarketSummary(prompt)  [web search tool]
        │       ├─ compliance gate (deterministic validator + tag sanitizer)
        │       └─ persist MarketBreakdown row (one per month)
        │
        ├─► per eligible user (tier plus/pro, has email):
        │       ├─ EmailLog idempotency check (skip if SENT/MOCKED for this month)
        │       ├─ per-user numbers (Alpaca portfolio history + contributions) OR market-only variant
        │       ├─ template render (resources/templates/email/market-breakdown.html)
        │       └─ EmailService.sendEmail(message, userId, MARKET_BREAKDOWN, periodKey)
        │
        └─► EmailService (facade)
                ├─ writes EmailLog row (SENT / MOCKED / FAILED)
                └─ delegates to active EmailSender (LoggingEmailSender for now)
```

## 1. Email service layer

### `EmailSender` interface (`service/EmailSender.java`)

```java
public interface EmailSender {
    void send(EmailMessage message);
}
```

### `EmailMessage` DTO (`dto/EmailMessage.java`)

Lombok `@Data`: `to`, `from`, `subject`, `htmlBody`, `textBody` (plaintext fallback).

### `LoggingEmailSender` (`service/LoggingEmailSender.java`)

Only implementation for now — logs the send instead of dispatching.
`@ConditionalOnProperty(name = "app.email.provider", havingValue = "logging", matchIfMissing = true)`.
A future `ResendEmailSender`/`SesEmailSender` registers with its own `havingValue`; switching = setting `app.email.provider`.

### `EmailService` (existing class → facade)

- **Unchanged signature** `sendEmail(String to, String subject, String text)` — the 4 existing callers (PaydayNotificationService, InvestmentExecutionService, ReferralService, AccountStatusService) keep working, now routed through the sender and recorded in EmailLog (`emailType = LEGACY`, null periodKey).
- **New** `sendEmail(EmailMessage message, Long userId, String emailType, String periodKey)`:
  - `app.email.enabled=false` (current state): record `MOCKED`, log content summary, never dispatch.
  - `app.email.enabled=true`: dispatch via active `EmailSender`; record `SENT` or `FAILED` (+ `errorMessage`).
- **New** `boolean hasBeenSent(String emailType, Long userId, String periodKey)` — returns true for existing `SENT`/`MOCKED` rows.

### `EmailLog` entity (`model/EmailLog.java`, table `email_log`)

Modeled after `ChatActionAudit`. Columns: `id`, `userId` (nullable), `recipient`, `subject`, `emailType`, `periodKey` (nullable), `status` (`SENT`/`MOCKED`/`FAILED`), `errorMessage` (nullable), `sentAt`.
Unique index `(emailType, userId, periodKey)` — MySQL permits repeated NULLs, so one-off emails repeat freely while period emails physically cannot double-send. **Email bodies are never stored.**
Table auto-created (`spring.jpa.hibernate.ddl-auto=update` in all profiles).

### Config keys

- `app.email.enabled` (exists, default false) — master kill switch.
- `app.email.from` (exists) — sender address.
- `app.email.provider` (new, default `logging`).

## 2. Content generation

### `MarketBreakdown` entity (`model/MarketBreakdown.java`, table `market_breakdown`)

`id`, `periodKey` (`"2026-06"`, unique), `periodLabel` (`"June 2026"`), `narrativeHtml` (`@Lob`), `etfReturnsJson` (numbers fed to Claude — audit), `sourcesJson` (web-search citations — audit), `model`, `status` (`GENERATED`/`FAILED`), `errorMessage` (nullable), `generatedAt`.

### `MarketBreakdownService` (`service/MarketBreakdownService.java`)

`getOrGenerate(YearMonth month)`:

1. Return existing `GENERATED` row if present (regenerate over a `FAILED` row).
2. **Fetch numbers** from Alpaca Market Data (`data.alpaca.markets/v2`, same header auth as `PortfolioDashboardService`'s latest-trade/quote calls): daily bars covering prior-month-end through target-month-end for `VTI`, `VXUS`, `VBR` (default portfolio 75/20/5) + `SPY` (market context). Monthly return = prior month's last close → target month's last close. Symbols + weights live in one constant.
3. **One grounded Claude call** via new `LLMService.generateGroundedMarketSummary(String prompt)`: non-streaming, `WebSearchTool20250305` (max ~5 searches), existing `anthropic.chat-model` (claude-sonnet-5). Returns text + citations. Prompt requirements:
   - FRED voice: calm, plain-English, freedom-focused, no jargon (consistent with `FredConstitution` tone).
   - Computed ETF returns included; **hard rule: use only these numbers, never invent figures**; events must come from search results.
   - Explain the month's major market events and connect them to why these funds moved.
   - Compliance: no recommendations, no predictions, no "you should", no urgency — only "what happened and why."
   - Output: HTML fragment restricted to `<p> <strong> <em> <h3> <ul> <li>`.
4. **Compliance gate** (deterministic validator, unit-tested):
   - Forbidden patterns: "you should", "we recommend", buy/sell imperatives, "guaranteed", "can't lose", "act now" etc.
   - Length sanity bounds; no unresolved artifacts.
   - Tag-allowlist sanitizer (strip `<script>`, `<style>`, `on*=` attributes, anything outside the allowlist).
   - Failure → row saved `FAILED` + reason; **nothing sends** until a later run (or manual trigger) regenerates successfully.
5. Persist and return.

### Per-user numbers (deterministic — never LLM)

For users with `accountStatus == ACTIVE` and an Alpaca account:
- Calendar-month start/end equity from Alpaca portfolio history (same `findEquityAtDate` approach `MonthlyFreedomUpdateService` uses).
- Contributions during the month (same source the MFU uses for `periodContributions`).
- Change `$` and `%`, plus market-driven return `= (delta − contributions) / startEquity` (the MFU `returnRate` formula) — a deposit is never presented as market growth.

All other recipients get the **market-only variant** (numbers card swapped for a gentle "once you're invested, your numbers will appear here" block — calm copy, no CTA pressure).

### Subject line

`FRED's Monthly Market Breakdown - {monthName} {year}` (e.g., "FRED's Monthly Market Breakdown - June 2026"). Calm, no urgency, no emoji. (Confirmed by Andy in spec review.)

### Template

`backend/src/main/resources/templates/email/market-breakdown.html`:
- Email-safe: single column, inline CSS, FRED-branded (Manrope-adjacent system stack for email, FRED blues, calm tone).
- `{{placeholder}}` slots filled by a small dependency-free renderer (`util/`): period label, narrative HTML, user numbers block or empty-variant block.
- Footer: "informational only, not investment advice" + past-performance disclaimer, help@fredvested.com, unsubscribe placeholder link (CAN-SPAM readiness for the real provider).
- Renderer fails loudly if any placeholder is left unresolved.
- A plaintext `textBody` version is generated alongside (simple tag-strip of the narrative + numbers).

## 3. Delivery

### `MarketBreakdownScheduler` (`scheduler/MarketBreakdownScheduler.java`)

Follows `AccountStatusScheduler` pattern (constructor injection, try/catch + logging).

- `@Scheduled(cron = "0 0 9 1,2,3 * *", zone = "America/New_York")` — the 1st is the real run; the 2nd/3rd are catch-up passes (server down, generation failure, per-user failures). Idempotency makes them no-ops when everything already sent.
- Flow: resolve prior month → `getOrGenerate` (failure: log + abort; catch-up retries) → `userRepository.findBySelectedTierIn(List.of("plus","pro"))`, require non-null email → per user:
  1. Skip if `hasBeenSent(MARKET_BREAKDOWN, userId, periodKey)`.
  2. Resolve variant: full numbers if ACTIVE + Alpaca account + history resolves; market-only if never funded.
  3. **Funded user whose numbers fail to resolve** → `FAILED` EmailLog row + skip (never send a funded user wrong/missing numbers); catch-up run retries.
  4. Compose + `EmailService.sendEmail(...)`.
  - Each user wrapped in try/catch — one failure never kills the batch.

### `MarketBreakdownController` (`controller/MarketBreakdownController.java`)

Standard controller conventions (`@CrossOrigin`, `@RestController`, `SecurityContextHolder` auth):
- `GET /api/market-breakdown/preview?month=2026-06` — rendered HTML email for the **requesting user**. 404 + clear message if no narrative row. Read-only, no LLM cost; safe in prod. This is the verification surface while the emailer is off.
- `POST /api/market-breakdown/generate?month=2026-06` — on-demand narrative generation, gated by `app.market-breakdown.manual-generate-enabled` (true in local/dev, false in prod).

## Error handling summary

| Failure | Behavior |
|---|---|
| Alpaca market data down | Generation aborts, `FAILED` row, catch-up run retries |
| Claude call fails / compliance gate rejects | Same — nothing sends that month until a successful regenerate |
| Per-user portfolio fetch fails (funded user) | `FAILED` EmailLog row, user skipped, catch-up retries |
| User never funded | Market-only variant (by design, not an error) |
| Emailer disabled (today) | `MOCKED` rows — full pipeline exercised, nothing dispatched |
| Scheduler re-run / overlap | EmailLog unique index makes double-send impossible |

## Testing (plain JUnit 5, no DB — per Acceptance Check Manifest conventions)

- Monthly-return math from bar data (holidays, partial months, missing bars).
- Template renderer: all placeholders resolved (fails loudly otherwise), both variants, currency/percent formatting.
- Compliance validator: rejects "you should buy", "we recommend", passes clean text; sanitizer strips `<script>`/`on*=`.
- Prompt builder: contains real ETF numbers + no-advice instructions.
- `EmailService`: disabled → `MOCKED` + sender never invoked; enabled → delegates + records; legacy signature unchanged; `hasBeenSent` logic.
- Scheduler eligibility: tier filter, variant selection, idempotent skip, per-user failure isolation.

## Out of scope (deliberate)

- Real provider integration (future: one `EmailSender` impl + config).
- Unsubscribe/preference management (placeholder link only until a provider exists).
- In-app rendering of the breakdown.
- Custom-portfolio narratives (per-user numbers are still correct for them; the narrative describes the default VTI/VXUS/VBR portfolio).
- Async outbox/queue with retry backoff (catch-up runs cover the realistic failure modes at current scale).
