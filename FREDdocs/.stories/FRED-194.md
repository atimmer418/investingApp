# FRED-194 — Uniform ion-header styling across tab3 settings pages

## Before (from backlog.md)
> change all settings page linked to from tab3 to have the exact same styling in their ion-headers as change-bank-account does. while youre at it, each page should also have similar styling usage so confirm that they do and if they dont, make them have uniform styling across each settings page

## After

**Summary:** Make every settings page linked from tab3 use the exact same ion-header as `change-bank-account` — the `.blue-hero-header` (blue gradient + concave white cutout + back button / centered title / spacer) — replacing each page's current `<ion-toolbar>` + `.header-inner` header. Then audit each page's broader styling (content background, section cards, spacing, CTAs) and bring any divergence into line so all settings pages look uniform. Done when every listed page renders a header pixel-identical to change-bank-account and the pages share consistent body styling.

### The reference (golden standard) — `change-bank-account`
- Markup: `<ion-header class="ion-no-border">` → `<div class="blue-hero-header">` → `<div class="hero-nav">` containing `.back-btn` (Material Symbol `arrow_back_ios_new`, `(click)="goBack()"`), `<h2 class="header-title">`, and `<div class="back-btn-spacer">`. **No `<ion-toolbar>`.**
- SCSS: `.blue-hero-header` = `linear-gradient(90deg, #2a5ae0, #1d4ed8)`, `padding: calc(env(safe-area-inset-top,0px)+2px) 20px 36px`, and a concave white `::after` cutout (`height:24px; background:#f8fafc; border-top-left/right-radius:24px`). Content bg: `ion-content { --background: #f8fafc; }`.
- Files: `frontend/src/app/change-bank-account/change-bank-account.page.{html,scss}`

### Current state of the other pages (the gap)
All 9 pages below use the **older** pattern: `<ion-header class="ion-no-border">` → `<ion-toolbar>` → `<div class="header-inner">` (same `.back-btn` + `arrow_back_ios_new` + `.header-title`, but **no `back-btn-spacer`**). Their SCSS has a `.header-inner` rule but **none** have the blue gradient and **none** have the concave cutout — confirmed by grep. So they need both a markup swap and the hero SCSS.

### Files / systems involved (pages linked from tab3 — see `tab3.page.ts` `this.router.navigate(...)`)
| Page | Route | Files |
|------|-------|-------|
| recurring-investments | `/recurring-investments` | `app/recurring-investments/recurring-investments.page.{html,scss}` |
| portfolio-customize ⚠️ | `/portfolio-customize` | `app/components/portfolio-customize/portfolio-customize.component.{html,scss}` (a component, not a `.page`) |
| sell-withdraw | `/sell-withdraw` | `app/sell-withdraw/sell-withdraw.page.{html,scss}` |
| security-settings | `/security-settings` | `app/pages/security-settings/security-settings.page.{html,scss}` |
| tax-documents | `/tax-documents` | `app/pages/tax-documents/tax-documents.page.{html,scss}` |
| faq | `/faq` | `app/faq/faq.page.{html,scss}` |
| lump-sum-investment | `/lump-sum-investment` | `app/lump-sum-investment/lump-sum-investment.page.{html,scss}` |
| my-profile | `/my-profile` | `app/pages/my-profile/my-profile.page.{html,scss}` |
| beneficiaries | `/beneficiaries` | `app/beneficiaries/beneficiaries.page.{html,scss}` |
| **change-bank-account** (reference) | `/change-bank-account` | `app/change-bank-account/change-bank-account.page.{html,scss}` |

Recommended new shared source of truth: `frontend/src/app/theme/_blue-hero-header.scss` (or a mixin in the theme dir) consumed by every page above **including** change-bank-account.

### Doc references
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — FRED palette, Manrope type scale, section-card patterns, CTA styling (the "similar styling usage" bar).
- `.claude/CONTEXT.md` — Frontend conventions; "don't invent patterns / reuse what exists" → favors a single shared header partial over copy-paste.

### Acceptance Criteria
1. Each of the 9 pages (recurring-investments, portfolio-customize, sell-withdraw, security-settings, tax-documents, faq, lump-sum-investment, my-profile, beneficiaries) renders an ion-header **visually identical** to change-bank-account: blue gradient `linear-gradient(90deg, #2a5ae0, #1d4ed8)`, concave white cutout, safe-area-inset-top padding, `arrow_back_ios_new` back button on the left, centered title, spacer on the right.
2. Each page's old `<ion-toolbar><div class="header-inner">…</div></ion-toolbar>` is replaced by the `<div class="blue-hero-header"><div class="hero-nav">…<div class="back-btn-spacer"></div></div></div>` structure. Each page keeps its own title text and its existing `goBack()` behavior; no navigation regressions.
3. The hero-header styling lives in **one shared SCSS partial/mixin** (e.g., `theme/_blue-hero-header.scss`) included by all listed pages, and change-bank-account is refactored to consume the same source — no duplicated gradient/cutout SCSS copy-pasted across files. (If Andy prefers simple per-file duplication instead, that's an allowed fallback — confirm.)
4. **Body styling uniformity (the "while you're at it" clause):** every settings page uses the same content background (`#f8fafc`) and consistent section-card, spacing, and CTA styling per the FRED Style Guide. Each page in the list is explicitly confirmed; any divergence is corrected.
5. No page-specific header content is lost. If a page needs extra header content (e.g., my-profile avatar/subtitle), it sits inside `.blue-hero-header` the way change-bank-account's (currently commented) `hero-account-peek` does — not via the old toolbar.
6. Headers render correctly on a notched device — `env(safe-area-inset-top)` honored — and the concave cutout meets the page background seamlessly with no seam/gap.
7. Frontend compiles cleanly (`cd frontend && npx tsc --noEmit` / scoped build) with no new warnings; spot-check each page's happy path for visual regressions.

### Edge cases / Open Questions
- **Scope of "settings pages" (RESOLVED — Andy):** all pages in the table are in scope. Includes the investment-action pages (lump-sum-investment, sell-withdraw, recurring-investments) and support pages (faq, tax-documents) — every page linked from tab3 gets the blue-hero header.
- **portfolio-customize (RESOLVED — Andy):** it is a component rendered as a page, so treat it exactly like the others — same header swap applies.
- **2nd clause is broader than the header.** "similar styling usage" across each full page body is a consistency audit that could balloon (cards, lists, buttons, empty/loading states). If it gets large, split it into its own follow-up story rather than letting it block the header unification. Flag for Andy.
- **my-profile** had a prior polish pass (FRED-122) — verify the header swap doesn't drop anything intentional there.

### Estimate & label
- **Estimate:** `3hr+` (9 pages × markup swap + shared-partial extraction + refactor reference, plus a body-styling consistency audit across all of them).
- **Label:** `[code]`
