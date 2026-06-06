# FRED-192 — Redesign tab3 settings page UI (keep blue header)

## Before (from backlog.md)

> ## FRED-192 — Redesign tab3 settings page UI (keep blue header)
> redesign the UI of tab3 (settings) page. we want to keep the blue header with the my profile and welcome and "FRED" but we kinda want a cleaner design. refer to the FRED UI Style Guide for how to come up with more designs for tab3 while still keeping that blue header idea. there should be 3-5 options for how it could look

## After (ticket)

**Summary:** Produce **3–5 distinct, cleaner** visual design options for the tab3 settings page that keep the blue header (avatar + "My Account"/welcome line + "FRED" branding), every option grounded in the FRED UI Style Guide, for Andrew to choose from before any implementation.

**Files / systems involved**
- `frontend/src/app/tab3/tab3.page.html` — current layout: blue `custom-profile-header` (avatar + action badge, "My Account", "Hi, Firstname", "FRED" branding with MFU-active state) → `settingSections` rendered as grouped `settings-card`s → footer (`© 2026 FREDvested`, `v1.0.0 (Beta)`)
- `frontend/src/app/tab3/tab3.page.scss` — current blue-header + card/list-row styling (the main surface to redesign)
- `frontend/src/app/tab3/tab3.page.ts` — `settingSections` data (groups: **Investment Management**, **Account & Security**, **Support & Legal**) + action handlers; **keep all behavior**, redesign is visual only
- Consistency references (same blue-header-over-white pattern): `frontend/src/app/pages/my-profile`, `frontend/src/app/pages/security-settings`

**Doc references** — `FREDdocs/FRED_UI_STYLE_GUIDE.md`, especially:
- **Header**, **Page Layout Structure**, **Color System**, **Typography**
- **Cards & Containers**, **Schedule / Data Rows**, **Iconography**
- **What Makes FRED Feel Premium**
- `.claude/CONTEXT.md` — the "looks/feels like FRED" bar: calm, minimal, premium; FRED palette only

**Acceptance criteria**
1. **3–5 options** presented for tab3, each keeping the blue-header **concept** (avatar, "My Account"/welcome line, "FRED" branding present). The header itself **may be restyled** and the greeting copy **may change** — the blue header just has to remain the anchor.
2. **Style-guide grounded** — every option uses only the FRED palette, the Manrope type scale, Material Symbols icons, and established card/row patterns; no ad-hoc colors or spacing.
3. **Content + actions preserved** — all three setting groups and their items, the profile action badge, and the FRED-logo MFU interaction survive in every option; no nav/behavior changes.
4. **Meaningfully distinct** — options explore genuinely different directions (e.g., grouped cards vs. flat inset list vs. iOS-grouped vs. hero-stat header variant), not 5 trivial reskins.
5. **Each option annotated** — how it's cleaner than today (hierarchy, spacing, reduced noise) and any trade-offs.
6. **Delivered as static HTML/CSS mockups posted in `today.html`** (the ITPM dashboard) for Andrew to pick from; the chosen option becomes a separate implementation story/run.

**Resolved decisions** (from A/C gate)
- The header **may be restyled** within the blue-header concept; the **greeting copy is open** to change.
- Deliver the 3–5 options as **static HTML/CSS in `today.html`** (not runnable Angular or Figma). Andrew expects the itpm routine to pick this story next (or he'll direct it to).

**Time estimate:** `1-3hr` (descriptive options) to `3hr+` (built option mockups)  ·  **Label:** `[code]` (design-exploration phase, tied to the coded tab3 page)
