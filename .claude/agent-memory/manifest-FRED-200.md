# Acceptance Check Manifest — FRED-200: Always-loaded tab3 stat strip via signals service

## AC-1: New `freedom-stats.service.ts` owns the three fetches + freedom-date/age/dollars-away math, preserved exactly
- Type:     frontend-unit
- Check:    `freedom-stats.service.ts` exists at `frontend/src/app/services/` with `@Injectable({ providedIn: 'root' })`. A spec verifies the math against fixed inputs: target = `retirementIncome / 0.04` ($1.5M default when income absent), `freedomAge = freedomYear − birthYear`, `dollarsAway = max(0, target − equity)`. Computed stats equal the values tab3 produced before for the same inputs.
- Evidence:
- Status:   pending

## AC-2: Signals are the reactive primitive; old loadStatStrip orchestration removed; comment notes first signals usage
- Type:     frontend-unit
- Check:    Service uses `toSignal(authService.userProgress$)` from `@angular/core/rxjs-interop`, writable signals for equity + birth-year set via `.set()`, and a `computed()` for stats + a loading signal. tab3 renders from the signal. `loadStatStrip()`, `progressDone/portfolioDone/kycDone` flags, `tryRender()`, and the strip's manual `subscribe`/`takeUntil` are gone from `tab3.page.ts` (grep returns nothing). A code comment marks the first/approved-deviation signals usage.
- Evidence:
- Status:   pending

## AC-3: Always loaded across navigation — instant on re-entry, no dashes, no second cold round; silent background refresh
- Type:     ui-acceptance
- Check:    Singleton holds computed stats. Leave tab3 and return: last values render instantly (no `—`), no second cold three-fetch round that blanks the strip. Per Andrew's Q1 answer, re-entry triggers a SILENT stale-while-revalidate background refresh (cached shown instantly, quiet refetch, swap on fresh) — never a dash on re-entry.
- Evidence:
- Status:   pending

## AC-4: Auto-updates on My Profile change
- Type:     ui-acceptance
- Check:    After `my-profile.page.ts` `saveChanges()` succeeds, the stat strip reflects new monthly-investment / retirement-income values with no manual reload or tab3 recreation, driven by `loadUserProgress()` → `userProgress$` → `toSignal` bridge (plus explicit `refresh()` if needed).
- Evidence:
- Status:   pending

## AC-5: FRED-196 KYC resilience preserved
- Type:     frontend-unit
- Check:    KYC fetch keeps the bounded transient-only retry (TimeoutError / status 0 / status ≥ 500; never 401/403/404; bounded backoff). Freedom Age degrades honestly (loading vs unavailable vs genuine no-DOB). Freedom Date and To Go render independently of KYC outcome. No regression vs prior behavior.
- Evidence:
- Status:   pending

## AC-6: tab3-vs-MFU split intact
- Type:     frontend-unit
- Check:    Service computes tab3's income-based freedom year ONLY; it does not read or converge the MFU's contribution-based projection. The two remain separate (grep confirms no MFU projection read in the service).
- Evidence:
- Status:   pending

## AC-7: Unhappy paths handled; liveEquity preserved
- Type:     ui-acceptance
- Check:    First load shows existing `—` placeholder via loading signal. Null/zero equity → To Go falls back via `max(0, …)`. Failed userProgress or portfolio fetch degrades gracefully (no crash, no eject, no raw error string). `liveEquity` still feeds the FRED-195 profile-avatar pig input.
- Evidence:
- Status:   pending

## AC-8: Instant on cold launch via user-scoped localStorage snapshot
- Type:     ui-acceptance
- Check:    After stats compute, service persists a user-scoped snapshot of displayed values (freedom year/age/dollars-away) to `localStorage`. On cold launch the strip hydrates from the snapshot and renders real numbers immediately (no `—`), then background-refresh replaces them. Snapshot keyed to / validated against current userId; cleared on logout in `clearJwtData()` BEFORE userId is removed (FRED-199 ordering lesson); missing/corrupt/foreign snapshot falls back to `—` loading state (no crash). Stores derived display values only — no tokens/new PII. No hard TTL (Andrew Q2): always hydrate then immediately background-refresh.
- Evidence:
- Status:   pending

## AC-9: No new debt; compiles clean; verified at 430×932
- Type:     frontend-unit
- Check:    Old `loadStatStrip()` machinery deleted (not commented); no orphaned imports or dead `destroy$` plumbing for the strip. `cd frontend && npx tsc --noEmit` exits 0; scoped build passes with no new TS/SCSS warnings. Strip verified at 430×932 — instant on cold launch from snapshot, instant on re-entry, updates after My Profile edit.
- Evidence:
- Status:   pending
