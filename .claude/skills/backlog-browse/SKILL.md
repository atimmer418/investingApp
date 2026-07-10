---
name: backlog-browse
description: Use when you want a quick overview of every item in the FRED backlog — displays only the story ID and title, one per line, grouped by prefix then by status.
---

# FRED Backlog — Browse

## Overview

Reads `FREDdocs/backlog.md` and prints every story ID + title, one per line. No descriptions, no context — just the index, grouped by prefix and then by status.

## Process

1. Run: `grep -E "^## [A-Z]+-[0-9]+" FREDdocs/backlog.md`
2. For each matching line, reformat `## PREFIX-NNN — Title` → `PREFIX-NNN: Title`. Keep any status emoji (`💤` / `🚫` / `✓`) that sits right after the em-dash — it stays in front of the title.
3. Determine each item's **status** from the character right after `— `:
   - no emoji (title starts with a normal character) → **Ready**
   - `💤` → **Sleeping**
   - `🚫` → **Blocker**
   - `✓` → **Done**
4. Group by prefix in this order: FRED, LPFRED, LEGAL, BUSINESS, DESIGN, DEV, QA. Omit any prefix with no items.
5. Within each prefix, order the items by status: **Ready → Sleeping → Blocker → Done**. Preserve backlog file order within each status. Put a blank line between status sub-groups; omit a status sub-group entirely if it has no items.
6. Print each prefix as a bare header line (e.g. `FRED`) followed by its status-ordered items. Separate prefix groups with a blank line.
7. Print a final count line: `Total: N items`

## Output Format

```
FRED
FRED-187: Investigate Plaid paycheck-triggered investment flow
FRED-189: Fix bank account subtype always showing Checking

FRED-100: 💤 RAG chunks for app knowledge and philosophy
FRED-101: 💤 Set up emailer for all transactional notifications

FRED-173: 🚫 Lock referral entry until 30 days post-trial

FRED-99: ✓ Implement all features from tiered pricing

LPFRED
LPFRED-184: Update LP calculator to net-income yield model

LPFRED-153: 💤 Add emailer to FRED landing page

DEV
DEV-190: ✓ Resolve @capacitor peer conflict (drop --legacy-peer-deps)
DEV-198: ✓ Eliminate package-lock.json libc-field churn in diffs

Total: N items
```

## Rules

- Do not read or summarize item bodies — title line only.
- Do not add commentary, recommendations, or triage scoring.
- Keep the status emoji on each line; do not add status text labels.
- Order within a prefix is always Ready → Sleeping (`💤`) → Blocker (`🚫`) → Done (`✓`); skip any status with no items.
- Do not ask clarifying questions. Just print the index and stop.
