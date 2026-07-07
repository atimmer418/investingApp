# Freedom Date Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every freedom date in FRED (tab3 strip, Monthly Freedom Update, my-profile) computes from the same live inputs: target = `retirementIncome × 25` (else $1.5M) and contribution = the actual investment schedule's monthly equivalent (else survey value).

**Architecture:** Two mirrored calculators (backend `MonthlyFreedomUpdateService`, frontend `FreedomStatsService`) fed identical inputs, pinned together by a cross-stack parity test fixture. A new shared frontend util owns frequency→monthly conversion. my-profile renders the same live signal tab3 renders. No new endpoints, no DB changes, no data migration.

**Tech Stack:** Spring Boot (Java 17, JUnit 5 plain — no `@SpringBootTest`), Angular 17+ standalone + Ionic (signals, Jasmine/Karma).

**Spec:** `docs/superpowers/specs/2026-07-07-freedom-date-unification-design.md`

## Global Constraints

- **Never run the whole frontend test suite** (legacy CLI-generated specs are red). Always: `cd frontend && ng test --include='**/<name>.spec.ts' --watch=false --browsers=ChromeHeadless`.
- **Angular AOT gate:** `cd frontend && npx ng build --configuration dev`. Valid configurations are production/local/dev/test/ci — `development` is NOT valid (exits 127, can be masked).
- **Backend tests:** `cd backend && ./gradlew test --tests <FullyQualifiedClass>` — plain JUnit 5, no Spring context.
- **Dirty working tree:** unrelated FRED-209 work is in flight. `git add` ONLY the exact files named in each task's commit step. NEVER `git add -A`, `-u`, or `.`.
- **Do not touch** (in-flight FRED-209 files): `FredConstitution.java`, `LLMService.java`, `portfolio-store.service.ts`, `portfolio-dashboard.*`, `retirement-planning.*`, `monte-carlo-flow.*`, `ai-chat.page.*`, `app.component.ts`, `mc-info-sheet.*`, `portfolio-chart.*`, `monte-carlo.service.spec.ts`, `jwt-token.utils.ts`.
- **Conversion factors, verbatim in both stacks:** WEEKLY ×4.33, BIWEEKLY ×2.17, SEMI_MONTHLY ×2, MONTHLY ×1.
- **Constants:** `SAFE_WITHDRAWAL_RATE = 0.04`, default target `$1,500,000`. `ASSUMED_ANNUAL_RETURN = 0.10` already exists on both sides — do not change it.
- **Parity fixture (both stacks must assert it):** equity $10,000 · contribution $500/month · target $1,500,000 → 374.02 months → ceil → **32 years** → `currentYear + 32`.
- `user.targetPortfolio` keeps being **written** at registration (`WebAuthnService`) — this plan removes all **reads**, nothing else.
- Every commit message ends with:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01AfEBYNHCcUmRNF4rJUNCiw
  ```

---

### Task 1: Shared frequency→monthly util (frontend)

**Files:**
- Create: `frontend/src/app/utils/investment-frequency.utils.ts`
- Test: `frontend/src/app/utils/investment-frequency.utils.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `InvestmentFrequencyUtils.toMonthlyEquivalent(amount: number, frequency: string | null | undefined): number` — static, case-insensitive, rounds to cents, returns 0 for non-positive amounts. Tasks 3 and 4 import it.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/utils/investment-frequency.utils.spec.ts`:

```typescript
import { InvestmentFrequencyUtils } from './investment-frequency.utils';

describe('InvestmentFrequencyUtils', () => {

  it('converts WEEKLY with the backend factor ×4.33', () => {
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(100, 'WEEKLY')).toBe(433);
  });

  it('converts BIWEEKLY with ×2.17 (backend parity — NOT the old my-profile 2.16)', () => {
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(100, 'BIWEEKLY')).toBe(217);
  });

  it('converts semi-monthly with ×2, accepting both spellings', () => {
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(250, 'SEMI_MONTHLY')).toBe(500);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(250, 'semimonthly')).toBe(500);
  });

  it('passes monthly through unchanged and is case-insensitive', () => {
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(500, 'monthly')).toBe(500);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(500, 'weekly')).toBe(2165);
  });

  it('rounds to cents like the backend setScale(2, HALF_UP)', () => {
    // 115.47 × 4.33 = 499.9851 → 499.99
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(115.47, 'WEEKLY')).toBe(499.99);
  });

  it('returns 0 for zero/negative amounts; unknown or missing frequency defaults to monthly', () => {
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(0, 'WEEKLY')).toBe(0);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(-5, 'WEEKLY')).toBe(0);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(500, 'QUARTERLY')).toBe(500);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(500, undefined)).toBe(500);
    expect(InvestmentFrequencyUtils.toMonthlyEquivalent(500, null)).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && ng test --include='**/investment-frequency.utils.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: FAIL — cannot resolve `./investment-frequency.utils`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/app/utils/investment-frequency.utils.ts`:

```typescript
/**
 * investment-frequency.utils.ts
 *
 * Converts a per-execution investment amount to its monthly equivalent.
 *
 * The factors MUST stay in lockstep with the backend's
 * MonthlyFreedomUpdateService.calculateMonthlyEquivalent
 * (WEEKLY ×4.33, BIWEEKLY ×2.17, SEMI_MONTHLY ×2, MONTHLY ×1) —
 * the unified freedom date depends on both stacks converting identically.
 */
export class InvestmentFrequencyUtils {

  static toMonthlyEquivalent(amount: number, frequency: string | null | undefined): number {
    if (!amount || amount <= 0) return 0;

    const freq = (frequency ?? 'MONTHLY').toUpperCase();
    let factor = 1;
    if (freq === 'WEEKLY') factor = 4.33;
    else if (freq === 'BIWEEKLY') factor = 2.17;
    else if (freq === 'SEMI_MONTHLY' || freq === 'SEMIMONTHLY') factor = 2;

    // Mirror the backend's setScale(2, RoundingMode.HALF_UP)
    return Math.round(amount * factor * 100) / 100;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && ng test --include='**/investment-frequency.utils.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: `TOTAL: 6 SUCCESS`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/utils/investment-frequency.utils.ts frontend/src/app/utils/investment-frequency.utils.spec.ts
git commit -m "feat: shared frequency-to-monthly util (backend-parity factors)"
```

---

### Task 2: Backend — MFU target goes live income-based

**Files:**
- Modify: `backend/src/main/java/com/investingapp/backend/service/MonthlyFreedomUpdateService.java` (constants ~line 31, target chain ~lines 273–284, `calculateFreedomYear` visibility ~line 721)
- Test: `backend/src/test/java/com/investingapp/backend/service/MonthlyFreedomUpdateServiceTest.java` (new)

**Interfaces:**
- Consumes: `User.getRetirementIncome(): Double` (annualized), `User` has `@NoArgsConstructor` + Lombok-style setters (`setRetirementIncome`, `setTargetPortfolio`).
- Produces: `double resolveTargetPortfolio(User user)` — package-private; `int calculateFreedomYear(BigDecimal, BigDecimal, BigDecimal)` — visibility widened from `private` to package-private (test access only, no behavior change).

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/java/com/investingapp/backend/service/MonthlyFreedomUpdateServiceTest.java`:

```java
package com.investingapp.backend.service;

import com.investingapp.backend.model.User;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Plain JUnit 5 (no Spring context) — unified freedom-target resolution and
 * freedom-year math.
 *
 * PARITY: the parityFixtureFreedomYear values are mirrored in
 * frontend/src/app/services/freedom-stats.service.spec.ts ("cross-stack parity
 * fixture"). If you change one, change both.
 */
class MonthlyFreedomUpdateServiceTest {

    private final MonthlyFreedomUpdateService service = new MonthlyFreedomUpdateService();

    @Test
    void targetIsLiveIncomeBasedAndIgnoresStoredTargetPortfolio() {
        User user = new User();
        user.setRetirementIncome(60000.0);
        user.setTargetPortfolio(150000.0); // stale signup snapshot — must be ignored
        assertEquals(1_500_000.0, service.resolveTargetPortfolio(user), 0.001);
    }

    @Test
    void targetDefaultsWhenIncomeAbsent() {
        User user = new User();
        user.setTargetPortfolio(150000.0);
        assertEquals(1_500_000.0, service.resolveTargetPortfolio(user), 0.001);
    }

    @Test
    void targetDefaultsWhenIncomeZero() {
        User user = new User();
        user.setRetirementIncome(0.0);
        assertEquals(1_500_000.0, service.resolveTargetPortfolio(user), 0.001);
    }

    @Test
    void parityFixtureFreedomYear() {
        // equity $10,000 · $500/month · target $1,500,000
        // → months-to-target ≈ 374.02 → ceil(374.02 / 12) = 32 years
        int year = service.calculateFreedomYear(
                new BigDecimal("10000"), new BigDecimal("500"), new BigDecimal("1500000"));
        assertEquals(LocalDate.now().getYear() + 32, year);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests com.investingapp.backend.service.MonthlyFreedomUpdateServiceTest`
Expected: COMPILATION FAILURE — `resolveTargetPortfolio` does not exist and `calculateFreedomYear` is private.

- [ ] **Step 3: Implement**

In `MonthlyFreedomUpdateService.java`, add two constants directly below `ASSUMED_ANNUAL_RETURN` (line 31):

```java
    private static final double ASSUMED_ANNUAL_RETURN = 0.10;
    private static final double SAFE_WITHDRAWAL_RATE = 0.04;
    private static final double DEFAULT_TARGET_PORTFOLIO = 1_500_000.0;
```

Replace the target chain in `generateUpdate` (currently lines 273–284):

```java
        // --- Projection: Freedom Year ---
        BigDecimal monthlyContribution = calculateMonthlyEquivalent(investmentAmount, frequency);
        Double targetPortfolio = user.getTargetPortfolio();
        if (targetPortfolio == null || targetPortfolio <= 0) {
            // Fallback: use retirementIncome / 0.04 (4% SWR)
            Double retirementIncome = user.getRetirementIncome();
            if (retirementIncome != null && retirementIncome > 0) {
                targetPortfolio = retirementIncome / 0.04;
            } else {
                targetPortfolio = 1500000.0; // Default $1.5M
            }
        }
```

with:

```java
        // --- Projection: Freedom Year ---
        BigDecimal monthlyContribution = calculateMonthlyEquivalent(investmentAmount, frequency);
        double targetPortfolio = resolveTargetPortfolio(user);
```

Add the new method directly above `calculateMonthsToTarget`:

```java
    /**
     * Resolve the FI target portfolio — live income-based 4% rule, $1.5M default.
     * UNIFIED with the tab3 stat strip (frontend FreedomStatsService): both sides
     * compute retirementIncome / SAFE_WITHDRAWAL_RATE from the user's CURRENT
     * retirement income. The user.targetPortfolio signup snapshot is intentionally
     * not read — it goes stale the moment the user edits their retirement income.
     */
    double resolveTargetPortfolio(User user) {
        Double retirementIncome = user.getRetirementIncome();
        if (retirementIncome != null && retirementIncome > 0) {
            return retirementIncome / SAFE_WITHDRAWAL_RATE;
        }
        return DEFAULT_TARGET_PORTFOLIO;
    }
```

Widen `calculateFreedomYear` visibility (line ~721) from:

```java
    private int calculateFreedomYear(BigDecimal currentEquity, BigDecimal monthlyContribution,
                                      BigDecimal targetPortfolio) {
```

to (package-private for the parity test; no behavior change):

```java
    int calculateFreedomYear(BigDecimal currentEquity, BigDecimal monthlyContribution,
                             BigDecimal targetPortfolio) {
```

The downstream `new BigDecimal(targetPortfolio)` call sites (lines ~286, 294, 301, 316, 317) compile unchanged — `BigDecimal` has a `double` constructor.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./gradlew test --tests com.investingapp.backend.service.MonthlyFreedomUpdateServiceTest`
Expected: `BUILD SUCCESSFUL`, 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/investingapp/backend/service/MonthlyFreedomUpdateService.java backend/src/test/java/com/investingapp/backend/service/MonthlyFreedomUpdateServiceTest.java
git commit -m "feat: MFU freedom target unified on live retirementIncome x 25"
```

---

### Task 3: Frontend — FreedomStatsService reads the real schedule

**Files:**
- Modify: `frontend/src/app/services/freedom-stats.service.ts`
- Test: `frontend/src/app/services/freedom-stats.service.spec.ts`

**Interfaces:**
- Consumes: `InvestmentFrequencyUtils.toMonthlyEquivalent(amount, frequency)` (Task 1); `authService.getCurrentInvestmentSchedule(): Observable<any>` (existing — GET `/investment-schedule/current`, emits `{ investmentAmount, frequency, ... }` or null).
- Produces: `readonly scheduleMonthly: WritableSignal<number | null>` on `FreedomStatsService` (`null` = not fetched yet, `0` = none/failed → survey fallback). `stats()` shape unchanged. Task 4 renders `stats()`.

- [ ] **Step 1: Extend the mock factory and write the failing tests**

In `freedom-stats.service.spec.ts`, replace the `makeAuthServiceMock` factory (lines 55–59):

```typescript
function makeAuthServiceMock(progress = userProgressStub) {
  return {
    userProgress$: new BehaviorSubject(progress).asObservable()
  };
}
```

with (default schedule = $500 MONTHLY so every existing expectation is numerically unchanged — survey `monthlyInvestment` is also 500):

```typescript
const scheduleStub = { investmentAmount: 500, frequency: 'MONTHLY', isPaused: false };

function makeAuthServiceMock(
  progress = userProgressStub,
  scheduleObservable: Observable<any> = of(scheduleStub)
) {
  return {
    userProgress$: new BehaviorSubject(progress).asObservable(),
    getCurrentInvestmentSchedule: jasmine.createSpy('getCurrentInvestmentSchedule')
      .and.returnValue(scheduleObservable)
  };
}
```

Append a new describe block at the end of the top-level `describe` (before its closing `});`):

```typescript
  // =========================================================================
  // Unified contribution source (freedom date unification, 2026-07-07 spec)
  // =========================================================================

  describe('unified contribution source', () => {

    it('uses the actual schedule monthly-equivalent when a schedule exists', fakeAsync(() => {
      // weekly $100 → ×4.33 = $433/mo
      configureTestBed(makeAuthServiceMock(userProgressStub,
        of({ investmentAmount: 100, frequency: 'WEEKLY', isPaused: false })));
      const svc = getService();
      tick(0);

      expect(svc.scheduleMonthly()).toBe(433);
      expect(svc.isLoading()).toBeFalse();
    }));

    it('falls back to the survey monthlyInvestment when no schedule exists', fakeAsync(() => {
      configureTestBed(makeAuthServiceMock(userProgressStub, of(null)));
      const svc = getService();
      tick(0);

      expect(svc.scheduleMonthly()).toBe(0);
      // survey $500/mo · equity $50k · target $1.5M → 319.56 months → 27 years
      const expectedYear = String(new Date().getFullYear() + 27);
      expect(svc.stats().freedomYear).toBe(expectedYear);
    }));

    it('falls back to the survey value and resolves the gate when the schedule fetch errors', fakeAsync(() => {
      configureTestBed(makeAuthServiceMock(userProgressStub,
        throwError(() => new Error('schedule down'))));
      const svc = getService();
      tick(0);

      expect(svc.scheduleMonthly()).toBe(0);
      expect(svc.isLoading()).toBeFalse();
      expect(svc.stats().freedomYear).not.toBe('—');
    }));

    it('cross-stack parity fixture: $10k equity, $500/mo schedule, $60k income → currentYear + 32', fakeAsync(() => {
      // PARITY: mirrored in MonthlyFreedomUpdateServiceTest.parityFixtureFreedomYear
      // (backend). If you change one, change both.
      configureTestBed(
        makeAuthServiceMock(userProgressStub, of({ investmentAmount: 500, frequency: 'MONTHLY', isPaused: false })),
        makePortfolioServiceMock(10000)
      );
      const svc = getService();
      tick(0);

      expect(svc.stats().freedomYear).toBe(String(new Date().getFullYear() + 32));
    }));
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail and old ones still pass**

Run: `cd frontend && ng test --include='**/freedom-stats.service.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: the 4 new tests FAIL (`svc.scheduleMonthly is not a function`); all pre-existing tests PASS (factory addition is inert until the service calls it).

- [ ] **Step 3: Implement**

In `freedom-stats.service.ts`:

3a. Add the import:

```typescript
import { InvestmentFrequencyUtils } from '../utils/investment-frequency.utils';
```

3b. Update the file header comment: change "owns the three data fetches (userProgress, portfolio equity, KYC birth-year)" to "owns the four data fetches (userProgress, portfolio equity, KYC birth-year, investment schedule)".

3c. Add the signal below `birthYear` (line ~70):

```typescript
  /**
   * Monthly-equivalent of the user's ACTUAL investment schedule.
   * `null` = not yet fetched; `0` = no schedule / fetch failed (survey fallback).
   */
  readonly scheduleMonthly: WritableSignal<number | null> = signal(null);
```

3d. Extend the loading gate (in the constructor):

```typescript
    this.isLoading = computed(() => {
      const notReady = this.equity() === null || this.birthYear() === null || this.scheduleMonthly() === null;
      const hasSnap = this._snapshot() !== null;
      return notReady && !hasSnap;
    });
```

3e. In the `stats` computed, read the signal and gate on it. Replace:

```typescript
      const progress = this.userProgress();
      const equity = this.equity();
      const birthYear = this.birthYear();
      const snapshot = this._snapshot();

      // Still waiting for fetches — return snapshot values if we have them.
      if (equity === null || birthYear === null) {
```

with:

```typescript
      const progress = this.userProgress();
      const equity = this.equity();
      const birthYear = this.birthYear();
      const scheduleMonthly = this.scheduleMonthly();
      const snapshot = this._snapshot();

      // Still waiting for fetches — return snapshot values if we have them.
      if (equity === null || birthYear === null || scheduleMonthly === null) {
```

3f. Replace the contribution/target block:

```typescript
      const retirementIncomeAnnual: number | null = progress?.retirementIncome ?? null;
      const monthlyContribution: number | null = progress?.monthlyInvestment ?? null;

      // FI target — income-based 4% rule, $1.5M default.
      // NOTE: intentionally kept SEPARATE from the Monthly Freedom Update (MFU),
      // which uses a contribution-based target (monthlyInvestment × 300). tab3 and
      // the MFU diverge here by design — do not converge them.
      const targetPortfolio: number =
        (retirementIncomeAnnual != null && retirementIncomeAnnual > 0)
          ? retirementIncomeAnnual / this.SAFE_WITHDRAWAL_RATE
          : this.DEFAULT_TARGET;

      const currentEquity = equity ?? 0;
      const hasLiveInputs =
        currentEquity > 0 ||
        (monthlyContribution != null && monthlyContribution > 0);
```

with:

```typescript
      const retirementIncomeAnnual: number | null = progress?.retirementIncome ?? null;

      // Contribution — the ACTUAL investment schedule (monthly equivalent),
      // falling back to the survey intent when no schedule exists yet.
      // Mirrors the MFU, which reads the latest schedule (even when paused).
      const surveyMonthly: number = progress?.monthlyInvestment ?? 0;
      const monthlyContribution: number = scheduleMonthly > 0 ? scheduleMonthly : surveyMonthly;

      // FI target — income-based 4% rule, $1.5M default.
      // UNIFIED with the Monthly Freedom Update by design: both sides compute
      // retirementIncome / 0.04 live (see MonthlyFreedomUpdateService
      // .resolveTargetPortfolio). Keep the two implementations in lockstep.
      const targetPortfolio: number =
        (retirementIncomeAnnual != null && retirementIncomeAnnual > 0)
          ? retirementIncomeAnnual / this.SAFE_WITHDRAWAL_RATE
          : this.DEFAULT_TARGET;

      const currentEquity = equity ?? 0;
      const hasLiveInputs = currentEquity > 0 || monthlyContribution > 0;
```

3g. Simplify the projection call (monthlyContribution is now always a number). Replace:

```typescript
        resolvedFreedomYear = this._calculateFreedomYearClientSide(
          currentEquity,
          monthlyContribution ?? 0,
          targetPortfolio
        );
```

with:

```typescript
        resolvedFreedomYear = this._calculateFreedomYearClientSide(
          currentEquity,
          monthlyContribution,
          targetPortfolio
        );
```

3h. Add the fetch (below `_fetchBirthYear`), and wire it into the constructor's initial fetches and `refresh()`:

```typescript
  private _fetchSchedule(): void {
    this.authService.getCurrentInvestmentSchedule()
      .subscribe({
        next: (schedule: any) => {
          const amount = Number(schedule?.investmentAmount) || 0;
          this.scheduleMonthly.set(
            InvestmentFrequencyUtils.toMonthlyEquivalent(amount, schedule?.frequency)
          );
        },
        error: () => {
          // No schedule reachable — survey fallback; gate must never hang.
          this.scheduleMonthly.set(0);
        }
      });
  }
```

Constructor (after `this._fetchBirthYear();`):

```typescript
    this._fetchEquity();
    this._fetchBirthYear();
    this._fetchSchedule();
```

`refresh()`:

```typescript
  refresh(): void {
    this._fetchEquity();
    this._fetchBirthYear();
    this._fetchSchedule();
  }
```

- [ ] **Step 4: Run tests to verify everything passes**

Run: `cd frontend && ng test --include='**/freedom-stats.service.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: all tests pass, including the pre-existing "does not read currentFreedomEstimate (MFU value)" test — unmodified (AC-7).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/services/freedom-stats.service.ts frontend/src/app/services/freedom-stats.service.spec.ts
git commit -m "feat: tab3 freedom date uses actual schedule contribution (unified with MFU)"
```

---

### Task 4: my-profile — live freedom year + shared conversion

**Files:**
- Modify: `frontend/src/app/pages/my-profile/my-profile.page.ts`
- Test: `frontend/src/app/pages/my-profile/my-profile.page.spec.ts` (full rewrite — the current 17-line CLI stub instantiates the component with zero providers for its 9 injected services and cannot run)

**Interfaces:**
- Consumes: `FreedomStatsService.stats(): { freedomYear: string; freedomAge: string; dollarsAway: string }` (Task 3); `InvestmentFrequencyUtils.toMonthlyEquivalent` (Task 1).
- Produces: `get freedomYear(): number | null` on `MyProfilePage` (replaces the property — template bindings `freedomYear` / `yearsToFreedom` keep working unchanged). Constructor gains a 10th param: `public freedomStats: FreedomStatsService`.

- [ ] **Step 1: Write the failing test (full spec rewrite)**

Replace the entire contents of `frontend/src/app/pages/my-profile/my-profile.page.spec.ts`:

```typescript
/**
 * my-profile.page.spec.ts
 *
 * Direct-construction unit tests (no TestBed): the page injects 9+ services,
 * and only the freedom-timeline derivation is under test here. The previous
 * CLI-generated stub had no providers and could not run.
 *
 * Freedom year source: FreedomStatsService.stats() — the same live signal
 * tab3 renders (freedom date unification, 2026-07-07 spec).
 */
import { of } from 'rxjs';
import { MyProfilePage } from './my-profile.page';

function makePage(freedomYearStat: string): MyProfilePage {
  const accountStatusMock = { actionRequired$: of(false) } as any;
  const freedomStatsMock = {
    stats: () => ({ freedomYear: freedomYearStat, freedomAge: '—', dollarsAway: '—' })
  } as any;

  return new MyProfilePage(
    {} as any,            // AuthService
    {} as any,            // SettingsService
    {} as any,            // ToastService
    {} as any,            // PortfolioService
    accountStatusMock,    // AccountStatusService
    {} as any,            // MonthlyFreedomUpdateService
    {} as any,            // Router
    {} as any,            // AlertController
    {} as any,            // NavController
    freedomStatsMock      // FreedomStatsService
  );
}

describe('MyProfilePage — freedom timeline', () => {

  it('derives the numeric freedom year from the live FreedomStatsService signal', () => {
    const page = makePage('2058');
    expect(page.freedomYear).toBe(2058);
  });

  it('computes yearsToFreedom from the live year', () => {
    const page = makePage('2058');
    expect(page.yearsToFreedom).toBe(2058 - new Date().getFullYear());
  });

  it('returns null (placeholder branch) while stats show the loading dash', () => {
    const page = makePage('—');
    expect(page.freedomYear).toBeNull();
    expect(page.yearsToFreedom).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && ng test --include='**/my-profile.page.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: FAIL — constructor takes 9 args (no `freedomStats`), and `freedomYear` is a plain property returning `null`.

- [ ] **Step 3: Implement**

In `my-profile.page.ts`:

3a. Add imports:

```typescript
import { FreedomStatsService } from '../../services/freedom-stats.service';
import { InvestmentFrequencyUtils } from '../../utils/investment-frequency.utils';
```

3b. Delete the property (line ~79–80):

```typescript
  // Freedom Timeline
  freedomYear: number | null = null;
```

and add a getter next to `yearsToFreedom` (line ~107):

```typescript
  // Freedom Timeline — live unified value (same signal tab3 renders).
  get freedomYear(): number | null {
    const year = parseInt(this.freedomStats.stats().freedomYear, 10);
    return isNaN(year) ? null : year;
  }
```

(`yearsToFreedom` at line 107–110 keeps working unchanged on top of the getter.)

3c. Append the service to the constructor (after `private navCtrl: NavController`):

```typescript
    private navCtrl: NavController,
    public freedomStats: FreedomStatsService
```

3d. Delete the stale assignment inside the `userProgress$` subscription (lines ~190–193):

```typescript
        // Freedom Timeline
        if (progress.currentFreedomEstimate) {
          this.freedomYear = progress.currentFreedomEstimate;
        }
```

3e. Replace the inline factors in `calculateCurrentScheduleYears` (lines ~397–408):

```typescript
    if (this.currentScheduledInvestment > 0) {
      // Re-approximating for dynamic update. 
      let monthly = this.currentScheduledInvestment;
      
      // Use stored frequency code instead of parsing UI text
      if (this.currentFrequency === 'weekly') monthly *= 4.33;
      else if (this.currentFrequency === 'biweekly') monthly *= 2.16;
      else if (this.currentFrequency === 'semi_monthly' || this.currentFrequency === 'semimonthly') monthly *= 2;
      
      this.currentMonthlyEquivalent = monthly;
```

with:

```typescript
    if (this.currentScheduledInvestment > 0) {
      // Shared conversion — same factors as the backend MFU projection
      // (fixes the old inline biweekly 2.16 vs backend 2.17 drift).
      const monthly = InvestmentFrequencyUtils.toMonthlyEquivalent(
        this.currentScheduledInvestment, this.currentFrequency);

      this.currentMonthlyEquivalent = monthly;
```

(the two `monthly` usages below — `calculateYears(monthly)` and `calculateYearsWithPV(monthly, ...)` — are unchanged).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && ng test --include='**/my-profile.page.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: `TOTAL: 3 SUCCESS`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/my-profile/my-profile.page.ts frontend/src/app/pages/my-profile/my-profile.page.spec.ts
git commit -m "feat: my-profile freedom timeline reads live unified value"
```

---

### Task 5: Cleanup — delete the inert 300× computation

**Files:**
- Modify: `frontend/src/app/components/investment-schedule/investment-schedule.component.ts` (interfaces ~lines 21–38, properties ~lines 52–56, `setFinancialData` ~lines 199–231)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing — pure deletion. Verified before this plan: the create payload (`goToStockPreferences`, line ~556) sends only `{ investmentAmount, frequency, startDate }`; `targetPortfolio`/`timeToFI` are never sent, never rendered (no matches in the component HTML), only console-logged.

- [ ] **Step 1: Re-verify the fields are inert (guard against drift since planning)**

Run: `grep -n "targetPortfolio\|timeToFI" frontend/src/app/components/investment-schedule/investment-schedule.component.ts frontend/src/app/components/investment-schedule/investment-schedule.component.html`
Expected: matches ONLY in the two interface declarations, the two property declarations, and inside `setFinancialData` (computation + console.log). If any OTHER usage appears, STOP and report instead of deleting.

- [ ] **Step 2: Delete**

2a. In `CreateInvestmentScheduleRequest`, remove the two optional fields:

```typescript
  targetPortfolio?: number;
  timeToFI?: number;
```

2b. In `InvestmentScheduleResponse`, remove the same two optional fields.

2c. Remove the two properties (keep `monthlyGoal`):

```typescript
  targetPortfolio: number = 0;
  timeToFI: number = 0;
```

2d. Replace `setFinancialData` (lines ~199–231) with:

```typescript
  private setFinancialData(progress: any): void {
    console.log('[InvestmentScheduleComponent] setFinancialData — monthlyInvestment:', progress?.monthlyInvestment);

    if (progress && progress.monthlyInvestment) {
      this.monthlyGoal = progress.monthlyInvestment;
      console.log('[InvestmentScheduleComponent] ✅ Loaded user monthly investment amount:', this.monthlyGoal);
    } else {
      console.log('[InvestmentScheduleComponent] ⚠️ No monthlyInvestment found in progress data.');
      this.monthlyGoal = 0;
    }

    this.calculateRecommendedAmount();
  }
```

(The deleted block was the contribution-based `annualInvestment * 25` target and hardcoded `timeToFI = 25` — the "300×" formula that motivated this whole story. It fed nothing but logs.)

- [ ] **Step 3: Verify no dangling references and the app still compiles (AOT gate)**

Run: `grep -n "targetPortfolio\|timeToFI" frontend/src/app/components/investment-schedule/investment-schedule.component.ts`
Expected: no matches.

Run: `cd frontend && npx ng build --configuration dev`
Expected: build completes with no errors (this also AOT-checks Tasks 3 and 4).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/components/investment-schedule/investment-schedule.component.ts
git commit -m "chore: remove inert contribution-based target computation (300x)"
```

---

### Task 6: Verification — manifest, full selective test sweep, on-device AC-6

**Files:**
- Create: `ITPM/agent-memory/manifest-freedom-unification.md`

**Interfaces:**
- Consumes: all prior tasks' tests and the spec's acceptance criteria (§5).
- Produces: the Acceptance Check Manifest with per-AC status + evidence, per CONTEXT.md's evidence gate. AC-6 is the only check needing a running app.

- [ ] **Step 1: Write the manifest**

Create `ITPM/agent-memory/manifest-freedom-unification.md`:

```markdown
# Acceptance Check Manifest — Freedom Date Unification
Spec: docs/superpowers/specs/2026-07-07-freedom-date-unification-design.md

## AC-1: MFU target is live income-based; stored targetPortfolio ignored; $1.5M default
- Type:     backend-unit
- Check:    cd backend && ./gradlew test --tests com.investingapp.backend.service.MonthlyFreedomUpdateServiceTest
- Evidence: targetIsLiveIncomeBasedAndIgnoresStoredTargetPortfolio, targetDefaultsWhenIncomeAbsent, targetDefaultsWhenIncomeZero — green
- Status:   pending

## AC-2: Backend parity fixture ($10k / $500 / $1.5M → currentYear + 32)
- Type:     backend-unit
- Check:    same gradle command as AC-1
- Evidence: parityFixtureFreedomYear — green
- Status:   pending

## AC-3: FreedomStatsService prefers schedule monthly-equivalent, survey fallback, gate never hangs
- Type:     frontend-unit
- Check:    cd frontend && ng test --include='**/freedom-stats.service.spec.ts' --watch=false --browsers=ChromeHeadless
- Evidence: 'unified contribution source' describe block — schedule/fallback/error tests green
- Status:   pending

## AC-4: Frontend parity fixture matches AC-2's year
- Type:     frontend-unit
- Check:    same ng test command as AC-3
- Evidence: 'cross-stack parity fixture' test — green
- Status:   pending

## AC-5: my-profile derives freedom year from FreedomStatsService (dash → placeholder)
- Type:     frontend-unit
- Check:    cd frontend && ng test --include='**/my-profile.page.spec.ts' --watch=false --browsers=ChromeHeadless
- Evidence: 'MyProfilePage — freedom timeline' — 3 tests green
- Status:   pending

## AC-6: On the dev account, tab3 strip, MFU sheet (reopen), and my-profile show the same freedom year
- Type:     ui-acceptance
- Check:    servlocal + backend bootRun (local profile); log in as facebook@gmail.com
            (uncomment simulateUserLogin in app.component.ts ~line 130 OR use ?devPage=).
            Visit tab3 → note freedom year; open MFU via reopen from FRED tab; open my-profile.
- Evidence: screenshots of all three surfaces showing the identical year
- Status:   pending

## AC-7: Existing 'does not read currentFreedomEstimate' spec passes unmodified
- Type:     frontend-unit
- Check:    same ng test command as AC-3
- Evidence: pre-existing test green with zero diff to its assertions
- Status:   pending
```

- [ ] **Step 2: Run the full selective sweep and flip statuses**

Run each Check command from the manifest (AC-1 through AC-5, AC-7). All must pass. Flip each `Status: pending` → `pass` with the actual evidence line (test counts).

- [ ] **Step 3: AC-6 on-device check**

Requires the local stack (`servlocal` + `./gradlew bootRun` with `SPRING_PROFILES_ACTIVE=local`). If running in a sandbox without the stack, leave AC-6 `pending` and flag it for Andy/verifier-agent with browser tools. IMPORTANT: `app.component.ts` is an in-flight FRED-209 file — if the simulateUserLogin uncomment is needed, revert it before finishing and do NOT commit it.

- [ ] **Step 4: Commit the manifest**

```bash
git add ITPM/agent-memory/manifest-freedom-unification.md
git commit -m "chore: acceptance manifest for freedom date unification"
```

---

## Post-implementation notes (orchestrator, not tasks)

- Dispatch **verifier-agent** with the diff + `ITPM/agent-memory/manifest-freedom-unification.md` (CONTEXT.md bounded fix-loop; AC-6 is the check that benefits from its browser tools).
- Backlog follow-up candidates from spec §7 (confirm with Andy before adding): paused-schedule semantics; registration `targetPortfolio` plumbing removal; `previousFreedomEstimate` future use.
- Update the stale agent memory `project_freedom_estimate_split.md` — the tab3-vs-MFU split is now deliberately converged.
