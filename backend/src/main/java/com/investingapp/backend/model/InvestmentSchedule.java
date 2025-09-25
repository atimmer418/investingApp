package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "investment_schedules")
public class InvestmentSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Core investment schedule fields for cron processing
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "next_investment_date", nullable = false)
    private LocalDate nextInvestmentDate;

    @Column(name = "investment_amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal investmentAmount; // Amount to invest per execution

    @Column(name = "monthly_amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal monthlyAmount; // Reference monthly amount user specified

    @Column(name = "frequency", length = 20, nullable = false)
    private String frequency; // "WEEKLY", "BIWEEKLY", "MONTHLY"

    @Column(name = "is_paused", nullable = false)
    private Boolean isPaused = true;

    // ACH and system fields
    @Column(name = "ach_request_id", length = 255)
    private String achRequestId; // This will be set when ACH linking is confirmed

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        
        // Set initial dates if not provided
        if (startDate == null) {
            startDate = LocalDate.now();
        }
        if (nextInvestmentDate == null) {
            nextInvestmentDate = calculateNextInvestmentDate(startDate);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Calculate the next investment date based on frequency
     */
    public LocalDate calculateNextInvestmentDate(LocalDate fromDate) {
        if (fromDate == null) fromDate = LocalDate.now();
        
        LocalDate nextDate = switch (frequency.toUpperCase()) {
            case "WEEKLY" -> fromDate.plusWeeks(1);
            case "BIWEEKLY" -> fromDate.plusWeeks(2);
            case "SEMI_MONTHLY" -> {
                // Semi-monthly: Always 15th and last day of month (ignore input date)
                LocalDate today = LocalDate.now();
                int currentDay = today.getDayOfMonth();
                
                if (currentDay < 15) {
                    // Next payment is 15th of current month
                    yield today.withDayOfMonth(15);
                } else {
                    // Next payment is last day of current month
                    yield today.withDayOfMonth(today.lengthOfMonth());
                }
            }
            case "MONTHLY" -> fromDate.plusMonths(1);
            default -> fromDate.plusWeeks(2); // Default to biweekly
        };
        
        // Adjust for weekends and holidays
        nextDate = adjustForBusinessDay(nextDate);
        
        System.out.println("calculateNextInvestmentDate: fromDate=" + fromDate + ", frequency=" + frequency + ", nextDate=" + nextDate);
        return nextDate;
    }

    /**
     * Adjust date to next business day if it falls on weekend or holiday
     */
    private LocalDate adjustForBusinessDay(LocalDate date) {
        LocalDate adjustedDate = date;
        
        // Skip weekends (Saturday = 6, Sunday = 7)
        while (adjustedDate.getDayOfWeek().getValue() >= 6) {
            adjustedDate = adjustedDate.plusDays(1);
        }
        
        // Check for common US holidays and adjust
        adjustedDate = adjustForHolidays(adjustedDate);
        
        return adjustedDate;
    }

    /**
     * Adjust for common US holidays
     */
    private LocalDate adjustForHolidays(LocalDate date) {
        if (isUSHoliday(date)) {
            // Move to next business day
            LocalDate nextDay = date.plusDays(1);
            // Recursively check if next day is also weekend/holiday
            return adjustForBusinessDay(nextDay);
        }
        return date;
    }

    /**
     * Check if date is a US federal holiday
     */
    private boolean isUSHoliday(LocalDate date) {
        int year = date.getYear();
        int month = date.getMonthValue();
        int day = date.getDayOfMonth();
        
        // New Year's Day
        if (month == 1 && day == 1) return true;
        
        // Independence Day
        if (month == 7 && day == 4) return true;
        
        // Christmas Day
        if (month == 12 && day == 25) return true;
        
        // Martin Luther King Jr. Day (3rd Monday in January)
        if (month == 1 && isNthWeekdayOfMonth(date, java.time.DayOfWeek.MONDAY, 3)) return true;
        
        // Presidents Day (3rd Monday in February)
        if (month == 2 && isNthWeekdayOfMonth(date, java.time.DayOfWeek.MONDAY, 3)) return true;
        
        // Memorial Day (last Monday in May)
        if (month == 5 && isLastWeekdayOfMonth(date, java.time.DayOfWeek.MONDAY)) return true;
        
        // Labor Day (1st Monday in September)
        if (month == 9 && isNthWeekdayOfMonth(date, java.time.DayOfWeek.MONDAY, 1)) return true;
        
        // Columbus Day (2nd Monday in October)
        if (month == 10 && isNthWeekdayOfMonth(date, java.time.DayOfWeek.MONDAY, 2)) return true;
        
        // Veterans Day (November 11)
        if (month == 11 && day == 11) return true;
        
        // Thanksgiving (4th Thursday in November)
        if (month == 11 && isNthWeekdayOfMonth(date, java.time.DayOfWeek.THURSDAY, 4)) return true;
        
        return false;
    }

    /**
     * Check if date is the nth occurrence of a weekday in the month
     */
    private boolean isNthWeekdayOfMonth(LocalDate date, java.time.DayOfWeek weekday, int n) {
        if (date.getDayOfWeek() != weekday) return false;
        
        LocalDate firstOfMonth = date.withDayOfMonth(1);
        LocalDate nthWeekday = firstOfMonth;
        
        // Find first occurrence of the weekday
        while (nthWeekday.getDayOfWeek() != weekday) {
            nthWeekday = nthWeekday.plusDays(1);
        }
        
        // Add (n-1) weeks to get nth occurrence
        nthWeekday = nthWeekday.plusWeeks(n - 1);
        
        return date.equals(nthWeekday);
    }

    /**
     * Check if date is the last occurrence of a weekday in the month
     */
    private boolean isLastWeekdayOfMonth(LocalDate date, java.time.DayOfWeek weekday) {
        if (date.getDayOfWeek() != weekday) return false;
        
        LocalDate lastOfMonth = date.withDayOfMonth(date.lengthOfMonth());
        
        // Find last occurrence of the weekday
        while (lastOfMonth.getDayOfWeek() != weekday) {
            lastOfMonth = lastOfMonth.minusDays(1);
        }
        
        return date.equals(lastOfMonth);
    }

    /**
     * Update the next investment date after processing
     */
    public void advanceToNextInvestmentDate() {
        this.nextInvestmentDate = calculateNextInvestmentDate(this.nextInvestmentDate);
    }

    /**
     * Check if this schedule is ready for investment execution
     */
    public boolean isReadyForInvestment() {
        return !isPaused && 
               nextInvestmentDate != null && 
               !nextInvestmentDate.isAfter(LocalDate.now()) &&
               achRequestId != null; // ACH must be linked
    }

    /**
     * Calculate investment amount based on frequency relative to monthly amount
     */
    public BigDecimal calculateInvestmentAmountFromMonthly() {
        if (monthlyAmount == null) return BigDecimal.ZERO;
        
        return switch (frequency.toUpperCase()) {
            case "WEEKLY" -> monthlyAmount.divide(new BigDecimal("4.33"), 2, java.math.RoundingMode.HALF_UP);
            case "BIWEEKLY" -> monthlyAmount.divide(new BigDecimal("2.17"), 2, java.math.RoundingMode.HALF_UP);
            case "SEMI_MONTHLY" -> monthlyAmount.divide(new BigDecimal("2"), 2, java.math.RoundingMode.HALF_UP); // Exactly 2 times per month
            case "MONTHLY" -> monthlyAmount;
            default -> monthlyAmount;
        };
    }

    /**
     * Generate a user-friendly schedule description
     */
    public String getScheduleDescription() {
        if (startDate == null || frequency == null) {
            return "Schedule not configured";
        }

        java.time.DayOfWeek dayOfWeek = startDate.getDayOfWeek();
        String dayName = dayOfWeek.getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH);
        
        return switch (frequency.toUpperCase()) {
            case "WEEKLY" -> String.format("Starting %s, %s — recurring every week on %s", 
                dayName, startDate.format(java.time.format.DateTimeFormatter.ofPattern("MMM d")), dayName);
            case "BIWEEKLY" -> String.format("Starting %s, %s — recurring every 2 weeks on %s", 
                dayName, startDate.format(java.time.format.DateTimeFormatter.ofPattern("MMM d")), dayName);
            case "SEMI_MONTHLY" -> {
                // Semi-monthly is typically 15th and last day of month
                yield String.format("Starting %s — recurring every month on the 15th and last day", 
                      startDate.format(java.time.format.DateTimeFormatter.ofPattern("MMM d")));
            }
            case "MONTHLY" -> String.format("Starting %s, %s — recurring every month on the %s", 
                dayName, startDate.format(java.time.format.DateTimeFormatter.ofPattern("MMM d")), 
                getOrdinalNumber(startDate.getDayOfMonth()));
            default -> "Custom schedule";
        };
    }

    /**
     * Helper method to convert numbers to ordinal (1st, 2nd, 3rd, etc.)
     */
    private String getOrdinalNumber(int number) {
        if (number >= 11 && number <= 13) {
            return number + "th";
        }
        return switch (number % 10) {
            case 1 -> number + "st";
            case 2 -> number + "nd";
            case 3 -> number + "rd";
            default -> number + "th";
        };
    }


}

