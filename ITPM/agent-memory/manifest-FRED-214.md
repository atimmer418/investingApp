# Acceptance Check Manifest — FRED-214
Settings-shell rollout to all tab3-linked pages.
Story: `FREDdocs/.stories/FRED-214.md` · Reference: tab3.page.{html,scss} (FRED-211 pattern + tuned gradient).

> VERIFIER VERDICT (2026-07-10, pass 2 after go-back): **APPROVED** — 8/8 AC pass with
> independent runtime evidence. The pass-1 blocking regression (security-settings fixed
> overlays trapped below the header) is FIXED: the go-back removed `position/z-index` from
> `.shell-content` and moved `.checking-overlay`/`.auth-overlay` OUTSIDE `ion-content` to the
> page root. Re-proven live: both overlays now cover the header, and the back button is NOT
> hit-testable through the auth gate (elementFromPoint). The z-index removal touches all 10
> pages but broke nothing — pinned sheet + header layering intact on all 5 re-checked pages.
> Go-back diff scope confirmed (mtimes): only `_settings-shell.scss` + `security-settings.page.html`.

## AC-1: Shared shell single source
- Type: static
- Check: shell styles in one source; grep proves no per-page duplicated gradient/sheet blocks.
- Evidence: `_settings-shell.scss` created; all 10 pages `@use` it (grep confirmed). The 3
  `linear-gradient` hits in page SCSS are legitimate PAGE CONTENT, not shell dupes:
  beneficiaries `.banner-complete/.banner-incomplete` (status banners), change-bank
  `.illustration-card` bg. The single `::part(scroll)` block (beneficiaries) only adds
  `scrollbar-gutter`+`overflow-y:scroll` for ion-item-sliding compat — it does NOT redefine
  the sheet bg/radius/shadow. Compiled `www/` CSS shows one tuned gradient source.
  (NOTE: manifest's original "grep returns nothing" claim is imprecise — content gradients
  exist — but the intent "no duplicated SHELL gradient/sheet" holds.)
- Status: pass (verifier-confirmed)

## AC-2: Header treatment per page
- Type: ui-acceptance
- Check: tuned gradient; white Manrope 800/18 centered title (optical centering vs back btn); white back affordance with existing behavior; right actions preserved.
- Evidence: Compiled CSS: `.blue-hero-header[_ngcontent-%COMP%]{background:linear-gradient(160deg,#1e60e3 0%,#1a58d0 60%,#0e3a96 100%);padding:calc(env(safe-area-inset-top,0px)+2px)...}`.
  `.header-title` = Manrope 800/18px/center/#fff; optical centering via symmetric 40px
  `.back-btn` + 40px `.back-btn-spacer`/`.hero-action-btn`. Screenshots (security-settings,
  my-profile, faq) show white centered title + white `arrow_back_ios_new`. my-profile keeps
  its Save `.hero-action-btn` (`*ngIf="isDirty"`) restyled white; back handler `goBack()` intact.
- Status: pass (verifier-confirmed)

## AC-3: Pinned sheet on every converted page
- Type: ui-acceptance
- Check: fixed rounded top, content-only scroll, overscroll contain, clearances intact (headless scroll rect proof on 2+ pages).
- Evidence: EMPIRICAL headless (localhost:8100 ?devPage) on faq, beneficiaries, sell-withdraw —
  RE-CONFIRMED in pass 2 after the z-index removal. All three: headerTop=0/headerBottom=56 and
  sheetTop=56 IDENTICAL before & after scroll-to-bottom; scrollTop advanced (faq 0→269,
  beneficiaries 0→533, sell-withdraw 0→178); content clips beneath a pinned header+sheet.
  Spot renders my-profile + tax-documents: sheetTop=56=headerBottom (clean seam), headerOnTop=true
  (header still paints above content WITHOUT the removed z-index). `overscroll-behavior:contain`
  in partial. Screenshots: fred214-v2-{faq,beneficiaries,sell-withdraw}-scrolled.png,
  fred214-v2-{my-profile,tax-documents}-top.png. 0 console errors on all.
- Status: pass (verifier-confirmed)

## AC-4: Keyboard avoidance engages on form pages
- Type: static
- Check: form pages keep an IonContent-hosted scroller compatible with KeyboardAvoidDirective; static trace proves mechanics engage (no silent no-op).
- Evidence: All 5 form pages (recurring-investments, lump-sum-investment, portfolio-customize,
  sell-withdraw, my-profile) keep `<ion-content class="shell-content" appKeyboardAvoid>` (diffs
  confirmed). EMPIRICAL: `content.getScrollElement()` returns the element with `part="scroll"`
  (the real native Ionic scroller) and it scrolls — so the directive's getScrollElement()/
  scrollByPoint() operate on the actual scroller, NOT a nested div. No `[scrollY]="false"`.
  portfolio-customize keeps `--keyboard-offset:0px !important`; beneficiaries keeps its overrides.
- Status: pass (verifier-confirmed)

## AC-5: Behavior preservation / scope
- Type: static
- Check: content/logic/back untouched per diff; no tab1/2/3 or service files in this story's diff.
- Evidence: Zero `.ts` diffs on all 10 pages. Back handlers, sell-withdraw stepper, beneficiaries
  ion-item-sliding overrides preserved. PASS-1 REGRESSION (security-settings fixed overlays
  trapped below the header by `.shell-content{z-index:2}`) is now FIXED by the go-back:
  (1) `_settings-shell.scss` removed `position/z-index` from `.shell-content` (documented at
  :182-185); (2) `security-settings.page.html` moved `.checking-overlay`+`.auth-overlay` OUTSIDE
  `ion-content` to the page root (siblings of ion-header/ion-content) — escaping BOTH the stacking
  context AND ion-content's internal transform containing-block. RE-PROVEN LIVE (window.ng forced
  states): auth-overlay (`checkingStepUp=false,isAuthenticated=false`) → elementFromPoint at
  header-center returns `.auth-overlay` (coversHeader=true), at back-button returns `.auth-overlay`
  and NOT `.back-btn` (back button NOT hit-testable through the gate); checking-overlay
  (`checkingStepUp=true`) → coversHeader=true (fully opaque). Screenshots:
  fred214-v2-securitysettings-authoverlay.png (header ghosted behind the 97%-opaque gate),
  fred214-v2-securitysettings-checkingoverlay.png (fully covered). security-settings.page.scss
  unchanged (overlay CSS intact).
- Status: pass (verifier-confirmed — go-back fix re-proven)

## AC-6: Inventory honesty
- Type: static
- Check: implementation notes list EVERY tab3-linked destination with disposition; skips justified.
- Evidence: Inventory covers 10 converted + 2 skips (add-beneficiary: modal; change-email: not in
  tab3 section). Verified add-beneficiary.page.scss, change-email.page.scss, and (out-of-scope)
  kyc-verification.component.scss all still `@use blue-hero-header` correctly. NO converted page
  redundantly imports the old partial. blue-hero-header is NOT dead (3 legit non-converted consumers).
  (Backlog note, out-of-scope: converted security-settings navigates to change-email AND
  kyc-verification, both on the OLD header — a one-nav-level-deep visual clash.)
- Status: pass (verifier-confirmed)

## AC-7: Visual consistency proof
- Type: ui-acceptance
- Check: fred214-<page>.png top+scrolled for each converted page; consistent with tab3.
- Evidence: All 12 builder screenshots present (fred214-*-top.png ×10 + faq/beneficiaries scrolled).
  Spot-viewed security-settings/my-profile/faq — gradient, white 800 centered title, white back,
  pinned rounded sheet consistent across pages and with tab3. Independent re-captures (pass 1 + 2):
  fred214-v{,2}-{faq,beneficiaries,sell-withdraw}-scrolled.png + fred214-v2-{my-profile,tax-documents}-top.png
  confirm the divider effect and consistency.
- Status: pass (verifier-confirmed)

## AC-8: Quality gates
- Type: build
- Check: AOT build (dev) zero new warnings on touched files; lint; subset-icons if new ligatures; no TODOs/dead styles.
- Evidence: `ng build --configuration dev` (pass 2) → exit 0, "Application bundle generation
  complete." The 10 IonToolbar TS-998113 warnings are PRE-EXISTING (unused `.ts` import arrays;
  security-settings in NONE of them; FRED-214 touched zero `.ts`). `ng lint` (pass 2) → same 4
  pre-existing no-empty-lifecycle-method errors (investment-schedule, strategy-deck, faq.page.ts,
  recovery — security-settings in NONE). Zero new build/lint issues from the go-back. No new
  Material Symbols ligatures. Safe-area: `safe-area-lint.mjs` flags all 10 pages BUT this is a
  FALSE POSITIVE — the linter doesn't resolve `@use`; the header's `env(safe-area-inset-top)`
  lives in the imported `_settings-shell.scss`. Proven handled: linting the partial alone is
  clean, and compiled `www/` CSS carries `.blue-hero-header[_ngcontent-%COMP%]{...calc(env(safe-area-inset-top,0px)+2px)...}`
  per component.
- Status: pass (verifier-confirmed; safe-area-lint FP noted for linter follow-up)
