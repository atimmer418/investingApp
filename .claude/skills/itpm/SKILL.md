---
name: itpm
description: Daily FRED ITPM routine — reads backlog + memory, picks today's priorities, triages stories, generates implementation options, writes and commits a fully populated ITPM/routine/today.html executive dashboard served at today.fredvested.com. Run at 9am EST daily via the itpm-morning-brief routine, or invoke manually with /itpm.
---

# FRED ITPM Daily Routine

**Announce at start:** "Running FRED ITPM daily routine."

This skill is the PLANNING brain. It generates the daily brief. It does NOT implement work — the `itpm-execute` routine does that when Andrew approves. Keep the two separate.

---

## Step 0 — State Guard (HARD GATE)

Before doing ANYTHING, run this exact check. It reads the state off the **dashboard div specifically** (not CSS selectors, which also contain `data-state`):

```bash
STATE=$(grep -o 'id="dashboard"[^>]*data-state="[^"]*"' ITPM/routine/today.html | grep -o 'data-state="[^"]*"' | head -1)
if [ "$STATE" != 'data-state="looks_good"' ]; then echo "GUARD_STOP: $STATE"; else echo "GUARD_PASS"; fi
```

- `GUARD_STOP` → **STOP immediately.** Do not generate, commit, or notify. A `planning`/`intermediary`/`completed`/`failed` page means Andrew hasn't closed out the prior cycle; overwriting it destroys unreviewed work. End silently.
- `GUARD_PASS` → proceed to Step 1.

**The only exception:** Andrew invokes `/itpm` manually AND explicitly says to force a fresh brief. The automated morning run has NO override.

---

## Step 1 — Orient

Read all of the following in parallel. Do not skip any source:

1. `ITPM/routine.md` — the ITPM spec (your constitution; read completely)
2. `FREDdocs/backlog.md` — current backlog with all stories and their status
3. `ITPM/memory/fred_vision.md` — product vision, UI principles, tier structure, patterns
4. `ITPM/memory/routine_memory.md` — recent history, tracked metrics, lessons, blockers

---

## Step 2 — Archive Yesterday

Before overwriting today.html, archive the existing version so history is preserved:

```bash
mkdir -p ITPM/archive
cp ITPM/routine/today.html "ITPM/archive/$(date '+%Y-%m-%d').html"
```

This runs every time. A week from now Andrew can look back at what was picked and why.

---

## Step 3 — Compute Success Criteria Metrics (with weekly trend)

Parse `FREDdocs/backlog.md` to compute each metric. For EACH metric, also compute the **weekly trend** — the delta versus the value recorded in `routine_memory.md` approximately 7 days ago (the closest daily entry or weekly summary). Express as `↑ +N`, `↓ -N`, or `→ no change`.

**Backlog burn-down:**
- Total stories: count all headings matching `## [A-Z]+-\d+` (covers FRED-, LPFRED-, DEV-, etc.)
- Completed: count stories in the `# ✓ DONE` section (equivalently, headings whose marker is ✓)
- Burn-down %: (completed / total) × 100, 1 decimal
- Trend: completed-count now vs ~7 days ago

**Piggy Tier completion:**
- Piggy Tier = free-tier core features: core investing, retirement projections, basic portfolio view, paycheck automation. Use judgment from fred_vision.md.
- Piggy %: (completed Piggy) / (total Piggy) × 100
- Trend vs last week

**Pages migrated to new UI/UX:**
- Read from the most recent daily entry in routine_memory.md; adjust for any UI work shipped since
- Trend vs last week

**Production readiness score (0–100):**
- UI coverage (40 pts): pages migrated % × 0.40
- Feature completeness (30 pts): Piggy Tier % × 0.30
- Error state coverage (20 pts): from memory; default 50% → 10 pts if unknown
- Bug density (10 pts): 10 − (open blocker count × 2), min 0
- Trend vs last week

**Days since last production-ready blocker:**
- Read the value from the most recent routine_memory.md entry.
- If a blocker was logged in that entry (execute recorded one), reset to 0.
- Otherwise increment by 1 (one more clean day).
- If no prior tracking exists at all, record 0 and note "tracking begins today."

**Launch readiness %:**
- Average of burn-down %, Piggy %, pages migrated %, and (readiness/100)×100, 1 decimal
- Trend vs last week

---

## Step 4 — Analyze Recent History & Blockers

From routine_memory.md extract:
- What shipped in the last 1–3 daily entries
- What is partially done
- **Blocked stories** — any story logged with a blocker. These must NOT be picked today unless the blocker is recorded as resolved.
- Patterns: stories Andrew consistently approves vs pushes back on

---

## Step 5 — Pick Today's Work (A/C tiering)

**The backlog is pre-sorted by status.** `FREDdocs/backlog.md` has four top-level sections: `# ✅ READY` (no marker — most suitable), `# 💤 SLEEPING`, `# 🚫 BLOCKED`, `# ✓ DONE`. **Pick from the READY section first.** Only fall to a SLEEPING story (and remove its 💤) if READY is empty or nothing in READY fits today. NEVER pick from BLOCKED or DONE.

Apply the Decision Framework from `ITPM/routine.md` in order: prerequisites → dependency chains → quick wins → guaranteed completion → production readiness impact → long-term value.

**Difficulty bias:** Prefer Easy/Medium until readiness > 75; allow Hard once mature.

**Acceptance-criteria tiering — this governs what you may pick:**

1. **Tier 1 (default):** Only pick stories that already have an `### Acceptance Criteria` block in `backlog.md`. These are build-ready.
2. **Tier 2 (only when Tier 1 is exhausted):** If no suitable A/C-complete stories remain, pick a story WITHOUT acceptance criteria, run the **triage skill** against it to generate proposed A/C, and present those A/C in the dashboard as a **proposal for Andrew to approve or edit** (see Step 9, A/C Proposal Mode). The execute agent will write the approved A/C back into backlog.md before building.

State in "Why I Picked These" which tier you're operating in.

**Pick rules:**
- **Pick exactly ONE story.** This routine works one story at a time — one story, one plan, one approval. (Later we may run 2–3 parallel ITPM routines each picking their own story; for now it is strictly one.)
- Pick the single highest-value story per the Decision Framework and difficulty bias.

**Never pick:** blocked stories, work that can't ship today, stories Andrew rejected before, or any story logged as `**Skipped:**` in a `routine_memory.md` entry within the last 7 days. A skip is a signal Andrew does not want that story now — honor it.

Record: story ID, title, difficulty, rationale, whether it's a UI overhaul, and whether it's Tier 1 or Tier 2.

---

## Step 6 — Triage Each Story

For each selected story generate:
- **In Scope:** concrete list of what implementing includes
- **Potentially Out of Scope:** adjacent work to exclude this run (goes INSIDE triage findings, not its own section)
- **UX Considerations:** loading / empty / error+retry states, mobile-first at 390×844, tier gating
- **Questions For Andrew:** genuine decision-points only; mark Required (blocks) or Optional

---

## Step 7 — Generate Options OR Phone Mockups

**If the story is a standard (non-UI-overhaul) story:**

Generate Option A, B, and (if meaningfully different) C. Each: Title, Approach (2–3 sentences), Pros, Cons, Risk + one sentence, Time estimate, Recommended (exactly one). Render as `.option-group` with `.option-card`s (recommended one gets `.selected` + `.option-rec` badge). Each card includes the edit button structure already in the template.

**If the story IS a UI overhaul:**

This is the single story of the day. Instead of text options, generate **three distinct visual design directions** as inline phone-frame mockups. Each mockup is a real, lightweight HTML/CSS rendering of the redesigned screen inside a `.phone-frame`, using FRED's actual design system (Manrope, the FRED palette, real component patterns). The three should be genuinely different directions (e.g. card-dense vs airy-minimal vs hero-led), not trivial variations.

Structure:
```html
<div class="phone-options">
  <div class="phone-option selected" onclick="selectPhoneOption(this)">
    <div class="phone-frame"><div class="phone-screen">[mockup HTML of redesigned screen]</div></div>
    <div class="phone-option-label">Option A — Airy Minimal <span class="phone-option-rec">Recommended</span></div>
    <div class="phone-option-note"><textarea placeholder="What do you like / want changed in this one?"></textarea></div>
  </div>
  <div class="phone-option" onclick="selectPhoneOption(this)"> ... Option B ... </div>
  <div class="phone-option" onclick="selectPhoneOption(this)"> ... Option C ... </div>
</div>
```

Andrew can pick one and annotate each via the note textareas — the approval will tell the execute agent e.g. "build B, but take the nav from A and the spacing from C." Make the mockups detailed enough to actually judge the design.

---

## Step 8 — Execution Order & Tomorrow

**Execution Order:** numbered `.step-item` steps (with the edit-button structure already in the template), logical implementation sequence.

**Tomorrow's Likely Priorities:** 1–3 likely next picks based on what ships today.

---

## Step 9 — Generate and Commit today.html

Read the current `ITPM/routine/today.html` to get the exact content structure. **CSS lives in `ITPM/routine/styles.css` and JS in `ITPM/routine/app.js` — those files are OFF LIMITS. Never edit them, never re-inline them.** today.html's `<head>` contains `<link rel="stylesheet" href="/styles.css" />` and just before `</body>` is `<script src="/app.js"></script>` — leave both EXACTLY as they are. Do NOT add any `<style>` or inline `<script>` blocks to today.html.

You ONLY edit the content INSIDE `<div id="dashboard">…</div>` (and its `data-state`/`data-populated` attributes). Use the existing classes (`.section-planning-only`, `.priority-card`, `.option-group`, `.metric-trend`, etc.) — they're already styled in styles.css. Swap in the new data; keep every class name and element id the JS depends on.

**Critical flags on `<div id="dashboard">`:** set `data-populated="true"` AND `data-state="planning"`. This is a brand-new day — the page must be a clean planning brief with NO leftover completion content.

**Reset stale state from yesterday's cycle:**
- Reset `#completion-content` back to its placeholder: `<p class="card-text" style="color:var(--gray);font-style:italic;">Completion summary will appear here once the execution agent finishes.</p>`
- Reset `#completion-section` to `style="display:none;"` (the state CSS shows it only in completed/looks_good).
- Clear `<p id="failure-detail">` and keep `#failure-banner` hidden.
- The approve bar must show "Approve / Get To Work" (planning state shows it; the JS handles this via `applyStateUI`).

Populate:
1. **Scoreboard** — all 6 metric values, bar-fill widths, `positive`/`warning` classes, AND the `.metric-trend` span for each (`↑ +N vs last week` green / `↓ -N vs last week` red / `→ no change` gray).
2. **Today's Priority** — exactly ONE `.priority-card` (badge "#1") with the skip checkbox already in template, title, desc, difficulty chip. If Andrew checks Skip, the dashboard hides the plan detail and the approve button becomes "Find New Story" — which sends a revision asking for a different single story. Do not render a second priority card.
3. **Why I Picked These** — 2–3 sentences; state Tier 1 or Tier 2.
4. **Strategic Alignment** — 1–2 sentences.
5. **Production Readiness Impact** — 1–2 sentences.
6. **Options OR Phone Mockups** — per Step 7.
7. **Triage Findings** — In Scope / Potentially Out of Scope / UX per story (Out-of-Scope lives here, NOT as its own section).
8. **A/C Proposal Mode (Tier 2 only):** if this is a Tier-2 story, add a section before the options showing the generated acceptance criteria as a checklist with an editable note, labeled "Proposed Acceptance Criteria — approve or edit". Make clear the build won't start until A/C is confirmed.
9. **Questions For Andrew** — `.question-item`s, Required/Optional badges.
10. **Suggested Execution Order** — `.step-item`s.
11. **Tomorrow's Likely Priorities** — 2–3 items.

Commit and push. Pull immediately before pushing — other routines (digest, etc.) commit to `develop` during the minutes you spent generating, so a stale push will be rejected:
```bash
git pull --no-rebase origin develop
git add ITPM/routine/today.html ITPM/memory/routine_memory.md ITPM/archive/
git commit -m "itpm: daily brief — $(date '+%Y-%m-%d')"
git push origin develop
```

Cloudflare Pages auto-deploys within ~60 seconds.

---

## Step 10 — Update routine_memory.md

Append a new daily entry:

```
### YYYY-MM-DD — [brief title]

**Priorities selected:** FRED-XXX (+ FRED-YYY)
**Tier:** 1 (A/C ready) or 2 (A/C generated)
**Rationale:** One sentence.
**Metrics:** Readiness XX/100, Piggy XX%, Pages XX%, Burndown XX%, Launch XX%
**Trends:** [any notable week-over-week movement]
**Days since last blocker:** N
**Blockers active:** [list any, or "none"]
**Status:** Pending approval from Andrew
```

Compression: 8+ daily entries → compress 7 oldest into a weekly summary; 5+ weekly → compress 4 oldest into a monthly. Retain accomplishments, lessons, decisions, outcomes, blocker history.

---

## Step 11 — Notify

Send a PushNotification: title "FRED ITPM — Morning Brief Ready", message listing today's top priorities.

---

## Note on execution

Implementation (post-approval build, verify, completion summary, failure handling) is owned by the `itpm-execute` routine, NOT this skill. This skill's job ends when the brief is generated and Andrew is notified.
