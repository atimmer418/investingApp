# FRED-202 — Standardize input fields to onboarding styling (except profile)

## Before (from backlog.md)
> except for my profile, standardize all text and character input fields to be like how the onboarding's are in terms of styling. [Confirmed: the onboarding input styling = the `.field-input` / `.field-label` pattern, defined in kyc-verification and investment-schedule. surveyinitial uses range sliders, stockselection uses an ion-searchbar, investmentconfirmation uses TOS checkboxes, get-started/linkplaid have no inputs.]

## After

### Summary
Make every text/character form input in the app (except My Profile) look like the onboarding's fields — the `.field-input` / `.field-label` underline style. Extract that pattern into one shared SCSS source of truth (it is currently duplicated, component-scoped, in kyc-verification + investment-schedule), then apply it everywhere else. "Done" = all non-profile, non-onboarding text inputs render in the Manrope underline style with matching labels, placeholders, focus, and error states.

### The canonical target (onboarding `.field-input` / `.field-label`)
From `components/kyc-verification/kyc-verification.component.scss` (and duplicated in `investment-schedule.component.scss`):
- `.field-label` — Manrope, 11px, weight 700, UPPERCASE, letter-spacing 0.08em, color `#6b7280`, `margin: 0 0 10px 0`.
- `.field-input` — Manrope, 17px, weight 500, color `var(--kyc-text)`, transparent background, no border except `border-bottom: 2px solid #2563EB`, `border-radius: 0`, `padding: 6px 0`, full width, `-webkit-appearance: none`, `outline: none`.
- Error state turns label + bottom-border red (`var(--kyc-error)`).
- These are plain native `<input>` elements in light DOM — NOT `<ion-input>`.

### Systems / files involved
- **New shared partial** (mirror the existing `frontend/src/theme/_blue-hero-header.scss` precedent): extract `.field-label` / `.field-input` into e.g. `frontend/src/theme/_form-fields.scss`, imported via `global.scss`, so every page can use it without copy-paste.
- **Excluded — leave untouched (finalized / by request):**
  - `pages/my-profile/my-profile.page.html` (3 `<input>`) — by request.
  - `pages/recovery/recovery.page.html` (2 `<ion-input>`) — already styled as Andy wants.
  - `components/authfinalize/authfinalize.component.html` (1 `<ion-input>`) — already styled as Andy wants.
  - ALL onboarding components — finalized, off-limits: kyc-verification, investment-schedule, surveyinitial, stockselection, investmentconfirmation, get-started, linkplaid.
- **Needs standardizing — non-onboarding text/character fields (mostly `<ion-input>` today):**
  - `beneficiaries/add-beneficiary.page.html` — 12 `<ion-input>`
  - `components/retirement-planning/retirement-planning.component.html` — 6 `<ion-input>`
  - `lump-sum-investment/lump-sum-investment.page.html` — 2 `<ion-input>` (+1 searchbar — see open Q)
  - `pages/change-email/change-email.page.html` — 2 `<ion-input>`
  - `components/portfolio-customize/portfolio-customize.component.html` — 1 `<ion-input>` (+1 searchbar — see open Q)
  - `recurring-investments/recurring-investments.page.html` — 1 `<ion-input>`
  - `sell-withdraw/sell-withdraw.page.html` — 1 `<ion-input>`
  - **Total: 25 fields across 7 files.**

### Doc references
- `./FREDdocs/FRED_UI_STYLE_GUIDE.md` — typography, color (#2563EB / #111827), Manrope, field conventions.
- Precedent for shared theme partials: `frontend/src/theme/_blue-hero-header.scss` + `global.scss`.

### Acceptance criteria
1. A shared SCSS source of truth that replicates the onboarding `.field-label` + `.field-input` underline style (new `theme/_form-fields.scss` imported via `global.scss`, or equivalent) is created for the non-onboarding pages. The onboarding component SCSS is NOT modified — the shared partial mirrors the canonical values (onboarding is finalized and off-limits; intentional duplication is acceptable here to avoid touching it).
2. Every text/character form input that is NOT in My Profile, NOT in onboarding, and NOT already-finalized (recovery, authfinalize) is restyled to match the canonical look: add-beneficiary (12), retirement-planning (6), lump-sum-investment (2), change-email (2), portfolio-customize (1), recurring-investments (1), sell-withdraw (1) — 25 fields across 7 files.
3. Labels, placeholders, focus state, and error/validation state on those fields all match the onboarding pattern (uppercase #6b7280 label, blue underline, red error treatment).
4. The following are left completely untouched: My Profile; ALL onboarding components (kyc-verification, investment-schedule, surveyinitial, stockselection, investmentconfirmation, get-started, linkplaid); recovery; and authfinalize.
5. No visual regression on any untouched surface (onboarding, My Profile, recovery, authfinalize) — confirmed unchanged.
6. Excluded/non-applicable inputs are documented and not restyled as form fields: the `document-upload` `type="file"` control; and (pending the open question below) the `<ion-searchbar>` search fields and the `ai-chat` `<ion-textarea>` composer.
7. `npx tsc --noEmit` exits 0; `ng build` succeeds within budget; every restyled field verified at 430×932 (and 390×844) with no broken alignment, clipped labels, or lost validation.

### Edge cases / open questions
- **Scope of "text and character input fields":** do the `<ion-searchbar>` search fields (stockselection, portfolio-customize, lump-sum) and the `ai-chat` `<ion-textarea>` chat composer count? Recommendation: **exclude** them — they are distinct UI patterns (search bar, chat input bar), not standard form fields. Needs Andy's confirmation.
- **`<ion-input>` → native `<input class="field-input">`:** the onboarding uses native `<input>`; the non-onboarding fields use Ionic `<ion-input>` (shadow DOM — a plain `.field-input` class cannot reach its internals). Recommendation: **convert** the `<ion-input>` usages to the native `.field-input` markup for a true pixel match (form bindings/ngModel carry over); note this drops Ionic-specific affordances (e.g. `clearInput`, built-in counter). Alternative is approximating via Ionic CSS variables (faster, not pixel-identical). Needs Andy's call.
- `var(--kyc-text)` / `var(--kyc-error)` are kyc-scoped tokens — the shared partial should use app-level tokens (or define neutral equivalents) so it is not coupled to the KYC component.

### Estimate / label
3hr+ · [code]
