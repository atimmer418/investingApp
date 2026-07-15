# Optimal Drawdown Walkthrough (Piggy Pro) — Design

**Date:** 2026-07-15
**Status:** Approved by Andy (sections 1–3 approved in brainstorming session)
**Scope:** Frontend only. No backend changes.

## What we're building

An educational walkthrough of the tax-optimal drawdown sequence (taxable → tax-deferred →
Roth), gated behind the Pro tier, reached from a button at the end of every tab2 strategy
deck. Pro users see a new 2-slide deck personalized with their own account buckets; non-pro
users get the existing Piggy Pro upgrade nudge.

Compliance framing (from the attorney-scope blurb): content is education on a widely
accepted strategy. FRED does not advise on specific tax decisions, does not execute
withdrawals from non-FRED accounts, and recommends a qualified tax advisor before acting.
No Roth-conversion or bracket-specific guidance — that crosses into personalized tax
planning.

**Scope decisions made:**
- Entry point is the deck button only. Freedom-Date-window proactive surfacing is a
  separate future story.
- Slides show the user's own buckets (personalized), not static-only content.
- Approach A chosen: separate 2-slide drawdown deck modal; nudge presents over the open
  strategy deck for non-pro.

## Entry point & flow

The playbook slide (last slide, index 4) of every strategy deck gains a button between
"Stress-test this strategy" and "Done":

- Label: **"Discover the Optimal Drawdown"**, with a small `Pro` chip shown only to
  non-pro users (copy the `mc-lockchip` visual pattern from
  `retirement-planning.component.scss` into the deck SCSS).
- `StrategyDeckComponent` receives `userTier` via `componentProps`
  (precedent: `MonteCarloFlowComponent` receives `userTier`).

Tap behavior:

- **Pro** → deck dismisses with new role `'drawdown'` → `RetirementPlanningComponent`
  presents `DrawdownDeckComponent` as a fullscreen modal (`mc-fullscreen-modal` class,
  `buildFade` enter/leave, reduced-motion variant, `userId` componentProp) — same
  orchestration pattern as the existing `'stress-test'` role.
- **Non-pro** → the deck itself presents `McInfoSheetComponent` (mode `'nudge'`) *over*
  the deck (it renders at app root; deck already injects `ModalController`) with
  `targetTier: 'pro'` and drawdown-specific copy:
  - `nudgeTitle`: "Unlock the Optimal Drawdown"
  - `nudgeBody`: "See the tax-smart order for spending your taxable, 401(k), and Roth
    accounts in retirement — personalized to your portfolio, updating as it grows."
  - `nudgeCtaLabel`: "Upgrade to Pro" (the default)
  - "Maybe later" → sheet closes; user is still on the playbook slide.
  - "Upgrade to Pro" → deck also dismisses itself with role `'upgrade'`;
    `RetirementPlanningComponent` calls the existing `upgradeToPlusClicked()` stub
    (single wiring point for future IAP).

End of the drawdown deck: **"Stress-test with your outside accounts"** dismisses with role
`'stress-test'`; `RetirementPlanningComponent` switches to the simulator section AND sets
`includeOutsideAccts = true`. Plus a "Done" ghost button.

## DrawdownDeckComponent — content

New standalone component, same deck visual language as `StrategyDeckComponent`
(deck-host, top dots, eyebrow, horizontal scroll-snap, tap-to-advance) with 2 slides.

### Slide 1 — `OPTIMAL DRAWDOWN · 1 OF 2`

- H1: **"Spend in the right order."**
- Body: "In retirement, **which account you tap first** matters almost as much as how much
  you withdraw. The tax-smart sequence most planners start from: taxable first,
  tax-deferred second, Roth last."
- Three numbered step rows, each with the user's live balance as a small chip:
  1. **Taxable first** — "Your FRED account. Withdrawals here are taxed at capital-gains
     rates — often 0–15%, the lowest rates you'll ever pay — while your tax-advantaged
     accounts keep compounding untouched." → chip: FRED portfolio value
  2. **Tax-deferred second** — "Traditional 401(k) and IRA. Every dollar out is ordinary
     income, so spreading withdrawals across your middle retirement years keeps you in
     lower brackets — and softens the required withdrawals that start at 73."
     → chip: 401(k) balance
  3. **Roth last** — "Tax-free growth is the most valuable dollar you own. The longer it
     compounds untouched, the more you keep — and it's the cleanest account to pass on."
     → chip: Roth balance
- **"Your buckets today"** strip beneath: the three balances side by side. Empty state
  (no outside balances entered): "Add your 401(k) and Roth in the simulator to see your
  own mix."

### Slide 2 — `OPTIMAL DRAWDOWN · 2 OF 2`

- H1: **"Why the order matters."**
- Stat chip: **0%** — "the long-term capital-gains rate many retirees actually pay"
- Three why rows:
  - **Your early years are your cheapest** — "Before required withdrawals and Social
    Security kick in, your tax bracket is the lowest it may ever be. Taxable withdrawals
    fill those years at bargain rates."
  - **It defuses the tax bomb at 73** — "Draining tax-deferred accounts second shrinks the
    forced withdrawals (RMDs) that can spike your bracket later."
  - **Every extra Roth year is free growth** — "Growth the IRS never touches. Last-out
    means decades more tax-free compounding."
- Warn card (drawdown-specific): "Educational content, not tax advice. Everyone's tax
  picture is different — talk to a qualified tax advisor before acting on any withdrawal
  plan."
- CTAs: "Stress-test with your outside accounts" (primary) + "Done" (ghost).

## Data flow (all read-only, all existing sources)

- **Tier:** `RetirementPlanningComponent.currentTier` (from `userProgress$.selectedTier`)
  → `userTier` componentProp on the strategy deck.
- **Taxable balance:** `portfolioService.getPortfolioDashboard()` →
  `summary.portfolioValue` (already single-flight + TTL-cached).
- **401(k)/Roth:** `localStorage['fred.mcOutside.${userId}']` → `{ k401, roth }` — the
  key the MC flow already writes when balances are entered. No new persistence.

## Edge cases

- Outside balances never entered / zero → chips show the empty-state hint line; the
  sequence content stands alone.
- Dashboard fetch fails or null → FRED chip renders "—"; slides never block on data.
- Balances arrive after render → chips populate on response (skeleton dash until then;
  no spinner for a cache hit).
- Double-present guard on the drawdown modal (`deckLock` pattern).
- Reduced motion: 0-duration fades (existing `prefersReduced` pattern).
- Tap-to-advance bounds adjusted for a 2-slide deck.
- Non-pro "Upgrade to Pro" with stub IAP → nudge dismisses, nothing else happens (same
  as today's simulator gate).

## Testing (Acceptance Check Manifest)

- **frontend-unit:**
  - Drawdown component: bucket mapping from localStorage + dashboard, empty state,
    2-slide bounds.
  - Strategy deck: button emits correct dismiss role per tier (`'drawdown'` pro,
    `'upgrade'` after nudge CTA); Pro chip only for non-pro.
  - Retirement planning: role `'drawdown'` → pro opens drawdown deck / non-pro presents
    nudge; drawdown deck's `'stress-test'` role flips `includeOutsideAccts` and switches
    section.
- **ui-acceptance** (via `?devPage=`, screenshots): playbook slide with button (both
  tiers), nudge over deck, drawdown slides with real buckets, empty-state variant.
