# LinkPlaid UI Overhaul — Design Spec

**Date:** 2026-03-25
**Component:** `frontend/src/app/components/linkplaid/`
**Status:** Approved

---

## Goal

Replace the existing generic LinkPlaid UI with a polished, FRED-design-system-consistent screen that matches the visual language of `surveyinitial`, `fi-plan-results`, and `authfinalize` — while preserving all existing TypeScript logic and Plaid integration unchanged.

---

## Design System Constraints

All styling follows the established FRED pattern from the three reference components:

| Token | Value |
|---|---|
| Background | `#f8fafc` |
| Text (primary) | `#0f172a` |
| Blue accent | `#2563EB` |
| Gray (subtext) | `#6b7280` |
| Font | Manrope |
| Icons | Material Symbols Outlined |
| Dark mode | Forced off (`:host` overrides Ionic CSS vars) |

---

## Structure

### `ion-header`
- No `ion-progress-bar` (removed per design decision)
- Custom `.header-inner` layout: `.back-btn` (left) + `.header-title` centered
- Back button: native `<button>` with `material-symbols-outlined` → `arrow_back_ios_new`, calls `goBack()`
- Title: "Link Bank Account"
- Frosted glass toolbar: `backdrop-filter: blur(8px)`, `rgba(248, 250, 252, 0.95)` background

### `ion-content`
- `ion-content::part(scroll)`: `display: flex; flex-direction: column; height: 100%` — enables vertical centering of center-zone
- `.content-inner`: `flex: 1; display: flex; flex-direction: column; padding: 16px 18px 24px`

#### Hero section (top-pinned, `flex-shrink: 0`)
- `h1.hero-title`: "Seamless investing starts here." — 32px, weight 800, centered
- `p.hero-subtitle`: supporting copy — 14px, gray, centered

#### Center zone (`flex: 1; justify-content: center; gap: 16px`)
Content order (top to bottom):

1. **Illustration card** — gradient `#eff6ff → #eef2ff`, `border: 1px solid #bfdbfe`, `border-radius: 16px`. Contains two layered icon tiles: main white card (bank icon, rotated -6°) + secondary blue card (sync icon, rotated +12°). Decorative blurred blobs in corners.

2. **Security badge** — `#f8fafc` background, `border: 1px solid #e5e7eb`, `border-radius: 10px`. `verified_user` icon + "Secured by Plaid • AES-256 Encryption" text. 12px gray.

3. **Benefits list** — 3 items, each with a 40×40px circular blue-tinted icon badge (`#eff6ff` bg, `#2563EB` icon) and text block (15px semibold title + 13px gray description):
   - `calendar_month` → "Schedule investments"
   - `lock` → "Bank-level security"
   - `tune` → "Full control"

### `ion-footer`
- Matches authfinalize/fi-plan-results pattern exactly
- `.cta-footer`: white bg, `border-top: 1px solid #f1f5f9`, subtle upward shadow, safe-area padding
- `.cta-btn`: full-width, 52px height, `border-radius: 12px`, **black** (`#111827`) background (intentional divergence from blue — design decision), white text, black drop shadow

---

## TypeScript Reconnection

All existing TS logic is preserved with zero changes. The HTML bindings map as follows:

| Element | Binding |
|---|---|
| Back button | `(click)="goBack()"` |
| CTA button | `(click)="openPlaid()"` |
| CTA button disabled | `[disabled]="isLoading \|\| !isPlaidReady"` |
| CTA button label — ready | `*ngIf="!isLoading && isPlaidReady"` → "Connect with Plaid" + arrow |
| CTA button label — not ready | `*ngIf="!isLoading && !isPlaidReady"` → "Preparing secure connection..." |
| CTA button label — loading | `*ngIf="isLoading"` → spinner + `statusMessage` |
| Status message | `*ngIf="statusMessage && !isLoading"` in `.feedback-zone` below center zone |

---

## Loading Veil

Same pattern as surveyinitial/fi-plan-results:
```html
<div class="loading-veil" [class.veil-hidden]="isPlaidReady"></div>
```
Fixed overlay that fades to transparent once `isPlaidReady` is true.

---

## What Does NOT Change

- `linkplaid.component.ts` — zero modifications
- Plaid SDK integration, token fetch, public token exchange
- Route navigation (`/investment-schedule` on success)
- `authService.markStepIncomplete` / `completeStep` calls
- All error handling and status message logic
