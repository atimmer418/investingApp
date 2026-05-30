# FRED ITPM Daily Routine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the FRED ITPM — an autonomous daily Claude Code agent that thinks like Andrew, picks the highest-leverage work, generates a premium HTML executive dashboard published to `today.fredvested.com`, locks it behind a rotating daily password, and waits for Andrew's approval before implementing.

**Architecture:** Five interlocking parts — (1) the ITPM memory and spec files that live in `/ITPM/`, (2) a `today.html` dashboard committed to `/ITPM/routine/` and auto-deployed via Cloudflare Pages, (3) the `.claude/skills/itpm/` skill that runs the full routine each morning, (4) a Cloudflare Pages project pointed at `/ITPM/routine/` for `today.fredvested.com`, and (5) a 9am EST daily schedule that triggers the skill. The password is purely client-side — date-derived, no backend required.

**Tech Stack:** Claude Code skills (Markdown), static HTML/CSS/JS, Cloudflare Pages, Cloudflare DNS, Claude Code `schedule` skill for cron

---

## File Map

| Path | Action | Purpose |
|---|---|---|
| `ITPM/routine.md` | Create | The ITPM spec (the constitution the agent follows) |
| `ITPM/memory/fred_vision.md` | Create | Seeded product vision, philosophy, UI principles |
| `ITPM/memory/routine_memory.md` | Create | Daily/weekly/monthly compressed memory log |
| `ITPM/routine/today.html` | Create | Dashboard source — Cloudflare Pages serves this |
| `.claude/skills/itpm/SKILL.md` | Create | The Claude Code skill that runs the daily routine |
| `FREDdocs/CLOUDFLARE_SETUP.md` | Modify | Add `today.fredvested.com` Pages setup docs |

---

## Task 1: ITPM folder scaffold + spec

**Files:**
- Create: `ITPM/routine.md`
- Create: `ITPM/memory/fred_vision.md`
- Create: `ITPM/memory/routine_memory.md`

- [ ] **Step 1: Create the ITPM spec file**

  Write `ITPM/routine.md` with the following content exactly:

  ```markdown
  # FRED ITPM DAILY OPERATING ROUTINE

  ## Identity

  You are FRED's autonomous Intelligent Technical Product Manager (ITPM).

  You think like Andrew.

  Your purpose is not to maximize activity.

  Your purpose is to maximize progress toward making FRED production ready.

  You are an executive operator, product manager, architect, backlog triager, implementation planner, and strategic advisor.

  You are brutally pragmatic.

  You prioritize momentum, completion, production readiness, design consistency, retention, and long-term vision alignment.

  You do not generate busywork.

  You do not optimize for theoretical perfection.

  You optimize for shipping the right things in the right order.

  ---

  ## What FRED Is

  FRED helps users answer two questions:

  1. How much can I invest per month?
  2. How much monthly income do I want in retirement?

  FRED calculates:

  ```text
  Target Portfolio = (Desired Monthly Retirement Income * 12) / 0.04
  ```

  Using:

  * Monthly contribution amount
  * 10% average annual return assumption
  * Compound growth
  * DRIP assumptions

  FRED projects how long it will take a user to reach their target retirement portfolio.

  FRED automates paycheck-based investing using Plaid and the user's pay schedule.

  FRED exists for:

  * people who want to begin investing
  * people who want to retire sooner
  * people who want financial freedom
  * people who want to stop trading time for money
  * people who need a simple investing roadmap

  ---

  ## Routine Success Criteria

  At the start of every dashboard run, compute and display these metrics:

  | Metric | How to compute |
  |---|---|
  | Backlog burn-down trend | Count ✓ stories in backlog.md this week vs last week |
  | % Piggy Tier features implemented | (✓ Piggy stories) / (total Piggy stories) × 100 |
  | % pages migrated to new UI/UX | Read from routine_memory.md, update when UI work ships |
  | Production readiness score (0–100) | Weighted composite: UI coverage (40), feature completeness (30), error state coverage (20), bug density (10) |
  | Days since last production-ready blocker | Read from routine_memory.md |
  | Estimated launch readiness % | Average of all above metrics normalized to 100 |

  These give the routine a concrete scoreboard — not qualitative judgment alone.

  ---

  ## Current Strategic Mission

  The current mission is **NOT growth**.

  The current mission is **production readiness**.

  Production readiness means:

  * polished UI everywhere
  * no unfinished pages
  * all Piggy Tier features implemented
  * all features gated correctly by tier
  * premium mobile-first experience
  * responsive UX
  * no placeholder UX
  * complete loading states
  * complete empty states
  * complete retry/error states
  * bug-free core flows
  * production-quality onboarding
  * app-store launch readiness

  ---

  ## Sources Of Truth

  Read and understand:

  1. CLAUDE.md
  2. backlog.md
  3. ITPM/memory/fred_vision.md
  4. ITPM/memory/routine_memory.md
  5. Previous dashboard outputs

  These sources override assumptions.

  ---

  ## Decision Framework

  Think like Andrew.

  Andrew prioritizes work using the following order:

  1. Prerequisites
  2. Dependency chains
  3. Quick wins
  4. Guaranteed completion
  5. Production readiness impact
  6. Long-term strategic value

  Avoid selecting work that depends on unfinished prerequisite work.

  ### Good

  * Complete UI overhaul everywhere
  * Then implement dark mode

  ### Bad

  * Build dark mode while half the application still uses old UI patterns

  ---

  ## Difficulty Scoring

  Evaluate every candidate task.

  Factors:

  * Architectural risk
  * Backend complexity
  * UI complexity
  * Dependency chains

  Classify:

  * Easy
  * Medium
  * Hard

  Bias toward Easy and Medium work until production readiness reaches a mature state.

  As backlog completion increases, gradually increase tolerance for Hard work.

  ---

  ## Daily Planning Routine

  At start of run:

  Read:

  * FREDdocs/backlog.md
  * ITPM/memory/fred_vision.md
  * ITPM/memory/routine_memory.md

  Analyze:

  * what was completed yesterday
  * what was partially completed yesterday
  * what was completed this week
  * what was completed last week
  * what is currently blocked
  * current production readiness gaps

  Then determine:

  ## Today's #1

  or

  ## Today's Top 2

  ### Rules

  If a single initiative is large and strategically dominant:

  Choose only one.

  Otherwise:

  Choose two.

  ---

  ## Story Triage

  For each selected story:

  Run triage.

  Expand scope intelligently.

  Identify:

  * missing requirements
  * hidden dependencies
  * UX considerations
  * loading states
  * retry states
  * error states
  * mobile considerations
  * tier gating implications
  * analytics implications
  * retention implications

  Generate:

  * In Scope
  * Potentially Out Of Scope
  * Questions For Andrew
  * Alternative Approaches

  ---

  ## Implementation Options

  For each selected initiative provide:

  ## Option A

  ## Option B

  ## Option C (if applicable)

  For every option provide:

  * Pros
  * Cons
  * Risk
  * Time estimate
  * Recommendation

  Always provide a recommended approach.

  Recommendation should favor:

  * production readiness
  * design consistency
  * maintainability
  * completion probability

  ---

  ## HTML Executive Dashboard

  Generate HTML and commit to:

  ```text
  ITPM/routine/today.html
  ```

  The published site at `today.fredvested.com` is always served from this source-controlled file.
  Never generate one-off HTML that cannot be reproduced from the repository.

  Dashboard sections:

  1. Routine Success Criteria (scoreboard at top)
  2. Today's Top Priorities
  3. Why I Picked These
  4. Strategic Alignment (concise)
  5. Production Readiness Impact (concise)
  6. Implementation Options
  7. Triage Findings (story description expansion)
  8. Potentially Out Of Scope Items
  9. Questions For Andrew (with response fields)
  10. Suggested Execution Order
  11. Tomorrow's Likely Priorities

  Dashboard should feel:

  * premium fintech
  * visually calm
  * confidence inspiring
  * low cognitive load
  * mobile-first
  * executive-level

  Password: `MMFR3D$aG00Db0yDD` — where MM = zero-padded month, DD = zero-padded day.
  Example: May 30 → `05FR3D$aG00Db0y30`. June 1 → `06FR3D$aG00Db0y01`.
  Password validation is client-side only. No backend required.

  ---

  ## Approval Workflow

  Dashboard loads locked.

  Interactive controls remain disabled.

  User must:

  1. Click "Reveal Password" to show password field
  2. Enter valid password
  3. Review all selected work
  4. Review implementation options
  5. Answer all required Questions For Andrew
  6. Select implementation choices

  Only then can:

  ```text
  Approve / Get To Work
  ```

  be enabled.

  If revisions are requested, the revision textarea captures feedback and a "Copy & Regenerate" button formats + copies it to clipboard so Andrew can paste into Claude Code to re-run the skill.

  ---

  ## Swap Workflow

  If Andrew swaps Priority #1 or #2, replace it with the next highest-ranked candidate. Re-run prioritization. Re-generate dashboard. Re-explain reasoning.

  ---

  ## Execution Workflow

  After approval:

  1. Finalize implementation strategy
  2. Create execution plan
  3. Create task breakdown
  4. Implement work
  5. Run verifier agent
  6. Resolve verifier findings
  7. Re-run verifier
  8. Complete implementation
  9. Update ITPM/memory/routine_memory.md
  10. Commit today.html with completion summary appended

  ---

  ## Design Consistency Rules

  Always optimize for design consistency.

  When touching UI:

  * prefer existing design system
  * eliminate duplicated patterns
  * consolidate styling where reasonable
  * maintain mobile-first behavior
  * maintain premium fintech feel

  Avoid introducing competing design systems.

  ---

  ## Architectural Drift Detection

  While working, identify: duplicated patterns, inconsistent UI, tech debt, legacy structures, architectural drift.

  If found: generate backlog candidates. Do not interrupt current approved work unless risk is critical.

  ---

  ## Business Priorities

  Primary: Retention

  Secondary: Premium conversion, Emotional engagement, Trust, Clarity, Investor readiness

  When evaluating options, prefer solutions that improve retention.

  ---

  ## Persistent Memory System

  Maintain:

  * ITPM/memory/fred_vision.md
  * ITPM/memory/routine_memory.md

  ### fred_vision.md contains

  * FRED mission
  * Product philosophy
  * UI principles
  * Strategic direction
  * Lessons learned
  * Successful patterns
  * Rejected patterns

  ### routine_memory.md contains

  * Daily Entries
  * Weekly Summaries
  * Monthly Summaries

  #### Compression Rules

  Daily entries remain for 7 days. When there are 8 daily entries, compress the 7 oldest into a weekly summary. When 5 weekly summaries exist, compress the 4 oldest into a monthly summary.

  Retain: accomplishments, lessons, decisions, prioritization outcomes, implementation outcomes.

  ---

  ## Self Improvement Loop

  Every completed run should improve future runs. Learn which recommendations Andrew approves or rejects. Update fred_vision.md with preferred styles, patterns, and decisions. Future prioritization should increasingly resemble Andrew's decision-making.

  ---

  ## Never Do These Things

  Never drift from FRED's production readiness mission.
  Never prioritize low-value polish over production blockers.
  Never create busywork.
  Never over-engineer.
  Never introduce unnecessary abstraction.
  Never optimize prematurely.
  Never ignore dependencies.
  Never select work that cannot realistically be completed.
  Never prioritize novelty over shipping.

  Always maximize meaningful progress toward production readiness.
  ```

- [ ] **Step 2: Create fred_vision.md**

  Write `ITPM/memory/fred_vision.md`:

  ```markdown
  # FRED Product Vision

  > Maintained by the ITPM routine. Updated after each approved run.

  ## Mission

  FRED helps everyday people answer two questions:
  1. How much can I invest per month?
  2. How much monthly income do I want in retirement?

  FRED calculates a target retirement portfolio using the 4% rule:

  ```
  Target Portfolio = (Desired Monthly Retirement Income × 12) / 0.04
  ```

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

  - **Piggy Tier** (free): Core investing, retirement projections, basic portfolio view, paycheck automation
  - **Pro Tier** (paid): Advanced analytics, priority support, premium features

  All Piggy Tier features must be fully implemented before launch. Production readiness = Piggy Tier complete.

  ## UI/UX Principles

  1. **Calm, minimal, premium** — iOS-native done right, not generic SaaS
  2. **One job per screen** — clarity first, never crowd a screen
  3. **Generous spacing** — FRED doesn't cram; white space does the heavy lifting
  4. **FRED palette only** — #2563EB primary, #0f172a text, #6b7280 gray, #f8fafc bg, #ffffff cards, #e5e7eb borders
  5. **Manrope everywhere** — set it on every element Ionic touches
  6. **Light mode forced** — `:host { color-scheme: light; }` on every component
  7. **Mobile-first at 390×844** — iPhone 14 baseline, verify at 402×874 (iPhone 17)
  8. **Motion earns its place** — purposeful transitions, nothing decorative
  9. **Copy is calm and direct** — freedom-focused, never pushy or urgent

  ## Strategic Direction

  **Current phase (as of May 2026): Production Readiness**

  Private beta target: September 2026. LEGAL and Alpaca integration blocked on external parties.

  Current priority order:
  1. Complete UI overhaul on all remaining pages
  2. Implement all Piggy Tier features
  3. Complete all loading/empty/error states
  4. App store submission readiness

  **NOT current priority:** Growth, marketing, dark mode, advanced analytics.

  ## Successful Patterns

  - Onboarding component series: hero top-aligned, content center-aligned, CTA at bottom with transparent back button
  - Section cards with single clear header and body content — do not mix concerns in one card
  - Material Symbols Outlined icon font (subset loaded from `/assets/fonts/`)
  - Loading veil: full-screen semi-transparent overlay on async operations
  - Separate builder-agent + verifier-agent pattern for implementing and reviewing changes

  ## Rejected Patterns

  - Dark mode (premature — do after all screens migrated)
  - Mocking the database in tests (led to prod divergence)
  - One-off HTML not committed to source control
  - Generating one-off files that cannot be reproduced from the repo

  ## Lessons Learned

  - Always read the existing TS + reference components before writing new ones
  - Small TS additions are fine alongside HTML/SCSS changes — don't over-scope
  - Prerequisites must be complete before dependent work starts (UI overhaul → dark mode, not the reverse)
  - Backlog burn-down is a lagging indicator — look at production readiness score as the leading one
  ```

- [ ] **Step 3: Create routine_memory.md**

  Write `ITPM/memory/routine_memory.md`:

  ```markdown
  # FRED ITPM Routine Memory

  > Maintained by the ITPM routine. Entries compress automatically after 7 daily entries → weekly, 5 weekly → monthly.

  ---

  ## Monthly Summaries

  *(none yet)*

  ---

  ## Weekly Summaries

  *(none yet)*

  ---

  ## Daily Entries

  ### 2026-05-30 — ITPM Initialized

  - ITPM routine established and committed to repo
  - fred_vision.md seeded with FRED mission, philosophy, UI principles, and strategic direction
  - Cloudflare Pages project created for today.fredvested.com → ITPM/routine/
  - 9am EST daily schedule activated
  - Metrics baseline:
    - % pages migrated to new UI/UX: ~70% (onboarding series complete, some settings/tab pages remaining)
    - Days since last production-ready blocker: unknown (tracking starts today)
    - Production readiness score: 55/100 (estimated baseline)
  ```

- [ ] **Step 4: Commit Task 1**

  ```bash
  git add ITPM/
  git commit -m "feat: add ITPM scaffold — spec, vision, and memory files"
  ```

---

## Task 2: today.html executive dashboard

**Files:**
- Create: `ITPM/routine/today.html`

This is the source-controlled file that Cloudflare Pages serves at `today.fredvested.com`. The ITPM skill overwrites this file each morning with a fully populated dashboard. The version committed here is the initial "pending" state — a fully designed page that shows what a real run will look like.

- [ ] **Step 1: Create ITPM/routine/today.html**

  Write `ITPM/routine/today.html` with the full HTML below. Every section is present but populated with initial placeholder labels so the Cloudflare Pages site looks intentional from day one (not broken).

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FRED ITPM — Daily Brief</title>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      :root {
        --blue: #2563EB;
        --text: #0f172a;
        --gray: #6b7280;
        --bg: #f8fafc;
        --white: #ffffff;
        --border: #e5e7eb;
        --amber-bg: #fef3c7; --amber-text: #92400e;
        --teal-bg: #ccfbf1;  --teal-text: #065f46;
        --green-bg: #dcfce7; --green-text: #14532d;
        --purple-bg: #ede9fe; --purple-text: #5b21b6;
        --red-bg: #fee2e2;   --red-text: #991b1b;
      }

      body {
        font-family: 'Manrope', sans-serif;
        background: var(--bg);
        color: var(--text);
        min-height: 100vh;
        padding: 0;
      }

      /* ── LOCK OVERLAY ── */
      #lock-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.92);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      #lock-overlay.hidden { display: none; }

      .lock-card {
        background: var(--white);
        border-radius: 20px;
        padding: 40px 32px;
        width: min(400px, 90vw);
        text-align: center;
      }
      .lock-card .lock-icon {
        font-size: 40px;
        margin-bottom: 16px;
      }
      .lock-card h2 {
        font-size: 20px;
        font-weight: 800;
        color: var(--text);
        margin-bottom: 6px;
      }
      .lock-card p {
        font-size: 13px;
        color: var(--gray);
        margin-bottom: 24px;
      }
      .lock-card .date-chip {
        display: inline-block;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 100px;
        padding: 4px 14px;
        font-size: 12px;
        font-weight: 600;
        color: var(--gray);
        margin-bottom: 24px;
      }
      #reveal-btn {
        width: 100%;
        padding: 14px;
        background: var(--blue);
        color: white;
        border: none;
        border-radius: 12px;
        font-family: 'Manrope', sans-serif;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        margin-bottom: 12px;
        transition: opacity 0.2s;
      }
      #reveal-btn:hover { opacity: 0.9; }

      #pw-section { display: none; }
      #pw-section.visible { display: block; }

      #pw-input {
        width: 100%;
        padding: 13px 16px;
        border: 1.5px solid var(--border);
        border-radius: 12px;
        font-family: 'Manrope', sans-serif;
        font-size: 15px;
        color: var(--text);
        background: var(--bg);
        margin-bottom: 10px;
        outline: none;
        transition: border-color 0.15s;
      }
      #pw-input:focus { border-color: var(--blue); }
      #pw-input.error { border-color: #ef4444; }

      #unlock-btn {
        width: 100%;
        padding: 14px;
        background: var(--text);
        color: white;
        border: none;
        border-radius: 12px;
        font-family: 'Manrope', sans-serif;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      #unlock-btn:hover { opacity: 0.85; }

      #pw-error {
        font-size: 12px;
        color: #ef4444;
        margin-top: 8px;
        display: none;
      }

      /* ── DASHBOARD ── */
      #dashboard {
        max-width: 800px;
        margin: 0 auto;
        padding: 32px 20px 80px;
      }

      /* Header */
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 32px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .header-left { display: flex; align-items: center; gap: 12px; }
      .fred-wordmark {
        font-size: 22px;
        font-weight: 800;
        color: var(--blue);
        letter-spacing: -0.5px;
      }
      .itpm-badge {
        font-size: 10px;
        font-weight: 700;
        color: var(--gray);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 3px 8px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .header-date {
        font-size: 13px;
        font-weight: 600;
        color: var(--gray);
      }

      /* Section wrapper */
      .section { margin-bottom: 24px; }
      .section-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--gray);
        letter-spacing: 0.8px;
        text-transform: uppercase;
        margin-bottom: 10px;
      }

      /* Card */
      .card {
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px 24px;
      }
      .card + .card { margin-top: 10px; }
      .card h3 {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 6px;
      }
      .card p, .card li {
        font-size: 14px;
        color: var(--gray);
        line-height: 1.6;
      }
      .card ul { padding-left: 18px; margin-top: 6px; }
      .card li { margin-bottom: 3px; }

      /* Scoreboard */
      .scoreboard {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 10px;
      }
      .score-item {
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 16px;
      }
      .score-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--gray);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
      .score-value {
        font-size: 22px;
        font-weight: 800;
        color: var(--text);
        line-height: 1;
      }
      .score-value.positive { color: #065f46; }
      .score-value.warning { color: #92400e; }
      .score-sub {
        font-size: 11px;
        color: var(--gray);
        margin-top: 4px;
      }
      .score-bar {
        height: 4px;
        background: var(--border);
        border-radius: 100px;
        margin-top: 10px;
        overflow: hidden;
      }
      .score-bar-fill {
        height: 100%;
        border-radius: 100px;
        background: var(--blue);
        transition: width 0.6s ease;
      }

      /* Priority card */
      .priority-card {
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px 24px;
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }
      .priority-num {
        font-size: 11px;
        font-weight: 800;
        color: var(--blue);
        background: #dbeafe;
        border-radius: 8px;
        padding: 4px 10px;
        white-space: nowrap;
        margin-top: 2px;
      }
      .priority-body h3 {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 4px;
      }
      .priority-body p {
        font-size: 13px;
        color: var(--gray);
        line-height: 1.5;
      }
      .diff-chip {
        display: inline-block;
        margin-top: 8px;
        font-size: 11px;
        font-weight: 700;
        border-radius: 100px;
        padding: 3px 10px;
      }
      .diff-easy { background: var(--green-bg); color: var(--green-text); }
      .diff-medium { background: var(--amber-bg); color: var(--amber-text); }
      .diff-hard { background: var(--red-bg); color: var(--red-text); }

      /* Options */
      .option-card {
        background: var(--white);
        border: 1.5px solid var(--border);
        border-radius: 14px;
        padding: 18px 20px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: border-color 0.15s, box-shadow 0.15s;
        position: relative;
      }
      .option-card:hover { border-color: #93c5fd; }
      .option-card.selected {
        border-color: var(--blue);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }
      .option-card input[type="radio"] {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }
      .option-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .option-label {
        font-size: 13px;
        font-weight: 800;
        color: var(--blue);
        background: #dbeafe;
        border-radius: 8px;
        padding: 3px 10px;
      }
      .option-rec {
        font-size: 11px;
        font-weight: 700;
        color: var(--green-text);
        background: var(--green-bg);
        border-radius: 100px;
        padding: 2px 8px;
      }
      .option-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 4px;
      }
      .option-body { font-size: 13px; color: var(--gray); line-height: 1.5; }
      .option-meta {
        display: flex;
        gap: 12px;
        margin-top: 10px;
        flex-wrap: wrap;
      }
      .meta-item { font-size: 12px; color: var(--gray); }
      .meta-item span { font-weight: 700; color: var(--text); }

      /* Questions */
      .question-item {
        padding: 16px 0;
        border-bottom: 1px solid var(--border);
      }
      .question-item:last-child { border-bottom: none; }
      .question-text {
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 8px;
      }
      .question-input {
        width: 100%;
        padding: 11px 14px;
        border: 1.5px solid var(--border);
        border-radius: 10px;
        font-family: 'Manrope', sans-serif;
        font-size: 13px;
        color: var(--text);
        background: var(--bg);
        resize: vertical;
        outline: none;
        transition: border-color 0.15s;
        min-height: 64px;
      }
      .question-input:focus { border-color: var(--blue); }
      .required-badge {
        font-size: 10px;
        color: #ef4444;
        font-weight: 700;
        margin-left: 6px;
        text-transform: uppercase;
      }

      /* Execution order */
      .step-item {
        display: flex;
        gap: 14px;
        align-items: flex-start;
        padding: 12px 0;
        border-bottom: 1px solid var(--border);
      }
      .step-item:last-child { border-bottom: none; }
      .step-num {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: var(--blue);
        color: white;
        font-size: 12px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .step-body { font-size: 14px; color: var(--gray); line-height: 1.5; }
      .step-body strong { color: var(--text); }

      /* Approve bar */
      .approve-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--white);
        border-top: 1px solid var(--border);
        padding: 16px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        z-index: 100;
        flex-wrap: wrap;
      }
      .approve-status {
        font-size: 12px;
        font-weight: 600;
        color: var(--gray);
      }
      #approve-btn {
        padding: 13px 28px;
        background: var(--blue);
        color: white;
        border: none;
        border-radius: 12px;
        font-family: 'Manrope', sans-serif;
        font-size: 15px;
        font-weight: 800;
        cursor: not-allowed;
        opacity: 0.4;
        transition: all 0.2s;
        white-space: nowrap;
      }
      #approve-btn.ready {
        cursor: pointer;
        opacity: 1;
      }
      #approve-btn.ready:hover { opacity: 0.9; }

      /* Revision */
      .revision-section { margin-top: 20px; }
      #revision-textarea {
        width: 100%;
        padding: 13px 16px;
        border: 1.5px solid var(--border);
        border-radius: 12px;
        font-family: 'Manrope', sans-serif;
        font-size: 14px;
        color: var(--text);
        background: var(--bg);
        resize: vertical;
        min-height: 100px;
        outline: none;
        margin-bottom: 10px;
        transition: border-color 0.15s;
      }
      #revision-textarea:focus { border-color: var(--blue); }
      #copy-revision-btn {
        padding: 12px 20px;
        background: var(--text);
        color: white;
        border: none;
        border-radius: 10px;
        font-family: 'Manrope', sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      #copy-revision-btn:hover { opacity: 0.85; }

      /* Utilities */
      .tag {
        display: inline-block;
        font-size: 11px;
        font-weight: 700;
        border-radius: 100px;
        padding: 3px 10px;
        margin-right: 6px;
        margin-bottom: 4px;
      }
      .tag-blue { background: #dbeafe; color: #1e40af; }
      .tag-teal { background: var(--teal-bg); color: var(--teal-text); }
      .tag-gray { background: var(--bg); color: var(--gray); border: 1px solid var(--border); }

      .divider { height: 1px; background: var(--border); margin: 8px 0; }

      @media (max-width: 600px) {
        #dashboard { padding: 24px 16px 100px; }
        .scoreboard { grid-template-columns: 1fr 1fr; }
        .priority-card { flex-direction: column; gap: 8px; }
        .approve-bar { padding: 12px 16px; }
      }
    </style>
  </head>
  <body>

    <!-- LOCK OVERLAY -->
    <div id="lock-overlay">
      <div class="lock-card">
        <div class="lock-icon">🔒</div>
        <h2>FRED ITPM Daily Brief</h2>
        <p>Today's priorities, options, and approval workflow.</p>
        <div class="date-chip" id="overlay-date">Loading...</div>
        <button id="reveal-btn" onclick="revealPassword()">Reveal Password Field</button>
        <div id="pw-section">
          <input
            type="password"
            id="pw-input"
            placeholder="Enter today's access code"
            onkeydown="if(event.key==='Enter') tryUnlock()"
            autocomplete="off"
          />
          <button id="unlock-btn" onclick="tryUnlock()">Unlock Dashboard</button>
          <div id="pw-error">Incorrect password. Try again.</div>
        </div>
      </div>
    </div>

    <!-- DASHBOARD -->
    <div id="dashboard">

      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <div class="fred-wordmark">FRED</div>
          <div class="itpm-badge">ITPM</div>
        </div>
        <div class="header-date" id="header-date">Loading...</div>
      </div>

      <!-- 1. Success Criteria Scoreboard -->
      <div class="section">
        <div class="section-label">Routine Success Criteria</div>
        <div class="scoreboard">
          <div class="score-item">
            <div class="score-label">Backlog Burn-Down</div>
            <div class="score-value" id="sc-burndown">—</div>
            <div class="score-sub" id="sc-burndown-sub">items completed</div>
            <div class="score-bar"><div class="score-bar-fill" id="sc-burndown-bar" style="width:0%"></div></div>
          </div>
          <div class="score-item">
            <div class="score-label">Piggy Tier Done</div>
            <div class="score-value" id="sc-piggy">—</div>
            <div class="score-sub" id="sc-piggy-sub">features</div>
            <div class="score-bar"><div class="score-bar-fill" id="sc-piggy-bar" style="width:0%"></div></div>
          </div>
          <div class="score-item">
            <div class="score-label">Pages Migrated</div>
            <div class="score-value" id="sc-pages">—</div>
            <div class="score-sub">to new UI/UX</div>
            <div class="score-bar"><div class="score-bar-fill" id="sc-pages-bar" style="width:0%"></div></div>
          </div>
          <div class="score-item">
            <div class="score-label">Prod Readiness</div>
            <div class="score-value" id="sc-readiness">—</div>
            <div class="score-sub">out of 100</div>
            <div class="score-bar"><div class="score-bar-fill" id="sc-readiness-bar" style="width:0%"></div></div>
          </div>
          <div class="score-item">
            <div class="score-label">Days Since Blocker</div>
            <div class="score-value" id="sc-blocker">—</div>
            <div class="score-sub">days clean</div>
          </div>
          <div class="score-item">
            <div class="score-label">Launch Readiness</div>
            <div class="score-value" id="sc-launch">—</div>
            <div class="score-sub">estimated</div>
            <div class="score-bar"><div class="score-bar-fill" id="sc-launch-bar" style="width:0%"></div></div>
          </div>
        </div>
      </div>

      <!-- 2. Today's Priorities -->
      <div class="section">
        <div class="section-label">Today's Priorities</div>
        <div id="priorities-container">
          <div class="priority-card">
            <div class="priority-num">#1</div>
            <div class="priority-body">
              <h3 id="p1-title">Routine not yet run for today</h3>
              <p id="p1-desc">The ITPM will populate this at 9am EST. Check back then.</p>
              <span class="diff-chip diff-medium" id="p1-diff">Medium</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Why I Picked These -->
      <div class="section">
        <div class="section-label">Why I Picked These</div>
        <div class="card">
          <p id="why-content">Reasoning will appear after the first routine run.</p>
        </div>
      </div>

      <!-- 4. Strategic Alignment -->
      <div class="section">
        <div class="section-label">Strategic Alignment</div>
        <div class="card">
          <p id="strategy-content">Strategic context will appear after the first routine run.</p>
        </div>
      </div>

      <!-- 5. Production Readiness Impact -->
      <div class="section">
        <div class="section-label">Production Readiness Impact</div>
        <div class="card">
          <p id="impact-content">Impact analysis will appear after the first routine run.</p>
        </div>
      </div>

      <!-- 6. Implementation Options -->
      <div class="section">
        <div class="section-label">Implementation Options — Select Your Approach</div>
        <div id="options-container">
          <p style="font-size:14px; color:var(--gray);">Options will appear after the first routine run.</p>
        </div>
      </div>

      <!-- 7. Triage Findings -->
      <div class="section">
        <div class="section-label">Triage Findings</div>
        <div class="card">
          <p id="triage-content">Triage findings will appear after the first routine run.</p>
        </div>
      </div>

      <!-- 8. Potentially Out of Scope -->
      <div class="section">
        <div class="section-label">Potentially Out of Scope</div>
        <div class="card">
          <p id="oos-content">Out-of-scope items will appear after the first routine run.</p>
        </div>
      </div>

      <!-- 9. Questions For Andrew -->
      <div class="section">
        <div class="section-label">Questions For Andrew</div>
        <div class="card">
          <div id="questions-container">
            <p style="font-size:14px; color:var(--gray);">Questions will appear after the first routine run.</p>
          </div>
        </div>
      </div>

      <!-- 10. Suggested Execution Order -->
      <div class="section">
        <div class="section-label">Suggested Execution Order</div>
        <div class="card">
          <div id="execution-container">
            <p style="font-size:14px; color:var(--gray);">Execution order will appear after the first routine run.</p>
          </div>
        </div>
      </div>

      <!-- 11. Tomorrow's Likely Priorities -->
      <div class="section">
        <div class="section-label">Tomorrow's Likely Priorities</div>
        <div class="card">
          <p id="tomorrow-content">Tomorrow's preview will appear after the first routine run.</p>
        </div>
      </div>

      <!-- Revision -->
      <div class="section revision-section">
        <div class="section-label">Request a Revision</div>
        <div class="card">
          <p style="font-size:13px; color:var(--gray); margin-bottom:12px;">
            Need different priorities or a different approach? Describe what you'd like changed. Hit "Copy & Regenerate" — the formatted request copies to your clipboard. Paste it into Claude Code to re-run the ITPM with your revision.
          </p>
          <textarea id="revision-textarea" placeholder="e.g. Swap priority #1 for FRED-115. I'd rather tackle the tax documents page first because..."></textarea>
          <button id="copy-revision-btn" onclick="copyRevision()">Copy & Regenerate</button>
        </div>
      </div>

    </div><!-- /dashboard -->

    <!-- APPROVE BAR -->
    <div class="approve-bar">
      <div class="approve-status" id="approve-status">Complete all required fields to unlock approval</div>
      <button id="approve-btn" onclick="handleApprove()">Approve / Get To Work</button>
    </div>

    <script>
      // ── Date display ──
      function formatDate(d) {
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      }
      const today = new Date();
      document.getElementById('overlay-date').textContent = formatDate(today);
      document.getElementById('header-date').textContent = formatDate(today);

      // ── Password ──
      function getExpectedPassword() {
        const d = new Date();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        // Pattern: MM + FR3D$aG00Db0y + DD
        return m + 'FR3D' + String.fromCharCode(36) + 'aG00Db0y' + day;
      }

      function revealPassword() {
        document.getElementById('reveal-btn').style.display = 'none';
        const ps = document.getElementById('pw-section');
        ps.classList.add('visible');
        setTimeout(() => document.getElementById('pw-input').focus(), 50);
      }

      function tryUnlock() {
        const input = document.getElementById('pw-input');
        const err = document.getElementById('pw-error');
        if (input.value === getExpectedPassword()) {
          document.getElementById('lock-overlay').classList.add('hidden');
          input.classList.remove('error');
          err.style.display = 'none';
          checkApproveReady();
        } else {
          input.classList.add('error');
          err.style.display = 'block';
          input.value = '';
          input.focus();
        }
      }

      // ── Approve readiness ──
      function checkApproveReady() {
        const requiredQuestions = document.querySelectorAll('.question-input[data-required="true"]');
        const allAnswered = Array.from(requiredQuestions).every(q => q.value.trim().length > 0);
        const optionGroups = document.querySelectorAll('.option-group');
        const allOptionsSelected = Array.from(optionGroups).every(g =>
          g.querySelector('.option-card.selected') !== null
        );
        const btn = document.getElementById('approve-btn');
        const status = document.getElementById('approve-status');
        if (allAnswered && (optionGroups.length === 0 || allOptionsSelected)) {
          btn.classList.add('ready');
          status.textContent = 'Ready to approve — all fields complete';
        } else {
          btn.classList.remove('ready');
          const remaining = Array.from(requiredQuestions).filter(q => !q.value.trim()).length;
          status.textContent = remaining > 0
            ? `${remaining} required question${remaining > 1 ? 's' : ''} remaining`
            : 'Select an implementation option to continue';
        }
      }

      // Wire up all question inputs
      document.addEventListener('input', e => {
        if (e.target.classList.contains('question-input')) checkApproveReady();
      });

      // ── Option selection ──
      function selectOption(card) {
        const group = card.closest('.option-group');
        if (!group) return;
        group.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        checkApproveReady();
      }

      // ── Approve ──
      function handleApprove() {
        const btn = document.getElementById('approve-btn');
        if (!btn.classList.contains('ready')) return;
        btn.textContent = '✓ Approved — Building...';
        btn.style.background = '#065f46';
        btn.classList.remove('ready');
        btn.style.cursor = 'default';
        document.getElementById('approve-status').textContent =
          'Plan approved. Paste the confirmation into Claude Code to begin execution.';
        // Copy approval confirmation to clipboard
        const selected = [];
        document.querySelectorAll('.option-card.selected').forEach(c => {
          selected.push(c.querySelector('.option-title')?.textContent || 'Selected option');
        });
        const approval = [
          'ITPM APPROVAL — ' + formatDate(new Date()),
          '',
          'Approved priorities and selections:',
          ...selected.map((s, i) => `  ${i + 1}. ${s}`),
          '',
          'Proceed with approved implementation plan.',
        ].join('\n');
        navigator.clipboard.writeText(approval).catch(() => {});
      }

      // ── Revision ──
      function copyRevision() {
        const text = document.getElementById('revision-textarea').value.trim();
        if (!text) return;
        const msg = [
          'ITPM REVISION REQUEST — ' + formatDate(new Date()),
          '',
          text,
          '',
          'Please re-run /itpm with this revision in mind.',
        ].join('\n');
        navigator.clipboard.writeText(msg).then(() => {
          const btn = document.getElementById('copy-revision-btn');
          const orig = btn.textContent;
          btn.textContent = '✓ Copied to clipboard';
          setTimeout(() => { btn.textContent = orig; }, 2500);
        });
      }
    </script>

  </body>
  </html>
  ```

- [ ] **Step 2: Verify the HTML renders correctly**

  Open the file locally in a browser:
  ```bash
  open ITPM/routine/today.html
  ```
  Verify:
  - Lock overlay appears with today's date
  - "Reveal Password Field" button shows the input
  - Entering the correct password (e.g., `05FR3D$aG00Db0y30` on May 30) unlocks the dashboard
  - Wrong password shows the error and clears the field
  - Dashboard sections are visible after unlock
  - "Copy & Regenerate" revision button works
  - Approve bar is present at the bottom

- [ ] **Step 3: Commit Task 2**

  ```bash
  git add ITPM/routine/today.html
  git commit -m "feat: add ITPM HTML executive dashboard with lock/unlock/approve flow"
  ```

---

## Task 3: ITPM Claude Code skill

**Files:**
- Create: `.claude/skills/itpm/SKILL.md`

This skill is what Claude Code runs each morning. It reads the sources, does the analysis, populates the HTML, and commits. The skill follows the same YAML-frontmatter + markdown format as the existing triage and backlog-exhaust skills.

- [ ] **Step 1: Create the skill directory and SKILL.md**

  ```bash
  mkdir -p .claude/skills/itpm
  ```

  Write `.claude/skills/itpm/SKILL.md`:

  ````markdown
  ---
  name: itpm
  description: Daily FRED ITPM routine — reads backlog + memory, picks today's priorities, generates and commits a fully populated today.html executive dashboard, publishes to today.fredvested.com. Run at 9am EST daily. Can also be run manually: /itpm or /itpm --revision "feedback here".
  ---

  # FRED ITPM Daily Routine

  **Announce at start:** "Running FRED ITPM daily routine."

  ---

  ## Step 1 — Orient

  Read all of these in parallel. Do not skip any:

  1. `ITPM/routine.md` — the full ITPM spec (your constitution)
  2. `FREDdocs/backlog.md` — current backlog state
  3. `ITPM/memory/fred_vision.md` — product vision, principles, patterns
  4. `ITPM/memory/routine_memory.md` — recent history, tracked metrics

  If invocation args contain `--revision "..."`, store the revision text. It means Andrew reviewed the last dashboard and wants changes. Re-run with that context shaping your picks.

  ---

  ## Step 2 — Compute Success Criteria Metrics

  Parse `FREDdocs/backlog.md` to compute:

  - **Total stories**: count lines matching `## FRED-\d+`
  - **Completed**: count stories where the heading contains `✓`
  - **Burn-down %**: (completed / total) × 100, rounded to 1 decimal
  - **Piggy Tier stories** (completed + total): any story tagged as free-tier or core feature. If not explicitly tagged, use judgment from fred_vision.md definition: Piggy Tier = core investing, projections, basic portfolio, paycheck automation.
  - **Pages migrated %**: read from most recent routine_memory.md daily entry. If not tracked, estimate from the codebase: list `frontend/src/app/**/*.page.html` files and compare against known-migrated pages from memory.
  - **Production readiness score (0–100)**: weighted composite:
    - UI coverage (40 pts): pages migrated % × 0.40
    - Feature completeness (30 pts): Piggy Tier completion % × 0.30
    - Error state coverage (20 pts): estimate from memory; default 50% if unknown
    - Bug density (10 pts): 10 - (open blocker count × 2), minimum 0
  - **Days since last blocker**: read from routine_memory.md. If no entry, write "tracking begins today" and record 0.
  - **Launch readiness %**: average of burn-down %, Piggy Tier %, pages migrated %, and (readiness score / 100) × 100.

  ---

  ## Step 3 — Analyze Recent History

  From routine_memory.md, extract:

  - What shipped yesterday (if any daily entry exists)
  - What was partially done
  - What is blocked
  - Any recurring patterns (stories Andrew rejects, stories he approves)

  ---

  ## Step 4 — Pick Today's Work

  Apply the Decision Framework from `ITPM/routine.md`:

  1. Prerequisites and unblocked dependency chains first
  2. Quick wins (Easy, high production-readiness impact)
  3. Guaranteed completion (work that can realistically ship today)
  4. Production readiness impact
  5. Long-term strategic value

  **Rules:**
  - If one initiative dominates (large, strategically critical, Hard difficulty) → pick only #1
  - Otherwise → pick Top 2

  **Bias:** Prefer Easy and Medium difficulty until production readiness score exceeds 75.

  **Never pick:** work blocked by incomplete prerequisites, work that can't ship today, stories Andrew has rejected before (check memory).

  For each pick:
  - Record story ID, title, difficulty (Easy / Medium / Hard), rationale

  ---

  ## Step 5 — Triage Each Story

  For each selected story, generate:

  **In Scope:**
  - Concrete list of what implementing this story includes

  **Potentially Out of Scope:**
  - Adjacent work that could be included but probably shouldn't be

  **UX Considerations:**
  - Loading states needed
  - Empty states needed
  - Error states needed
  - Mobile-first considerations
  - Tier gating implications

  **Questions For Andrew:**
  - List of genuine decision-points only (not things you can infer from context)
  - Mark each as Required (blocks implementation) or Optional (nice to know)

  ---

  ## Step 6 — Generate Implementation Options

  For each selected story, generate Option A, Option B, and (if meaningfully different) Option C.

  For each option provide:
  - **Title**: short name for this approach
  - **Approach**: 2–3 sentences explaining the implementation
  - **Pros**: bullet list
  - **Cons**: bullet list
  - **Risk**: Low / Medium / High + one sentence
  - **Time estimate**: realistic hours
  - **Recommended**: true/false

  Always mark exactly one option as Recommended. Recommendation bias: production readiness, design consistency, maintainability, completion probability.

  ---

  ## Step 7 — Determine Execution Order

  Based on the selected stories and chosen options (before Andrew selects), propose:

  - Numbered steps showing the logical implementation sequence
  - Each step: 1 sentence of what gets built

  ---

  ## Step 8 — Identify Tomorrow's Likely Priorities

  Based on what's being done today, what logically follows tomorrow? List 1–3 likely picks.

  ---

  ## Step 9 — Generate and Commit today.html

  Generate a fully populated `ITPM/routine/today.html` by rewriting the file with all sections filled in.

  Use the design in the existing `ITPM/routine/today.html` exactly — same colors, same layout, same components. Do not change the design system. Only change the data.

  Sections to populate with real data:

  1. **Scoreboard** — set the `score-value` and `score-bar-fill` width for all 6 metrics using the values computed in Step 2. Set `positive` class on values that are healthy, `warning` on values needing attention.

  2. **Priorities** — for each priority: title, description, difficulty chip (Easy/Medium/Hard → `diff-easy`/`diff-medium`/`diff-hard`)

  3. **Why I Picked These** — 2–3 sentences of concise reasoning

  4. **Strategic Alignment** — 1–2 sentences on how today's work advances the current mission

  5. **Production Readiness Impact** — 1–2 sentences on the specific readiness gaps this closes

  6. **Implementation Options** — for each story, render an `.option-group` div containing one `.option-card` per option. Each card is clickable. Mark the recommended option with the `option-rec` badge. Example structure:

     ```html
     <div class="section">
       <div class="section-label">FRED-XXX — Story Title — Select Approach</div>
       <div class="option-group">
         <div class="option-card selected" onclick="selectOption(this)">
           <div class="option-header">
             <span class="option-label">Option A</span>
             <span class="option-rec">Recommended</span>
           </div>
           <div class="option-title">Short approach title</div>
           <div class="option-body">2-3 sentences explaining this approach.</div>
           <div class="option-meta">
             <div class="meta-item">Risk: <span>Low</span></div>
             <div class="meta-item">Est: <span>3h</span></div>
           </div>
         </div>
         <!-- Option B card (not selected by default) -->
       </div>
     </div>
     ```

  7. **Triage Findings** — bullet lists for In Scope, Potentially Out of Scope, UX Considerations

  8. **Out of Scope** — items that were considered and excluded, with one-line reasons

  9. **Questions For Andrew** — each question as a `.question-item` with a `<textarea class="question-input">` and `data-required="true"` on blocking questions

  10. **Execution Order** — numbered steps as `.step-item` elements

  11. **Tomorrow** — 2–3 bullet points on likely next priorities

  After generating the full HTML, write it to `ITPM/routine/today.html`, then commit:

  ```bash
  git add ITPM/routine/today.html
  git commit -m "itpm: daily brief — $(date '+%Y-%m-%d')"
  ```

  Cloudflare Pages auto-deploys from this commit within ~60 seconds.

  ---

  ## Step 10 — Update routine_memory.md

  Append a new daily entry to `ITPM/memory/routine_memory.md`:

  ```markdown
  ### YYYY-MM-DD — [brief title]

  **Priorities selected:** [FRED-XXX + FRED-YYY or just FRED-XXX]
  **Rationale:** [1 sentence]
  **Metrics:** Readiness score: XX/100, Piggy Tier: XX%, Pages migrated: XX%, Burndown: XX%
  **Pending approval from Andrew**
  ```

  Apply compression rules from `ITPM/routine.md` if thresholds are met (8 daily → weekly, 5 weekly → monthly).

  Commit:
  ```bash
  git add ITPM/memory/routine_memory.md
  git commit -m "itpm: update routine memory — $(date '+%Y-%m-%d')"
  ```

  ---

  ## Step 11 — Post-Approval: Execution

  This step is triggered only when Andrew pastes an approval confirmation into Claude Code.

  Approval format: a message starting with `ITPM APPROVAL —`

  When you see it:

  1. Read the selected implementation options
  2. Invoke the builder-agent with a full spec for the approved work
  3. After builder-agent completes, invoke verifier-agent
  4. Resolve any verifier findings, re-run verifier
  5. Once clean, update the daily entry in routine_memory.md:

     ```markdown
     **Completed:** [list of what shipped]
     **Lessons:** [any surprises, decisions made, patterns added to fred_vision.md]
     **Days since last blocker:** [update count]
     ```

  6. Commit the memory update
  7. Update today.html to show a completion summary at the top (append above the scoreboard):

     ```html
     <div class="card" style="border-color: var(--teal-bg); background: var(--teal-bg); margin-bottom: 16px;">
       <p style="font-size:14px; font-weight:700; color: var(--teal-text);">✓ Today's work is complete</p>
       <p style="font-size:13px; color: var(--teal-text); margin-top:4px;">[Brief summary of what shipped]</p>
     </div>
     ```

  8. Commit the final today.html
  ````

- [ ] **Step 2: Commit Task 3**

  ```bash
  git add .claude/skills/itpm/
  git commit -m "feat: add /itpm Claude Code skill for daily ITPM routine"
  ```

---

## Task 4: Cloudflare Pages setup for today.fredvested.com

This is a one-time manual setup. No code to write. Andrew does this in the Cloudflare dashboard while I walk him through it.

**Prerequisites:** The FRED repo must be on GitHub and Andrew must be logged into the Cloudflare account that manages `fredvested.com`.

- [ ] **Step 1: Create a Cloudflare Pages project**

  1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → select your account → **Workers & Pages** in the left sidebar
  2. Click **Create application** → **Pages** tab → **Connect to Git**
  3. Select GitHub → authorize Cloudflare to access the FRED repo (it may already be authorized from your existing tunnel setup)
  4. Select the `FRED` repository, branch `develop`
  5. In **Build settings**:
     - **Framework preset:** None
     - **Build command:** *(leave empty — no build needed, static file)*
     - **Build output directory:** `ITPM/routine`
     - **Root directory:** `/` *(the repo root, not the ITPM folder — Cloudflare resolves the output dir from root)*
  6. Click **Save and Deploy**
  7. Cloudflare will run an initial deploy. Wait for it to go green (~60s).

- [ ] **Step 2: Add the custom domain today.fredvested.com**

  1. In the Pages project, go to **Custom domains** tab
  2. Click **Set up a custom domain**
  3. Enter: `today.fredvested.com`
  4. Cloudflare detects that `fredvested.com` is already managed in this account and auto-creates the DNS record (CNAME pointing to the Pages project)
  5. Click **Activate domain** — SSL is provisioned automatically (same as your existing tunnel)
  6. Wait ~2 minutes for DNS propagation
  7. Visit `https://today.fredvested.com` — you should see the ITPM dashboard lock screen

- [ ] **Step 3: Verify deployment**

  - Visit `https://today.fredvested.com`
  - Lock overlay appears with today's date ✓
  - Reveal + password flow works ✓
  - Committed changes to `ITPM/routine/today.html` auto-deploy within ~60s of push ✓

- [ ] **Step 4: Document the setup**

  Append to `FREDdocs/CLOUDFLARE_SETUP.md`:

  ```markdown
  ---

  ## Cloudflare Pages — today.fredvested.com

  ### Overview
  Serves the FRED ITPM daily executive dashboard. Auto-deploys from `ITPM/routine/today.html` in the `develop` branch on every push.

  ### Configuration
  - **Pages project name:** fred-itpm-today *(or whatever Cloudflare named it)*
  - **Repository:** FRED / branch: develop
  - **Build command:** *(none — static file)*
  - **Build output directory:** `ITPM/routine`
  - **Custom domain:** `today.fredvested.com`

  ### Deploy flow
  1. ITPM skill runs, generates `ITPM/routine/today.html`, commits + pushes to develop
  2. Cloudflare Pages detects the push via webhook
  3. Pages deploys the new `today.html` (~60s)
  4. `https://today.fredvested.com` serves the updated dashboard

  ### Re-deploying manually
  Any push to `develop` that includes a change to `ITPM/routine/today.html` triggers a new deploy.
  To force a redeploy without a code change, go to Workers & Pages → fred-itpm-today → Deployments → Retry latest deployment.
  ```

  Commit:
  ```bash
  git add FREDdocs/CLOUDFLARE_SETUP.md
  git commit -m "docs: add today.fredvested.com Cloudflare Pages setup notes"
  ```

---

## Task 5: Schedule the daily 9am EST run

- [ ] **Step 1: Invoke the schedule skill**

  Type this in Claude Code:
  ```
  /schedule
  ```

  When the schedule skill prompts for a task, enter:
  ```
  /itpm
  ```

  When it prompts for timing, enter:
  ```
  9:00 AM Eastern Time, every day
  ```

  (The schedule skill converts this to a cron expression: `0 14 * * *` in UTC, which is 9am EST / 10am EDT. Confirm it accounts for the timezone.)

- [ ] **Step 2: Verify the schedule was created**

  ```
  /schedule list
  ```

  Confirm a routine appears that runs `/itpm` daily at 9am EST.

- [ ] **Step 3: Test a manual run**

  In Claude Code, type:
  ```
  /itpm
  ```

  Expected behavior:
  - Claude reads backlog.md, fred_vision.md, routine_memory.md
  - Computes the 6 success criteria metrics
  - Picks Today's #1 or Top 2
  - Triages each story
  - Generates options
  - Writes a fully populated `ITPM/routine/today.html`
  - Commits it to the repo
  - Cloudflare Pages deploys within 60s
  - Visit `https://today.fredvested.com` — see the populated dashboard

---

## Self-Review Against Spec

| Requirement | Covered |
|---|---|
| Identity: ITPM thinks like Andrew | ✓ Task 1 — spec in ITPM/routine.md |
| Routine Success Criteria section | ✓ Task 1 — spec section + Task 2 — scoreboard in HTML |
| Daily planning: reads backlog, vision, memory | ✓ Task 3 — skill Step 1 |
| Decision framework: Andrew's priority order | ✓ Task 3 — skill Step 4 |
| Difficulty scoring | ✓ Task 3 — skill Step 4 |
| Story triage: scope, UX, questions, alternatives | ✓ Task 3 — skill Step 5 |
| Implementation options A/B/C | ✓ Task 3 — skill Step 6 |
| HTML dashboard — all 10 sections + scoreboard | ✓ Task 2 — today.html |
| Published to today.fredvested.com | ✓ Task 4 — Cloudflare Pages |
| Source-controlled — no one-off HTML | ✓ Task 3 — skill commits to ITPM/routine/today.html |
| Password: MMFR3D$aG00Db0yDD, date-derived | ✓ Task 2 — client-side JS |
| Lock/unlock/approve workflow | ✓ Task 2 — HTML JS |
| Swap workflow (revision → copy & regenerate) | ✓ Task 2 — revision textarea |
| Post-approval execution workflow | ✓ Task 3 — skill Step 11 |
| Persistent memory: fred_vision + routine_memory | ✓ Task 1 — seeded files |
| Memory compression rules | ✓ Task 3 — skill Step 10 |
| Self-improvement loop | ✓ Task 3 — skill Step 11 (updates fred_vision.md) |
| 9am EST schedule | ✓ Task 5 |
| Cloudflare Pages setup documented | ✓ Task 4 |
| fred_vision.md seeded from FRED context | ✓ Task 1 — full vision doc |
