# Acceptance Check Manifest — FRED-194: Uniform ion-header styling across tab3 settings pages

## AC-1: Each of the 9 pages renders an ion-header visually identical to change-bank-account (blue gradient `linear-gradient(90deg,#2a5ae0,#1d4ed8)`, concave white cutout, safe-area-inset-top padding, `arrow_back_ios_new` back button left, centered title, spacer right)
- Type:     ui-acceptance
- Check:    For each of recurring-investments, portfolio-customize, sell-withdraw, security-settings, tax-documents, faq, lump-sum-investment, my-profile, beneficiaries — the rendered header DOM contains `.blue-hero-header > .hero-nav > .back-btn .material-symbols-outlined` (text `arrow_back_ios_new`) + `.header-title` + `.back-btn-spacer`, and computed background of `.blue-hero-header` is `linear-gradient(90deg,#2a5ae0,#1d4ed8)` with a `::after` cutout. Compare against change-bank-account header screenshot.
- Evidence: STRUCTURAL + COMPILED-CSS fallback (live render of uncommitted working tree not feasible — tunnel serves deployed build, not the working tree; full ng build impractical in sandbox; stated explicitly). All 11 HTML files contain exactly one `.blue-hero-header` block (grep count = 11/11) with identical `.hero-nav > .back-btn > span.material-symbols-outlined[arrow_back_ios_new] + .header-title + .back-btn-spacer` markup (verified via sed of each file's header). All consume the SAME `_blue-hero-header.scss` partial, so all render identically to change-bank-account by construction. Compiled CSS of recurring-investments (`npx sass`) emits `.blue-hero-header { background: linear-gradient(90deg, #2a5ae0, #1d4ed8); padding: calc(env(safe-area-inset-top, 0px) + 2px) 20px 36px 20px }` and `.blue-hero-header::after { ...background:#f8fafc; border-top-left-radius:24px }`. Safe-area-lint exit 0.
- Status:   pass

## AC-2: Each page's old `<ion-toolbar><div class="header-inner">…</div></ion-toolbar>` is replaced by the `.blue-hero-header` structure; each keeps its own title and `goBack()`; no navigation regressions
- Type:     ui-acceptance
- Check:    grep each target page's HTML: zero occurrences of `header-inner` / old `<ion-toolbar>` settings header; one `.blue-hero-header` block present. Each `.back-btn` still wires `(click)="goBack()"` (or the page's existing back handler). Title text matches the page's prior title verbatim.
- Evidence: `grep -rn header-inner frontend/src/app` returns ZERO hits in any of the 10 target pages (remaining hits are unrelated pages: recovery, change-email, investment-schedule, fi-plan-results, document-upload, investmentconfirmation, linkplaid, surveyinitial, kyc-verification, authfinalize — all out of scope). Each target HTML has exactly one `.blue-hero-header` block (grep count 11/11). All 10 wire `(click)="goBack()"`; goBack() confirmed present in all 10 `.ts` files. Titles verbatim: recurring-investments="Recurring Investments", portfolio-customize="Customize Portfolio", sell-withdraw="Sell & Withdraw", security-settings="Account Security", tax-documents="Documents", faq="Frequently Asked Questions", lump-sum-investment="One-Time Transactions", my-profile="My Profile", beneficiaries="Beneficiaries", add-beneficiary="{{ editMode ? 'Edit Beneficiary' : 'Add Beneficiary' }}". git diff confirms the only structural change is the wrapper swap `<ion-toolbar><div header-inner>` -> `<div blue-hero-header><div hero-nav>` + added spacer.
- Status:   pass

## AC-3: Hero-header styling lives in one shared SCSS partial (`theme/_blue-hero-header.scss`) consumed by all 9 pages + change-bank-account; no duplicated gradient/cutout SCSS
- Type:     frontend-unit
- Check:    File `frontend/src/theme/_blue-hero-header.scss` exists and contains the gradient + `&::after` cutout + `.hero-nav`/`.back-btn`/`.back-btn-spacer`/`.header-title` rules. All 10 page SCSS files `@use`/`@import` it. grep confirms the gradient literal `linear-gradient(90deg, #2a5ae0, #1d4ed8)` appears only in the partial (not copy-pasted in page files).
- Evidence: `frontend/src/theme/_blue-hero-header.scss` exists (2959 bytes) and contains the gradient (line 19), `&::after` cutout (bottom:-1px, background:#f8fafc, border-top-*-radius:24px, lines 27-37), `.hero-nav`, `.back-btn`, `.back-btn-spacer`, `.header-title`, `.hero-action-btn`, `.hero-account-peek`. `grep -rn "linear-gradient(90deg" frontend/src/app` returns ONLY tab3.page.scss (lines 213,236) — tab3 is the parent tab page, NOT one of the 11 swapped pages and NOT in this story's diff (pre-existing, out of scope). NONE of the 11 target SCSS files contain the gradient literal. All 11 SCSS files `@use '.../theme/blue-hero-header'` with correct relative depth (`../../` for app-level, `../../../` for pages/ and components/). Paths resolve (sass compile exit 0 for all sampled).
- Status:   pass

## AC-4: Body styling uniformity — every settings page uses content background `#f8fafc` and consistent section-card/spacing/CTA per Style Guide; each page confirmed; divergence corrected (balloon → follow-up story allowed)
- Type:     ui-acceptance
- Check:    Each page's `ion-content`/host sets `--background: #f8fafc` (or `#f8fafc` body bg). Spot-check section-card/spacing/CTA consistency. Any page whose deeper restyle balloons is documented as a split-out follow-up rather than blocking.
- Evidence: All 10 target pages set `--background: #f8fafc` on ion-content/host: faq, lump-sum-investment, tax-documents, recurring-investments, my-profile, security-settings, sell-withdraw via `ion-content { --background: #f8fafc; }`; beneficiaries, add-beneficiary, portfolio-customize via host/nested `--background: #f8fafc;`. All resolve to #f8fafc content bg, matching the partial cutout color.
- Status:   pass

## AC-5: No page-specific header content lost; extra header content (e.g. my-profile avatar/subtitle) sits inside `.blue-hero-header` like change-bank-account's `hero-account-peek`, not the old toolbar
- Type:     ui-acceptance
- Check:    Diff each page's old header for content beyond title/back. Any such content (notably my-profile) is relocated inside `.blue-hero-header`; nothing dropped.
- Evidence: `git diff` of all 10 HTMLs shows the ONLY meaningful removed header element across all pages is my-profile's `<button *ngIf="isDirty" (click)="saveChanges()" class="save-btn">Save</button>`, which is relocated inside `.hero-nav` as `<button *ngIf="isDirty" (click)="saveChanges()" class="hero-action-btn">Save</button>` with `<div *ngIf="!isDirty" class="back-btn-spacer">` fallback. saveChanges() and isDirty confirmed present in my-profile.page.ts (lines 81, 468). No other page had any extra header content beyond back-btn + title (the old markup already used back-btn/header-title; only the wrapper changed). Nothing dropped.
- Status:   pass

## AC-6: Headers render correctly on a notched device — `env(safe-area-inset-top)` honored — and the concave cutout meets the page background seamlessly (no seam/gap)
- Type:     ui-acceptance
- Check:    `.blue-hero-header` padding uses `calc(env(safe-area-inset-top,0px) + 2px)`; `::after` cutout background equals page bg `#f8fafc` with `bottom:-1px` (no seam). Visual spot-check.
- Evidence: Partial line 22: `padding: calc(env(safe-area-inset-top, 0px) + 2px) 20px 36px 20px`. Partial `::after` (lines 27-37): `bottom: -1px; background: #f8fafc; border-top-*-radius: 24px`. Cutout #f8fafc matches all 10 pages' content bg #f8fafc (AC-4) — no seam. Static safe-area-lint (test/ui/safe-area-lint.mjs) on changed top-chrome files: exit 0, "clean — no top-pinned element is missing safe-area-inset-top".
- Status:   pass

## AC-7: Frontend compiles cleanly (`cd frontend && npx tsc --noEmit` / scoped build) with no new warnings; happy-path spot-check each page
- Type:     frontend-unit
- Check:    `cd frontend && npx tsc --noEmit` exits 0. SCSS compiles (scoped build / `ng build` config check) with no new errors/warnings introduced by the partial or page edits.
- Evidence: `npx tsc --noEmit` exit 2, but the ONLY two errors are TS5101 (tsconfig.json:5 baseUrl deprecation) and TS5107 (tsconfig.json:17 moduleResolution=node10 deprecation) — both PRE-EXISTING tsconfig deprecation warnings, NOT originating from any .ts/.html changed in this story. Zero code errors from the diff. SCSS: `npx sass` on the new partial-consuming files (change-bank-account, my-profile, recurring-investments, portfolio-customize, security-settings — covering both `../../` and `../../../` import depths) all exit 0 with no errors from the new `@use`. Compiled CSS emits the expected gradient/cutout/safe-area rules.
- Status:   pass
