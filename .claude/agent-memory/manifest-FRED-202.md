# Acceptance Check Manifest — FRED-202 (Standardize input fields to onboarding styling, except My Profile)

Story: Make every text/character form input in the app (outside onboarding, My Profile, recovery, authfinalize)
match the onboarding `.field-label` / `.field-input` Manrope underline style. Create one shared SCSS source
(`frontend/src/theme/_form-fields.scss`) that MIRRORS the canonical values with FRED palette literals
(do NOT modify the onboarding SCSS, do NOT reuse the kyc-scoped `--kyc-*` vars). Apply the partial SCOPED
under each target page's root selector (NOT a blanket global import), and convert the inputs to native
`<label class="field-label"> + <input class="field-input">` for a true pixel match.

Canonical values (resolved from kyc-verification.component.scss):
- primary / underline: `#2563EB`  | text: `#0f172a`  | label + gray: `#6b7280`  | error: `#dc2626`
- label: Manrope 11px / 700 / uppercase / letter-spacing 0.08em / `#6b7280`
- input: Manrope 17px / 500 / `#0f172a` / transparent bg / no border / 2px bottom-border `#2563EB` / radius 0 / 6px 0 padding / placeholder `#cbd5e1` 400
- error state: label → `#dc2626`, input bottom-border → `#dc2626`

Target files (25 fields / 7 files):
- `frontend/src/app/beneficiaries/add-beneficiary.page.{html,scss}` (12)
- `frontend/src/app/components/retirement-planning/*` (6)
- `frontend/src/app/lump-sum-investment/*` (2)
- `frontend/src/app/pages/change-email/*` (2)
- `frontend/src/app/components/portfolio-customize/*` (1)
- `frontend/src/app/recurring-investments/*` (1)
- `frontend/src/app/sell-withdraw/*` (1)

Excluded (per Andrew's approval): `<ion-searchbar>` search fields, `ai-chat` `<ion-textarea>` composer,
`document-upload` `type="file"` control. Untouched: My Profile, ALL onboarding components
(kyc-verification, investment-schedule, surveyinitial, stockselection, investmentconfirmation, get-started,
linkplaid), recovery, authfinalize.

Scope decisions (Andrew confirmed on today.fredvested.com 2026-06-23):
- Exclude the ion-searchbar and ai-chat textarea composer — just the 25 form fields across the 7 pages.
- Apply the shared partial SCOPED to the 7 pages, NOT global — keep My Profile/onboarding provably untouched.

---

## AC-1: shared SCSS source of truth created, mirroring onboarding field style; onboarding SCSS NOT modified
- Type:     frontend-unit
- Check:    `frontend/src/theme/_form-fields.scss` exists and defines `.field-label` + `.field-input` (and the error treatment) using FRED palette LITERALS (`#2563EB` / `#0f172a` / `#6b7280` / `#dc2626`), NOT `--kyc-*` vars. `git diff` shows `kyc-verification.component.scss` and `investment-schedule.component.scss` are UNCHANGED.
- Evidence:
- Status:   pending

## AC-2: all 25 in-scope fields across the 7 files restyled to the canonical class
- Type:     frontend-unit
- Check:    Each of the 7 target files renders its text/character inputs as native `<input class="field-input">` with a `<label class="field-label">` (or already-canonical markup carrying those classes), and `@use`s the shared partial scoped under that page's root selector. Field counts match: add-beneficiary 12, retirement-planning 6, lump-sum-investment 2, change-email 2, portfolio-customize 1, recurring-investments 1, sell-withdraw 1.
- Evidence:
- Status:   pending

## AC-3: labels, placeholders, focus + error/validation states match the onboarding pattern
- Type:     ui-acceptance
- Check:    On the restyled fields: label is uppercase `#6b7280`; input has transparent bg + 2px `#2563EB` bottom-border; placeholder `#cbd5e1`; focus keeps blue underline; error state turns label + underline red (`#dc2626`). Existing `ngModel`/validation bindings on each field still fire.
- Evidence:
- Status:   pending

## AC-4: My Profile, all onboarding, recovery, authfinalize left completely untouched
- Type:     frontend-unit
- Check:    `git diff --name-only` includes NONE of: My Profile component, kyc-verification, investment-schedule, surveyinitial, stockselection, investmentconfirmation, get-started, linkplaid, recovery, authfinalize.
- Evidence:
- Status:   pending

## AC-5: no visual regression on untouched surfaces (no global bleed)
- Type:     frontend-unit
- Check:    No `.field-input` / `.field-label` rule is added to `global.scss` (or any globally-imported sheet). The shared partial is `@use`d only scoped under each target page's root selector, so My Profile's `.field-label` rows and all onboarding fields render byte-identical.
- Evidence:
- Status:   pending

## AC-6: documented exclusions are NOT restyled as form fields
- Type:     frontend-unit
- Check:    The `<ion-searchbar>` search fields, the `ai-chat` `<ion-textarea>` composer, and the `document-upload` `type="file"` control are NOT converted to `.field-input` / `.field-label`. `git diff` shows those controls unchanged.
- Evidence:
- Status:   pending

## AC-7: tsc clean, ng build succeeds, fields verified at 430×932 and 390×844
- Type:     frontend-unit
- Check:    `cd frontend && npx tsc --noEmit` exits 0 (modulo pre-existing tsconfig deprecation notices). `cd frontend && ng build` succeeds within budget. Every restyled field renders at 430×932 and 390×844 with no broken alignment, clipped labels, or lost validation.
- Evidence:
- Status:   pending
