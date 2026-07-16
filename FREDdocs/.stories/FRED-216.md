# FRED-216 — My Profile refactor: simplified plan, rebalancing, goals, TLH

## Before (backlog entry, verbatim)

> ## FRED-216 — My Profile refactor: simplified plan, rebalancing, goals, TLH
> Rebuild my-profile's content per the approved prototype (ITPM/agent-memory/FRED-216-prototype.html): keep + restyle the enlarged pig avatar hero, percentile pill, and referral card; simplify the Freedom Plan into two editable tiles + gradient year-bubble + one projection sentence + progress bar (absorbing the Freedom Timeline card); ADD Portfolio Rebalancing (schedule chips — Piggy locked to default w/ note, Plus+ selectable), Multi-Goal Tracking (Plus+: goals with target amount/date/outside-monthly, projection-only rows with on-track/late states, add-goal bottom sheet; Freedom Date row always first with FRED-invests badge), and a concise Tax Loss Harvesting card (non-Pro: "could save ~$X/yr" + "Want to save this money?" → Pro upgrade nudge; Pro: saved-to-date; Coming-soon pill). Piggy tapping the gated Goals section prompts a tab2-style upgrade sheet (to Plus); TLH's button prompts the Pro sheet. v1 persistence for rebalance choice + goals = per-user localStorage (projection-only features; backend wiring comes with the real engines). Existing behaviors preserved: photo change, referral flows, upgrade offers, action-required banner.

## After (structured ticket)

**One-line summary:** Rebuild my-profile.page content to the approved prototype with tier-gated Rebalancing/Goals/TLH sections, tab2-style upgrade nudge sheets on gated taps, simplified plan math rendered from the page's existing computed values, per-user localStorage persistence for the new preferences, and all existing flows (photo, referrals, offers, banner) preserved.

**Label:** `[code]` · **Time estimate:** `3hr+`

### Files / systems involved

- `frontend/src/app/pages/my-profile/my-profile.page.{html,ts,scss}` — the rebuild. Shell header (FRED-214) stays.
- `frontend/src/app/components/mc-info-sheet/*` — EXTEND with configurable copy inputs (title/body/cta label/target tier) so the same root-level sheet serves: tab2's existing nudge (unchanged defaults), the Goals→Plus nudge, and the TLH→Pro nudge. Existing consumers unchanged.
- New tiny goal-editor bottom sheet (ModalController, mc-bottom-sheet-modal pattern) for Add-a-goal.
- New `frontend/src/app/services/goals.service.ts` (or equivalent) — per-user localStorage CRUD for goals + rebalance schedule preference (versioned schema, corrupt-tolerant, per-user keyed) — same discipline as SimulationHistoryService.
- `frontend/scripts/subset-icons.mjs` — DYNAMIC_ICONS additions for TS-bound goal icons (home, health_and_safety, flag, …) + `npm run subset-icons`.
- **Visual spec:** `ITPM/agent-memory/FRED-216-prototype.html` (approved; copy/layout/gating verbatim incl. the two added nudge behaviors).

### Acceptance Criteria

1. **Identity hero.** Enlarged avatar (~104px, ring + shadow) with the camera badge wired to the EXISTING photo-change flow; userName + percentile pill (existing bindings); action-required banner preserved above.
2. **Freedom Plan simplified.** Two editable tiles bound to the existing `retirementIncomeGoal`/`monthlyInvestGoal` fields + handlers (persistence unchanged); gradient year-bubble + one projection sentence + progress bar + assumptions footnote — ALL VALUES from the page's existing computed properties (portfolioGoal, yearsToReach, currentPortfolioValue, freedom year/age from existing sources). No new math model; the old two-card sprawl (Freedom Plan + Freedom Timeline cards) is replaced by this single card. Edits live-update the projection as today.
3. **Referrals restyled, behavior identical.** Segments/count, code box + share, redeem flow incl. validation/disabled/success states, reward banner, and the referral upgrade-offers card all keep their exact logic — re-dressed in the family grammar (zone label, tiles, Manrope).
4. **Portfolio Rebalancing.** Explainer row + Quarterly/Semi-annual/Annual chips. Piggy: chips dimmed/locked, default-schedule note, PLUS lockchip on the zone label; tap → the Plus upgrade nudge sheet. Plus/Pro: selectable, choice persisted per-user (localStorage v1 — documented as UI preference until the rebalancing engine story), "Next rebalance" line derived from the chosen schedule.
5. **Goals (Plus+).** Freedom Date row always first (values from the plan; FRED-INVESTS badge). Added goals: name/icon, target amount, target year, outside-monthly; projection-only math per the prototype (months = target/monthly; projected date vs target → green on-track / amber projected-late; small progress bar); Add-a-goal bottom sheet (root-level modal) appends + persists per-user; goals editable/deletable (long-press or a detail affordance — builder picks the lightest per FRED patterns and documents). Compliance line verbatim: "FRED invests only toward your Freedom Date. Other goals are projections built from amounts you contribute outside FRED — FRED never holds or moves those funds."
6. **Piggy gating on Goals.** Frosted veil over the extra-goals area with the nudge copy; TAPPING anywhere on the veil (and the add-goal affordance) presents the tab2-style upgrade sheet targeting Piggy Plus (extended mc-info-sheet), whose CTA routes to the existing upgrade path.
7. **Tax Loss Harvesting (concise).** Zone label with Coming-soon pill (+ PRO lockchip when non-Pro). Non-Pro: "You could save ~$X/yr in taxes" where X is a documented heuristic from the user's portfolio value (builder documents formula; label clearly an estimate) + a "Want to save this money?" button presenting the Pro upgrade sheet. Pro: "Saved this year: $0.00"-style line sourced from a placeholder until the engine ships, framed with the coming-soon pill so $0 reads as not-yet-launched, sub "Rule-based harvesting on your portfolio's ETFs — VTI · VXUS · VBR". One card, nothing more.
8. **Nudge sheets.** Both prompts use the root-level ModalController sheet (never inline fixed divs), match tab2's nudge anatomy, and their CTAs invoke the existing upgrade flow (same handler family as tab2's upgradeToPlusClicked / the page's confirmTierUpgrade where appropriate). mc-info-sheet's existing tab2 usage renders byte-identically (defaults preserved).
9. **Tier reactivity.** All gating reads the existing tier source (userProgress.selectedTier) reactively — upgrading tiers updates the sections without reload.
10. **Quality gates.** `ng build --configuration dev` AOT-clean; lint clean; DYNAMIC_ICONS + subset run for TS-bound icons (no ligature text); keyboard avoidance works for the plan tiles + goal sheet inputs (page keeps its FRED-214 shell-content structure); headless screenshots per tier (piggy/plus/pro, top + scrolled) as fred216-*.png; localStorage schema versioned + corrupt-tolerant; prefers-reduced-motion respected on bars/veils; no TODOs or dead styles from the replaced cards.

### Edge cases

- Missing plan inputs (new user): tiles empty → projection placeholder like today's "complete your setup" state.
- Goal with monthly=0 → guarded (no divide-by-zero; prompt for a monthly amount).
- Goal target date in the past → renders as late, never crashes.
- Corrupt/old-schema goals in storage → discarded silently.
- Percentile null → pill hidden (as today).
- Referral offer card absent when no offers (as today).
- Very long goal names ellipsize.

### Open questions (non-blocking)

- Goal edit/delete affordance choice (row tap → sheet with delete vs swipe) — builder picks the lightest consistent option and documents it.
