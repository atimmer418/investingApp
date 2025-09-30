# Database Migration Reminder

## Issue Fixed
- Added `next_investment_date` column to `investment_schedules` table
- Used `create-drop` to recreate table with new schema

## Steps Taken
1. Changed `spring.jpa.hibernate.ddl-auto=create-drop` in `application-local.properties`
2. Start the application to recreate tables
3. **IMPORTANT**: Change back to `spring.jpa.hibernate.ddl-auto=update` after first run

## Manual SQL Alternative (if needed)
If you prefer to manually add the column instead of using create-drop:

```sql
ALTER TABLE investing_dev.investment_schedules 
ADD COLUMN next_investment_date DATE NOT NULL DEFAULT CURRENT_DATE;
```

## After Fix
Remember to change back to:
```properties
spring.jpa.hibernate.ddl-auto=update
```

This prevents future data loss during development.
