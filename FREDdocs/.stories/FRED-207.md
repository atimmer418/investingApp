# FRED-207 — Refactor Monte Carlo simulator into fullscreen premium flow

## Before (backlog entry, verbatim)

> ## FRED-207 — Refactor Monte Carlo simulator into fullscreen premium flow
> Full refactor of the tab2 simulator section (everything from the "Monte Carlo Retirement Simulator" heading down inside ion-content; header/tab-switcher and Education tab untouched). Replace the card-based UI with a premium fintech simulation experience — new all-blue-gradient FRED sub-theme, screens fading smoothly one after the other.
> - Landing: big circular gradient play button (subtle idle pulse) centered; past 3 projections below (localStorage per-user, tap to re-run instantly, designed empty state); Conservative/Expected/Aggressive scenario chips (Pro); "Include outside accounts (401k/Roth IRA)" toggle (Plus+); "Market assumptions & methodology" link opening a bottom-sheet disclosure.
> - Fullscreen flow via ModalController (true takeover incl. tab bar and header), sequential screens with crossfades: Portfolio value (slider + tap-to-type + "Use my portfolio" fetch) → Outside accounts (Plus+, if toggled) → Monthly retirement spend → Years to last → Calculating ("Testing market N of 1,000" theater ~2s) → Results.
> - Results: NO giant headline % — the strategy showdown IS the result: all 5 withdrawal strategies each with own success % against the 1,000 simulated markets + holds/at-risk badge. Pro: on-the-fly monthly contribution + retirement age steppers (true two-phase sim — accumulate until retirement age using KYC birth year, then withdraw), monthly withdrawal estimate at 90% confidence, scenario flip control re-running instantly. Auto-save to history. Keep Share results (restyled). Done fades back to landing.
> - Tier gating (per Andy's edit): core = whole section blurred with lock overlay centered vertically + horizontally; Plus = full basic flow + results + showdown + outside accounts (401k/Roth IRA); Pro-only = scenario configs (conservative/expected/aggressive), on-the-fly adjusters, withdrawal estimate (visible-but-locked with upgrade nudge for Plus).
> - Drop: guide card, strategy dropdown, NTSX toggle, per-strategy config inputs, comparison chart/table, CSV export, print. Sims use current defaults under the hood.
> - Fulfills the Piggy Pro "Deeper projections & income simulation" plan copy. Related (not in scope): FRED-182 piggy bank visual states could layer onto the results verdicts later.

## After (structured ticket)

**One-line summary:** Replace the card-based Monte Carlo section in tab2 with a premium play-button landing + fullscreen blue-gradient modal flow (sequential inputs → calculating theater → strategy-showdown results), adding Pro-tier scenarios, outside accounts, two-phase contribution/retirement-age adjusters, and a 90%-confidence monthly withdrawal estimate.

**Label:** `[code]` · **Time estimate:** `3hr+`

### Files / systems involved

- `frontend/src/app/components/retirement-planning/retirement-planning.component.{html,ts,scss}` — simulator-section markup replaced by the landing state; ion-header/toolbar/tab-switcher and the Education section untouched.
- **New** `frontend/src/app/components/monte-carlo-flow/monte-carlo-flow.component.{ts,html,scss}` — standalone fullscreen modal component (presented via `ModalController`); internal step state machine (portfolio → outside-accounts → spend → duration → calculating → results) with CSS crossfade transitions; owns the blue-gradient sub-theme.
- `frontend/src/app/services/monte-carlo.service.ts` — extend: `ScenarioType` (`conservative | expected | aggressive`) assumption sets as named constants; two-phase simulation (monthly-contribution accumulation until retirement, then withdrawals, per path); inverse solver for sustainable monthly withdrawal at a target confidence.
- **New** `frontend/src/app/services/simulation-history.service.ts` — per-user localStorage history (versioned schema, max 3 entries).
- Reuses: `PortfolioService.getPortfolioDashboard()` (portfolio fetch), `AuthService.userProgress$` (tier, `monthlyInvestment`), KYC/freedom-stats birth-year derivation, `ToastService`, edu-sheet bottom-sheet pattern (assumptions disclosure), html2canvas + `@capacitor/share` (share).
- **Docs:** `FREDdocs/FRED_UI_STYLE_GUIDE.md` (Manrope, palette, force-light-mode, motion rules), `.claude/CONTEXT.md` (component/service conventions), `FREDdocs/PROGRESS_TRACKING_SYSTEM.md` (userProgress/tier fields).

### Acceptance Criteria

1. **Landing state.** Everything below the "Monte Carlo Retirement Simulator" heading in the simulator section is replaced by: a circular gradient orb button (≥96px, subtle idle pulse) bearing the filled Material Symbols `savings` piggy-bank icon, centered in the content area; the past-projections list below it; a Conservative/Expected/Aggressive scenario chip row (default Expected); an "Include outside accounts" toggle; and a "Market assumptions & methodology" link. The ion-header, toolbar, and simulator/education tab switcher are unchanged, and the Education section markup/behavior is untouched.
2. **Fullscreen takeover.** Tapping play presents a fullscreen modal via `ModalController` that covers the entire screen — tab bar, header, and safe areas included — themed with an all-blue gradient. Steps transition with smooth crossfades (opacity, ~300–400ms; no slide/pop). A close (X) affordance on every input step exits to the landing with no history entry; a guard prevents double-present on rapid taps.
3. **Portfolio step.** Large live dollar readout + slider (spanning at least $10k–$5M); tapping the readout allows exact numeric entry; a "Use my portfolio" chip fetches the live value via `PortfolioService.getPortfolioDashboard()` with a loading state — on failure it shows a calm toast and manual entry still works. Continue is disabled while the value is ≤ $0.
4. **Spend + duration steps.** Monthly retirement spend entered in dollars/month (annualized ×12 for the sim); duration is a years slider (10–70). Continue disabled on zero/invalid input. Last-used inputs prefill the next run.
5. **Calculating step.** The market counter eases 0→1,000 over **5.5 seconds** while four status lines rotate with a soft fade (~1.4s each: "Crashing the market on purpose…", "Testing a 1970s-style inflation decade…", "Compounding the good years…", "Checking every withdrawal strategy…"), then crossfades to results. History re-runs use a short ~1s pass with a single static "Re-testing your plan…" line instead of the rotation. Sim stays client-side and synchronous as today; dismissing mid-calc cancels cleanly (no orphaned timers, no history entry).
6. **Results — strategy showdown, no headline.** There is NO single giant success percentage. The results screen leads with the showdown: all 5 strategies (Traditional 4%, SBLOC, Annuity + Growth, Dynamic Guardrails, Full Annuity), each showing its own success % against the 1,000 simulated markets for the entered duration, with a badge — ≥90% "Strong", 75–89% "Moderate", <75% "At risk" — using FRED success/warning/danger colors on the gradient theme; rows animate in staggered. Strategy math uses today's defaults for the removed knobs (NTSX off; SBLOC 5.5% / 70% LTV; guardrails 4%/6%; annuity split from the existing essential-expenses recommendation logic with its default).
7. **Scenarios (Pro).** The three scenario chips set the run's market assumptions, defined as named constants in `MonteCarloService`: Expected = current values (stocks 10%/18%, bonds 4%/5%); Conservative = stocks 8%/20%, bonds 3.5%/5.5%; Aggressive = stocks 11.5%/16%, bonds 4.5%/4.5%; inflation 2.5% for all (exact numbers tunable at review). The results screen has a scenario flip control that re-simulates and updates the showdown in place in <1s without re-entering the flow or replaying the calculating theater.
8. **Outside accounts (Plus and Pro).** With the landing toggle on, an extra step collects 401(k) and Roth IRA balances, shows the running combined starting total, and adds them to the simulated starting portfolio. Entered balances are remembered per-user on device and prefilled next run.
9. **On-the-fly adjusters (Pro).** The results screen has steppers for monthly contribution (default `userProgress.monthlyInvestment`, else $0) and retirement timing — modeled internally as years-until-retirement (0–40) and displayed as "Retire at age N" when a birth year is derivable from KYC data, falling back to "Retire in N years" when not. Any change re-runs a true two-phase simulation (each of the 1,000 paths accumulates monthly contributions with market returns until retirement, then withdraws) and updates the showdown in place in <1s. At 0 years-until-retirement the results equal the plain withdrawal-only run.
10. **Monthly withdrawal estimate (Pro).** Results show "Supports ~$X/mo at 90% confidence" — inverse-solved (e.g. binary search on monthly spend, Traditional strategy, current scenario + adjuster inputs), rounded to the nearest $50, recomputed whenever scenario or adjusters change.
11. **History.** Reaching the results screen auto-saves a run (timestamp, all inputs incl. scenario/outside accounts/adjusters, per-strategy success rates) to per-user localStorage via `SimulationHistoryService` (versioned schema; only the 3 most recent kept). The landing shows up to 3 cards — relative date, key inputs, and "N of 5 strategies hold" (hold = ≥75%) — tap re-opens results directly with that run's inputs re-simulated. A designed empty state shows before any runs exist. Corrupt/old-schema entries are discarded silently, never crash.
12. **Tier gating.** Core: the entire simulator section renders blurred with the lock overlay centered both horizontally and vertically in the visible content area, with the upgrade CTA. Plus: full flow, showdown, share, history, AND the outside-accounts toggle/step all work; Pro-only affordances (scenario chips, results adjusters + withdrawal estimate) are visible with a lock affordance and show an upgrade nudge on tap instead of functioning. Pro: everything unlocked. Gating reads `userProgress.selectedTier` exactly like today.
13. **Removed + retained.** The guide card, strategy dropdown card, NTSX toggle, SBLOC/guardrail config inputs, comparison chart + table, CSV export, and print are removed from markup with their dead TS pruned (Chart.js comparison chart, `exportToCSV`, `printReport`). Share is retained on the results screen, restyled for the gradient theme, still html2canvas → Capacitor Share with the existing failure toast.
14. **Assumptions disclosure.** The landing link (and an info affordance on results) opens a bottom sheet listing the per-scenario return/vol assumptions, 2.5% inflation, the 1,000-scenario methodology, data-source line, and an "educational estimates, not guarantees" disclaimer.
15. **Quality gates.** Typography/colors/motion follow the style guide (Manrope everywhere, FRED palette + gradient sub-theme, force light mode). `ng build` passes AOT (plain or `--configuration dev` — NOT "development"); lint clean; new targeted unit specs for `MonteCarloService` (scenario sets, two-phase accumulation, inverse solver — deterministic via injected/mocked randomness) pass via `ng test --include`; no TODOs or dead code left behind.

### Edge cases

- Double-tap on play / rapid step taps — modal presents once; Continue debounced.
- Portfolio fetch for a user with no Alpaca account/holdings → toast + manual entry (never blocks the flow).
- Typed portfolio values beyond the slider max are allowed (slider pins, value wins); absurd inputs (0, negatives, NaN) blocked at each step.
- App backgrounded mid-flow → modal state survives resume; dismissal cancels timers cleanly.
- Full Annuity's deterministic 0%/100% rows render sensibly in the showdown.
- `prefers-reduced-motion`: pulse and crossfades degrade to instant transitions.
- History from an older schema version or corrupt JSON → discarded, empty state shown.

### Open questions (non-blocking, for mockup review)

- Exact gradient stops for the blue sub-theme (mockups will propose; derived from `#2563EB`).
- Scenario assumption numbers above are proposals — tune at review.
- Whether the landing keeps the current h2 heading text or restyles it into the new hero (mockups will show both).
- FRED-182 piggy-bank verdict art stays out of scope but the showdown badge slots are designed so it can layer in later.
