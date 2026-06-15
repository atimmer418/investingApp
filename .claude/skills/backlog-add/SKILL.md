---
name: backlog-add
description: Use when adding new items to the FRED project backlog from raw notes or a bulk dump — parses items, assigns the correct project prefix, inserts each into the matching status section of FREDdocs/backlog.md (new items default to # READY) after confirmation, then offers to enrich code-relevant stories (Summary + acceptance criteria) via the triage skill.
---

# FRED Backlog — Add Items

## Overview

Parses a raw notes dump into numbered story items, assigns the correct project prefix based on category, determines each item's status, and **inserts each item into the matching status section** of `FREDdocs/backlog.md` after confirmation. **New items default to the `# ✅ READY` section** — they only go elsewhere when they're being parked for now (`# 💤 SLEEPING`) or are waiting on something external (`# 🚫 BLOCKED`). Does not overwrite existing entries. After inserting, it offers to hand each code-relevant story (`FRED`, `DEV`, `QA`, `LPFRED`) to the **triage** skill's `--enrich` flow, which adds a `### Summary` and `### Acceptance Criteria` block to that backlog entry.

## Prefix Reference

| Prefix | Use for |
|--------|---------|
| `FRED` | Core app: backend Spring Boot, frontend Angular/Ionic, feature work, bug fixes, auth, Alpaca, Plaid |
| `LPFRED` | Landing page (fredvested.com): copy, design, calculators, charts, emailer, testimonials, SEO |
| `LEGAL` | Legal review, compliance, filings, TOS, privacy policy, securities attorney, regulatory |
| `BUSINESS` | Founder-only tasks: strategy, operations, partnerships, calls, emails, hiring, investor outreach |
| `DESIGN` | Brand and visual assets: Fred character art, merchandise, loading screens, color systems, mockups |
| `DEV` | Developer tooling: MCP setup, CI/CD, infrastructure, build tools, Claude tooling, EXPO, Railway |
| `QA` | Testing tasks: manual testing, device testing, regression checks, end-to-end verification |

When in doubt between `FRED` and another prefix, ask Andrew rather than guess.

## Status Section Reference

The backlog is organized into status sections, in this order: `# ✅ READY`, `# 💤 SLEEPING`, `# 🚫 BLOCKED`, `# ✓ DONE`. A newly-added item goes into one of the first three:

| Section | When to use it | Title marker |
|---------|----------------|--------------|
| `# ✅ READY` | **Default for new items** — ready to be picked up next; not parked, not waiting on anything | none |
| `# 💤 SLEEPING` | Parked "for now" / later / someday / explicitly not a priority yet | `💤 ` right after the `— ` |
| `# 🚫 BLOCKED` | Waiting on an external party, dependency, or something not yet available | `🚫 ` right after the `— ` |

**Default to `# ✅ READY`** unless the note clearly signals the item should sleep or is blocked. When unsure which of the three a non-Ready item belongs in, ask Andrew rather than guess. Never place new items in `# ✓ DONE`.

## Process

1. Read `FREDdocs/backlog.md`. Scan for all `## [A-Z]+-NNN` patterns to find the highest existing story number. Next number = highest + 1. All prefixes share the same number sequence. Also note the section headers and their boundaries (`# ✅ READY`, `# 💤 SLEEPING`, `# 🚫 BLOCKED`, `# ✓ DONE`) so you know where to insert in step 7.
2. Ask Andrew to paste the raw notes dump.
3. Parse into individual items using line breaks, bullets, and obvious topic shifts as separators. Ask to clarify rather than guess on ambiguous splits.
4. For each item, assign the correct prefix from the table above and the next sequential number, incrementing by 1 per item. Then assign each item a **status section** using the Status Section Reference — **default to `# ✅ READY`** unless the note clearly signals the item should sleep (parked for now / later) or is blocked (waiting on something external).
5. Generate a short title (5–8 words) for each.
6. Show the parsed result inline — each item's prefix, number, title, **target status section (Ready / Sleeping / Blocked)**, and original note. Then present the confirmation as an **`AskUserQuestion`** (header "Confirm") with these options:
   - **Looks right — enrich** — confirm the list, insert it (step 7), then enrich the code-relevant stories (step 8). *Include this option only when at least one parsed item is `FRED`, `DEV`, `QA`, or `LPFRED`.*
   - **Looks right — don't enrich** — confirm the list and insert it (step 7); skip enrichment. *When no parsed item is enrichable, this is the only "looks right" option — label it just **Looks right**.*
   - **No — tell me what to change** — write nothing; Andrew says what to fix; re-parse and show again.
   Do not write to `backlog.md` until Andrew picks one of the "Looks right" options.
7. **INSERT each confirmed item into its assigned status section** — not at the bottom of the file:
   - **Ready** items → at the end of the `# ✅ READY` section (just before the `# 💤 SLEEPING` header), with **no** status marker.
   - **Sleeping** items → at the end of the `# 💤 SLEEPING` section (just before `# 🚫 BLOCKED`), with `💤 ` right after the `— ` in the title.
   - **Blocked** items → at the end of the `# 🚫 BLOCKED` section (just before `# ✓ DONE`), with `🚫 ` right after the `— ` in the title.
   Keep one blank line between entries. Do not overwrite or modify existing entries, and never insert into `# ✓ DONE`.
8. **Enrich (only when Andrew chose "Looks right — enrich").** For each newly-added story whose prefix is `FRED`, `DEV`, `QA`, or `LPFRED`, in ascending ID order, invoke the **triage** skill's `--enrich=<ID>` flow, one story at a time. Each runs triage's per-story A/C gate (Approve / Edit / Skip / Block) and, on approval, appends a `### Summary` + `### Acceptance Criteria` block to that backlog entry. It does **not** mark the story In Progress. `BUSINESS`, `LEGAL`, and `DESIGN` stories are always left as raw entries — triage's code-oriented ticket format doesn't fit them. When finished, report which IDs were enriched and which were left as raw entries.

## Item Format

Ready item (default — no status marker):
```
## [PREFIX]-NNN — Short descriptive title here
Original note text, preserved as-is.
```

Sleeping or Blocked item (status marker right after the `— `):
```
## [PREFIX]-NNN — 💤 Short descriptive title here
## [PREFIX]-NNN — 🚫 Short descriptive title here
```

## Classification Heuristics

**FRED vs others:**
- Involves writing code (Java, TypeScript, Swift, SQL, SCSS) → `FRED`
- About the fredvested.com website, not the app → `LPFRED`
- Involves talking to a lawyer, filing a document, or regulatory review → `LEGAL`
- Only Andrew can do it (call, email, meeting, business decision) → `BUSINESS`
- Creating a visual asset not tied to app code (character art, logo, merchandise) → `DESIGN`
- About the dev environment or build process itself (not the app features) → `DEV`
- Manually testing something on a device or in a browser → `QA`

**Edge cases:**
- In-app transparency features (showing assumptions, disclaimers as UI): `FRED`
- App Store submission or deployment pipeline: `DEV`
- Writing copy that goes into coded app UI: `FRED`
- Writing copy for the landing page only: `LPFRED`
- Social proof or testimonials for the landing page: `LPFRED`
- Social proof built as an in-app feature: `FRED`

## What to Avoid

- Don't overwrite `backlog.md` — insert each item into its status section (new items default to `# ✅ READY`); never modify or overwrite existing entries.
- Don't modify existing entries when inserting.
- Don't invent story numbers — always read the current highest first to avoid collisions.
- Don't skip or reuse numbers, even where gaps exist from merges.
- Don't use `FRED` as a catch-all when a more specific prefix clearly applies.
- Don't write to the file until Andrew confirms the parsed list.
- Don't enrich `BUSINESS`, `LEGAL`, or `DESIGN` stories — only `FRED`, `DEV`, `QA`, and `LPFRED` go through triage `--enrich`.
