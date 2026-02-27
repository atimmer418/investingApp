# Investment Scheduler & Execution Documentation

## Overview

The Investment Scheduler is the automation system that manages recurring investments, lump-sum investments, and ensures proper funding and execution of trades. It operates on a daily cycle with three phases: **Schedule → Fund → Trade**.

## Architecture & Timing

### Cron Jobs

| Job | Cron | Schedule | Class |
|-----|------|----------|-------|
| **Schedule Recurring** | `0 55 23 * * *` | 11:55 PM ET daily | `InvestmentScheduler.processScheduledInvestments()` |
| **Batch Fund** | `0 59 23 * * *` | 11:59 PM ET daily | `InvestmentExecutionService.processEndOfDayBatchTransfers()` |
| **Check Funding** | `0 */30 8-17 * * MON-FRI` | Every 30 min, 8AM–5PM ET, Mon–Fri | `InvestmentScheduler.checkFundingStatus()` |
| **Check Trading** | `0 */15 9-15 * * MON-FRI` | Every 15 min, 9AM–4PM ET, Mon–Fri | `InvestmentScheduler.checkTradingStatus()` |

### Phase 1: Scheduling (11:55 PM ET)
Identifies what needs to be invested today but does **not** move money yet.
- Scans for active `InvestmentSchedule` records where `startDate` or `nextInvestmentDate` matches today (or is past due).
- Creates `InvestmentExecution` records with status `SCHEDULED`.
- Calculates and saves the next investment date for each schedule using preferred-date logic to prevent drift.

### Phase 2: Batch Funding (11:59 PM ET)
Executes funding for everything queued during the day.
- Collects all `SCHEDULED` executions from the 11:55 PM job **and** any bank-funded lump-sum investments made via the API during the day.
- Groups by user.
- Sends a **single** ACH transfer request per user for the total amount via `alpacaService.initiateAchTransfer()`.
- All executions in the batch share the same `alpacaTransferId`.
- Status moves to `FUNDING_INITIATED`.

**Note:** This cron runs every day including weekends. If a user makes a lump-sum investment on Saturday, the ACH request is submitted Saturday night. Alpaca queues it, and actual NACHA processing happens the next business day. The funding status poller only runs Mon–Fri, so the transfer is picked up Monday morning.

### Phase 3: Funding & Trading Checks (Next Business Day)
- **`checkFundingStatus()`** — Polls Alpaca's transfers endpoint (`GET /accounts/{account_id}/transfers?direction=INCOMING`) every 30 minutes during business hours. Finds the transfer by ID and reads its status directly.
- **`checkTradingStatus()`** — Polls Alpaca's orders endpoint every 15 minutes during market hours. Also calls `initiateDelayedTrading()` first to pick up any `FUNDING_COMPLETED` executions that were funded after market close.

---

## InvestmentExecution Lifecycle

### Status Flow
```
SCHEDULED → FUNDING_INITIATED → FUNDING_COMPLETED → TRADING_INITIATED → COMPLETED
                ↓                                         ↓
          FUNDING_FAILED                            TRADING_FAILED
                                                                    → FAILED
```

### Status Definitions

| Status | Meaning | What Happens Next |
|--------|---------|-------------------|
| `SCHEDULED` | Created by controller (lump sum) or 11:55 PM cron (recurring). Bank-funded investments sit here until the 11:59 PM batch. | Picked up by `processEndOfDayBatchTransfers()` |
| `FUNDING_INITIATED` | ACH transfer submitted to Alpaca. All batch siblings share one `alpacaTransferId`. | Polled by `checkFundingStatus()` Mon–Fri 8AM–5PM |
| `FUNDING_COMPLETED` | Alpaca transfer status is `COMPLETE`. | Trading initiated immediately if market is open; otherwise queued for `initiateDelayedTrading()` |
| `FUNDING_FAILED` | Alpaca transfer status is `REJECTED`, `CANCELED`, or `RETURNED`. User notified via email. | Terminal state |
| `TRADING_INITIATED` | Market order(s) placed via Alpaca. Portfolio type → one order per allocation symbol. Stock type → one order for target symbol. | Polled by `checkTradingStatus()` Mon–Fri 9AM–4PM |
| `COMPLETED` | All orders filled. User notified via email. | Terminal state |
| `TRADING_FAILED` | Order rejected or canceled by Alpaca. User notified via email. | Terminal state |
| `FAILED` | Generic failure state. | Terminal state |

### Buying Power Path
If `fundingSource` is `"buying_power"`, the entire funding phase is skipped. The execution goes directly from `SCHEDULED` → `FUNDING_COMPLETED` → trading.

---

## Funding Status Check (Alpaca Integration)

### Endpoint Used
```
GET /v1/accounts/{account_id}/transfers?direction=INCOMING&limit=20&offset=0
```

The system retrieves the account's incoming transfers list and finds the one matching the stored `alpacaTransferId`. This gives us the exact transfer status from Alpaca.

### Alpaca Transfer Statuses (mapped to our behavior)

| Alpaca Status | Our Behavior |
|---------------|-------------|
| `QUEUED` | Pending — keep polling |
| `APPROVAL_PENDING` | Pending — keep polling |
| `PENDING` | Pending — keep polling |
| `SENT_TO_CLEARING` | Pending — keep polling |
| `APPROVED` | Pending — keep polling |
| `COMPLETE` | → `FUNDING_COMPLETED`, initiate trading |
| `REJECTED` | → `FUNDING_FAILED`, notify user |
| `CANCELED` | → `FUNDING_FAILED`, notify user |
| `RETURNED` | → `FUNDING_FAILED`, notify user ("bank returned the ACH transfer") |

### Pagination
Transfers are fetched in pages of 20 (`limit=20`). Since recent transfers appear first and we're always checking recently-initiated transfers, the first page almost always contains it. Up to 5 pages (100 records) are searched before giving up.

### Staleness Warning
If a transfer has been in `FUNDING_INITIATED` for more than 7 days, a warning is logged for manual review.

### Batch Handling
When multiple executions share the same `alpacaTransferId` (from end-of-day batching), a status update for the transfer applies to **all** sibling executions.

---

## Investment Types

| Type | Created By | Funding | Trading |
|------|-----------|---------|---------|
| `"portfolio"` | Recurring schedule or lump-sum portfolio investment | Bank ACH or buying power | Fractional/notional orders for each symbol in user's portfolio allocation |
| `"stock"` | Lump-sum individual stock investment | Bank ACH or buying power | Single order for `targetSymbol` |
| `"recurring"` | Recurring schedule | Bank ACH | Same as portfolio |

### Order Placement
- Uses `placeOrderWithFractionalCheck()` — checks `alpacaService.isFractionable(symbol)` to decide between notional (fractional) vs. quantity (whole shares) orders.
- Portfolio investments split the funded amount proportionally across all allocation symbols.

---

## Lump-Sum Investment Flow

### Entry Point
`POST /api/investments/execute`

1. Validates user has `alpacaAccountId` and `plaidRelationshipId`.
2. Validates amount ($1–$1,000,000).
3. Creates `InvestmentExecution` entity with `investmentType`, `targetSymbol`, `fundingSource`.
4. Calls `processInvestmentExecutionImmediately(execution)`.

### Behavior by Funding Source
- **`"buying_power"`** — Checks Alpaca buying power balance, immediately moves to `FUNDING_COMPLETED` → trading.
- **`"bank"`** — Sets status to `SCHEDULED` with message "Queued for end-of-day batch processing". Picked up at 11:59 PM by the batch cron.

### Weekend/Holiday Behavior
There is no business-day guard on the EOD batch cron. If a user invests on Saturday:
- 11:59 PM Saturday: ACH request submitted to Alpaca (Alpaca queues it).
- Monday 8AM: `checkFundingStatus()` starts polling. Actual ACH settlement happens on the business day.

---

## Investment Schedule Logic

### Ready Criteria
A schedule is ready for execution if:
1. `isPaused` is `false`.
2. `achRequestId` is not null (verified bank linked).
3. `startDate` == today (first run) **or** `nextInvestmentDate` <= today (recurring).

### Frequency & Date Calculation
Uses "Preferred Date" logic with stored `chosenDate`, `dayOfWeek`, `dayOfMonth` to prevent schedule drift.

| Frequency | Logic |
|-----------|-------|
| `WEEKLY` | Next occurrence of stored `dayOfWeek` |
| `BIWEEKLY` | +14 days, with parity check against `startDate` to maintain cadence |
| `SEMI_MONTHLY` | Fixed 1st and 15th of each month |
| `MONTHLY` | Next month's `dayOfMonth`, clamped to last day if month is shorter |

### Business Day Adjustment
After calculating the ideal date, `adjustForBusinessDay()` is applied:
1. **Weekends** — moves forward to Monday.
2. **US Market Holidays** — New Year's, MLK Day, Presidents' Day, Memorial Day, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas. Moves forward to next business day.

**Important:** The stored `nextInvestmentDate` is the adjusted (business) day. But the *next cycle* calculation uses the original preferred components (day of week, day of month) to avoid permanent drift.

**Note:** Juneteenth is mentioned in some docs but is not currently in the holiday list in code.

---

*Last Updated: February 27, 2026*
