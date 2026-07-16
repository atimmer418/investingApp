# Acceptance Check Manifest — FRED-215

**Story:** Extend settings-shell to change-email + KYC edit mode
**Verifier:** verifier-agent (independent, adversarial)
**Verdict:** APPROVED
**Tiering:** Frontend-only diff (KYC component, change-email page, `_settings-shell.scss`). No backend `.java`, no API contract change → Phase 2 API integration N/A. Phase 3 UI ran live (backend :8080 + tunnel both reachable).
**Tree noise (out of scope, NOT judged):** another session's ai-chat/tabs work (now committed to HEAD `cedf3f4`). The full `ng build` actually passes clean — the blocker the brief warned about is not currently active, so no stash was needed. FRED-215 files compile clean as-is.

## Diff scope (working-tree vs committed HEAD)
- `frontend/src/app/components/kyc-verification/kyc-verification.component.html` — +2 additive `[class.*]` bindings only
- `frontend/src/app/components/kyc-verification/kyc-verification.component.scss` — import swap + `.content-inner--edit` block
- `frontend/src/app/pages/change-email/change-email.page.{html,scss,ts}` — full shell conversion
- `frontend/src/theme/_settings-shell.scss` — fade-to-flat header bottom edge
- KYC component.ts: **ZERO changes** (verified via `git diff --stat`).

| AC | Type | Check | Evidence | Status |
|----|------|-------|----------|--------|
| AC-1 | static+visual | change-email adopts shell | Live DOM: `contentHasShell:true`, `hasShellInner:true`, `hasSectionCard:true`, `ionContentBg:#0e3a96`, headerTitle "Change Email", currentEmail prefilled `facebook@gmail.com`; builder `fred215-change-email-top.png`; source: `@use settings-shell` + `ion-content.shell-content appKeyboardAvoid` + `div.shell-inner` | pass |
| AC-2 | static-cascade+visual | KYC editMode shell / onboarding byte-identical | Live bidirectional toggle on same instance: ONBOARDING → `headerBranch:ONBOARDING`, `contentHasShell:false`, `ionContentBg:#f8fafc`, `toolbarBgVar:#f8fafc`, title "Identity Verification", hero "A few more details."; EDIT → `headerBranch:EDIT(blue-hero)`, `contentHasShell:true`, `ionContentBg:#0e3a96`, `innerPadTop:18px`, white title+back (`rgb(255,255,255)`), title "Edit Identity", hero "Update your info."; builder `fred215-kyc-onboarding-unchanged.png` + `fred215-kyc-edit-top.png` | pass |
| AC-3 | static+wiring | Keyboard avoidance engages (IonContent host, no no-op) | `KeyboardAvoidDirective` injects `IonContent` in ctor (would throw if not on ion-content); both pages apply it to `ion-content`; change-email `[scrollY]="false"` REMOVED (`scrollYAttr:null` = default true, required for `scrollByPoint` line 63). Native-only by design; web fallback in app.component.ts | pass |
| AC-4 | visual | Seam: fade-to-flat header bottom meets #0e3a96, no break | Live: `heroGradientSnippet` shows fade layer `rgba(14,58,150,0)...calc(100% - 26px), rgb(14,58,150) 100%`; builder `fred215-seam-corner.png` (flat dark strip meets white corner, no lighter-blue triangle) | pass |
| AC-5 | static+live | Behavior preserved; zero .ts beyond conditional classing | KYC .ts ZERO changes (`git diff --stat` empty); change-email .ts = import-only (`+KeyboardAvoidDirective`), all flow methods intact (goBack, ngOnInit, canSave, initiateEmailChange); live edit mode: `ssnFieldPresent:false` (SSN-lock), `dobFieldPresent:false`+`fundingSourcePresent:true` (edit field swap), agreement pre-check/disable via ngOnInit | pass |
| AC-6 | gate | AOT-clean; lint clean; screenshots; no TODOs | `ng build --configuration dev` exit 0 "Application bundle generation complete" (only pre-existing IonToolbar-unused warnings); `ng lint` scoped to 3 files → "All files pass linting" exit 0; 7 screenshots saved (1170x2532); no NEW TODO in diff (KYC agreement TODO is pre-existing in committed HEAD blob) | pass |

## Static cascade analysis (the AC-2 core question)
The partial swap `blue-hero-header` → `settings-shell` is safe for the onboarding path because:
1. **`ion-header` reset**: byte-identical declarations in both partials (`--background:transparent; background:transparent !important; contain:none; overflow:visible`). No change.
2. **`ion-toolbar` reset**: both partials emit `--background:transparent; --border-width:0; --min-height:0`. Identical. The KYC component's own `ion-toolbar { --background:#f8fafc }` (line 38, AFTER the top-of-file `@use`) wins by source order (same specificity) → onboarding toolbar stays light. **Confirmed live: `toolbarBgVar:#f8fafc`.**
3. **`.shell-content` / `.blue-hero-header` gradient / `#0e3a96` bg**: these are class selectors that only apply when the `[class.shell-content]="editMode"` binding is true. Onboarding (editMode=false) never gets the class → no leak. **Confirmed live: onboarding `contentHasShell:false`, `ionContentBg:#f8fafc`.**
4. ViewEncapsulation.Emulated scopes all partial selectors to the KYC component's DOM (not truly global), so no cross-component leak either.

## Test Results
- **Phase 2 — API**: N/A (frontend-only diff, no API contract touched).
- **Phase 3 — UI** (backend :8080 reachable, tunnel reachable):
  - change-email: shell applied, prefill works, console clean.
  - KYC onboarding (`?devPage=/kyc-verification`, no edit): onboarding render confirmed, byte-identical to pre-story.
  - KYC edit (forced `editMode=true` via `window.ng.getComponent().editMode` + `applyChanges` — devPage does NOT pass `&edit=true` through): shell + white nav + prefill + SSN-lock confirmed.
  - Console: no errors, no warnings on the KYC route across load + editMode flip.
- **Safe-area notch lint**: exit 1 with 2 advisories on the two `.blue-hero-header` divs — FALSE POSITIVES. The linter cannot resolve `@use` partials; the `env(safe-area-inset-top)` padding lives in `_settings-shell.scss:73` (`padding: calc(env(safe-area-inset-top,0px)+2px) ...`). All 12 shell consumers (incl. 10 shipped FRED-214 pages) rely on the partial and have 0 `safe-area-inset-top` in their own SCSS — change-email/KYC are identical to the accepted pattern. Notch protection IS present.

## User-state coverage
Phase 3 uses facebook@gmail.com. KYC editMode was exercised by forcing the `@Input() editMode` (the real entry is `?edit=true` from security-settings). Onboarding path exercised via the user's real progress state (KYC is that user's current step, so `/kyc-verification` stuck without bounce). No user-state-dependent branch beyond editMode; both states covered.

## In-scope failures
None.

## Out-of-scope discoveries (backlog drafts — do NOT affect verdict, NOT handed to builder)
- [DEV] safe-area-lint.mjs should resolve `@use` partials — currently over-flags every settings-shell consumer as a false FRED-124 positive because the safe-area padding lives in the shared partial, not the page's own SCSS — enhancement
- [DEV] devPage dev-harness drops trailing query params (`&edit=true`) — devPage consumes the outer URL and navigates to the bare route, so editMode/other-param pages can't be reached by URL alone in dev — enhancement
