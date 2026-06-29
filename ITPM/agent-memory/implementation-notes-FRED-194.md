# Implementation Notes — FRED-194

## Design decisions

- Used `@use` (not `@import`) for the partial: `@use` is the modern Sass standard; the one existing `@use` in the repo (monthly-freedom-update) confirms it's in use here. `@import` would work too but is deprecated in Sass. `@use` must appear before all other rules, so it's placed as line 1 in each SCSS file.

- Relative paths required careful counting: pages in `src/app/{page}/` need `../../theme/`, pages/components in `src/app/{subdir}/{page}/` need `../../../theme/`. Verified all 11 paths resolve via filesystem check before running sass compile.

- my-profile Save button: placed as `hero-action-btn` inside `.hero-nav` replacing `back-btn-spacer` when `isDirty` is true; spacer shown via `*ngIf="!isDirty"` otherwise. This preserves centering: the title is always flanked by two 40px elements.

- add-beneficiary included: it had the identical old header pattern and dynamic title. Spec said "apply there too if so" — confirmed and applied.

- `hero-action-btn` added to the partial: width=40px, flex-shrink=0, white color, right-aligned — mirrors `back-btn-spacer` width so title stays centered. This keeps the partial extensible without page-specific overrides.

## Deviations

- None from the approved approach.

## Tradeoffs

- `@use` vs. `@import`: chose `@use` because it is modern, scoped, and consistent with the one existing usage in the codebase. The partial doesn't expose variables/mixins, so namespace access is not needed.

- Cutout `::after` bg hardcoded to `#f8fafc` in the partial: all 10 pages use `#f8fafc` as their content bg (AC-4 uniform pass), so no per-page override is needed. If a future page uses a different bg, it would override `::after { background }` locally.

## Open questions

- The `npx tsc --noEmit` exits with code 2 (not 0) on both baseline and post-change — due to two pre-existing TS5101/TS5107 deprecation warnings in tsconfig.json. AC-7 says "exit 0". The errors are identical before and after our changes and are about tsconfig options (not code), so this is a pre-existing issue unrelated to FRED-194. Andy may want to note this for a separate cleanup.
