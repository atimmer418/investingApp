---
name: backlog-exhaust
description: Use when starting a FRED backlog clearance loop, when Andy asks to exhaust or drain the backlog, or when running /goal against FRED-, DEV-, QA-, DESIGN- prefixed stories end-to-end.
---

# Backlog Exhaust

## Overview

Pairs with `/goal` to drain `FREDdocs/backlog.md` hands-off: pick story → triage (A/C gate) → build → verify → mark done. You approve or skip each A/C, then step back.

**Prerequisite:** `triage --story` must include the A/C approval gate. Without it, stories build without approval.

## How to Start

1. Invoke `/backlog-exhaust` — loads this workflow into context.
2. Copy the `/goal` condition below and run it.

## `/goal` Condition (copy-paste this)

```
Every story heading in FREDdocs/backlog.md with prefix FRED-, DEV-, QA-, or DESIGN- has a marker (✓, 🚫, or 💤) in the title. Prove this each turn by running: grep -E '^## (FRED|DEV|QA|DESIGN)-' FREDdocs/backlog.md | grep -vE '— (✓|🚫|💤) ' and surfacing the output. Condition is met when the output is empty. Stop after 30 turns.
```

## Per-Turn Workflow

One story per turn:

1. **Pick.** Find the first heading in `FREDdocs/backlog.md` where prefix is `FRED-`, `DEV-`, `QA-`, or `DESIGN-` AND the title has no `✓`, `🚫`, or `💤` marker. Top-down; first match wins.
2. **Triage.** Run `triage --story=<ID>`. The A/C approval gate fires automatically inside triage:
   - `Approve` or `Edit` → continue to step 3.
   - `Skip` (💤) or `Block` (🚫) → triage writes the marker; skip to step 6.
3. **Build.** Dispatch `builder-agent` with `FREDdocs/.stories/<ID>.md` as input.
4. **Verify.** Dispatch `verifier-agent`. Check its first-line output:
   - `APPROVED` → step 5a.
   - `REVISION REQUIRED` → re-dispatch `builder-agent` with the verifier's `Reasoning:` section. Re-dispatch `verifier-agent`:
     - `APPROVED` → step 5a.
     - `REVISION REQUIRED` again → step 5b.
5a. **Mark done.** Run `triage --done=<ID>`. Commit: `git commit -am "done: <ID>"`. Go to step 6.
5b. **Mark blocked.** Edit `FREDdocs/backlog.md`: insert `🚫 ` before the title → `## <ID> — 🚫 <title>`. Append a `### Blocked` block with the verifier's `Reasoning:`. Commit. Go to step 6.
6. **End-of-turn summary.** Run and print:
   ```
   grep -E '^## (FRED|DEV|QA|DESIGN)-' FREDdocs/backlog.md | grep -vE '— (✓|🚫|💤) '
   ```
   Surface the output so the `/goal` evaluator can see remaining-story count.

## State Markers in `backlog.md`

Markers appear in the title: `## FRED-119 — [marker] Short Title`

| Marker | Meaning | Set by |
|--------|---------|--------|
| `✓` | done | `triage --done` |
| `🚫` | blocked (verify failed after retry, or Block at gate) | this workflow or `triage --story` gate |
| `💤` | skipped at A/C gate | `triage --story` gate |

## Server Assumptions

Angular HMR is always active. `spring-boot-devtools` auto-restarts Spring on classpath change. Do not start or stop servers in the workflow.

## Common Mistakes

- **Loop re-picks the same story.** Marker wasn't written or committed. Check step 5a/5b ran.
- **`/goal` stops after one turn.** Grep output wasn't surfaced in step 6 — the evaluator only reads the conversation.
- **Verifier flags prior stories' changes.** Expected — verifier uses `develop...HEAD`. Per-story commits (step 5a/5b) keep the diff scoped.
