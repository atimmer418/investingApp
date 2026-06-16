# Acceptance Check Manifest — FRED-194: Uniform ion-header styling across tab3 settings pages

## AC-1: Each of the 9 pages renders an ion-header visually identical to change-bank-account (blue gradient `linear-gradient(90deg,#2a5ae0,#1d4ed8)`, concave white cutout, safe-area-inset-top padding, `arrow_back_ios_new` back button left, centered title, spacer right)
- Type:     ui-acceptance
- Check:    For each of recurring-investments, portfolio-customize, sell-withdraw, security-settings, tax-documents, faq, lump-sum-investment, my-profile, beneficiaries — the rendered header DOM contains `.blue-hero-header > .hero-nav > .back-btn .material-symbols-outlined` (text `arrow_back_ios_new`) + `.header-title` + `.back-btn-spacer`, and computed background of `.blue-hero-header` is `linear-gradient(90deg,#2a5ae0,#1d4ed8)` with a `::after` cutout. Compare against change-bank-account header screenshot.
- Evidence:
- Status:   pending

## AC-2: Each page's old `<ion-toolbar><div class="header-inner">…</div></ion-toolbar>` is replaced by the `.blue-hero-header` structure; each keeps its own title and `goBack()`; no navigation regressions
- Type:     ui-acceptance
- Check:    grep each target page's HTML: zero occurrences of `header-inner` / old `<ion-toolbar>` settings header; one `.blue-hero-header` block present. Each `.back-btn` still wires `(click)="goBack()"` (or the page's existing back handler). Title text matches the page's prior title verbatim.
- Evidence:
- Status:   pending

## AC-3: Hero-header styling lives in one shared SCSS partial (`theme/_blue-hero-header.scss`) consumed by all 9 pages + change-bank-account; no duplicated gradient/cutout SCSS
- Type:     frontend-unit
- Check:    File `frontend/src/theme/_blue-hero-header.scss` exists and contains the gradient + `&::after` cutout + `.hero-nav`/`.back-btn`/`.back-btn-spacer`/`.header-title` rules. All 10 page SCSS files `@use`/`@import` it. grep confirms the gradient literal `linear-gradient(90deg, #2a5ae0, #1d4ed8)` appears only in the partial (not copy-pasted in page files).
- Evidence:
- Status:   pending

## AC-4: Body styling uniformity — every settings page uses content background `#f8fafc` and consistent section-card/spacing/CTA per Style Guide; each page confirmed; divergence corrected (balloon → follow-up story allowed)
- Type:     ui-acceptance
- Check:    Each page's `ion-content`/host sets `--background: #f8fafc` (or `#f8fafc` body bg). Spot-check section-card/spacing/CTA consistency. Any page whose deeper restyle balloons is documented as a split-out follow-up rather than blocking.
- Evidence:
- Status:   pending

## AC-5: No page-specific header content lost; extra header content (e.g. my-profile avatar/subtitle) sits inside `.blue-hero-header` like change-bank-account's `hero-account-peek`, not the old toolbar
- Type:     ui-acceptance
- Check:    Diff each page's old header for content beyond title/back. Any such content (notably my-profile) is relocated inside `.blue-hero-header`; nothing dropped.
- Evidence:
- Status:   pending

## AC-6: Headers render correctly on a notched device — `env(safe-area-inset-top)` honored — and the concave cutout meets the page background seamlessly (no seam/gap)
- Type:     ui-acceptance
- Check:    `.blue-hero-header` padding uses `calc(env(safe-area-inset-top,0px) + 2px)`; `::after` cutout background equals page bg `#f8fafc` with `bottom:-1px` (no seam). Visual spot-check.
- Evidence:
- Status:   pending

## AC-7: Frontend compiles cleanly (`cd frontend && npx tsc --noEmit` / scoped build) with no new warnings; happy-path spot-check each page
- Type:     frontend-unit
- Check:    `cd frontend && npx tsc --noEmit` exits 0. SCSS compiles (scoped build / `ng build` config check) with no new errors/warnings introduced by the partial or page edits.
- Evidence:
- Status:   pending
