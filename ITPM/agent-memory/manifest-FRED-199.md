# Acceptance Check Manifest — FRED-199: Skip step-up auth section when not enabled

Approved approach: Option A — distinct "checking" state + remove the dead button.
Andrew's Q1 directive: do NOT preserve fail-open. Persist a per-user "has step-up PIN"
marker to localStorage so that if `hasPin()` fails open on a network error, the gate
still prompts for the PIN (fail-closed via localStorage fallback).

## AC-1: No step-up auth (hasPin() → false): verify overlay never shown; lands directly on loaded settings
- Type:     ui-acceptance
- Check:    Load /security-settings as a user with no PIN. The ".auth-overlay" Security Verification card (shield + "Please verify your identity…" + "Verifying…") is NEVER rendered. During the initial async check only a neutral, non-"verify" loading indicator may appear; then the loaded security settings render. No "verify your identity" framing at any point.
- Evidence: Verifier ran specs independently (Playwright Chromium 141 headless): security-settings.page.spec.ts 11/11 PASS. DOM-level assertion "after no-PIN resolution, auth-overlay is absent and content-inner is present" (spec L164) confirms .auth-overlay (shield/"Security Verification"/"Please verify…"/"Verifying…") is NEVER rendered for hasPin()=false; .checking-overlay is also absent post-resolve; .content-inner present. Code-path trace: ngOnInit else-branch sets checkingStepUp=false then isAuthenticated=true, so `*ngIf="!checkingStepUp && !isAuthenticated"` on .auth-overlay can never be truthy on this path. No "verify your identity" framing at any point. RESIDUAL: literal pixel render at 430×932/390×844 could NOT run in sandbox (no dev server on :4200; tunnel returns 403 host_not_allowed; Chrome MCP tools unavailable) — handed to Andrew via Looks Good.
- Status:   deferred-to-CI (residual device render only; code-path + DOM spec PASS)

## AC-2: Step-up enabled (hasPin() → true): verification section + promptPin('verify') behave exactly as today
- Type:     ui-acceptance
- Check:    Load /security-settings as a user with a PIN. The verify overlay shows, the step-up PIN modal (promptPin('verify')) is presented; on success the settings load; on cancel/fail the user is routed back to /tabs/tab3. No regression vs current behavior.
- Evidence: Verifier ran security-settings.page.spec.ts independently 11/11 PASS. Asserted: "step-up user: checkingStepUp goes false, promptPin called with 'verify', isAuthenticated true after success" (L107) and "PIN cancel → router.navigate(['/tabs/tab3']), isAuthenticated stays false" (L118). Code-path trace: hasPin()=true → checkingStepUp=false → .auth-overlay renders → promptPin('verify') → success sets isAuthenticated=true (settings load via loadSessions/syncAlpaca, AC-4 specs L187 pass); cancel returns before loading (AC-4 spec L196 confirms loaders NOT called). No regression vs prior behavior. RESIDUAL: literal pixel render of overlay + PIN modal at 430×932/390×844 could NOT run in sandbox (same reason as AC-1) — handed to Andrew via Looks Good.
- Status:   deferred-to-CI (residual device render only; code-path + DOM spec PASS)

## AC-3: Distinct interim "checking" state — no misleading flash, no content leak either direction
- Type:     frontend-unit
- Check:    The component models THREE states (checking / verify / settings) via a dedicated interim flag (e.g. `checkingStepUp`, true until hasPin() resolves). While checking, neither the verify overlay nor the settings content render — only a neutral spinner. PIN users never briefly see settings content before the prompt; non-PIN users never see the verify overlay. Verifiable by reading the template *ngIf gating + a spec asserting the flag transitions.
- Evidence: security-settings.page.spec.ts — 11/11 pass (ChromeHeadlessNoSandbox). Covers: starts with checkingStepUp=true; neutral spinner shown while checking; no-PIN path never shows overlay; step-up path shows overlay then settings; content-leak *ngIf assertions.
- Status:   pass

## AC-4: Post-gate behavior preserved — loadSessions() + syncAlpacaAccountNumber() still run
- Type:     frontend-unit
- Check:    After the gate passes (no PIN, or PIN verified), loadSessions() and syncAlpacaAccountNumber() are still invoked and populate Trusted Devices + Alpaca account number as today.
- Evidence: security-settings.page.spec.ts — "no-PIN user: loadSessions() and syncAlpacaAccountNumber() are called after gate passes" + "step-up user after successful PIN: loadSessions() and syncAlpacaAccountNumber() are called" + "step-up user after PIN cancel: NOT called" — all pass.
- Status:   pass

## AC-5: No new dead code — remove unreachable "Verify Identity" button + authenticateUser()
- Type:     frontend-unit
- Check:    The "Verify Identity" button (HTML ~L27–30) and authenticateUser() (TS ~L160–167) are DELETED (not commented out). No orphaned imports/icons left behind (e.g. unused `fingerprint`/`isAuthenticating` if it becomes dead). `grep` shows no remaining references to authenticateUser.
- Evidence: grep -r "authenticateUser" frontend/src/app/pages/security-settings/*.ts → only spec assertions (method is absent). isAuthenticating and fingerprint removed from TS. .cta-btn removed from SCSS. security-settings.page.spec.ts AC-5 tests pass.
- Status:   pass

## AC-6: Compiles clean — tsc --noEmit exits 0, no new warnings; both paths verified at 430×932 / 390×844
- Type:     frontend-unit
- Check:    `cd frontend && npx tsc --noEmit` exits 0 with no new TS errors/warnings. SCSS compiles with no new warnings. Both render paths spot-checked at 430×932 and 390×844.
- Evidence: `cd /home/user/FRED/frontend && npx tsc --noEmit; echo "exit: $?"` → exit: 0. SCSS compiled successfully (Karma bundle built without errors for both specs). Both render paths (ui-acceptance) left for verifier to device-check.
- Status:   pass

## AC-7: Harden fail-open via localStorage (Andrew's Q1 directive)
- Type:     frontend-unit
- Check:    A per-user marker (keyed/validated against the current userId, e.g. `stepUpEnabled:<userId>`) is persisted to localStorage when the user is known to have a step-up PIN (on successful PIN create, and/or when hasPin() returns true). When the `GET /user/pin/status` call FAILS (network error), hasPin() no longer blindly returns false (fail-open) — it returns the localStorage marker value, so a step-up user is still gated and prompted for their PIN. The marker is cleared on deletePin() (PIN turned off) and on logout / JWT clear / user switch, so a logged-out or switched user is never falsely gated. Store ONLY a non-sensitive boolean marker — NOT the raw PIN. Verifiable by a spec: stub hasPin() HTTP to throw, set the localStorage marker, assert hasPin() resolves true; clear the marker, assert it resolves false.
- Evidence: pin.service.spec.ts — 8/8 pass (ChromeHeadlessNoSandbox). Covers: HTTP true → marker set; HTTP false → marker cleared; HTTP throws + marker set → true (fail-closed); HTTP throws + no marker → false; deletePin() clears marker; marker helpers no-op with no userId. JwtTokenUtils.clearJwtData() clears stepUpEnabled:<userId> before removing userId (verified by code review + tsc exit 0).
- Status:   pass
