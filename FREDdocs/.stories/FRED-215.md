# FRED-215 — Extend settings-shell to change-email + KYC edit mode

## Before (backlog entry, verbatim)

> ## FRED-215 — Extend settings-shell to change-email + KYC edit mode
> The two surfaces FRED-214 skipped now get the shell so the settings flows are style-consistent one level deep: /change-email (pushed from security-settings) converts fully; kyc-verification converts ONLY in editMode (the `?edit=true` path from security-settings) — its onboarding appearance must remain pixel-identical. Includes the FRED-215-era shell fixes automatically (fade-to-flat header bottom edge).

## After (structured ticket)

**One-line summary:** Convert change-email.page and kyc-verification.component (editMode only, conditionally) to the shared settings-shell — gradient header + white Manrope title + white back + pinned white sheet — with onboarding KYC byte-identical and keyboard avoidance genuinely working on both (they are form pages).

**Label:** `[code]` · **Time estimate:** `1-3hr`

### Acceptance Criteria

1. **change-email.page** adopts the shell (swap _blue-hero-header for _settings-shell import; shell-content/shell-inner structure like the FRED-214 conversions); form logic/back behavior untouched; appKeyboardAvoid on the ion-content shell-content.
2. **kyc-verification editMode**: when `editMode === true`, the page presents the shell (gradient header, white title, white back, pinned sheet); when false (onboarding), markup/styles render EXACTLY as today — verified by diff-reasoning + onboarding-mode screenshot comparison (devPage=/kyc-verification without ?edit renders pre-story identical). Conditional application via [class]/[ngClass] or template branch — builder chooses the cleanest.
3. **Keyboard avoidance engages** on both (IonContent-hosted scroller; no silent no-op) — both are form pages.
4. **Seam correctness inherited**: both pages show the fade-to-flat header bottom meeting the #0e3a96 strip with no color break (the fixed shell partial provides it — verify visually).
5. **Behavior preservation**: KYC edit prefill/SSN-lock/step logic, change-email flow, guards, submissions untouched; zero .ts changes beyond what conditional classing strictly requires.
6. **Quality gates**: ng build --configuration dev AOT-clean; lint clean on touched files; headless screenshots (change-email top; kyc ?edit=true top; kyc onboarding-mode UNCHANGED proof) saved as fred215-*.png; no TODOs.

### Edge cases
- KYC two-step form navigation inside the sheet; scroll + keyboard on step 2.
- editMode entered directly via URL with ?edit=true but unauthenticated — existing guards unchanged.
- change-email OTP/confirm sub-states render inside the sheet.
