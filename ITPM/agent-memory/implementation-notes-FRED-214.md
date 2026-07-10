# Implementation Notes — FRED-214
Settings-shell: family gradient header + pinned sheet on all tab3-linked pages.

---

## Inventory — All Tab3-Linked Destinations

| Page | Component file | Disposition | Notes |
|------|---------------|-------------|-------|
| My Profile | `pages/my-profile/my-profile.page` | Converted | `appKeyboardAvoid` preserved; uses `hero-action-btn` for Save (right slot) |
| Recurring Investments | `recurring-investments/recurring-investments.page` | Converted | Form page; `appKeyboardAvoid` preserved |
| Lump Sum Investment | `lump-sum-investment/lump-sum-investment.page` | Converted | Form page; `appKeyboardAvoid` preserved |
| Portfolio Customize | `components/portfolio-customize/portfolio-customize.component` | Converted | Form component (modal-style); `appKeyboardAvoid` preserved; kept `--keyboard-offset: 0px !important` |
| Sell / Withdraw | `sell-withdraw/sell-withdraw.page` | Converted | Form page; `appKeyboardAvoid` preserved |
| Security Settings | `pages/security-settings/security-settings.page` | Converted | Non-form; fixed overlays (position:fixed;inset:0) unaffected by shell |
| Change Bank Account | `change-bank-account/change-bank-account.page` | Converted | Non-form |
| Tax Documents | `pages/tax-documents/tax-documents.page` | Converted | Non-form |
| Beneficiaries | `beneficiaries/beneficiaries.page` | Converted | `ion-item-sliding` compat: kept `overflow-y: scroll !important` on `::part(scroll)` |
| FAQ | `faq/faq.page` | Converted | Non-form |

**Not converted (out of scope per story):**
- `add-beneficiary` — tab3 launches modal; not a direct tab3-linked page (same blue-hero-header still correct)
- `change-email` — not in tab3 settings section; imports old blue-hero-header correctly

---

## Design Decisions

- Created `_settings-shell.scss` as a NEW partial (did not modify `_blue-hero-header.scss`). Reason: kyc-verification, add-beneficiary, and change-email still use blue-hero-header with the old gradient+concave-cutout pattern. Touching that partial would have changed unscoped pages.
- Gradient: `linear-gradient(160deg, #1e60e3 0%, #1a58d0 60%, #0e3a96 100%)`. End color `#0e3a96` matches `.shell-content { --background: #0e3a96 }`, creating a seamless corner transition where the rounded sheet meets the gradient body.
- Shell uses `::part(scroll)` to pin the white rounded surface. The `ion-content::part(scroll)` exposes the native `.inner-scroll` container; styling it with `border-radius: 26px 26px 0 0` and `background: #ffffff` pins the sheet top while content scrolls inside.
- All 10 pages use exactly one shell pattern: `<ion-content class="shell-content">` + `<div class="shell-inner">`. No per-page overrides to the gradient or sheet.

---

## KeyboardAvoidDirective Trace (AC-4)

`KeyboardAvoidDirective` constructor: `constructor(private content: IonContent) {}` — injects the host `ion-content` directly.

On `ngOnInit`: `this.scrollEl = await this.content.getScrollElement()` — calls native Ionic API on the injected `IonContent` instance.

On keyboard show: `this.scrollEl.style.paddingBottom = keyboardHeight + 'px'` — adjusts the native scroll element's padding.

On `focusin`: `this.content.scrollByPoint(0, overshoot, 150)` — calls IonContent's scroll API.

Why `::part(scroll)` is safe: we are styling the *same* native scroll container via CSS, not replacing it with a div. `scrollY` remains `true` (default) on `ion-content`. The directive's `getScrollElement()` and `scrollByPoint()` calls operate on the real Ionic scroll host. Zero silent no-op risk (unlike the FRED-211 `[scrollY]="false"` trap).

---

## Tradeoffs

- Kept `overflow-y: scroll !important` override in beneficiaries only, because `ion-item-sliding` swipe-to-delete requires the scroll container to have explicit overflow scroll (Ionic bug). Other pages don't need it.
- `portfolio-customize` kept `--keyboard-offset: 0px !important` to prevent Ionic's native keyboard resize from double-adjusting the scroll position alongside the directive.

---

## Open Questions

None — spec was fully covered by the tab3 action map and the FRED-211 reference pattern.

---

## Build + Lint Results

**AOT build (ng build --configuration dev):** Completed with zero errors. Four IonToolbar "not used in template" warnings are pre-existing — they appear in .ts import arrays on pages that use the custom `div.blue-hero-header` pattern (not `<ion-toolbar>`). These warnings existed before FRED-214; my changes were SCSS+HTML only, not TypeScript.

**ESLint (ng lint):** Four pre-existing errors in files outside FRED-214's diff:
- `investment-schedule.component.ts:591` — empty lifecycle method
- `strategy-deck.component.ts:217` — empty lifecycle method
- `faq.page.ts:115` — empty lifecycle method (faq.page.ts NOT in my diff; only faq.page.html + .scss changed)
- `recovery.page.ts:48` — empty lifecycle method

Zero new lint errors introduced by FRED-214.

**Material Symbols:** No new ligatures added. All icons in converted pages were present before FRED-214. `npm run subset-icons` not needed.

---

## SCSS Path Depths

Pages under `src/app/<page>/` use `@use '../../theme/settings-shell'` (2 levels up).
Pages under `src/app/pages/<page>/` and `src/app/components/<comp>/` use `@use '../../../theme/settings-shell'` (3 levels up).

---

## Go-Back 1 Fix (FRED-214 revision)

**Root cause:** `_settings-shell.scss` had `position: relative; z-index: 2` on `.shell-content`, which created a stacking context. Children of that stacking context (including the security-settings overlays with `z-index: 100`) were bounded by the context's z-index:2 at the page level — below the header's z-index:10 — so the header painted above them regardless of the overlay's inner z-index.

**Why z-index removal alone was insufficient:** Ionic's `ion-content` applies an internal transform on its shadow host for GPU compositing, which creates a fixed-position containing block. Even without a z-index, `position: fixed` children inside `<ion-content>` can't escape the ion-content's painted area. The overlays needed to move to the page root level.

**Combined fix applied:**
1. `_settings-shell.scss`: removed `position: relative; z-index: 2` from `.shell-content` — no stacking context should ever exist here; ion-header/ion-content layering is handled by Ionic's built-in layout, not by z-index on the host
2. `security-settings.page.html`: moved `.checking-overlay` and `.auth-overlay` from inside `<ion-content>` to page root level (sibling of `<ion-header>` and `<ion-content>`). At `.ion-page` level, `contain: layout` makes fixed descendants positioned relative to `.ion-page` (which is `inset: 0`, full screen, including header). Their z-index:100 beats the header's z-index:10

**elementFromPoint proof:** `{ element: "div.auth-overlay", hasOverlayClass: true }` at (195, 55) — overlay is topmost at header center.

**Overlay elements confirmed interactable:** cardRect top:273, width:340×298, titleText:"Security Verification", spinnerFound:true.
