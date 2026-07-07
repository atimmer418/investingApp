# Freedom Date Unification — Design

- **Date:** 2026-07-07
- **Status:** Design approved by Andy; spec pending his review
- **Owner:** Andy + Claude

## 1. Problem

FRED shows a "freedom date" in three places, and they can disagree:

| Surface | Target | Contribution input | Computed |
|---|---|---|---|
| tab3 stat strip (`FreedomStatsService`) | live `retirementIncome / 0.04`, else $1.5M | survey `monthlyInvestment` | client-side, every view |
| Monthly Freedom Update (backend `MonthlyFreedomUpdateService`) | frozen `user.targetPortfolio` (snapshot from signup), then same fallbacks | actual investment schedule (monthly equivalent) | server-side, monthly |
| my-profile Freedom Timeline card | shows persisted `currentFreedomEstimate` (last MFU output) | — | stale between MFUs |

The projection math (10% assumed annual return, months-to-target annuity formula, ceil to years) is already byte-identical in both calculators. The divergence comes from **inputs**:

1. **Frozen target.** `user.targetPortfolio` is written once at passkey registration and never updated when the user later changes their retirement income. tab3 always computes the target live. (Accounts created under older signup flows can hold a contribution-based `monthlyInvestment × 300` value, making the mismatch dramatic.)
2. **Different contribution.** tab3 uses survey intent; MFU uses the real schedule.
3. **Stale display.** my-profile shows the MFU's persisted output, up to a month old.

Decision from 2026-07-06 discussion: unify on the income-based target (`retirementIncome × 25`, the 4% rule) — it is the only number that actually means "your portfolio can fund your life." The previous "intentionally split — do not converge" decision (guard comment in `freedom-stats.service.ts`, FRED-200 era) is explicitly reversed.

## 2. Locked decisions

1. **Target:** `retirementIncome × 25` everywhere (`retirementIncome` is stored annualized); `$1.5M` default when income is absent/zero. `user.targetPortfolio` is no longer read anywhere.
2. **Contribution:** the actual investment schedule everywhere (converted to a monthly equivalent), falling back to survey `monthlyInvestment` when no schedule exists yet. MFU already behaves this way; tab3 adopts it.
3. **my-profile:** Freedom Timeline card reads the live `FreedomStatsService` value (same signal as tab3). `currentFreedomEstimate` remains as MFU-persisted history only.
4. **Architecture:** keep two mirrored calculators (backend Java + frontend TS) fed identical inputs, with a cross-stack parity test fixture pinning them together. No new endpoint.
5. **No data migration.** `daysBoughtBack`, `freedomYearsChange`, and best-next-move recompute both comparison sides against the same in-request target, so persisted history is not corrupted by the target change. `currentFreedomEstimate` self-heals at the next MFU generation.

## 3. Design

### 3.1 Backend — MFU target (`MonthlyFreedomUpdateService.java`, generateUpdate ~lines 273–284)

Replace the target chain:

```java
// BEFORE: user.getTargetPortfolio() → retirementIncome/0.04 → 1_500_000
// AFTER:
Double retirementIncome = user.getRetirementIncome();
double targetPortfolio = (retirementIncome != null && retirementIncome > 0)
        ? retirementIncome / SAFE_WITHDRAWAL_RATE
        : DEFAULT_TARGET_PORTFOLIO;
```

New named constants on the service: `SAFE_WITHDRAWAL_RATE = 0.04`, `DEFAULT_TARGET_PORTFOLIO = 1_500_000.0` (names mirror `FreedomStatsService`). All downstream uses (projected freedom year, best-next-move, days bought back, quarterly compare) share the local variable, so no other backend logic changes.

`user.targetPortfolio` keeps being **written** at registration (`WebAuthnService.startRegistrationFlow`) — removing it would touch the passkey auth flow for zero user benefit. It becomes a write-only signup snapshot. No schema change (ddl-auto).

### 3.2 Frontend — `FreedomStatsService` contribution source

- New shared util `frontend/src/app/utils/investment-frequency.utils.ts`:
  `toMonthlyEquivalent(amount: number, frequency: string): number` with the backend's exact factors — WEEKLY ×4.33, BIWEEKLY ×2.17, SEMI_MONTHLY ×2, MONTHLY ×1, unknown → ×1 (mirrors `calculateMonthlyEquivalent`). Case-insensitive.
- `FreedomStatsService` adds a third fetch alongside equity/KYC: `authService.getCurrentInvestmentSchedule()` (`GET /investment-schedule/current`, returns `investmentAmount` + `frequency`). Result stored in a `scheduleMonthly: WritableSignal<number | null>` signal (`null` = not fetched, `0` = none/failed).
- Contribution used by the projection: `scheduleMonthly() > 0 ? scheduleMonthly() : (progress.monthlyInvestment ?? 0)`.
- Failure handling mirrors the existing equity fetch: on error set `0` (falls back to survey value); the loading gate must never hang on this fetch. `refresh()` refetches the schedule too.
- Loading gate: schedule participates like equity/birthYear (`null` = still loading) so first paint uses complete inputs; localStorage snapshot hydration is unchanged and still covers the wait.
- **Deliberate MFU mirror:** the latest schedule counts even when paused (backend uses `findTopByUserOrderByCreatedAtDesc` with no pause check). Changing pause semantics is a follow-up (§7), not part of this change.
- my-profile's `calculateCurrentScheduleYears()` switches its inline ×4.33/×2.17 math to the shared util (same factors, one source of truth on the frontend).

### 3.3 Frontend — my-profile Freedom Timeline card

`my-profile.page.ts` stops reading `progress.currentFreedomEstimate` (~lines 190–193). It injects `FreedomStatsService` and derives `freedomYear` (numeric) from `stats().freedomYear`, treating the `'—'` placeholder as null so the existing `noFreedomDate` template branch renders. `yearsToFreedom` keeps working off the numeric year. `currentFreedomEstimate` stays in the `UserProgress` DTO untouched (it is MFU history; nothing else displays it).

### 3.4 Cleanup

- `investment-schedule.component.ts` (~lines 215–228): delete the inert contribution-based computation (`annualInvestment * 25`, hardcoded `timeToFI = 25`) and the now-unused `targetPortfolio`/`timeToFI` component properties. Pre-condition (verify during implementation): confirm they are never sent in any request or template — current evidence says they only feed `console.log`. The optional `targetPortfolio`/`timeToFI` fields on `CreateInvestmentScheduleRequest`/`InvestmentScheduleResponse` interfaces are removed only if nothing populates or reads them.
- `freedom-stats.service.ts` guard comment (lines ~120–123): reword from "tab3 and the MFU diverge here by design — do not converge them" to state the target is now unified with the MFU by design (`retirementIncome × 25`, $1.5M default) and must be kept in lockstep with `MonthlyFreedomUpdateService`.
- The existing spec test "does not read currentFreedomEstimate (MFU value) when computing freedom year" **stays** — still correct: tab3 computes live rather than reading MFU output. Update only its explanatory comment if it references the intentional split.

## 4. Parity guard

One shared fixture, asserted on both stacks so formula drift breaks a test:

> equity $10,000 · contribution $500/month · retirementIncome $60,000 → target $1,500,000 → months-to-target ≈ 374.02 → ceil(374.02 / 12) = **32 years** → projected freedom year = current year + 32. Both tests assert `currentYear + 32` (deterministic — the +32 does not depend on when the test runs).

- Java: plain JUnit 5 test (no `@SpringBootTest`) on `MonthlyFreedomUpdateService` target selection + freedom-year math.
- TS: same numbers in `freedom-stats.service.spec.ts`.
- Both test files carry a comment naming the counterpart file.

## 5. Test plan (acceptance criteria)

- **AC-1** (backend-unit): with `retirementIncome = 60000`, MFU target = 1,500,000 regardless of `user.targetPortfolio` (set it to a junk 150,000 in the fixture); with income null or 0 → 1,500,000 default. JUnit evidence.
- **AC-2** (backend-unit): parity fixture year matches the hand-computed expected year. JUnit evidence.
- **AC-3** (frontend-unit): `FreedomStatsService` uses the schedule monthly-equivalent when a schedule exists (weekly $100 → $433.00/mo), and the survey `monthlyInvestment` when the schedule is absent or the fetch fails; the loading gate resolves in all cases. Spec evidence (`ng test --include`).
- **AC-4** (frontend-unit): parity fixture year matches AC-2's expected year. Spec evidence.
- **AC-5** (frontend-unit): my-profile derives `freedomYear` from `FreedomStatsService` and renders the `noFreedomDate` branch on `'—'`. Spec evidence.
- **AC-6** (ui-acceptance): on the dev account, tab3 strip, MFU sheet (reopen), and my-profile show the same freedom year. Screenshot evidence.
- **AC-7** (frontend-unit): existing "does not read currentFreedomEstimate" spec still passes unmodified (behavioral assertion unchanged).

## 6. Edge cases

- `retirementIncome` null/0 → $1.5M default (both sides, already-existing fallback paths).
- No schedule yet (mid-onboarding) → survey fallback; no survey either → contribution 0 → growth-only projection / 600-month cap (existing behavior).
- Schedule fetch error on tab3 → survey fallback, gate resolves, snapshot covers the interim.
- Equity 0 + contribution 0 → tab3 shows '—' (existing `hasLiveInputs` gate); MFU doesn't show at all (requires equity > 0).
- Paused schedule → still counted (deliberate mirror of current MFU behavior; see §7).

## 7. Out of scope / follow-ups (backlog candidates, not blocking)

1. **Paused-schedule semantics:** should a paused schedule contribute $0 to the projection on both sides? Needs a product call.
2. **Registration plumbing removal:** `targetPortfolio` through fi-plan-results → auth-finalize → `RegistrationStartRequest` → `User` could be deleted end-to-end later; touches the passkey flow, so it rides separately.
3. **`previousFreedomEstimate`:** written on a 12-month rotation, never read for display. Candidate for use in a future year-over-year MFU comparison, or removal.

## 8. Affected files

| File | Change |
|---|---|
| `backend/.../service/MonthlyFreedomUpdateService.java` | target chain → live income; two new constants |
| `backend/.../service/MonthlyFreedomUpdateServiceTest.java` (new) | AC-1, AC-2 |
| `frontend/src/app/utils/investment-frequency.utils.ts` (new) | shared monthly-equivalent conversion |
| `frontend/src/app/services/freedom-stats.service.ts` | schedule fetch + contribution source; comment reword |
| `frontend/src/app/services/freedom-stats.service.spec.ts` | AC-3, AC-4, AC-7 |
| `frontend/src/app/pages/my-profile/my-profile.page.ts` | live freedom year (§3.3); shared util in schedule-years calc |
| `frontend/src/app/pages/my-profile/my-profile.page.spec.ts` | AC-5 |
| `frontend/src/app/components/investment-schedule/investment-schedule.component.ts` | delete inert 300× computation |

Working-tree note: none of these files are among the FRED-209 in-flight modifications; no overlap with the withdrawal-strategy refactor.
