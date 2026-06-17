# FRED-199 — Skip step-up auth section when not enabled

## Before (verbatim from backlog.md)

> change the security settings loading animation for people without step up auth enabled to just load the security settings instead of showing that section; for people who do have step up auth, they should have that section still along with the prompting of the actual stepup auth pin entering

## After (structured ticket)

### Summary
On the Account Security page, only users who have **Step-Up Authentication enabled (a PIN set)** should see the "Security Verification" overlay and be prompted to enter their step-up PIN. Users **without** step-up auth currently still get a flash of that "verify your identity / Verifying…" overlay before the page loads — they should skip it entirely and land straight on the loaded security settings.

### Why this happens today
`security-settings.page.ts` initializes `isAuthenticated = false` + `isAuthenticating = true`, so the HTML's "Authentication Overlay" (`*ngIf="!isAuthenticated"`, lines 16–32 — shield icon, "Security Verification", "Please verify your identity…", "Verifying…" spinner) renders for **everyone** at first paint. `ngOnInit` then `await`s `pinService.hasPin()` — an **async network call** to `GET /user/pin/status` — and only after it resolves does it branch: PIN set → `promptPin('verify')`; no PIN → immediately `isAuthenticated = true`. So a no-step-up user sees the "verify your identity" overlay during that network round-trip even though nothing is being verified. Because `hasPin()` is async, the page genuinely doesn't know at first paint whether step-up is on — that's the core thing the fix has to handle.

### Files / systems involved
- `frontend/src/app/pages/security-settings/security-settings.page.ts` — the gating state machine in `ngOnInit` and the `isAuthenticated` / `isAuthenticating` flags (lines 53–54, 82–110). Likely needs a distinct interim "checking step-up status" state separate from "verifying via PIN".
- `frontend/src/app/pages/security-settings/security-settings.page.html` — the `.auth-overlay` block (lines 16–32) must only render for step-up-enabled users; a neutral loader covers the `hasPin()` window.
- `frontend/src/app/pages/security-settings/security-settings.page.scss` — minor styling if a neutral "checking" loader is added.
- `frontend/src/app/services/pin.service.ts` — read-only reference; `hasPin()` (async, fails open to `false` on error) and `promptPin('verify')` are the source of truth. No changes expected here.

### Doc references
- `./FREDdocs/AUTHENTICATION_AND_JWT.md` — step-up / PIN auth context (auth-touching change).
- `./FREDdocs/FRED_UI_STYLE_GUIDE.md` — for any neutral loading-state styling (FRED loading veil / spinner conventions).

### Acceptance Criteria
1. **No step-up auth (`hasPin()` → false):** the "Security Verification" overlay (shield + "Please verify your identity to access security settings" + "Verifying…") is **never** shown. The user lands directly on the loaded security settings. A neutral, non-"verify" loading indicator during the initial `hasPin()` + data fetch window is acceptable; the "verify your identity" framing is not.
2. **Step-up auth enabled (`hasPin()` → true):** the verification section **and** the actual step-up PIN entry modal (`promptPin('verify')`) behave exactly as today — on success the settings load; on cancel/fail the user is routed back to `/tabs/tab3`. No regression.
3. **No misleading flash:** because `hasPin()` is an async network call, the page must not flash the "verify your identity" overlay to non-step-up users while the check is in flight. Use a distinct interim state (neutral loader or blank) so the verification overlay only ever renders for step-up-enabled users — and so PIN users never briefly see the settings content before the PIN prompt appears (no content leak either direction).
4. **Existing post-gate behavior preserved:** once the gate passes (no PIN, or PIN verified), `loadSessions()` and `syncAlpacaAccountNumber()` still run and populate Trusted Devices + Alpaca account exactly as today.
5. **No new dead code (CONTEXT.md):** if this change leaves the legacy "Verify Identity" button (HTML lines 27–30) and `authenticateUser()` (TS lines 160–167) unreachable, remove them or wire them in — no orphaned code left behind. (See open question below.)
6. `cd frontend && npx tsc --noEmit` exits 0, no new SCSS/TS warnings. Both paths verified at 430×932 (and spot-checked at 390×844): (a) a user with no PIN loads straight into settings with no "verify" overlay; (b) a user with a PIN sees the verification overlay + PIN modal and reaches settings only after verifying.

### Edge cases / open questions
- **`hasPin()` fail-open:** `hasPin()` currently catches network errors and returns `false`, so on a flaky connection a step-up user would be treated as no-step-up and let straight in. This is the *current* behavior and is outside the note's scope. Preserve it (safer for availability), or harden to block/retry on error? — flag for Andy; default is to preserve.
- **Legacy "Verify Identity" button:** in today's flow `isAuthenticating` is only ever true during `ngOnInit` and is flipped to `false` together with `isAuthenticated = true`, so the button's visible condition (`!isAuthenticated && !isAuthenticating`) is never reached and `authenticateUser()`'s 1.5s fake `setTimeout` never runs. It looks vestigial — confirm it can be removed as part of this change (AC-5).
- **Neutral loader style:** should the interim "checking" state use the FRED loading veil or a simple inline `ion-spinner`? Default to whatever is lightest and consistent with the style guide, since this window is brief.

### Time estimate
`1-3hr` — single-component change, but the async state machine (checking → overlay/PIN vs. checking → content) and dual-path verification carry the weight.

### Label
`[code]`
