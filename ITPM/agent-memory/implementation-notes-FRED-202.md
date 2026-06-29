# Implementation Notes — FRED-202

## Design decisions

- DOB field in add-beneficiary: kept as native `<input readonly>` with `id="open-dob-modal"` so the ion-modal trigger still fires. The `[value]` binding uses `| date:'mediumDate'` pipe — native input can't use pipes directly, so the TS component already pipes through DatePipe in the template. Decision: use a template variable workaround — bind `[value]` using interpolation via the existing pattern since this is a readonly field; use Angular's `DatePipe` directly or pass value via component. Actually, the easier approach is to leave the ion-input for DOB (readonly display-only) since native `<input>` cannot bind to pipes in attribute position. Reconsidering: Angular template allows `[value]="beneficiary.dateOfBirth | date:'mediumDate'"` on native elements too. Will use native input with binding.
- The alloc-input in portfolio-customize: it's an inline numeric input inside a list item (not a labeled form field). The spec says 1 field for portfolio-customize. I will add the `.field-input` class to the `ion-input.alloc-input` but will NOT convert it to native `<input>` since it's inside ion-reorder-group and the `(ionInput)` handler is critical and the display is inline. Wait — spec says "convert to native." But count is 1 not N (dynamic list). Interpretation: the alloc-input is the 1 field. However, converting ion-input in ion-item-sliding/ion-reorder-group to native input is architecturally safe. Decision: convert alloc-input to native input, keep the existing `(ionInput)` binding rewired to `(input)`.
- Retirement-planning: The 6 fields are inside `ion-item` wrappers. Converting those to native `<label>+<input>` means removing ion-item/ion-label. The ion-item styling is complex; native inputs would be simpler and cleaner.
- The currency-input-wrap fields (lump-sum, recurring, sell-withdraw): already have underline via `.currency-input-wrap { border-bottom: 2px solid #2563EB }`. Converting their inner `ion-input` to native `<input class="field-input">` but keeping the currency-wrap for the `$` prefix. The `.field-input` rules from the partial won't conflict since the border is on the parent `.currency-input-wrap`. Will override: add `border: none; border-bottom: none` to `.field-input` inside `.currency-input-wrap` so the parent wrap continues to provide the underline. Actually simpler: just use `.field-input` class and override the border-bottom inside `.currency-input-wrap` to keep the parent's underline.
- Change-email: the "Current Email" readonly field — convert to native `<input readonly class="field-input">` styled identically.
- SCSS @use approach: using `@use '../../theme/form-fields' as ff` and then calling `@include ff.form-fields` within each page's root selector won't work with SCSS `@use`. Instead: will `@use` the file with `as *` and then apply the styles scoped. Actually the cleanest approach with the approved plan is to define the partial as a mixin and call it scoped. But the spec says "mirror `.field-label`/`.field-input`" as classes. With SCSS `@use`, we can include the file's styles by putting the rules inside the host scope. Plan: define the partial as a mixin (or just rules at root) and call `@forward`. Actually the simplest correct approach: the partial defines a mixin `form-fields-rules()` and each page `@use`s it then calls the mixin inside the page selector.

## Tradeoffs

- Could define plain classes in the partial and `@include` them, but `@use` + mixin is the cleanest scoping approach with modern Sass.
- Retirement-planning 6 fields include the advanced-options ion-item fields (essentialExpenses, sblocInterestRate, guardrailLower, guardrailUpper) plus portfolioValue and annualWithdrawal. However the portfolio/annual fields are inside `.custom-input-container .input-box` with a border+radius design, NOT the underline style. These 2 have a different existing visual treatment. Decision: still convert them per the spec (all 6 must match canonical style).
- The `ion-input` for retirement-planning fields uses `[(ngModel)]` which works on both `ion-input` and native `<input>` with FormsModule.

## Open questions

- retirement-planning: portfolioValue and annualWithdrawal are inside `.input-box` with box border. After conversion to native `<input class="field-input">`, the `.input-box` wrapper still exists. The `.field-input` border-bottom will appear but the `.input-box` border will also appear. Need to remove `.input-box` border or override. Decision: keep `.input-box` for the `$` prefix alignment but remove its border/box-shadow after conversion, letting `.field-input` underline show.

## Build verification (2026-06-23)

- `npx tsc --noEmit` exits 0 (no errors, only pre-existing TS5101/TS5107 deprecation notices).
- `ng build` — only error is pre-existing `Can't find stylesheet to import` in kyc-verification.component.scss referencing `blue-hero-header`. Confirmed pre-existing by stashing all FRED-202 changes and re-running build — identical error. No new errors introduced by FRED-202.
- All 7 target SCSS files confirmed to `@use '...theme/form-fields'`.
- `global.scss` has 0 occurrences of `field-input` or `field-label` — no global bleed.
- `git diff --name-only` contains only the 7 target page sets + package-lock.json — no excluded files touched.
