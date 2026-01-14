# Investment Scheduler Documentation

## Overview

The Investment Scheduler is a critical automation system that manages recurring investments and ensures proper funding and execution of trades. It operates on a daily cycle to process scheduled investments and batch ACH transfers.

## Key Features

### **Smart Schedule Management** 📅
- **Preserves Preferred Dates**: The system remembers the user's originally chosen day (e.g., "Mondays" or "15th of the month") and snaps future dates back to that preference, even if holidays or weekends cause temporary shifts.
- **Dual Triggers**: Schedules are triggered if:
  1. **First-time**: `startDate` matches today.
  2. **Recurring**: `nextInvestmentDate` matches today (or is past due).

### **Batch Processing** 📦
- **Daily Batch**: All recurring investments and bank-funded lump sums are aggregated into a single ACH transfer at the end of the day.
- **Limit Compliance**: This design respects the "one ACH transfer per day" limitation often present in brokerage integrations (like Alpaca).

## Architecture & Timing

The system relies on two synchronized cron jobs to handle the "Schedule then Execute" workflow.

### 1. Scheduler Job (11:55 PM ET)
**Cron:** `0 55 23 * * *`
**Class:** `InvestmentScheduler.processScheduledInvestments()`

This job identifies what *needs* to be invested today but does not execute money movement yet.
- **Finds Ready Schedules**: Scans for active schedules where the date matches "today".
- **Creates Execution Records**: Generates `InvestmentExecution` records with status `SCHEDULED`.
- **Updates Next Cycle**: Calculates and saves the *next* investment date for the schedule so it's ready for the next period.

### 2. Batch Execution Job (11:59 PM ET)
**Cron:** `0 59 23 * * *`
**Class:** `InvestmentExecutionService.processEndOfDayBatchTransfers()`

This job executes the funding for everything queued up during the day.
- **Aggregates**: Collects all `SCHEDULED` executions from the 11:55 PM job AND any ad-hoc lump sum investments made via Bank Funding during the day.
- **Batches**: Groups them by user.
- **Funds**: Sends a **single** ACH transfer request for the total amount.
- **Status Update**: Updates executions to `FUNDING_INITIATED`.

### 3. Execution (Morning)
**Frequency:** Every 15-30 minutes
**Class:** `InvestmentScheduler.checkFundingStatus()` / `checkTradingStatus()`

- **Checks Funding**: Polls for ACH completion.
- **Trades**: Once funding is "COMPLETED", it triggers the stock purchase order.
  - If Market is **Open**: Buys immediately.
  - If Market is **Closed**: Queues trade for next market open (9:30 AM ET).

## Investment Schedule Logic

### Ready Criteria (`isReadyForInvestment`)
A schedule is considered "Ready" to run if all of the following are true:
1. `isPaused` is **false**.
2. `achRequestId` is **not null** (User has a verified bank linked).
3. **Date Check**:
   - `startDate` == TODAY (First run)
   - OR `nextInvestmentDate` <= TODAY (Recurring)

### Frequency & Date Calculation

The system uses a "Preferred Date" logic to prevent schedule drift. It stores `chosenDate`, `dayOfWeek`, and `dayOfMonth` to ensure consistency.

#### 1. WEEKLY
- **Logic**: Finds the next occurrence of the stored `dayOfWeek`.
- **Example**: If you pick "Monday", it will always target the next Monday.

#### 2. BIWEEKLY
- **Logic**: Adds 2 weeks (14 days) to the current cycle.
- **Drift Prevention**: Checks the parity against the `startDate` to ensure it stays on the correct 2-week cadence (even/odd weeks).

#### 3. SEMI_MONTHLY
- **Logic**: Fixed schedule of **1st** and **15th**.
- **Calculation**: Finds the next upcoming 1st or 15th relative to the current date.

#### 4. MONTHLY
- **Logic**: Finds the next month's occurrence of `dayOfMonth`.
- **End-of-Month Handling**: If preferred day is 31st and next month is Feb, it clamps to the last day of the month (28th/29th). Next month it tries to snap back to 31st if possible.

#### Business Day Preservation Logic
When an investment date requires adjustment for weekends or holidays:
- **WEEKLY / BIWEEKLY**: Preserves the **Day of the Week** (e.g. shifts execution to Tuesday, but next schedule remains Monday).
- **MONTHLY**: Preserves the **Day of the Month** (e.g. shifts execution to 17th, but next schedule remains 15th).

### Business Day Adjustment

After calculating the "Ideal Date" (e.g., Saturday the 15th), the system applies `adjustForBusinessDay()`:
1. **Weekends**: Moves forward to Monday.
2. **Holidays**: Checks against rigid list of US Market Holidays (New Years, MLK, Presidents, Memorial, Juneteenth, Independence, Labor, Thanksgiving, Christmas). Moves forward to next business day.

**Crucial**: The `nextInvestmentDate` stored in the database is the *Adjusted* (business) day. However, the calculation logic for the *following* cycle uses the preserved "Preferred" components to calculate the next Ideal date to avoid permanent drift.
