# Acceptance Check Manifest — FRED-207
Refactor Monte Carlo simulator into fullscreen premium flow.
Story: `FREDdocs/.stories/FRED-207.md` · Visual spec: `ITPM/agent-memory/FRED-207-prototype.html` (approved interactive prototype — port its look/feel/behavior faithfully).

> VERIFIER PASS 3 (2026-07-03) — FINAL. Builder's go-back-2 (keyboard rework) verified. Scope this pass = only `monte-carlo-flow.component.{ts,html,scss}` changed since pass 2 (retirement-planning.* + monte-carlo.service.ts untouched). Static gates green: `ng build --configuration dev` exit 0, ZERO TS-998113 on FRED-207 files; `ng test` 22/22 SUCCESS. The PASS-2 keyboard-avoidance BLOCKER is RESOLVED — the no-op ion-content wrapper is gone and replaced with a flow-local, genuinely-functional transform-based avoidance (native-only; web no-op). Live device-keyboard behavior stays needs-manual-QA (Capacitor Keyboard never fires on web → inherently un-runnable in this sandbox). VERDICT: APPROVED (visual/device tier remains needs-manual-QA).

## AC-1: Landing state replaces the simulator section; app chrome untouched
- Status:   needs-manual-QA  (orb labels/prototype-parity + chrome-untouched confirmed in code pass 2; render unverified)

## AC-2: Fullscreen modal takeover with crossfading steps
- Evidence: PASS 3 — ion-content wrapper REMOVED; root is back to plain `<div class="flow-host">`. Fullscreen css + `flowLock` guard + X-always-visible + mid-calc clean cancel all intact. Crossfade `.fscreen` opacity 0.38s. Takeover VISUAL = needs-manual-QA.
- Status:   needs-manual-QA

## AC-3: Portfolio step (readout, log slider, tap-to-type, live fetch, validation)
- Evidence: logic + fetch-contract cross-check PASS (pass 1). KEYBOARD (tap-to-type `#pfTypeInput`) now handled by the flow-local avoidance (see PASS 3 section) — functional native-only; device render = needs-manual-QA.
- Status:   needs-manual-QA

## AC-4: Spend + duration steps
- Status:   needs-manual-QA  (×12 + prefill code-confirmed; visual unverified)

## AC-5: Calculating theater — 5.5s, rotating lines, short re-run pass
- Evidence: `_calcLineTimer` assigned/cleared; main interval cleared inline on complete (:305) and via `_cancelTimers()` on dismiss/destroy; mid-calc X-dismiss cancels cleanly, no history. Visual timing = needs-manual-QA.
- Status:   needs-manual-QA

## AC-6: Results = strategy showdown, NO headline %
- Status:   needs-manual-QA  (5 cards + badges + defaults code-confirmed; visual unverified)

## AC-7: Scenario assumption sets + results flip (Pro)
- Status:   pass (unit constants 22/22) / needs-manual-QA (results-flip UI)

## AC-8: Outside accounts step (Plus and Pro)
- Evidence: wiring/persistence code-confirmed. KEYBOARD: the 401(k)+Roth inputs are now covered by the flow-local avoidance — on `keyboardWillShow` the active `.fscreen` is translated up by the occlusion overshoot (16px margin), transitioned 250ms, restored on hide/step-change. Functional native-only; device render = needs-manual-QA.
- Status:   needs-manual-QA  (wiring confirmed; keyboard avoidance now functional in code; device unverified)

## AC-9: Two-phase on-the-fly adjusters (Pro)
- Status:   pass (unit two-phase) / needs-manual-QA (adjuster UI)

## AC-10: Monthly withdrawal estimate at 90% confidence (Pro)
- Status:   pass (unit solver) / needs-manual-QA (estimate UI)

## AC-11: History — per-user localStorage, 3 entries, re-run, empty state
- Status:   needs-manual-QA  (service logic code-confirmed; visual unverified)

## AC-12: Tier gating (core lock centered; Plus full basic + outside accounts; Pro-only extras)
- Evidence: pass-1 inert-chip FAIL fixed pass 2 (`openChipNudge()` + FRED-pattern nudge sheet). Unchanged this pass. Three-tier VISUAL = needs-manual-QA.
- Status:   needs-manual-QA

## AC-13: Legacy removal + share retained
- Status:   pass  (removal + share code path grep/code-evidenced; share visual = needs-manual-QA)

## AC-14: Assumptions disclosure sheet
- Evidence: pass-1 copy inaccuracy fixed pass 2 (Box-Muller + Bloomberg data-source). Unchanged this pass. Visual = needs-manual-QA.
- Status:   needs-manual-QA

## AC-15: Quality gates
- Evidence: PASS 3 — `ng build --configuration dev` exit 0, ZERO TS-998113 for FRED-207 files (ion-content + KeyboardAvoidDirective imports fully removed; flow imports array now `[CommonModule, FormsModule]`); `ng test` 22/22 SUCCESS; Manrope/gradient/safe-area intact; `.fscreen` transition now includes `transform 250ms` (scss:138). MINOR NIT (non-blocking): `computed` is imported (flow ts:2) but never used — pre-existing since pass 1, produces NO build warning (`noUnusedLocals` off) and no runtime effect; recommend dropping the token, but it does not warrant another verification round.
- Status:   pass  (build clean + 22/22 + style OK; one trivial unused `computed` import to sweep)

---
## PASS 3 — keyboard rework verification (the go-back-2 item)
RESOLVED. flow html root is a plain `<div class="flow-host">` again (no ion-content); avoidance is now flow-local in the component:
- **Functional (fixes pass-2 no-op):** on `keyboardWillShow`, after a 300ms settle, `_applyOcclusion()` measures the focused input's `getBoundingClientRect().bottom` vs `window.innerHeight - keyboardHeight - 16`, and if occluded sets `transform: translateY(-overshoot)` on the active `.fscreen.on` (ts:628-637). A CSS transform DOES move a `position:absolute` panel (unlike the pass-2 ion-content scroll), so this genuinely lifts the input above the keyboard. Restored via `_restoreTransform()` on `keyboardWillHide` (ts:624) and on every step change (`showStep`→`_restoreTransform`, ts:457).
- **2a TEARDOWN PLACEMENT — SAFE:** `_cancelTimers()` (which calls `_teardownKeyboardAvoid()`, ts:598) has EXACTLY two call sites — `closeFlow()` (ts:530) and `ngOnDestroy()` (ts:590), both terminal. The calc-complete path clears its interval INLINE (`clearInterval` ts:305), NOT via `_cancelTimers`; no step-change / re-run / scenario-flip path calls it. So listeners never detach mid-session. Double-teardown (closeFlow then destroy) is idempotent (handles/handler nulled after first). NOTE (latent smell, non-blocking): burying `_teardownKeyboardAvoid()` inside `_cancelTimers()` is fragile — a future mid-session `_cancelTimers` call would silently kill avoidance; safer to call teardown directly from ngOnDestroy/closeFlow.
- **2b HANDLES — CORRECT:** `import { Keyboard } from '@capacitor/keyboard'` (ts:11) matches keyboard-avoid.directive.ts and package.json (`@capacitor/keyboard@^8.0.5`); `_kbShow`/`_kbHide` store the `Promise<PluginListenerHandle>` and teardown does `?.then(h => h.remove())` then nulls them; focusin listener also removed. No dangling listeners; on web the plugin never fires so no unhandled rejection.
- **2c TRANSLATE MATH — CORRECT:** measured against the focused input rect; transform on the active `.fscreen`; transitioned (scss:138 `transform 250ms ease`); restored on hide + step-change; web/native guard `if (!keyboardHeight || !activeFocused) return` (ts:629) = web no-op, equivalent to the directive.

## Verified-fixed across all passes (no longer failing)
- AC-15 dead imports/field (IonContent, KeyboardAvoidDirective, `_calcLineTimer`) — removed/assigned; build 0 FRED-207 warnings.
- AC-12 inert Plus landing chips → `openChipNudge()` + FRED-pattern nudge sheet.
- AC-14 "log-normal" copy → accurate Box-Muller + Bloomberg data-source line.
- userProgress$ leak → `takeUntil(destroy$)`.
- Orb prototype labels restored + extra "Run Simulator" button removed.
- X visible during calc; mid-calc dismiss cancels timers + no history.
- PASS-2 keyboard no-op → PASS-3 functional flow-local transform avoidance.

## Non-blocking cleanups (not for re-verification)
- flow ts:2 unused `computed` import (trivial, warning-free, pre-existing).
- `_teardownKeyboardAvoid()` coupled inside `_cancelTimers()` — safe today, latent fragility.
- History re-run re-saves a fresh entry each time (minor UX). Chart.js npm dep retained (unused, harmless).

## Visual / device tier (needs-manual-QA — NOT blocking per team-lead)
AC-1,2,3,4,5,6,8,11,14 + UI halves of AC-7/9/10/12/13, AND the native keyboard-avoidance BEHAVIOR (Capacitor Keyboard is native-only; never fires on web) all require a device/sim or CI-with-browser pass. Code-level correctness for every one of these is confirmed.
