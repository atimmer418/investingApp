# Acceptance Check Manifest — FRED-199: Skip step-up auth section when not enabled

Approved approach: Option A — distinct "checking" state + remove the dead button.
Andrew's Q1 directive: do NOT preserve fail-open. Persist a per-user "has step-up PIN"
marker to localStorage so that if `hasPin()` fails open on a network error, the gate
still prompts for the PIN (fail-closed via localStorage fallback).

## AC-1: No step-up auth (hasPin() → false): verify overlay never shown; lands directly on loaded settings
- Type:     ui-acceptance
- Check:    Load /security-settings as a user with no PIN. The ".auth-overlay" Security Verification card (shield + "Please verify your identity…" + "Verifying…") is NEVER rendered. During the initial async check only a neutral, non-"verify" loading indicator may appear; then the loaded security settings render. No "verify your identity" framing at any point.
- Evidence:
- Status:   pending

## AC-2: Step-up enabled (hasPin() → true): verification section + promptPin('verify') behave exactly as today
- Type:     ui-acceptance
- Check:    Load /security-settings as a user with a PIN. The verify overlay shows, the step-up PIN modal (promptPin('verify')) is presented; on success the settings load; on cancel/fail the user is routed back to /tabs/tab3. No regression vs current behavior.
- Evidence:
- Status:   pending

## AC-3: Distinct interim "checking" state — no misleading flash, no content leak either direction
- Type:     frontend-unit
- Check:    The component models THREE states (checking / verify / settings) via a dedicated interim flag (e.g. `checkingStepUp`, true until hasPin() resolves). While checking, neither the verify overlay nor the settings content render — only a neutral spinner. PIN users never briefly see settings content before the prompt; non-PIN users never see the verify overlay. Verifiable by reading the template *ngIf gating + a spec asserting the flag transitions.
- Evidence:
- Status:   pending

## AC-4: Post-gate behavior preserved — loadSessions() + syncAlpacaAccountNumber() still run
- Type:     frontend-unit
- Check:    After the gate passes (no PIN, or PIN verified), loadSessions() and syncAlpacaAccountNumber() are still invoked and populate Trusted Devices + Alpaca account number as today.
- Evidence:
- Status:   pending

## AC-5: No new dead code — remove unreachable "Verify Identity" button + authenticateUser()
- Type:     frontend-unit
- Check:    The "Verify Identity" button (HTML ~L27–30) and authenticateUser() (TS ~L160–167) are DELETED (not commented out). No orphaned imports/icons left behind (e.g. unused `fingerprint`/`isAuthenticating` if it becomes dead). `grep` shows no remaining references to authenticateUser.
- Evidence:
- Status:   pending

## AC-6: Compiles clean — tsc --noEmit exits 0, no new warnings; both paths verified at 430×932 / 390×844
- Type:     frontend-unit
- Check:    `cd frontend && npx tsc --noEmit` exits 0 with no new TS errors/warnings. SCSS compiles with no new warnings. Both render paths spot-checked at 430×932 and 390×844.
- Evidence:
- Status:   pending

## AC-7: Harden fail-open via localStorage (Andrew's Q1 directive)
- Type:     frontend-unit
- Check:    A per-user marker (keyed/validated against the current userId, e.g. `stepUpEnabled:<userId>`) is persisted to localStorage when the user is known to have a step-up PIN (on successful PIN create, and/or when hasPin() returns true). When the `GET /user/pin/status` call FAILS (network error), hasPin() no longer blindly returns false (fail-open) — it returns the localStorage marker value, so a step-up user is still gated and prompted for their PIN. The marker is cleared on deletePin() (PIN turned off) and on logout / JWT clear / user switch, so a logged-out or switched user is never falsely gated. Store ONLY a non-sensitive boolean marker — NOT the raw PIN. Verifiable by a spec: stub hasPin() HTTP to throw, set the localStorage marker, assert hasPin() resolves true; clear the marker, assert it resolves false.
- Evidence:
- Status:   pending
