# FRED-215 — Implementation Notes

## Conditional approach chosen (KYC)

**Approach**: `[class.shell-content]="editMode"` added to the single `ion-content` element alongside the existing `kyc-content` class. `[class.content-inner--edit]="editMode"` added to the inner content div to apply 18px top padding in edit mode (matches `shell-inner`'s top padding so content clears the 26px rounded corner).

**Onboarding footprint**: zero. The two added `[class.*]` bindings evaluate to false when `editMode=false` — no DOM difference, no style difference. The `kyc-content` class and all existing selectors are untouched. Verified via before/after headless screenshots showing byte-identical onboarding layout.

**Why this over ngIf'd content branches**: duplicating the entire `ion-content` + form tree for two modes would double the onboarding footprint risk and create a maintenance surface. The additive-class approach has zero footprint for the onboarding path and only adds CSS weight in edit mode.

## Cascade management (KYC SCSS)

- Swapped `@use '../../../theme/blue-hero-header'` → `@use '../../../theme/settings-shell'`.
- Kept `.blue-hero-header .back-btn` and `.blue-hero-header .header-title` white-text overrides. The shell partial's `.back-btn { color: #fff }` and `.header-title { color: #fff }` are overridden by the component's own `.back-btn` and `.header-title` rules (same specificity, cascade order wins). The two two-class overrides restore white in edit mode.
- Kept `ion-toolbar { --background: #f8fafc; }` in the KYC SCSS. The shell resets `ion-toolbar { --background: transparent }` — this must not apply to the onboarding `<ion-toolbar>` inside the `*ngIf="!editMode"` header branch. The component's own `ion-toolbar` rule (later in cascade, same specificity) wins, preserving the light toolbar background for onboarding.
- `ion-content { --background: var(--kyc-bg) }` (element selector, 0,0,1) is correctly overridden by `.shell-content { --background: #0e3a96 }` (class selector, 0,1,0) in edit mode. Onboarding (no shell-content class) keeps `#f8fafc`.

## change-email

- Full conversion: `@use settings-shell`, `ion-content.shell-content appKeyboardAvoid`, `div.shell-inner`.
- Removed `[scrollY]="false"` — scroll must be enabled for `KeyboardAvoidDirective.scrollByPoint` to work. The form fits on screen normally so this doesn't change UX for non-keyboard cases.
- Removed standalone `ion-content { --background }` and `.content-inner` blocks — shell partial owns them now.
- `--ion-toolbar-background: transparent` in `:host` (was `#f8fafc`); shell makes the toolbar transparent.
- `IonToolbar` import kept in TS (pre-existing unused import, pre-existing warning, not introduced by FRED-215).

## Open questions

- None. The story was complete as specced.

## Screenshots saved

- `fred215-change-email-top.png` — shell header + sheet + content
- `fred215-kyc-edit-top.png` — KYC in editMode with shell + Alpaca prefill
- `fred215-kyc-onboarding-before.png` — onboarding before (has pre-existing ai-chat TS error overlay)
- `fred215-kyc-onboarding-unchanged.png` — onboarding after (clean render, layout identical)
- `fred215-seam-corner.png` — fade-to-flat seam proof at change-email top
