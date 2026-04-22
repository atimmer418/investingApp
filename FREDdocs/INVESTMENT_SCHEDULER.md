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
| **DRIP Process** | `0 0 10 * * TUE,THU` | 10:00 AM ET, Tue & Thu | `InvestmentScheduler.processDripDividends()` |
| **DRIP Order Check** | `0 */15 10-15 * * MON-FRI` | Every 15 min, 10AM–3PM ET, Mon–Fri | `InvestmentScheduler.checkDripOrderStatus()` |

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

## DRIP (Dividend Reinvestment Plan)

### Overview

DRIP automatically reinvests cash dividends back into the stock that paid them. Since the Alpaca Broker API does not support native DRIP, the system implements it by polling for dividend activity and placing notional buy orders.

### How It Works

1. **Detect dividends** — On Tuesdays and Thursdays at 10:00 AM ET, `DripService.processAllDividends()` iterates all users.
2. **Filter eligible users** — A user is eligible if `dripEnabled` is not `false` (null = true for backwards compatibility) **and** they have an `alpacaAccountId`.
3. **Query Alpaca** — For each eligible user, calls `GET /v1/accounts/activities/DIV` with `after` and `until` parameters. Paginates up to 10 pages (100 per page).
4. **Filter to CDIV** — Only `activity_sub_type = "CDIV"` (Cash Dividend) with `status = "executed"` are processed.
5. **Dedup** — Each dividend's unique `id` field is stored as `alpacaActivityId` in the `drip_executions` table (unique constraint). Already-processed dividends are skipped.
6. **Minimum check** — Dividends below **$1.00** are recorded with status `SKIPPED` (Alpaca's minimum for notional orders).
7. **Place buy order** — A notional market buy order is placed via `AlpacaService.placeBuyOrder(accountId, symbol, netAmount)` for the full dividend amount back into the same stock.
8. **Track status** — The `DripExecution` record moves from `DETECTED` → `ORDER_PLACED` → `FILLED` (or `FAILED`).

### The `after` Window

The `after` parameter for the Alpaca query is derived from the most recent `dividendDate` in the `drip_executions` table for that user. If the user has no DRIP history, a default lookback of **90 days** is used. This ensures:
- No dividends are missed between polling cycles.
- Already-processed dividends are caught by the dedup check if there's date overlap.

### Order Status Checking

Every 15 minutes from 10 AM to 3 PM ET, Monday through Friday, `DripService.checkDripOrderStatus()` polls all `ORDER_PLACED` records:
- If Alpaca reports `filled` → mark `FILLED`, record `executedAt` timestamp.
- If Alpaca reports `canceled`, `expired`, or `rejected` → mark `FAILED` with error message.
- Otherwise (e.g., `new`, `partially_filled`, `pending_new`) → keep polling.

### DripExecution Lifecycle

```
DETECTED → ORDER_PLACED → FILLED
               ↓
             FAILED

DETECTED → SKIPPED  (amount < $1.00)
```

| Status | Meaning |
|--------|---------|
| `DETECTED` | Dividend found from Alpaca, not yet reinvested (transient — immediately moves to ORDER_PLACED or SKIPPED) |
| `ORDER_PLACED` | Notional buy order submitted to Alpaca |
| `FILLED` | Buy order filled successfully |
| `FAILED` | Order placement failed, or Alpaca canceled/rejected the order |
| `SKIPPED` | Dividend amount below $1.00 minimum |

### Database: `drip_executions` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT PK | Auto-increment primary key |
| `user_id` | BIGINT FK | References `users.id` |
| `alpaca_activity_id` | VARCHAR (unique) | Alpaca's dividend activity ID — **dedup key** |
| `symbol` | VARCHAR(20) | Stock that paid the dividend |
| `net_amount` | DECIMAL(10,2) | Dollar amount of the dividend |
| `dividend_date` | VARCHAR(20) | Date the dividend was paid (from Alpaca's `date` field) |
| `alpaca_order_id` | VARCHAR | Alpaca's order ID for the reinvestment buy |
| `status` | VARCHAR(30) | DETECTED / ORDER_PLACED / FILLED / FAILED / SKIPPED |
| `description` | TEXT | Alpaca's description (e.g., "Cash DIV @ 0.54 Pos QTY:9.03...") |
| `error_message` | TEXT | Error details if FAILED |
| `created_at` | DATETIME | Record creation time (ET) |
| `updated_at` | DATETIME | Last update time (ET) |
| `executed_at` | DATETIME | When the buy order was filled (ET) |

### User Model: `drip_enabled` Field

- Column: `drip_enabled` (BOOLEAN) on the `users` table.
- Default: `true` (set in entity field initializer and constructor).
- Null handling: `null` is treated as `true` for backwards compatibility with existing users.
- Hibernate `ddl-auto=update` creates the column automatically.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/user/drip` | Returns `{ "dripEnabled": true/false }` |
| `PUT` | `/api/user/drip` | Body: `{ "enabled": true/false }`. Returns `{ "dripEnabled": bool, "message": "..." }` |

Both endpoints require JWT authentication.

### Frontend Toggle

Located on the **Sell & Withdraw** page, inside the "Withdraw Cash" section header. The UI shows:
- **DRIP** label with an **(i)** popover icon that explains what DRIP is.
- An `ion-toggle` bound to the user's `dripEnabled` status.
- Toggle is disabled during load/save operations. Guards prevent spurious `ionChange` events from firing during programmatic `[checked]` updates.

### Alpaca API Used

**Dividend Activities:**
```
GET /v1/accounts/activities/DIV?account_id={id}&after={date}&until={date}&direction=asc&page_size=100
Headers: APCA-API-KEY-ID, APCA-API-SECRET-KEY
```

**Response (CDIV object):**
```json
{
  "activity_type": "DIV",
  "activity_sub_type": "CDIV",
  "id": "20190801011955195::5f596936-6f23-4cef-bdf1-3806aae57dbf",
  "date": "2019-08-01",
  "net_amount": "1.02",
  "symbol": "T",
  "qty": "2",
  "per_share_amount": "0.51",
  "description": "Cash DIV @ 0.54 Pos QTY:9.03...",
  "status": "executed",
  "account_id": "uuid",
  "created_at": "2021-05-10T14:01:04.650275Z"
}
```

**Reinvestment Order:** Uses `AlpacaService.placeBuyOrder(accountId, symbol, notionalAmount)` — a notional market buy order.

**Order Status:** Uses `AlpacaService.checkOrderStatus(accountId, orderId)` — same method used by the regular trading status checker.

---

*Last Updated: February 27, 2026*
