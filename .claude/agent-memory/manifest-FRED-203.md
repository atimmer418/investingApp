# Acceptance Check Manifest — FRED-203 (KYC edit page: blue hero header + part-1 gating)

Story: In the KYC component (serves onboarding `editMode=false` and edit-from-security-settings `editMode=true`):
(1) give the edit flow the shared blue hero header on both step 1 and step 2; (2) keep it out of onboarding;
(3) block advancing part 1 → part 2 in editMode until at least one step-1 field changes from its on-file value.

Files: `frontend/src/app/components/kyc-verification/kyc-verification.component.{ts,html,scss}`,
`frontend/src/theme/_blue-hero-header.scss`, ref `frontend/src/app/pages/security-settings/security-settings.page.*`.

---

## AC-1: editMode renders the shared blue hero header on BOTH step 1 and step 2
- Type:     ui-acceptance
- Check:    Load the KYC edit route in editMode at 430×932. Step 1 shows the blue-hero-header (blue gradient + concave white cutout + centered white title "Edit Identity" + back button). Advance to step 2 — the same blue hero header still renders.
- Evidence:
- Status:   pending

## AC-2: blue header renders ONLY in editMode; onboarding keeps its non-blue header and styles do not leak
- Type:     ui-acceptance
- Check:    Load KYC in onboarding mode (`editMode=false`, "Identity Verification", e.g. `?devPage=/kyc-verification`). The blue hero header is absent; the original onboarding header renders; no blue-hero styling appears. The `.blue-hero-header` markup is inside an `*ngIf="editMode"` branch so the scoped SCSS class never applies in onboarding.
- Evidence:
- Status:   pending

## AC-3: editMode header reuses the theme partial via @use, back btn calls goBack(), title is "Edit Identity"
- Type:     frontend-unit
- Check:    `kyc-verification.component.scss` contains `@use '../../theme/blue-hero-header'` (not a re-implemented copy). The editMode header back button binds to existing `goBack()`. Header title text is exactly "Edit Identity". Verify by grep of the html/scss + tsc.
- Evidence:
- Status:   pending

## AC-4: in editMode cannot proceed part 1 → part 2 unless a step-1 field changed (button disabled AND proceedToStep2 no-op)
- Type:     ui-acceptance
- Check:    In editMode with step 1 still equal to prefilled on-file values, the continue button is disabled (`[disabled]="!step1Valid || !step1Changed"`) AND `proceedToStep2()` early-returns when `editMode && !step1Changed`. Change one step-1 field → button enables and proceed works.
- Evidence:
- Status:   pending

## AC-5: "Changed" = current step-1 value vs snapshot captured AFTER the Alpaca prefill HTTP resolves; re-typing same value is not a change; !step1Valid still applies
- Type:     frontend-unit
- Check:    `step1Snapshot = JSON.stringify(step1Form.value)` is captured right after the Alpaca prefill resolves; `step1Changed` getter compares live `JSON.stringify(step1Form.value)` to the snapshot. Re-typing the same value yields no change (string equality). Existing `step1Valid` validation is still required (button uses `!step1Valid || !step1Changed`).
- Evidence:
- Status:   pending

## AC-6: gating applies only in editMode; onboarding step 1 → step 2 is unaffected
- Type:     ui-acceptance
- Check:    In onboarding mode, advancing step 1 → step 2 works with no "changed" requirement (gate code is guarded by `editMode`). Verify onboarding continue still proceeds on valid form.
- Evidence:
- Status:   pending

## AC-7: localStorage step-1 draft restore + step-transition animation still work; a restored draft equal to on-file values counts as "not changed"
- Type:     ui-acceptance
- Check:    Existing localStorage draft restore and the step-transition animation behave as before. If a restored draft equals the post-prefill on-file snapshot, `step1Changed` is false (gate stays closed). Prefill-slow/fail handling: button stays disabled in editMode until baseline captured; if prefill fails, fall back to `step1Valid`-only gate so the user is never stuck.
- Evidence:
- Status:   pending

## AC-8: `npx tsc --noEmit` exits 0; verified at 430×932 (editMode blue header both steps, onboarding original header, gate enables/disables correctly)
- Type:     frontend-unit
- Check:    `cd frontend && npx tsc --noEmit` exits 0. Plus the 430×932 visual confirmations from AC-1/AC-2/AC-4.
- Evidence:
- Status:   pending
