---
name: backlog-add
description: Use when adding new items to the FRED project backlog from raw notes or a bulk dump — parses items, assigns the correct project prefix, and appends to FREDdocs/backlog.md after confirmation.
---

# FRED Backlog — Add Items

## Overview

Parses a raw notes dump into numbered story items, assigns the correct project prefix based on category, and appends to `FREDdocs/backlog.md` after confirmation. Does not overwrite existing entries.

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

## Process

1. Read `FREDdocs/backlog.md`. Scan for all `## [A-Z]+-NNN` patterns to find the highest existing story number. Next number = highest + 1. All prefixes share the same number sequence.
2. Ask Andrew to paste the raw notes dump.
3. Parse into individual items using line breaks, bullets, and obvious topic shifts as separators. Ask to clarify rather than guess on ambiguous splits.
4. For each item, assign the correct prefix from the table above and the next sequential number, incrementing by 1 per item.
5. Generate a short title (5–8 words) for each.
6. Show the parsed result inline and ask Andrew to confirm. Fix problems and show again. Do not write until confirmed.
7. After confirmation, APPEND the new items to the bottom of `FREDdocs/backlog.md`. Do not overwrite or modify existing entries.

## Item Format

```
## [PREFIX]-NNN — Short descriptive title here
Original note text, preserved as-is.
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

- Don't overwrite `backlog.md` — always append.
- Don't modify existing entries when appending.
- Don't invent story numbers — always read the current highest first to avoid collisions.
- Don't skip or reuse numbers, even where gaps exist from merges.
- Don't use `FRED` as a catch-all when a more specific prefix clearly applies.
- Don't write to the file until Andrew confirms the parsed list.
