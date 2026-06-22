# Implementation Notes — FRED-203

## Design decisions

- `@use '../../theme/blue-hero-header'` placed at the very top of the component SCSS, before all other rules. The partial emits bare selectors (`.back-btn`, `.header-title`, `ion-toolbar`, etc.) into the component scope. The KYC component's own rules, being declared after the `@use`, override them — which is the correct cascade for onboarding mode. For editMode, two scoped overrides restore white color: `.blue-hero-header .back-btn` and `.blue-hero-header .header-title`. No other partial rules need un-doing because the editMode header has no `<ion-toolbar>`.

- `step1Snapshot: string | null = null` initialized to null. Getter `step1Changed` returns `false` when snapshot is null (baseline not yet captured) — this satisfies the "button disabled until baseline captured" edge case. Falls back to `true` when `prefillFailed = true` so user is never permanently stuck.

- `prefillFailed` flag is separate from `step1Snapshot` so the two cases (baseline not yet fetched vs. fetch failed) are handled independently and clearly.

- In onboarding mode, `step1Snapshot` stays null and `prefillFailed` stays false. The `step1Changed` getter short-circuits to `true` when `!editMode`, so onboarding is completely unaffected.

- `proceedToStep2()` early-return: `if (this.editMode && !this.step1Changed) return;` — placed after the `!step1Valid` guard. This is a no-op guard; the button is already disabled so it only protects against programmatic calls.

- The two `<ion-header>` blocks (one for onboarding, one for editMode) sit at the top of the template. Angular renders only one because of the `*ngIf` guards. Both are rendered above step 1 and step 2 (the step content is inside `<ion-content>` so the header always shows regardless of current step).

- The continue button (step 1 footer) uses `[disabled]="!step1Valid || exitingStep1 || (editMode && !step1Changed)"` and `[class.btn-visible]` uses the same expression negated. This matches the spec's `!step1Valid || !step1Changed` with the additional `exitingStep1` guard already present.

## Tradeoffs

- Chose to add `.blue-hero-header .back-btn` and `.blue-hero-header .header-title` scoped overrides rather than restructuring the partial, to minimize blast radius.

- Did not remove or restructure the existing `<ion-header>` block — wrapped it in `*ngIf="!editMode"` to keep onboarding exactly as-is.

## Open questions

- None — Andrew's two answers fully specify the behaviour.
