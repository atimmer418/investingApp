---
name: itpm-execute
description: FRED ITPM execution brain — consumes a queued approval or revision from ITPM/pending/action.json, then either rebuilds the plan (revision) or runs builder-agent + verifier-agent to ship the approved work (approval), updating the dashboard state throughout. Fired by the itpm-execute routine via API after Andrew approves or revises on today.fredvested.com.
---

# FRED ITPM Execution Routine

This skill is the EXECUTION brain. It runs only when there is a queued action. It does NOT pick stories or generate plans from scratch — that is the planning skill (`.claude/skills/itpm/SKILL.md`). Keep the two separate.

---

## Step 1 — Check for a Pending Action

```bash
cat ITPM/pending/action.json 2>/dev/null || echo NO_PENDING_ACTION
```

If the output is `NO_PENDING_ACTION` — stop immediately and end the session silently. This is rare: it means a prior run already consumed the action, or the fire arrived with nothing queued. It is not an error.

If the file exists, read its JSON: `{ "type": "approval" | "revision", "content": "...", "timestamp": "..." }`.

Delete it and commit so it is not processed twice:

```bash
git rm ITPM/pending/action.json
git commit -m "itpm: consume pending action"
git push origin develop
```

---

## Step 2 — Branch on Action Type

Read `type`. Follow the matching section below.

---

## IF type is `revision`

Andrew reviewed the plan and wants changes. The `content` field holds his feedback — it may include skipped stories, edited approaches, design feedback per UI mockup, and free-text notes.

1. **Read Andrew's guidance FIRST.** The `content` may contain "Guidance for the new pick:" or "Additional context:" free-text. This is the most important input — read it before anything else and let it drive the whole revision:
   - **If Andrew named a specific story** (e.g. "pick FRED-117", "do the tax docs page", "I want FRED-109 next") — that is AUTHORITATIVE. Pick exactly that story. Do not re-score or second-guess it. The only reasons to refuse: the story doesn't exist, is already done, or is a hard-blocked story — in which case pick nothing, leave the page, and PushNotification explaining why.
   - If the guidance is a preference rather than a named story (e.g. "something quick", "prefer UI work"), use it to shape the pick.
2. Read `.claude/skills/itpm/SKILL.md`, `ITPM/memory/fred_vision.md`, `FREDdocs/backlog.md`, `ITPM/memory/routine_memory.md`.
3. **Parse the skipped story ID(s) from `content`** (e.g. "Andrew skipped today's story: FRED-100"). These are HARD EXCLUSIONS.
   - **Log the skip durably:** add `**Skipped:** FRED-XXX (YYYY-MM-DD)` to today's `routine_memory.md` entry. This is what stops the same story coming back.
   - Build the exclusion set: every story ID in today's skip + every story skipped in the last 7 days of memory entries.
4. Decide the new pick: if Andrew named a story in step 1, use it (it overrides scoring). Otherwise re-run the planning routine (planning skill Steps 1, 3–10) with one absolute constraint: **the new pick MUST be a different story than any in the exclusion set** — pick the next-best story that is not excluded, even if scoring ranks a skipped one highest.
5. Rewrite `ITPM/routine/today.html` with the revised plan. Set `data-populated="true"` AND `data-state="planning"` on the `#dashboard` div. Do not change the CSS or `<script>` — only the content. The priority card must show the NEW story, not the skipped one.
6. Commit and push:
   ```bash
   git pull --no-rebase origin develop
   git add ITPM/routine/today.html ITPM/memory/routine_memory.md
   git commit -m "itpm: revised plan ($(date '+%Y-%m-%d')) — swapped out skipped story"
   git push origin develop
   ```
7. PushNotification — title `FRED ITPM — Plan Revised`, message: which NEW story was picked and that it avoided the skipped one.

Then stop.

---

## IF type is `approval`

The `content` field includes: selected approach, edited implementation description (use verbatim — do not substitute your own), edited execution order (follow exactly), any skipped stories, design feedback per UI mockup option, answers to questions, additional context, and a Tier-2 acceptance-criteria approval if present.

### Step A — Confirm State + Notify

Ensure `data-state` in `ITPM/routine/today.html` is `intermediary` (the Cloudflare function sets it on approval; if it still reads `planning`, patch it):

```bash
sed -i 's/data-state="planning"/data-state="intermediary"/' ITPM/routine/today.html
git add ITPM/routine/today.html && git commit -m "itpm: execution started" && git push origin develop
```

Send an early PushNotification — title `FRED ITPM — Build Started`, message: which story is being built.

### Step B — Read Context

1. Read `ITPM/routine/today.html` — identify the story, the selected option (or chosen UI mockup), and any inline edits Andrew made.
2. Read `FREDdocs/backlog.md` for the story's acceptance criteria. **If this was a Tier-2 story** (A/C proposed in the dashboard), write the approved/edited acceptance criteria back into `backlog.md` under that story, commit, and push BEFORE building.
3. Read `ITPM/memory/fred_vision.md` for design system context.

**Generate the Acceptance Check Manifest** (after reading the A/C above, before dispatching the builder) at `.claude/agent-memory/manifest-<story-id>.md` from the story's acceptance criteria (format defined in `.claude/CONTEXT.md` → Agents → The Acceptance Check Manifest). One entry per A/C item: pick the right `Type` (backend-unit | frontend-unit | api-integration | ui-acceptance), write a concrete executable `Check`, leave `Evidence` empty and `Status: pending`. Commit it:
```bash
git add .claude/agent-memory/manifest-*.md
git commit -m "itpm: manifest for <story-id>" && git push origin develop
```

### Step C — Implement

4. Invoke **builder-agent** with a complete spec:
   - Story ID and title
   - The approved approach (edited description verbatim)
   - Execution order from the approval, if provided — follow it exactly
   - All acceptance criteria from backlog.md
   - All UX states required (loading / empty / error / retry)
   - Relevant file paths in the codebase
   - Design constraints from fred_vision.md
   - Any UI mockup design feedback
   - Any additional context from Andrew
   - The path to the Acceptance Check Manifest (`.claude/agent-memory/manifest-<story-id>.md`)
     — instruct the builder to work manifest-first and self-fill the checks it can verify
5. PushNotification — title `FRED ITPM — Verifying`, message: builder done, verifier starting.
6. Invoke **verifier-agent** with the diff + the manifest path. It executes every
   manifest Check, attaches Evidence, and returns: a verdict (APPROVED / REVISION
   REQUIRED), an **in-scope failures** list, and an **out-of-scope discoveries** list.
7. Bounded fix-loop (cap = 2 cycles):
   - If REVISION REQUIRED and cycles_done < 2: hand back to builder-agent ONLY the
     in-scope failures ("fix exactly these; do not re-architect or touch out-of-scope
     items"), then re-invoke the verifier (back to step 6). Increment the cycle count.
   - If still REVISION REQUIRED after 2 cycles: treat as a Hard Blocker (below) — do
     NOT keep looping. The failure-detail must list the surviving in-scope failures.
   - Out-of-scope discoveries are NEVER handed to the builder and NEVER block the
     verdict.
8. On APPROVED: surface the verifier's out-of-scope discoveries to Andy as backlog
   drafts. Use the backlog-add skill to append them ONLY after Andrew confirms (include
   them in the completion PushNotification / dashboard so he can confirm). Do not
   silently append.

### If a Hard Blocker Is Hit (build cannot complete)

a. Set `data-state="failed"` in `ITPM/routine/today.html` (sed `planning`/`intermediary` → `failed`).
b. Populate `<p id="failure-detail">` with a plain-language reason for the blocker.
c. Append to today's `routine_memory.md` entry: `**Blocker:** [what blocked it]`, and record it so the morning brief avoids re-picking this story.
d. Commit and push (pull first).
e. PushNotification — title `FRED ITPM — Build Blocked`, message: the blocker reason. Then STOP.

### Step D — On Success, Update Memory

8. Update `ITPM/memory/routine_memory.md` today's entry:
   - What shipped (specific files/components changed)
   - How it moves the production readiness needle
   - Updated readiness score estimate
   - Lessons learned
   - Update `**Days since last blocker:**` (increment by 1 vs the prior entry if no blocker today)
   - Set `**Status:** Complete`
   Add any meaningful pattern or decision to `ITPM/memory/fred_vision.md`.

### Step E — Update today.html to Completed

9. Read the current `ITPM/routine/today.html`. Then:
   a. Set `data-state="completed"` on the `#dashboard` div.
   b. Replace the contents of `#completion-content` with:
      ```html
      <div style="margin-bottom:16px;">
        <p style="font-size:15px;font-weight:700;color:var(--text);margin:0 0 8px;">[Story ID] — [Story title]</p>
        <p style="font-size:14px;color:var(--gray);line-height:1.65;margin:0 0 12px;">[What was implemented — specific components/files]</p>
        <p style="font-size:13px;font-weight:600;color:var(--text);margin:0 0 4px;">Acceptance criteria satisfied:</p>
        <ul style="font-size:13px;color:var(--gray);padding-left:18px;margin:0 0 12px;">[one li per criterion]</ul>
        <p style="font-size:13px;font-weight:600;color:#059669;margin:0;">[How this moved the production readiness needle]</p>
      </div>
      ```
   c. Remove `style="display:none"` from `#looks-good-btn` so Andrew can confirm.
10. Commit and push:
    ```bash
    git pull --no-rebase origin develop
    git add ITPM/routine/today.html ITPM/memory/routine_memory.md ITPM/memory/fred_vision.md
    git commit -m "itpm: complete — $(date '+%Y-%m-%d')"
    git push origin develop
    ```
11. PushNotification — title `FRED ITPM — Done`, message: story ID + what shipped + readiness delta + that Andrew can press "Looks Good" when satisfied.

---

## Note on planning

Plan generation (story selection, triage, options/mockups, metrics) is owned by the planning skill `.claude/skills/itpm/SKILL.md`, NOT this skill. This skill only consumes an already-queued action.
