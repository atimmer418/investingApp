# FRED Product Vision

> Maintained by the ITPM routine. Updated after each approved run.

## Mission

FRED helps everyday people answer two questions:
1. How much can I invest per month?
2. How much monthly income do I want in retirement?

FRED calculates a target retirement portfolio using the 4% rule:

Target Portfolio = (Desired Monthly Retirement Income x 12) / 0.04

Using monthly contributions, 10% average annual return, compound growth, and DRIP assumptions, FRED projects how long it takes to reach that target.

FRED automates paycheck-based investing using Plaid and the user's pay schedule.

## Who FRED Is For

- People beginning their investing journey who don't know where to start
- People who want to retire sooner than the default 65
- People pursuing financial freedom — stopping the trade of time for money
- People who want a simple roadmap, not a Bloomberg terminal
- People who believe they can't afford to invest (and FRED proves them wrong)

## Product Philosophy

Boglehead-aligned: long-term index investing, low costs, diversification, staying the course through volatility.

FRED is NOT a trading app. FRED is NOT a budget app. FRED is a retirement acceleration engine.

The UX should feel like someone knowledgeable quietly handing you a clear plan — not a dashboard, not a gamification loop.

## Tier Structure

- Piggy Tier (free): Core investing, retirement projections, basic portfolio view, paycheck automation
- Pro Tier (paid): Advanced analytics, priority support, premium features

All Piggy Tier features must be fully implemented before launch. Production readiness = Piggy Tier complete.

## UI/UX Principles

1. Calm, minimal, premium — iOS-native done right, not generic SaaS
2. One job per screen — clarity first, never crowd a screen
3. Generous spacing — FRED doesn't cram; white space does the heavy lifting
4. FRED palette only — #2563EB primary, #0f172a text, #6b7280 gray, #f8fafc bg, #ffffff cards, #e5e7eb borders
5. Manrope everywhere — set it on every element Ionic touches
6. Light mode forced — color-scheme: light on every component. As of FRED-193 (2026-06-15) all `@media (prefers-color-scheme: dark)` blocks are removed app-wide; the `settings.service.ts` theme infra (`'light'|'dark'|'auto'`, `applyTheme()`, `body.dark` toggle) is kept inert for the future FRED-146 dark-mode epic. When removing/forcing a scheme, grep for surviving `.dark`/`body.dark` selectors too — not just the media query — since `applyTheme('auto')` could otherwise re-activate them.
7. Mobile-first at 390x844 — iPhone 14 baseline, verify at 402x874 (iPhone 17)
8. Motion earns its place — purposeful transitions, nothing decorative
9. Copy is calm and direct — freedom-focused, never pushy or urgent

## Strategic Direction

Current phase (as of May 2026): Production Readiness

Private beta target: September 2026. LEGAL and Alpaca integration blocked on external parties.

Current priority order:
1. Complete UI overhaul on all remaining pages
2. Implement all Piggy Tier features
3. Complete all loading/empty/error states
4. App store submission readiness

NOT current priority: Growth, marketing, dark mode, advanced analytics.

## Successful Patterns

- Onboarding component series: hero top-aligned, content center-aligned, CTA at bottom with transparent back button
- Section cards with single clear header and body content — do not mix concerns in one card
- Blue-header-over-white ("hero-led") settings pages: a `div.custom-profile-header` directly inside `ion-header` (no ion-toolbar) with a blue gradient and an `&::after` concave cutout whose bg exactly matches `ion-content --background`, so the white content curves up over the blue (tab3 pattern; reused on change-bank-account FRED-124)
- Centered ion-header title: back button (40px) + `flex:1` centered title + a 40px balancing spacer/`padding-right` so the title is truly centered (security-settings pattern)
- **Canonical settings header is now a shared partial:** `frontend/src/theme/_blue-hero-header.scss` is the single source of truth for the `.blue-hero-header` (gradient + concave cutout + `.hero-nav`/`.back-btn`/`.back-btn-spacer`/`.header-title`/`.hero-action-btn`). Every settings page `@use`s it — never copy-paste the gradient/cutout SCSS into a page file (the verifier's "gradient literal count == 1" grep is the AC for this). HTML structure is `<ion-header class="ion-no-border"><div class="blue-hero-header"><div class="hero-nav"><button class="back-btn" (click)="goBack()">…</button><h2 class="header-title">…</h2><div class="back-btn-spacer"></div></div></div></ion-header>`. Page-specific header extras go INSIDE `.blue-hero-header` (e.g. my-profile's `.hero-action-btn` Save), never back in a toolbar (FRED-194). Pages not yet on it: tab3.page.scss (still inlines the gradient) and ~10 non-settings pages still on the old `ion-toolbar`/`header-inner`.
- Reusing the linkplaid `.illustration-card` on other pages: copy the markup/styles and substitute its `--plaid-*` CSS vars with FRED palette literals (its `:host` scope does not carry over)
- Material Symbols Outlined icon font (subset loaded from /assets/fonts/)
- Loading veil: full-screen semi-transparent overlay on async operations
- Separate builder-agent + verifier-agent pattern for implementing and reviewing changes
- Transient-only HTTP retry on resilience-sensitive observables: reuse the canonical `auth.service.ts loadUserProgress()` block verbatim — `timeout(10_000)` + `retry({count:2, delay})` where `transient = isTimeout || status===0 || status>=500`, non-transient errors re-thrown via `throwError(()=>err)`, backoff `timer(400·2^(attempt-1))`. The non-transient re-throw is load-bearing: it prevents retrying 401/403/4xx so auth failures are never masked as retryable blips (FRED-196, tab3 KYC call). Pair with an error handler that still settles the render gate so a permanently-failing call can't hang the view.

## Rejected Patterns

- Dark mode (premature — do after all screens migrated)
- Mocking the database in tests (led to prod divergence)
- One-off HTML not committed to source control
- Generating one-off files that cannot be reproduced from the repo

## Lessons Learned

- Always read the existing TS + reference components before writing new ones
- Small TS additions are fine alongside HTML/SCSS changes — don't over-scope
- Prerequisites must be complete before dependent work starts (UI overhaul then dark mode, not the reverse)
- Backlog burn-down is a lagging indicator — look at production readiness score as the leading one
- When a picked design includes a data-backed flourish (e.g. a hero stat strip) but the story is scoped "HTML + SCSS only, no .ts rewrite," OMIT the flourish rather than fill it with placeholder numbers — fake financial data violates the no-mock-data rule. Offer it as a follow-up wired to real data.
- The sandbox often can't serve a frontend or drive a browser, so UI stories may only reach a static/SCSS-level verification floor. That's acceptable, but the live device-render confirmation (390×844 / 430×932) must be handed to Andrew explicitly via "Looks Good" — never imply screenshots were captured when they weren't.
