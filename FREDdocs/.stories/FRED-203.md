# FRED-203 — KYC edit page blue header + part-1 gating

## Before (from backlog.md)
> make the update/edit KYC page linked to from security-settings have the blue header that security settings has for both parts of the kyc update. also, a user should not be able to proceed from part 1 to part 2 in kyc if the data in part 1 has not been updated from its current values. make sure that the kyc page only has the blue ion header in editMode and not the 'Identity Verification' onboarding flow step

## After

### Summary
The KYC verification component is reused for two flows: the onboarding "Identity Verification" step (`editMode = false`) and the edit-KYC page opened from security-settings (`editMode = true`). Three changes, all editMode-only: (1) give the edit flow the shared blue hero header that security-settings uses, on BOTH step 1 and step 2; (2) keep the blue header out of the onboarding flow (it keeps its current plain header); (3) block advancing from part 1 to part 2 until the user actually changes at least one step-1 field from its current on-file value.

### Systems / files involved
- `frontend/src/app/components/kyc-verification/kyc-verification.component.html`
  - Header (lines 1-10): currently a plain `<ion-toolbar>` with `<h2 class="header-title">{{ editMode ? 'Edit Identity' : 'Identity Verification' }}</h2>` for both modes.
  - Step-1 footer continue button (line ~220): `(click)="proceedToStep2()" [disabled]="!step1Valid || exitingStep1"`.
- `frontend/src/app/components/kyc-verification/kyc-verification.component.scss` — `@use` the shared blue-hero partial, scoped to editMode only.
- `frontend/src/app/components/kyc-verification/kyc-verification.component.ts`
  - `@Input() editMode` (line 86), `currentStep` (92), `step1Form` (109), `proceedToStep2()`, `step1Valid` getter (306).
  - `loadKycDataForEdit()` (177) → `prefillFromAlpacaData()` (203) — async load of the current on-file values; `prefillUserData()` (285) is the fallback.
- **Reference (do not modify):** `frontend/src/theme/_blue-hero-header.scss` (the shared partial — provides `.blue-hero-header`, `.hero-nav`, `.back-btn`, `.back-btn-spacer`, `.header-title`) and `frontend/src/app/pages/security-settings/security-settings.page.html` (lines 1-11, the exact header markup to replicate).

### Doc references
- `./FREDdocs/FRED_UI_STYLE_GUIDE.md` — blue header pattern, #2563EB palette, Manrope.
- Related: FRED-123 (added KYC edit mode + Alpaca PATCH from security-settings).

### Acceptance criteria
1. In editMode (KYC opened from security-settings), the page renders the shared blue hero header — blue gradient + concave white cutout + centered white title + back button — the same `blue-hero-header` security-settings uses, on BOTH step 1 and step 2.
2. The blue header renders ONLY in editMode. In onboarding mode (`editMode = false`, the "Identity Verification" step) the existing non-blue header is shown unchanged, and the blue-hero styles do NOT leak into onboarding mode (the partial must be scoped, since one component serves both modes).
3. The editMode blue header reuses the shared `theme/_blue-hero-header.scss` partial (via `@use`) rather than a re-implemented copy; the back button calls the existing `goBack()`; title is the editMode copy ("Edit Identity").
4. In editMode, the user cannot proceed from part 1 to part 2 unless at least one step-1 field has changed from its current on-file value: the continue button is disabled AND `proceedToStep2()` is a no-op while step 1 still equals the prefilled values.
5. "Changed" is computed by comparing the current step-1 form value against a snapshot of the values prefilled from Alpaca, captured AFTER the prefill HTTP resolves — so re-typing the same value does not count as a change. The existing `!step1Valid` validation still applies on top of this.
6. The gating applies only in editMode; onboarding step 1 → step 2 is unaffected (there is no current-values baseline in onboarding).
7. The existing localStorage step-1 draft restore and the step-transition animation still work; a restored draft whose values equal the on-file values is treated as "not changed."
8. `npx tsc --noEmit` exits 0; verified at 430×932: editMode shows the blue header on both steps, onboarding shows the original header, and the part-1 gate disables/enables correctly.

### Edge cases / open questions
- **Partial scoping:** the same component renders both modes, so importing the blue-hero partial unconditionally would restyle the onboarding header too. Scope it (host/wrapper class like `:host(.edit-mode)` or an `editMode`-gated wrapper) so AC-2 holds.
- **Snapshot timing:** `prefillFromAlpacaData()` is async; the baseline snapshot must be taken after it resolves, and must account for the localStorage draft restore path.
- **Prefill fallback:** if the Alpaca load fails and `prefillUserData()` runs instead, define the baseline as whatever was prefilled (so the user still must change something). Confirm this is acceptable.
- **Title copy:** keep "Edit Identity" for the editMode header unless Andy prefers different wording.

### Estimate / label
1-3hr · [code]
