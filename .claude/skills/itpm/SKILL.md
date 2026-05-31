---
name: itpm
description: Daily FRED ITPM routine — reads backlog + memory, picks today's priorities, triages stories, generates implementation options, writes and commits a fully populated ITPM/routine/today.html executive dashboard to be served at today.fredvested.com. Run at 9am EST daily via schedule, or invoke manually with /itpm. Pass --revision "feedback" to re-run with revision context.
---

# FRED ITPM Daily Routine

**Announce at start:** "Running FRED ITPM daily routine."

---

## Step 1 — Orient

Read all of the following in parallel. Do not skip any source:

1. `ITPM/routine.md` — the ITPM spec (your constitution; read completely)
2. `FREDdocs/backlog.md` — current backlog with all stories and their status
3. `ITPM/memory/fred_vision.md` — product vision, UI principles, tier structure, patterns
4. `ITPM/memory/routine_memory.md` — recent history, tracked metrics, lessons

If invocation args contain `--revision "..."`, store the revision text. It means Andrew reviewed the last dashboard and wants changes. Shape your picks and options with that feedback in mind.

---

## Step 2 — Compute Success Criteria Metrics

Parse `FREDdocs/backlog.md` to compute:

**Backlog burn-down:**
- Total stories: count headings matching `## FRED-\d+`
- Completed stories: count those where the heading contains a checkmark (done marker)
- Burn-down %: (completed / total) × 100, rounded to 1 decimal

**Piggy Tier completion:**
- Piggy Tier = free-tier core features: core investing, retirement projections, basic portfolio view, paycheck automation. Use judgment from fred_vision.md.
- Count completed vs total Piggy Tier stories
- Piggy Tier %: (completed Piggy) / (total Piggy) × 100

**Pages migrated to new UI/UX:**
- Read from the most recent daily entry in `ITPM/memory/routine_memory.md`
- If not tracked, estimate: the onboarding series is complete (~70%). Adjust based on any UI work that shipped since initialization.
- Record the updated % in this run's memory entry

**Production readiness score (0–100):**
- UI coverage (40 pts): pages migrated % × 0.40
- Feature completeness (30 pts): Piggy Tier % × 0.30
- Error state coverage (20 pts): read from memory if tracked; default 50% if unknown → 10 pts
- Bug density (10 pts): 10 − (known open blocker count × 2), minimum 0
- Sum all four components

**Days since last production-ready blocker:**
- Read from `ITPM/memory/routine_memory.md` most recent entry
- If no prior tracking, write "tracking begins today" and record 0

**Launch readiness %:**
- Average of: burn-down %, Piggy Tier %, pages migrated %, and (readiness score / 100) × 100
- Round to 1 decimal

---

## Step 3 — Analyze Recent History

From `ITPM/memory/routine_memory.md` extract:
- What shipped in the last 1–3 daily entries
- What is partially done or blocked
- Any patterns: stories Andrew consistently approves, stories he pushes back on
- Current trend (improving / stagnant / declining)

---

## Step 4 — Pick Today's Work

Apply the Decision Framework from `ITPM/routine.md` in order:
1. Prerequisites and unblocked dependency chains first
2. Quick wins with high production-readiness impact
3. Guaranteed completion (can realistically ship today)
4. Production readiness impact
5. Long-term strategic value

**Difficulty bias:** Prefer Easy and Medium until production readiness score > 75. Allow Hard once score is mature.

**Pick rules:**
- One initiative dominates (large, strategically critical, Hard) → pick only #1
- Otherwise → pick Top 2

**Never pick:**
- Work blocked by incomplete prerequisites
- Work that can't ship today
- Stories Andrew has rejected before (check memory)

For each pick, record: story ID, title, difficulty (Easy / Medium / Hard), rationale.

---

## Step 5 — Triage Each Story

For each selected story generate:

**In Scope:** concrete list of what implementing this story includes

**Potentially Out of Scope:** adjacent work that could be included but probably shouldn't be this run

**UX Considerations:**
- Loading states required
- Empty states required
- Error/retry states required
- Mobile-first considerations (390×844 baseline)
- Tier gating implications

**Questions For Andrew:**
- Genuine decision-points only (not things inferrable from context or existing code)
- Mark each: Required (blocks implementation) or Optional (nice to know)

---

## Step 6 — Generate Implementation Options

For each selected story provide Option A, Option B, and (if meaningfully different) Option C.

For each option provide:
- **Title:** short name for this approach
- **Approach:** 2–3 sentences explaining the implementation
- **Pros:** bullet list (2–4 items)
- **Cons:** bullet list (1–3 items)
- **Risk:** Low / Medium / High + one sentence
- **Time estimate:** realistic hours
- **Recommended:** yes or no (exactly one option must be recommended)

Recommendation bias: production readiness, design consistency, maintainability, completion probability.

---

## Step 7 — Determine Execution Order

Propose numbered steps for the logical implementation sequence based on today's selected stories. Each step: one sentence of what gets built.

---

## Step 8 — Identify Tomorrow's Likely Priorities

Based on what ships today, what logically follows? List 1–3 likely picks for tomorrow.

---

## Step 9 — Generate and Commit today.html

Rewrite `ITPM/routine/today.html` completely using the design and structure of the existing file. Do not change the CSS design system. Only change the data in the HTML.

Read the current `ITPM/routine/today.html` first to understand its exact structure, then rewrite it with all sections populated.

**Critical:** Change `data-populated="false"` to `data-populated="true"` on the `<div id="dashboard">` element. This is what unlocks the Approve button for Andrew. If you forget this, he cannot approve the plan.

**Scoreboard values to set:**
For each of the 6 metric cards, set:
- The `score-value` text to the computed number (e.g. "43.2%", "55", "0")
- The `score-bar-fill` width as an inline style percentage
- Add class `positive` to `score-value` when the metric is healthy (green)
- Add class `warning` to `score-value` when the metric needs attention (amber)

**Sections to populate with real data:**

1. **Scoreboard** — all 6 metrics with computed values and bar widths

2. **Today's Priorities** — for each pick render a priority card:
   ```html
   <div class="priority-card">
     <div class="priority-num">#1</div>
     <div class="priority-body">
       <h3>FRED-XXX — Story Title</h3>
       <p>One sentence describing why this was picked.</p>
       <span class="diff-chip diff-easy">Easy</span>
     </div>
   </div>
   ```
   Use `diff-easy`, `diff-medium`, or `diff-hard` on the chip.

3. **Why I Picked These** — 2–3 concise sentences of reasoning

4. **Strategic Alignment** — 1–2 sentences connecting today's work to the current mission

5. **Production Readiness Impact** — 1–2 sentences on which readiness gaps this closes

6. **Implementation Options** — for each story, render an `.option-group` div with one `.option-card` per option. The recommended option gets the `.selected` class by default and shows the `option-rec` badge. Structure:
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
         <div class="option-body">2–3 sentences on the approach.</div>
         <div class="option-meta">
           <div class="meta-item">Risk: <span>Low</span></div>
           <div class="meta-item">Est: <span>3h</span></div>
         </div>
       </div>
       <div class="option-card" onclick="selectOption(this)">
         <!-- Option B — not selected by default -->
       </div>
     </div>
   </div>
   ```

7. **Triage Findings** — bullet lists for In Scope, Potentially Out of Scope, UX Considerations per story

8. **Potentially Out of Scope** — items excluded with one-line reasons

9. **Questions For Andrew** — each question as:
   ```html
   <div class="question-item">
     <div class="question-text">
       Question text here
       <span class="required-badge">Required</span>
     </div>
     <textarea class="question-input" data-required="true" placeholder="Your answer..."></textarea>
   </div>
   ```
   Optional questions omit `data-required` and the required badge.

10. **Suggested Execution Order** — numbered steps as `.step-item` elements:
    ```html
    <div class="step-item">
      <div class="step-num">1</div>
      <div class="step-body"><strong>Task name</strong> — one sentence description</div>
    </div>
    ```

11. **Tomorrow's Likely Priorities** — 2–3 bullet points

After generating the complete HTML, write to `ITPM/routine/today.html` and commit:
```bash
git add ITPM/routine/today.html ITPM/memory/routine_memory.md
git commit -m "itpm: daily brief — $(date '+%Y-%m-%d')"
```

Cloudflare Pages auto-deploys from this commit within ~60 seconds.

---

## Step 10 — Update routine_memory.md

Append a new daily entry to `ITPM/memory/routine_memory.md`:

```
### YYYY-MM-DD — [brief 3–5 word title]

**Priorities selected:** FRED-XXX + FRED-YYY (or just FRED-XXX)
**Rationale:** One sentence.
**Metrics:** Readiness score: XX/100, Piggy Tier: XX%, Pages migrated: XX%, Burndown: XX%
**Days since last blocker:** N
**Status:** Pending approval from Andrew
```

Apply compression rules if thresholds are met:
- 8 or more daily entries → compress the 7 oldest into a weekly summary (retain: accomplishments, lessons, decisions, outcomes)
- 5 or more weekly summaries → compress 4 oldest into a monthly summary

Commit the memory update together with today.html (see Step 9 commit command above).

---

## Step 11 — Post-Approval Execution

This step triggers only when Andrew pastes an approval into Claude Code.

**Approval format:** a message beginning with `ITPM APPROVAL —`

When you see it:

1. Read the selected implementation options from the approval message
2. Invoke the builder-agent skill with a complete implementation spec for the approved work. Include: story ID, all acceptance criteria from backlog.md, selected option approach, UX states required, relevant file paths from the codebase.
3. After builder-agent completes, invoke verifier-agent with a review spec
4. Resolve any verifier findings; re-run verifier until clean
5. Update the daily entry in `ITPM/memory/routine_memory.md`:
   ```
   **Completed:** [brief list of what shipped]
   **Lessons:** [surprises, decisions made, patterns to add to fred_vision.md]
   **Days since last blocker:** [updated count]
   **Status:** Complete
   ```
6. If any lesson is a meaningful pattern or decision, add it to the relevant section of `ITPM/memory/fred_vision.md`
7. Append a completion summary banner to the top of `ITPM/routine/today.html` (inside `<div id="dashboard">`, before the header):
   ```html
   <div style="background:#ccfbf1;border:1px solid #99f6e4;border-radius:14px;padding:16px 20px;margin-bottom:20px;">
     <p style="font-size:14px;font-weight:700;color:#065f46;margin:0 0 4px;">Today's work is complete</p>
     <p style="font-size:13px;color:#065f46;margin:0;">[Brief summary of what shipped]</p>
   </div>
   ```
8. Commit:
   ```bash
   git add ITPM/routine/today.html ITPM/memory/routine_memory.md ITPM/memory/fred_vision.md
   git commit -m "itpm: mark complete — $(date '+%Y-%m-%d')"
   ```
