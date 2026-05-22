# FRED-125 — Recurring investments streak badge and pause warning

## Before
```
## FRED-125 — Recurring investments streak badge and pause warning
recurring investments ALMOST DONE needs monthly streak badge and are you sure you want to pause your investments, this will break your investing streak and reset it to 0 and that it may be better to do less than none
```

## Summary
Two additions to the recurring-investments page: (1) A "monthly streak" badge showing how many consecutive months the user has invested — incremented by the backend scheduler each time an investment executes in a new calendar month, reset to 0 on pause. (2) A confirmation `AlertController` dialog before pausing that warns the user their streak will reset and suggests reducing the amount instead.

## Files
- `backend/src/main/java/com/investingapp/backend/model/InvestmentSchedule.java` — add `monthlyStreak` int field
- `backend/src/main/resources/db/migration/V<next>__add_monthly_streak_to_investment_schedules.sql` — Flyway migration: `ALTER TABLE investment_schedules ADD COLUMN monthly_streak INT NOT NULL DEFAULT 0`
- `backend/src/main/java/com/investingapp/backend/service/InvestmentScheduleService.java` — increment `monthlyStreak` when investment executes in a new calendar month; reset to 0 in `pauseSchedule()`
- `backend/src/main/java/com/investingapp/backend/dto/InvestmentScheduleDTO.java` (or whichever DTO surfaces the schedule to the frontend) — expose `monthlyStreak`
- `frontend/src/app/services/investment.service.ts` — add `monthlyStreak: number` to `InvestmentSchedule` interface
- `frontend/src/app/recurring-investments/recurring-investments.page.html` — add streak badge to the Investment Schedule card; add `IonAlert` confirmation before pause
- `frontend/src/app/recurring-investments/recurring-investments.page.ts` — intercept pause action to show `AlertController` confirmation; import `IonAlert`, `AlertController`
- `frontend/src/app/recurring-investments/recurring-investments.page.scss` — streak badge styling

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — badge and card styling conventions
- `FREDdocs/INVESTMENT_SCHEDULER.md` — understand how the scheduler marks a successful investment execution (where to hook streak increment)

## Acceptance Criteria
1. `investment_schedules` table gains `monthly_streak INT NOT NULL DEFAULT 0` via Flyway migration.
2. Each time the investment scheduler successfully executes an investment, it checks if the current calendar month differs from the month of the previous execution. If it does (new month), increment `monthlyStreak` by 1. If it's the same month, do not increment (multiple investments in one month don't multi-count).
3. `pauseSchedule()` resets `monthlyStreak` to 0 on the backend before persisting. `resumeSchedule()` does NOT reset it — the streak is lost on pause, not on resume.
4. `monthlyStreak` is returned in the schedule DTO and on the `InvestmentSchedule` TypeScript interface.
5. Streak badge: shown in the Investment Schedule card directly below the Amount/Frequency/Next Date row when `monthlyStreak > 0`. Reads "X-month streak" (e.g. "5-month streak"). Uses a small filled badge style: `background: #2563EB`, white text, pill shape, `material-symbols-outlined` flame icon (`local_fire_department`) to the left of the text.
6. When `monthlyStreak === 0` (or user has never invested), the badge is hidden (`*ngIf`).
7. When the user taps "Pause Investments": before calling `pauseSchedule()`, show an `AlertController` confirmation with:
   - Header: "Pause Investments?"
   - Message: "This will reset your [X]-month investing streak to 0. Investing less is better than investing nothing — consider reducing your amount instead."
   - Buttons: "Cancel" (dismiss) | "Pause Anyway" (proceed with pause)
8. If `monthlyStreak === 0`, skip the confirmation and pause immediately (no point warning about a 0-streak).
9. `npx tsc --noEmit` exits 0; `./gradlew build -x test` exits 0.

## Edge Cases / Open Questions
- Streak increment needs a "last increment month" reference. Simplest approach: add a `lastStreakIncrementDate LocalDate` column (nullable) to `investment_schedules` — set it each time the streak increments; compare `currentMonth != lastStreakIncrementDate.getMonth()` before incrementing.
- If the user was already paused and resumes, the streak stays at 0 (it was reset on pause). Future months of investing will build it back up from 0.
- The "reduce amount instead" suggestion in the confirmation: this is just copy — don't add a deep-link to the edit form in this story.

## Time Estimate
`1-3hr`

## Label
`[code]`
