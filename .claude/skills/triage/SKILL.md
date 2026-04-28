---
name: triage
description: Use when starting a FRED work session to decide what to build today, when the day's work needs to be picked from FREDdocs/backlog.md, or when setting up the backlog for the first time. Pass --mode=override to pick one on-demand item, --story=FRED-XXX to triage one specific item by ID, or --done=FRED-XXX to mark a story complete.
---

# FRED Triage

## Overview

Reads `FREDdocs/backlog.md` and picks today's work using day-of-week scheduling rules. Shapes each pick into a structured ticket with file paths, doc references, acceptance criteria, and a time estimate. Writes output to `FREDdocs/today.md`, overwriting any previous version.

## Day-of-Week Rules

Check the actual current date — do not ask.

| Day(s) | Mode | Picks |
|--------|------|-------|
| Wed, Fri, Sat | Full day | 3 items: 1 quick win + 1 hard thing + 1 creative thing |
| Sun, Mon, Thu | Limited time | 2 quick wins only |
| Tuesday | No time | 0 items — short message + Flags section only |
| `--mode=override` (any day) | On-demand | Exactly 1 item (any type); also appends to `stories_in_progress.md` |
| `--story=<ID>` (any day) | Targeted | Exactly 1 item — the backlog entry matching `<ID>`; also appends to `stories_in_progress.md` |
| `--done=<ID>` (any day) | Completion | Marks one story done in `stories_in_progress.md` and `backlog.md` |

**Override:** If invocation args contain `--mode=override`, pick exactly 1 item regardless of day. Append the chosen story to `FREDdocs/stories_in_progress.md` (dedup by ID, same as `--story`).

**Story target:** If invocation args contain `--story=<ID>` (e.g. `--story=FRED-119`), skip day-of-week rules and scoring entirely — shape only that one backlog entry. Match `<ID>` case-insensitively. If no match, report the error and list closest matches — stop without writing any file.

**Done flag:** If invocation args contain `--done=<ID>`, run the **Done Flag Flow** — do not pick any work items.

## Definitions

- **Quick win** — under ~1 hour, low ambiguity, satisfying to ship (copy edits, small bug fixes, config tweaks, sending a single email).
- **Hard thing** — 2+ hours of meaningful technical or strategic MVP work (Plaid, Alpaca, auth, RAG, content engine architecture).
- **Creative thing** — content, design, brand, copy, brainstorming, or anything generative rather than executional.

## Process

0. **Check invocation args first:**
   - Contains `--story=<ID>` → jump to **Targeted Story Flow**; skip everything below.
   - Contains `--done=<ID>` → jump to **Done Flag Flow**; skip everything below.
   - Otherwise, continue with steps 1–9.
1. Read `FREDdocs/backlog.md`. If it doesn't exist → jump to **First-Run Setup**.
2. Read `.claude/REFERENCES.md` to know which internal docs exist and their paths.
3. Read `.claude/skills/triage/priorities.md` if it exists.
4. Check the actual current date and determine mode from the table above.
5. Categorize every backlog item: `[code]` (builder_agent can execute), `[founder]` (only Andrew can do), or `[research]`.
6. Score items against priorities from `priorities.md` plus the project context below.
7. Pick the right number per the day-of-week rule.
8. For each pick, produce a **before/after pair** (see Ticket Format).
9. Write output to `FREDdocs/today.md`. Do not modify `backlog.md`.
   - If `--mode=override`: also append the chosen story to `FREDdocs/stories_in_progress.md` under **In Progress** (dedup by ID).

## Targeted Story Flow (`--story=<ID>`)

1. Parse `<ID>` from the invocation arg (e.g. `--story=FRED-119` → `FRED-119`).
2. Read `FREDdocs/backlog.md`. Find the heading `## <ID> — <title>` (case-insensitive on `<ID>`).
3. If not found → tell Andrew the ID is not in the backlog, list the closest IDs present, stop. Write nothing.
4. Read `.claude/REFERENCES.md` to know which internal docs are relevant.
5. Read `.claude/CONTEXT.md` to orient yourself on the tech stack, conventions, and code layout before building the ticket.
6. Build a structured ticket using the **Ticket Format** below (before/after pair, file paths, doc references, acceptance criteria, time estimate, label).
7. Write the ticket to `FREDdocs/.stories/<ID>.md`. Create `.stories/` if it does not exist. Overwrite if `<ID>.md` already exists (re-triaging refreshes the ticket).
8. Append to `FREDdocs/stories_in_progress.md` under **In Progress** if `<ID>` is not already listed anywhere in that file. Format: `- <ID> — <title>`. Do not duplicate if already present in In Progress or Done.
9. Do **not** touch `FREDdocs/today.md`. Do **not** produce Punted or Flags sections.

## Done Flag Flow (`--done=<ID>`)

1. Parse `<ID>` from the invocation arg (e.g. `--done=FRED-119` → `FRED-119`).
2. Read `FREDdocs/stories_in_progress.md`. Find the line `- <ID> — <title>` under **In Progress**.
3. If not found in In Progress → tell Andrew and stop. (If it's already in Done, say so explicitly.)
4. Remove the line from **In Progress** and append it to the **Done** section.
5. Read `FREDdocs/backlog.md`. Find the heading `## <ID> — <title>`. Change it to `## <ID> — ✓ <title>`. This marks the story as complete at a glance in the backlog.
6. Do **not** delete `FREDdocs/.stories/<ID>.md` — it stays as a record of what was built.
7. Report to Andrew: story moved to Done, backlog marked.

## Ticket Format

**Before:** the original line(s) from `backlog.md`, verbatim, with its story number.

**After:** structured ticket containing:
- One-line summary
- File paths or systems involved — use `.claude/CONTEXT.md` conventions for code paths (controllers, services, repositories, DTOs; frontend services and components)
- Relevant doc references from `.claude/REFERENCES.md` when the ticket touches those areas — cite the exact path so Andrew doesn't have to look them up
- Acceptance criteria
- Edge cases or open questions
- Time estimate: `<1hr`, `1-3hr`, or `3hr+`
- Label: `[code]`, `[founder]`, or `[research]`

## Output Sections in today.md

Applies to day-of-week and `--mode=override` runs only. The `--story` flow writes to `FREDdocs/.stories/<ID>.md`; `--done` modifies `stories_in_progress.md` and `backlog.md`.

1. **Today's Picks** — the before/after pairs
2. **Punted** — 3–5 items that almost made the cut, one-sentence reason each
3. **Flags** — time-sensitive items regardless of mode (filings, expiring access, scheduled deadlines, calls due)

## Project Context (for scoring)

- **Two workstreams:** MVP build (technical) and content engine (marketing/distribution).
- **Content publishing is blocked** — Stradley Ronon legal review not yet cleared. Drafting and ideation are fine for "creative thing" picks. Do not pick anything requiring public posting until Andrew confirms clearance.
- **Founder tasks** — valid in any bucket; label `[founder]`. builder_agent cannot run them.
- If `priorities.md` doesn't exist, apply the above and surface it as a gap after triage.

## First-Run Setup

When `FREDdocs/backlog.md` does not exist:

1. Tell Andrew you need the backlog and ask him to paste it in bulk.
2. Parse the dump into individual items using line breaks, bullets, and obvious topic shifts. Ask to clarify rather than guess on ambiguous splits.
3. Assign story numbers starting at `FRED-100`, incrementing by 1.
4. Generate a short title (5–8 words) per item.
5. Format exactly as:
   ```
   ## FRED-100 — Short descriptive title here
   Original note text, preserved as-is.

   ## FRED-101 — Another short title
   Original note text.
   ```
6. Show the parsed result inline and ask Andrew to confirm. Fix problems and show again. Only write `FREDdocs/backlog.md` after confirmation.
7. After saving, ask Andrew 3–5 questions about current priorities (what's in flight, what's blocked, what's most urgent) and write answers to `.claude/skills/triage/priorities.md`.

## What to Avoid

- Don't assign a `[founder]` task to a code slot — builder_agent can't run it.
- Don't pick content that requires public posting until legal review is cleared.
- Don't invent file paths — use `.claude/REFERENCES.md`; surface unknowns as open questions in the ticket.
- Don't pad picks. If Sunday only has one good quick win, pick one and explain.
- Don't reformat or rewrite items in `backlog.md` after first-run setup — except adding `✓` via `--done`.
- Don't use `.claude/CONTEXT.md` for prioritization — it's for code conventions only.
- Don't ask Andrew what day it is — check the current date programmatically.
- Don't write to `today.md` when `--story=<ID>` or `--done=<ID>` is used.
- Don't append to `stories_in_progress.md` if the ID is already listed anywhere in that file.
- Don't accept a `--story` or `--done` ID that isn't in `backlog.md` — surface the error and stop.
