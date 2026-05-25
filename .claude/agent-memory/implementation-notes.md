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
