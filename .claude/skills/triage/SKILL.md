---
name: triage
description: Use when starting a FRED work session to decide what to build today, when the day's work needs to be picked from FREDdocs/backlog.md, or when setting up the backlog for the first time. Pass --mode=override to pick exactly one on-demand item regardless of day.
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
| `--mode=override` (any day) | On-demand | Exactly 1 item (any type) |

**Override:** If invocation args contain `--mode=override`, pick exactly 1 item regardless of day.

## Definitions

- **Quick win** — under ~1 hour, low ambiguity, satisfying to ship (copy edits, small bug fixes, config tweaks, sending a single email).
- **Hard thing** — 2+ hours of meaningful technical or strategic MVP work (Plaid, Alpaca, auth, RAG, content engine architecture).
- **Creative thing** — content, design, brand, copy, brainstorming, or anything generative rather than executional.

## Process

1. Read `FREDdocs/backlog.md`. If it doesn't exist → jump to **First-Run Setup**.
2. Read `.claude/REFERENCES.md` to know which internal docs exist and their paths.
3. Read `.claude/skills/triage/priorities.md` if it exists.
4. Check the actual current date and determine mode from the table above.
5. Categorize every backlog item: `[code]` (builder_agent can execute), `[founder]` (only Andrew can do), or `[research]`.
6. Score items against priorities from `priorities.md` plus the project context below.
7. Pick the right number per the day-of-week rule.
8. For each pick, produce a **before/after pair** (see Ticket Format).
9. Write output to `FREDdocs/today.md`. Do not modify `backlog.md`.

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
- Don't reformat or rewrite items in `backlog.md` after first-run setup.
- Don't use `.claude/CONTEXT.md` for prioritization — it's for code conventions only.
- Don't ask Andrew what day it is — check the current date programmatically.
