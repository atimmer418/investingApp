# Investment Scheduler Documentation

## Overview

The Investment Scheduler is a cron-based system that automates the execution of scheduled investments for users. It handles the complete workflow from detecting due investments to funding transfers and stock purchases through the Alpaca trading platform.

## Key Features

### **Dual Date Processing** 🔄
The scheduler processes investments based on **two different triggers**:
1. **First-time investments**: When `startDate` equals today
2. **Recurring investments**: When `nextInvestmentDate` is today or overdue

### **Smart Schedule Management** 📅
- **Preserves `startDate`**: Original schedule start date remains unchanged
- **Updates `nextInvestmentDate`**: Only the next occurrence date is advanced
- **Prevents duplicate processing**: Each schedule processes only once per due date

## Architecture Components

### Core Components

1. **InvestmentScheduler** - Main cron job scheduler
2. **InvestmentScheduleService** - Manages investment schedules
3. **InvestmentExecutionService** - Handles the investment execution workflow
4. **InvestmentSchedule** (Model) - Represents a user's investment schedule
5. **InvestmentExecution** (Model) - Represents a specific investment execution instance
6. **InvestmentTrade** (Model) - Represents individual stock trades within an execution

### Key Services

- **AlpacaService** - Interface to Alpaca trading platform
- **EmailService** - User notifications
- **PortfolioService** - Portfolio allocation management

## Investment Schedule Model

### Key Fields

```java
@Entity
public class InvestmentSchedule {
    private Long id;
    private User user;
    private LocalDate startDate;           // When the schedule starts
    private LocalDate nextInvestmentDate;  // Next due date
    private BigDecimal investmentAmount;   // Amount to invest per execution
    private BigDecimal monthlyAmount;      // Reference monthly amount
    private String frequency;              // WEEKLY, BIWEEKLY, SEMI_MONTHLY, MONTHLY
    private Boolean isPaused;              // Schedule pause status
    private String achRequestId;           // ACH relationship ID (required for execution)
}
```

### Investment Frequency Logic

The system supports four frequency types with specific date calculation logic:

#### 1. WEEKLY
- **Investment Amount**: Specified amount every week
- **Next Date Calculation**: `fromDate.plusWeeks(1)`
- **Monthly Equivalent**: `investmentAmount × 4.33`

#### 2. BIWEEKLY
- **Investment Amount**: Specified amount every 2 weeks
- **Next Date Calculation**: `fromDate.plusWeeks(2)`
- **Monthly Equivalent**: `investmentAmount × 2.17`

#### 3. SEMI_MONTHLY
- **Investment Amount**: Specified amount twice per month
- **Next Date Calculation**: Always 15th and last day of month (ignores input date)
- **Monthly Equivalent**: `investmentAmount × 2`
- **Special Logic**:
  ```java
  if (currentDay < 15) {
      nextDate = today.withDayOfMonth(15);
  } else if (currentDay < lastDayOfMonth) {
      nextDate = today.withDayOfMonth(lastDayOfMonth);
  } else {
      nextDate = today.plusMonths(1).withDayOfMonth(15);
  }
  ```

#### 4. MONTHLY
- **Investment Amount**: Specified amount once per month
- **Next Date Calculation**: `fromDate.plusMonths(1)`
- **Monthly Equivalent**: Same as investment amount

### Business Day Adjustment

All calculated dates are adjusted to business days using `adjustForBusinessDay()` method to avoid weekends and US market holidays.

## Cron Job Schedule

### Main Investment Processing
```java
@Scheduled(cron = "0 30 9 * * MON-FRI", zone = "America/New_York")
public void processScheduledInvestments()
```
- **Time**: 9:30 AM ET (Market Open)
- **Days**: Monday through Friday
- **Purpose**: Process all scheduled investments due today

### Funding Status Check
```java
@Scheduled(fixedRate = 1800000) // 30 minutes
public void checkFundingStatus()
```
- **Frequency**: Every 30 minutes
- **Hours**: 8:00 AM - 6:00 PM ET (Funding Hours)
- **Purpose**: Check ACH transfer status for pending executions

### Trading Status Check
```java
@Scheduled(fixedRate = 900000) // 15 minutes
public void checkTradingStatus()
```
- **Frequency**: Every 15 minutes
- **Hours**: 9:30 AM - 4:00 PM ET (Market Hours Only)
- **Purpose**: Check order fill status for submitted trades

## Investment Execution Workflow

When either a user's `nextInvestmentDate` equals today's date OR their `startDate` equals today's date, the following logical sequence occurs:

### Phase 1: Schedule Detection & Validation

1. **Schedule Discovery**
   ```java
   List<InvestmentSchedule> readySchedules = 
       investmentScheduleService.getSchedulesReadyForInvestment();
   ```

2. **Enhanced Readiness Criteria**
   ```java
   public boolean isReadyForInvestment() {
       LocalDate today = LocalDate.now();
       
       // Must not be paused and must have ACH linked
       boolean basicRequirements = !isPaused && achRequestId != null;
       
       if (!basicRequirements) {
           return false;
       }
       
       // Check if either:
       // 1. Start date is today (first-time investment)
       // 2. Next investment date is today or past due (recurring investment)
       boolean dateRequirement = (startDate != null && startDate.equals(today)) ||
                                (nextInvestmentDate != null && !nextInvestmentDate.isAfter(today));
       
       return dateRequirement;
   }
   ```

3. **Processing Logic**
   ```java
   // Check if this schedule should be processed today
   boolean shouldProcessToday = false;
   String reason = "";
   
   if (schedule.getStartDate() != null && schedule.getStartDate().equals(today)) {
       shouldProcessToday = true;
       reason = "start date is today";
   } else if (schedule.getNextInvestmentDate() != null && 
             !schedule.getNextInvestmentDate().isAfter(today)) {
       shouldProcessToday = true;
       reason = "next investment date is due";
   }
   ```

4. **User Validation**
   - Alpaca account ID exists
   - Plaid relationship ID exists
   - Portfolio allocation configured

### Phase 2: Execution Creation

5. **Create InvestmentExecution Record**
   ```java
   InvestmentExecution execution = createInvestmentExecution(schedule);
   ```
   
   ```java
   private InvestmentExecution createInvestmentExecution(InvestmentSchedule schedule) {
       InvestmentExecution execution = new InvestmentExecution();
       execution.setUser(schedule.getUser());
       execution.setAmount(schedule.getInvestmentAmount());
       execution.setScheduledDate(LocalDateTime.now()); // Use LocalDateTime
       execution.setStatus(InvestmentExecution.ExecutionStatus.SCHEDULED);
       
       return executionRepository.save(execution);
   }
   ```

### Phase 3: Funding Initiation

6. **Update Status to FUNDING_INITIATED**
   ```java
   execution.setStatus(ExecutionStatus.FUNDING_INITIATED);
   execution.setExecutionDate(LocalDateTime.now());
   execution.setAlpacaAccountId(user.getAlpacaAccountId());
   ```

7. **Initiate ACH Transfer**
   ```java
   AlpacaTransferResponse transferResponse = alpacaService.initiateAchTransfer(
       user.getAlpacaAccountId(),
       user.getPlaidRelationshipId(),
       execution.getAmount()
   );
   ```

8. **Handle Transfer Response**
   - **Success**: Store `transferResponse.id` as `alpacaTransferId`
   - **Failure**: Set status to `FUNDING_FAILED`, notify user

### Phase 4: Schedule Advancement

9. **Update Next Investment Date (Preserves Start Date)**
   ```java
   private void updateScheduleAfterExecution(InvestmentSchedule schedule) {
       LocalDate currentNextDate = schedule.getNextInvestmentDate();
       LocalDate newNextDate = schedule.calculateNextInvestmentDate(LocalDate.now());
       
       schedule.setNextInvestmentDate(newNextDate);
       // Note: We don't update startDate - it remains as the original start date
       
       // Save the updated schedule
       investmentScheduleRepository.save(schedule);
       
       logger.info("Updated schedule {} next investment date from {} to {}", 
                  schedule.getId(), currentNextDate, newNextDate);
   }
   ```
   
   **Key Points:**
   - Only `nextInvestmentDate` is updated for future recurring investments
   - `startDate` is preserved as the original schedule start date
   - This ensures first-time investments work correctly

### Phase 5: Funding Monitoring (Async - Every 30 minutes)

10. **Check Transfer Status** (10+ minutes after initiation)
   ```java
   AlpacaTransferResponse status = alpacaService.checkTransferStatus(
       execution.getAlpacaAccountId(),
       execution.getAlpacaTransferId(),
       execution.getAmount(),
       execution.getExecutionDate()
   );
   ```

11. **Status Handling**
    - **COMPLETED**: Update to `FUNDING_COMPLETED`, proceed to trading
    - **FAILED/REJECTED**: Update to `FUNDING_FAILED`, notify user
    - **PENDING**: Wait (timeout after 24 hours)

### Phase 6: Trading Initiation

12. **Market Hours Check**
    ```java
    private boolean isMarketOpen() {
        // Monday-Friday 9:30 AM - 4:00 PM ET
        // Excludes US market holidays
    }
    ```

13. **Portfolio Allocation Retrieval**
    ```java
    Map<String, BigDecimal> portfolioAllocation = getUserPortfolioAllocation(user);
    ```

14. **Trade Creation for Each Asset**
    ```java
    for (Map.Entry<String, BigDecimal> allocation : portfolioAllocation.entrySet()) {
        String symbol = allocation.getKey();
        BigDecimal percentage = allocation.getValue();
        BigDecimal amount = execution.getAmount()
            .multiply(percentage)
            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        
        // Create InvestmentTrade record
        InvestmentTrade trade = new InvestmentTrade(execution, symbol, amount);
        
        // Place order with Alpaca
        AlpacaOrderResponse orderResponse = alpacaService.placeBuyOrder(
            execution.getAlpacaAccountId(), symbol, amount
        );
    }
    ```

### Phase 7: Trading Monitoring (Async - Every 15 minutes during market hours)

15. **Order Status Checking**
    - Check fill status for submitted orders
    - Update trade records with fill information
    - Handle partial fills and failures

16. **Execution Completion**
    - Mark execution as `COMPLETED` when all trades are filled
    - Update user's portfolio holdings
    - Send completion notification

## Execution Status States

| Status | Description | Next Action |
|--------|-------------|-------------|
| `SCHEDULED` | Created but not yet processed | Process on cron trigger |
| `FUNDING_INITIATED` | ACH transfer started | Wait for funding completion |
| `FUNDING_COMPLETED` | Funds available in account | Initiate trading |
| `FUNDING_FAILED` | ACH transfer failed | Notify user, retry logic |
| `TRADING_INITIATED` | Orders submitted to market | Monitor order status |
| `TRADING_FAILED` | Some/all orders failed | Notify user, manual intervention |
| `COMPLETED` | All trades successfully filled | Archive, update portfolio |
| `FAILED` | Execution failed at any stage | Notify user, investigate |

## Error Handling & Notifications

### Funding Failures
- **Insufficient funds**: Notify user to add funds
- **Banking issues**: Suggest contacting bank
- **Timeout (24 hours)**: Mark as failed, manual intervention

### Trading Failures
- **Market closed**: Wait for next market open
- **Invalid symbols**: Configuration error, notify user
- **Order rejection**: Market conditions, retry logic

### User Notifications
- Email notifications for all failures
- Success confirmations for completed investments
- Portfolio update summaries

## Configuration & Maintenance

### Market Holidays
Update the `US_HOLIDAYS_2025` set annually:
```java
private static final Set<LocalDate> US_HOLIDAYS_2025 = Set.of(
    LocalDate.of(2025, 1, 1),   // New Year's Day
    LocalDate.of(2025, 1, 20),  // Martin Luther King Jr. Day
    // ... other holidays
);
```

### Schedule Pausing
- New schedules start as `isPaused = true`
- Unpaused when ACH relationship confirmed
- Can be manually paused/resumed via API

### Testing Mode
For development, uncomment the test scheduler:
```java
@Scheduled(fixedRate = 60000) // 1 minute for testing
public void processTestInvestments()
```

## Algorithm Improvements

### **Enhanced Schedule Processing Logic**

The investment scheduler now uses improved logic that handles both first-time and recurring investments correctly:

#### Before (Problem):
- Only checked `nextInvestmentDate`
- First-time investments could be missed if `startDate` != `nextInvestmentDate`
- Schedule advancement was inconsistent

#### After (Solution):
```java
// Enhanced readiness check
boolean shouldProcessToday = false;
String reason = "";

if (schedule.getStartDate() != null && schedule.getStartDate().equals(today)) {
    shouldProcessToday = true;
    reason = "start date is today";
} else if (schedule.getNextInvestmentDate() != null && 
          !schedule.getNextInvestmentDate().isAfter(today)) {
    shouldProcessToday = true;
    reason = "next investment date is due";
}
```

#### Benefits:
1. **First-time investments work correctly**: Processes on exact `startDate`
2. **Recurring investments continue normally**: Uses `nextInvestmentDate`
3. **Clear separation of concerns**: `startDate` stays historical, `nextInvestmentDate` manages future
4. **Better logging**: Explains why each schedule was processed

## Performance Considerations

1. **Database Queries**: Use indexed queries for date-based lookups
2. **Rate Limiting**: Respect Alpaca API rate limits
3. **Transaction Management**: Use `@Transactional` for data consistency
4. **Error Recovery**: Implement retry mechanisms for transient failures
5. **Monitoring**: Log all significant events for debugging and auditing

## Integration Dependencies

- **Alpaca Trading API**: Account management, ACH transfers, order placement
- **Plaid API**: Bank account verification and linking
- **Email Service**: User notifications
- **Database**: PostgreSQL/MySQL for data persistence
- **Spring Scheduler**: Cron job execution framework
