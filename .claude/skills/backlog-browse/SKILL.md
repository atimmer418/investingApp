---
name: backlog-browse
description: Use when you want a quick overview of every item in the FRED backlog — displays only the story ID and title, one per line, grouped by prefix.
---

# FRED Backlog — Browse

## Overview

Reads `FREDdocs/backlog.md` and prints every story ID + title, one per line. No descriptions, no context — just the index.

## Process

1. Run: `grep -E "^## [A-Z]+-[0-9]+" FREDdocs/backlog.md`
2. For each matching line, reformat `## PREFIX-NNN — Title` → `PREFIX-NNN: Title`
3. Print the results grouped by prefix (FRED, LPFRED, LEGAL, BUSINESS, DESIGN, DEV, QA), with a blank line between groups. Omit any prefix group that has no items.
4. Print a final count line: `Total: N items`

## Output Format

```
FRED-100: RAG chunks for app knowledge and philosophy
FRED-101: Set up emailer for all transactional notifications
...

LPFRED-153: Add emailer to FRED landing page
...

Total: N items
```

## Rules

- Do not read or summarize item bodies — title line only.
- Do not add commentary, recommendations, or triage scoring.
- Do not ask clarifying questions. Just print the index and stop.
