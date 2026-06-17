# FRED-200 — Always-loaded tab3 stat strip via signals service

## Before (from backlog.md)
> The tab3 stat strip (Freedom date / Freedom age / To go) re-fetches three separate calls on every cold load — `authService.getUserProgress()`, `portfolioService.getPortfolioDashboard()`, `alpacaService.getKycData()` — coordinated in `loadStatStrip()` (`tab3.page.ts` ~285–428). It shows `—` dashes until all three settle, caches nothing, and doesn't reflect a My Profile edit until the component is recreated (tab3 never subscribes to the `userProgress$` BehaviorSubject that My Profile's `saveChanges()` already updates via `loadUserProgress()`). Make the data always loaded (instant after first load) and auto-updating, via a dedicated reactive `FreedomStatsService` using Angular **signals** (`toSignal` + `computed`).

## After (structured ticket)

**Summary:** Extract the tab3 stat-strip data + freedom-date/age/dollars-away math out of `tab3.page.ts` into a new singleton `FreedomStatsService` that holds the result reactively with Angular signals, keeps it warm across tab navigation (no more cold three-call reload + `—` dashes on every visit), and re-derives automatically when an input changes (e.g. a My Profile edit). It also persists a user-scoped `localStorage` snapshot so the strip is instant on a cold app launch (background refresh then corrects it). First signals usage in the app — an intentional, approved pilot in a well-bounded service.

**Files / systems involved**
- **New:** `frontend/src/app/services/freedom-stats.service.ts` — `@Injectable({ providedIn: 'root' })`. Owns the three fetches + the derived calc; exposes the stats as signals + a `refresh()`.
- `frontend/src/app/tab3/tab3.page.ts` — remove the `loadStatStrip()` orchestration (`progressDone/portfolioDone/kycDone` flags, `tryRender()`, the three manual `subscribe` + `takeUntil` blocks, ~L285–428); inject `FreedomStatsService` and read its signal. Keep feeding `liveEquity` (profile-avatar pig input).
- `frontend/src/app/tab3/tab3.page.html` — bind the three tiles (~L21–35) to the service signal; `statStripLoading` becomes the service's loading signal.
- `frontend/src/app/pages/my-profile/my-profile.page.ts` — `saveChanges()` (~L468–495) already calls `authService.loadUserProgress()`; ensure the strip reflects the change (via the `toSignal(userProgress$)` bridge and/or an explicit `freedomStatsService.refresh()`).
- **Consumed (unchanged):** `auth.service.ts` (`userProgress$`, `getUserProgress()`, `loadUserProgress()`), `portfolio.service.ts` (`getPortfolioDashboard()`), `alpaca.service.ts` (`getKycData()`).
- **New imports:** `signal`, `computed` from `@angular/core`; `toSignal` from `@angular/core/rxjs-interop`.

**Doc references**
- `./FREDdocs/PROGRESS_TRACKING_SYSTEM.md` — userProgress (retirementIncome, monthlyInvestment) feeding Freedom Date.
- `./FREDdocs/API_ENDPOINTS.md` — `/user/progress`, `/portfolio/dashboard`, `/alpaca/account/kyc`.
- `./FREDdocs/FRED_UI_STYLE_GUIDE.md` — stat-strip visual + the `—` placeholder.
- `.claude/CONTEXT.md` §Frontend → Services — documents the **BehaviorSubject** state convention; this story deliberately deviates (signals). Flag so the verifier doesn't treat the new primitive as a defect.
- **Related:** FRED-196 (KYC resilience — must be preserved); memory `project_freedom_estimate_split` (tab3 freedom date is **income-based**, separate from the MFU **contribution-based** projection — keep separate).

**Edge cases / open questions**
- **Equity/KYC refresh trigger:** `userProgress` reactivity is the must-have for this story. Where to call `refresh()` for equity changes (after a deposit / one-time investment) — explicit call vs refresh-on-tab-enter — can be the lighter path here; a deeper deposit-driven refresh can be a follow-up.
- **Cold-launch persistence (folded in from Option 3):** now **in scope** (AC 8) — persist a user-scoped `localStorage` snapshot and hydrate from it on cold launch. Decisions baked in: snapshot is keyed to the current user and cleared on logout (no cross-user leak); a missing/corrupt/foreign snapshot falls back to the `—` loading state; stores derived display values only.
- **First-call dependency:** the `toSignal(userProgress$)` bridge assumes `loadUserProgress()` has run at least once (it does during app init). Confirm the strip still populates on a fresh tab3 mount.
- **`destroy$`/`takeUntil`:** once the strip reads a signal, its manual subscriptions go away; confirm nothing else in tab3 still depends on the removed plumbing.

**Time estimate:** `3hr+` (new service + first-time signals adoption + persisted snapshot with user-scoping/clear-on-logout + preserving FRED-196 resilience). **Label:** `[code]`

---

## Acceptance Criteria

1. **New service owns the data + math.** `frontend/src/app/services/freedom-stats.service.ts` (`@Injectable({ providedIn: 'root' })`) owns the three fetches and the freedom-date / freedom-age / dollars-away calculation currently inlined in `tab3.page.ts` `loadStatStrip()`. The math is preserved exactly: 4% safe-withdrawal target (`retirementIncome / 0.04`, $1.5M default), the existing client-side freedom-year projection, `freedomAge = freedomYear − birthYear`, `dollarsAway = max(0, target − equity)` — same displayed numbers as today for the same inputs.
2. **Signals are the reactive primitive.** The service exposes the stats via signals — `authService.userProgress$` bridged with `toSignal` (`@angular/core/rxjs-interop`), portfolio equity + KYC birth-year stored in writable signals via `.set()`, and a `computed()` that produces `{ freedomYear, freedomAge, dollarsAway }` plus a loading signal. tab3 renders from the signal in its template; the old `loadStatStrip()` orchestration and its manual `subscribe`/`takeUntil` for the strip are removed. A short code comment notes this is the app's first signals usage and an intentional, approved deviation from the documented BehaviorSubject convention (CONTEXT.md §Services).
3. **Always loaded across navigation.** Because the service is a singleton holding the computed stats, leaving tab3 and returning shows the last values **instantly** — no `—` dashes and no second cold round of three fetches on re-entry. (First load of the session still fetches once.)
4. **Auto-updates on My Profile change.** After `my-profile.page.ts` `saveChanges()` succeeds, the stat strip reflects the new monthly-investment / retirement-income values **without** a manual reload or tab3 component recreation — driven by `loadUserProgress()` → `userProgress$` → the `toSignal` bridge (and/or an explicit `freedomStatsService.refresh()`).
5. **FRED-196 resilience preserved.** The KYC fetch keeps the bounded, transient-only retry (TimeoutError / status 0 / status ≥ 500, never 401/403/404; bounded backoff) and Freedom Age still degrades honestly (loading vs unavailable vs genuine no-DOB), exactly as FRED-196 shipped. Freedom Date and To Go render independently of the KYC outcome. No regression to that behavior.
6. **tab3-vs-MFU split intact.** The service computes tab3's **income-based** freedom year only; it does not read or converge with the MFU's contribution-based projection. The two remain intentionally separate.
7. **Unhappy path (CONTEXT.md).** First-load shows the existing `—` placeholder via the loading signal; null/zero equity → To Go falls back via `max(0, …)`; a failed userProgress or portfolio fetch degrades gracefully (no crash, no user eject, no raw error string). `liveEquity` (profile-avatar pig input) continues to be fed.
8. **Instant on cold launch (persisted snapshot).** After the stats compute, the service persists a **user-scoped** snapshot of the displayed values (freedom year / age / dollars-away) to `localStorage`; on app cold launch the strip hydrates from it and renders real numbers immediately (no `—`), even before the network returns, then a background refresh replaces them once fresh data loads. The snapshot is keyed to / validated against the current user and cleared on logout (alongside the existing JWT/data clear), so a logged-out or switched user never sees another user's figures; a missing, corrupt, or foreign snapshot falls back to the normal `—` loading state (no crash). Stores derived display values only — no tokens or new PII beyond what the app already persists.
9. **No new debt; compiles clean.** Old `loadStatStrip()` machinery is deleted, not commented out; no orphaned imports or dead `destroy$` plumbing. `cd frontend && npx tsc --noEmit` exits 0 and the scoped build passes with no new TS/SCSS warnings. Stat strip verified visually at 430×932 — instant on cold launch from snapshot, instant on re-entry, and updates after a My Profile edit.
