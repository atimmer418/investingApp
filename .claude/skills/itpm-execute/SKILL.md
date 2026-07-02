---
name: itpm-execute
description: FRED ITPM execution brain — consumes a queued approval or revision from ITPM/pending/action.json, then either rebuilds the plan (revision) or runs builder-agent + verifier-agent to ship the approved work (approval), updating the dashboard state throughout. Fired by the itpm-execute routine via API after Andrew approves or revises on today.fredvested.com.
---

# FRED ITPM Execution Routine

This skill is the EXECUTION brain. It runs only when there is a queued action. It does NOT pick stories or generate plans from scratch — that is the planning skill (`.claude/skills/itpm/SKILL.md`). Keep the two separate.

---

## Step 0 — Sync the Checkout to Latest `develop`

This is an unattended routine and the local checkout may be behind `origin/develop`. Sync FIRST, before consuming the action, so that everything downstream — the `action.json` you read, the code the builder builds against, and the `verify/<story>` branch you cut — starts from the latest `develop`. The working tree is clean at this point (no build has run yet), so this is a safe fast-forward/merge:

```bash
git pull --no-rebase origin develop
```

This single sync covers all three action types (`revision`, `approval`, `rework`). The other `git pull --no-rebase origin develop` calls later in the skill are pre-push guards (they prevent non-fast-forward rejections right before a commit is pushed); this one guarantees a fresh *starting* point.

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
2. Read (with the **Read tool**, never `cat`/`sed`/`grep` on `.claude/` — Bash-touching `.claude/` paths trips a self-mod guard that hangs this session): `.claude/skills/itpm/SKILL.md`, `ITPM/memory/fred_vision.md`, `FREDdocs/backlog.md`, `ITPM/memory/routine_memory.md`.
3. **Parse the skipped story ID(s) from `content`** (e.g. "Andrew skipped today's story: FRED-100"). These are HARD EXCLUSIONS.
   - **Log the skip durably:** add `**Skipped:** FRED-XXX (YYYY-MM-DD)` to today's `routine_memory.md` entry. This is what stops the same story coming back.
   - Build the exclusion set: every story ID in today's skip + every story skipped in the last 7 days of memory entries.
4. Decide the new pick: if Andrew named a story in step 1, use it (it overrides scoring). Otherwise re-run the planning routine (planning skill Steps 1, 3–10) with one absolute constraint: **the new pick MUST be a different story than any in the exclusion set** — pick the next-best story that is not excluded, even if scoring ranks a skipped one highest.
5. Rewrite ONLY the content inside `<div id="dashboard">` in `ITPM/routine/today.html` with the revised plan. Set `data-populated="true"` AND `data-state="planning"` on the `#dashboard` div. **CSS is in `/styles.css` and JS in `/app.js` — never edit or re-inline them; leave the `<link>`/`<script src>` in today.html untouched.** The priority card must show the NEW story, not the skipped one.
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

**Generate the Acceptance Check Manifest** (after reading the A/C above, before dispatching the builder) at `ITPM/agent-memory/manifest-<story-id>.md` from the story's acceptance criteria. One entry per A/C item. The format is inlined below — **do NOT shell out to read `.claude/CONTEXT.md` or anything under `.claude/`; reading `.claude/` paths via Bash trips a self-modification guard that hangs this unattended session.** Use this exact format, one block per acceptance criterion:

```
## AC-1: <the acceptance criterion, restated>
- Type:     backend-unit | frontend-unit | api-integration | ui-acceptance
- Check:    <concrete, executable pass-condition>
- Evidence: <leave empty — the verifier fills this: JUnit test name / curl assertion / screenshot path>
- Status:   pending        # verifier flips to pass | fail
```

Picking `Type`: `backend-unit` → `cd backend && ./gradlew test --tests <FullyQualifiedClass>` (plain JUnit 5, no `@SpringBootTest`, no DB). `frontend-unit` → `cd frontend && ng test --include='**/<name>.spec.ts' --watch=false --browsers=ChromeHeadless` (always target the specific spec). `api-integration` → a curl assertion. `ui-acceptance` → a screenshot + network assertion. Leave every `Evidence` empty and `Status: pending`. Commit it:
```bash
git add ITPM/agent-memory/manifest-*.md
git commit -m "itpm: manifest for <story-id>" && git push origin develop
```

### Step C — Implement

4. Invoke **builder-agent** with a complete spec. **CRITICAL — autonomous mode:** this is an unattended cloud routine; nobody is watching to answer questions. The spec you pass MUST open with this directive, verbatim:

   > **AUTONOMOUS MODE — DO NOT call AskUserQuestion. There is no human watching this session; calling it will hang the routine forever.** When you hit a decision point that would normally make you stop and ask (ambiguous spec, an edge case the A/C didn't cover, an out-of-scope temptation, etc.): make the most reasonable, lowest-risk call that satisfies the acceptance criteria and the FRED conventions, implement it, and record the decision + your reasoning in your implementation-notes file for the verifier and Andy to review. The ONE exception is a genuine HARD BLOCKER — something that makes the build impossible to complete correctly (a Hard Rule would be violated: auth/JWT change required, DB schema change required, or the spec is fundamentally contradictory). In that case do NOT guess and do NOT ask — stop, and report back to me (the execute routine) exactly what blocks you and why, so I can surface it as a failed-state blocker to Andy.

   Then the rest of the spec:
   - Story ID and title
   - The approved approach (edited description verbatim)
   - Execution order from the approval, if provided — follow it exactly
   - All acceptance criteria from backlog.md
   - All UX states required (loading / empty / error / retry)
   - Relevant file paths in the codebase
   - Design constraints from fred_vision.md
   - Any UI mockup design feedback
   - Any additional context from Andrew (this includes his answers to the dashboard questions — the predicted/confirmed placeholders ARE his answers; treat them as decisions already made, not open questions)
   - The path to the Acceptance Check Manifest (`ITPM/agent-memory/manifest-<story-id>.md`)
     — instruct the builder to work manifest-first and self-fill the checks it can verify

   If the builder reports a HARD BLOCKER instead of completing, jump to the Hard Blocker handling below (set `failed`, populate `#failure-detail`, notify Andy) — do not retry blindly.
5. PushNotification — title `FRED ITPM — Verifying`, message: builder done, verifier starting.
6. Invoke **verifier-agent** with the diff + the manifest path. It executes every
   manifest Check, attaches Evidence, and returns: a verdict (APPROVED / REVISION
   REQUIRED), an **in-scope failures** list, and an **out-of-scope discoveries** list.
7. Bounded fix-loop — **UP TO 2 GO-BACKS** to the builder (the builder gets 2 chances to fix; up to 3 verifier passes total):
   - If REVISION REQUIRED and go_backs_done < 2: hand back to builder-agent ONLY the
     in-scope failures ("fix exactly these; do not re-architect or touch out-of-scope
     items"), then re-invoke the verifier (back to step 6). Increment go_backs_done.
   - If still REVISION REQUIRED after the 2nd go-back: treat as a Hard Blocker (below) — do
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

9. Update `ITPM/memory/routine_memory.md` today's entry:
   - What shipped (specific files/components changed)
   - How it moves the production readiness needle
   - Updated readiness score estimate
   - Lessons learned
   - Update `**Days since last blocker:**` (increment by 1 vs the prior entry if no blocker today)
   - Set `**Status:** Complete`
   Add any meaningful pattern or decision to `ITPM/memory/fred_vision.md`.

### Step D2 — Push the story code; CI opens the PR, verifies, and merges it

The builder's code changes are uncommitted in the working tree (the build does not commit
them itself). Push them on a `verify/<story>` branch. **You do NOT open the PR** — your
integration can push but cannot create PRs (GitHub 403s "Resource not accessible by
integration"). The `auto-pr.yml` GitHub Action opens the PR, and `verify.yml` verifies it and
squash-merges to `develop` when green. The dashboard (`today.html`) + memory still go to
`develop` directly in Step E. At this point the ONLY uncommitted changes are the build's, so
`git add -A` stages exactly the story's work.

First capture the design-fidelity inputs:
- Copy the chosen UI mockup (from the approval `content` / today.html) to `ITPM/verify/design-ref/<story-id>.png` (or `.html`).
- Write the route the story changes to `ITPM/verify/route-<story-id>.txt` — a single line, the Angular route the rendered page lives at (e.g. `/change-bank-account` or `/tabs/tab3`). CI renders this route and compares it to the mockup. If the story has no single user-facing route, skip this file (the design-fidelity check then skips too).
- Write Andrew's design feedback for this story — the additions / deletions / changes he included when selecting the option on today.fredvested.com (from the approval `content`, the same "UI mockup design feedback" you pass to the builder) — to `ITPM/verify/design-notes-<story-id>.txt`. This tells the vision judge which intentional deviations from the raw mockup to expect, so Andrew's requested changes are NOT flagged as drift. If he accepted the option as-is with no changes, skip this file.

Push the branch (do NOT run `gh pr create` / a create-PR MCP tool — the Action does that):
```bash
STORY=<story-id>
git checkout -b "verify/$STORY"
git add -A                                   # the build's changes + the design-ref
git commit -m "itpm: $STORY — <one-line summary of the build>"
git push -u origin "verify/$STORY"
git checkout develop                         # working tree is now clean on develop
```
Set `data-state="verifying-in-ci"` on `today.html`, commit+push it to develop, and
PushNotification "Build done — verifying in CI".

Now wait for CI on the auto-opened PR (you can READ PRs/checks even though you can't create
them). Poll for the PR (the Action opens it within ~30s), then watch its checks:
```bash
for i in $(seq 1 20); do PR=$(gh pr list --head "verify/$STORY" --base develop --state open --json number -q '.[0].number'); [ -n "$PR" ] && break; sleep 10; done
gh pr checks "$PR" --watch --interval 30
```
- **CI green** → `verify.yml` squash-merges the PR to develop automatically → proceed to Step E (Completed).
- **CI red** → bounded fix-loop, **UP TO 2 GO-BACKS**, ON THE PR BRANCH (`verify/$STORY`): hand the
  failing CI logs to builder-agent → it fixes on the branch → `git push` → CI re-runs. After the
  2nd go-back still fails, treat as a Hard Blocker (leave the PR open, set `data-state="failed"`,
  notify). Do NOT proceed to Completed while CI is red.

**Fallback — only if the branch push itself fails (e.g. no git auth at all):** commit directly to
develop (`git add -A && git commit && git pull --no-rebase origin develop && git push origin develop`)
and flag in the completion PushNotification that the CI gate was skipped. This is rare — pushing
works in the routine sandbox; only PR *creation* was blocked, and the Action handles that now.

### Step E — Update today.html to Completed

10. Read the current `ITPM/routine/today.html`. Then make ONLY these two surgical edits — do not rewrite or restructure the rest of the file, and do NOT touch CSS/JS (they're in `/styles.css` and `/app.js`):
   a. Set `data-state="completed"` on the `#dashboard` div (change the attribute value only).
   b. Replace the INNER contents of `#completion-content` (between `<div class="card" id="completion-content">` and its closing `</div>`) with:
      ```html
      <div style="margin-bottom:16px;">
        <p style="font-size:15px;font-weight:700;color:var(--text);margin:0 0 8px;">[Story ID] — [Story title]</p>
        <p style="font-size:14px;color:var(--gray);line-height:1.65;margin:0 0 12px;">[What was implemented — specific components/files]</p>
        <p style="font-size:13px;font-weight:600;color:var(--text);margin:0 0 4px;">Acceptance criteria satisfied:</p>
        <ul style="font-size:13px;color:var(--gray);padding-left:18px;margin:0 0 12px;">[one li per criterion]</ul>
        <p style="font-size:13px;font-weight:600;color:#059669;margin:0;">[How this moved the production readiness needle]</p>
      </div>
      ```
   **CRITICAL — do NOT add any `style="display:none"` (or any inline style) to `#completion-section`, `#looks-good-btn`, or `#rework-block`. Their visibility is owned entirely by `/styles.css` + `/app.js`. The `#completion-section` opening tag must stay exactly `<div class="section-group section-intermediary-only" id="completion-section">` with no style attribute. Adding `display:none` there hides the whole completion view on the completed page — a known regression.**
11. Commit and push:
    ```bash
    git pull --no-rebase origin develop
    git add ITPM/routine/today.html ITPM/memory/routine_memory.md ITPM/memory/fred_vision.md
    git commit -m "itpm: complete — $(date '+%Y-%m-%d')"
    git push origin develop
    ```
12. PushNotification — title `FRED ITPM — Done`, message: story ID + what shipped + readiness delta + that Andrew can press "Looks Good" when satisfied.

---

## IF type is `rework`

Andrew reviewed a COMPLETED build, was not satisfied, and submitted feedback. The same story must be reworked — **do NOT re-pick or re-plan.** The `content` holds the story ID and his feedback.

1. Parse the story ID and feedback from `content`.
2. Read `ITPM/routine/today.html` to recover what was built (the completion summary, the originally selected approach) and `FREDdocs/backlog.md` for the story's acceptance criteria. Read `ITPM/memory/fred_vision.md` for design constraints.
3. The Cloudflare function already set `data-state="intermediary"`. Send a PushNotification — title `FRED ITPM — Reworking`, message: the story is being reworked on your feedback.
4. Invoke **builder-agent** with: the story ID + title, the original approach, **Andrew's rework feedback as the priority directive** ("the previous build shipped X; Andrew wants these changes: …"), all acceptance criteria, and the manifest path. Tell it to address the feedback specifically, not re-architect.
5. Invoke **verifier-agent** with the diff + manifest (same bounded fix-loop, **up to 2 go-backs**, as the approval path). If it can't pass after the 2nd go-back, treat as a Hard Blocker (set `failed`, notify).
6. On success: update today's `routine_memory.md` entry with a `**Reworked:** [what changed per feedback]` note. Then redo **Step E** (update `today.html` back to `data-state="completed"`, refresh `#completion-content` with the new summary, keep `#looks-good-btn` visible).
7. Ship the reworked code via the **Step D2** flow (push the `verify/<story>` branch; the `auto-pr.yml` Action opens the PR; `verify.yml` verifies + squash-merges on green). Then PushNotification — title `FRED ITPM — Reworked`, message: what changed + that Andrew can press "Looks Good" or request more changes.

Then stop.

---

## Note on planning

Plan generation (story selection, triage, options/mockups, metrics) is owned by the planning skill `.claude/skills/itpm/SKILL.md`, NOT this skill. This skill only consumes an already-queued action.
