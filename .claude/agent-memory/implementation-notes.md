# Implementation Notes — Dropdown Standardization (2026-05-28)

## Design Decisions
- Part A canonical SCSS uses literal hex values (NOT CSS var references) per spec
- add-beneficiary: existing `label.field-label` has `display: block` + letter-spacing 0.07em; normalizing to canonical values; switching to `p.field-label` per canonical pattern; keeping `.required-star` span inside the p tag
- add-beneficiary: `IonItem` kept in imports because ion-modal/ion-datetime/ion-buttons still use it
- recurring-investments: `IonDatetimeButton` retained; only `IonSelect`/`IonSelectOption` removed
- lump-sum-investment: `brokerageOptions` already exists in TS — no data change needed; `IonSegment`/`IonSegmentButton` not touched (out of scope)
- retirement-planning: `IonItem` and `IonLabel` used extensively throughout template — NOT removing from imports; only stripping the specific `ion-item` wrapping the strategy select
- Part B (kyc, document-upload): vars resolve to same hex values — replacing var() refs with literal hex per spec

## Deviations
- None significant; all bindings/handlers preserved exactly

## Open Questions
- None

---

# Implementation Notes — Tab 3 Back Button Standardization

## Pattern extracted
- HTML: `<div class="header-inner">` wrapping `<button class="back-btn">` (with `arrow_back_ios_new` icon) + `<h2 class="header-title">Title</h2>`
- SCSS: `.header-inner` (flex, align-items center, padding 0 4px), `.back-btn` (40x40 circle, transparent, arrow_back_ios_new 20px), `.header-title` (18px 700 Manrope, text-align center, flex 1, padding-right 40px)
- Source of truth: investmentconfirmation.component + FRED_UI_STYLE_GUIDE.md §Header

## Design decisions
- my-profile has a "Save" button in `slot="end"` — this is NOT a back button and is preserved as-is. The `ion-title` → `h2.header-title` swap still centers the title. The save button must be placed alongside `.header-inner` or inside it at the end slot. Decision: keep it inside `.header-inner` as a sibling after `h2` — but that would push the title left. Safer: keep `ion-buttons slot="end"` outside `.header-inner` or wrap entire toolbar differently. Final decision: my-profile keeps its `ion-title` centered via `ion-buttons slot="end"` — but the spec says onboarding pattern uses `.header-inner`. Resolution: place save button INSIDE `.header-inner` as the third flex child — the `padding-right: 40px` on `.header-title` already accounts for the back button, so adding the save button on the right needs `padding-right: 0` on title instead. Actually: use `padding-right` only when there's no right element. Since the save button is the same 40px width, the `padding-right: 40px` trick still works — leave title with `padding-right: 40px` removed, since the save button provides equivalent visual balance.

## Deviations
- my-profile page: `.header-title` gets `padding-right: 0` instead of `40px` because the save button is the right-side counterpart to the back button, providing symmetric visual centering without extra padding.
- my-profile page: the save button from `ion-buttons slot="end"` moves inside `.header-inner` as a third child.

## Open questions
- None — all pages had identifiable back buttons using ion-back-button pattern.
