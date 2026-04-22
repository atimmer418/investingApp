# authfinalize Component Redesign

**Date:** 2026-03-25
**Status:** Approved
**Scope:** HTML + SCSS rewrite; minimal additive TS changes only

---

## Goal

Restyle `authfinalize` to match the design language of `surveyinitial` and `fi-plan-results`, while implementing five specific UX changes requested by the user.

---

## Design System Reference

All tokens mirror `fi-plan-results` exactly:

| Token | Value |
|---|---|
| Primary blue | `#2563EB` |
| Background | `#f8fafc` |
| Text | `#0f172a` |
| Gray | `#6b7280` |
| Font | Manrope (800 hero, 700 titles, 600 labels) |
| Border radius | 12–14px cards, 10–12px buttons |

---

## Changes

### 1. Header

**Remove:** `ion-back-button`, `ion-title`, `ion-progress-bar`

**Replace with** the fi-plan-results `.header-inner` pattern:
```html
<ion-header class="ion-no-border">
  <ion-toolbar>
    <div class="header-inner">
      <button class="back-btn" (click)="goBack()">
        <span class="material-symbols-outlined">arrow_back_ios_new</span>
      </button>
      <h2 class="header-title">Create Your Account</h2>
    </div>
  </ion-toolbar>
</ion-header>
```

Add `goBack()` to TS (additive, one line): `goBack() { this.navCtrl.back(); }`

SCSS: `--min-height: 52px`, backdrop blur, same `.back-btn` / `.header-title` styles as fi-plan-results.

---

### 2. Content Layout

`ion-content::part(scroll)` → `display: flex; flex-direction: column; height: 100%`

`.content-inner` → `flex: 1; display: flex; flex-direction: column; padding: 16px 18px 24px`

Two sub-zones within `.content-inner`:
- **`.hero-section`** (`flex-shrink: 0`) — top-pinned, same font/size as fi-plan-results hero (32px/800/`-0.025em`)
- **`.center-zone`** (`flex: 1; display: flex; flex-direction: column; justify-content: center`) — contains: email input, passkey note, bypass button (dev only), "or" divider, recovery button

---

### 3. Footer — "Create Account" Button

Move the sign-up action to `ion-footer`:
- Footer rendered with `*ngIf="hasRequiredParams && emailTouched"` — only shown when plan data is valid AND user has blurred the email input
- Button text: **"Create Account"** with `arrow_forward` material icon
- Same `.cta-btn` style as fi-plan-results: `height: 52px`, `border-radius: 12px`, `#2563eb`, Manrope 16px/700, blue shadow
- `IonFooter` must be added to the component's `imports` array

New TS additions (additive only):
- `emailTouched = false;`
- `(ionBlur)="emailTouched = true"` on the `ion-input`

---

### 4. Center Zone — Content Order

Within `.center-zone`, elements appear in this order:
1. Email input (bottom-border underline style, `ion-input` with `(ionBlur)`)
2. Passkey helper text ("No passwords needed — just Face ID or fingerprint...")
3. Bypass button (`*ngIf="env.local"`) — plain native `<button>` styled as a subtle text link, same pattern as recovery button
4. "or" divider row (line / text / line)
5. Recovery button — plain native `<button>` with `help-circle-outline` icon (matching fi-plan-results native `<button>` pattern, not `ion-button`)

---

### 5. "I'm at Work" Bypass Button — Local Only

Add `local` boolean flag to all four environment files:
- `environment.ts` → `local: true`
- `environment.dev.ts` → `local: false`
- `environment.prod.ts` → `local: false`
- `environment.test.ts` → `local: false`

`environment.ts` is the file used by `ng serve` locally (no fileReplacements needed — it is already the default). No `angular.json` changes required.

New TS additions:
- `import { environment } from '../../../environments/environment';` (already imported if not present)
- `protected env = environment;`

Apply `*ngIf="env.local"` to the bypass button. Method `bypassAuthID()` is untouched.

---

### 6. Error / Missing-Params State

The `*ngIf="!hasRequiredParams"` block is restyled to match the fi-plan-results `.error-state` pattern (centered, Manrope, same color tokens). The "Try Loading Saved Data" button calling `debugMissingParams()` is preserved. The "Back to Plan Selection" and "Restart Investment Survey" buttons are preserved. All three are restyled as native `<button>` elements matching the fi-plan-results `.error-cta` style.

---

### 7. Feedback Messages (`errorMessage` / `successMessage`)

A `.feedback-zone` div sits below `.center-zone` inside `.content-inner`. It renders conditionally:
- `*ngIf="errorMessage && hasRequiredParams"` → error text styled with `color: #dc2626`, centered, Manrope 14px/500
- `*ngIf="successMessage"` → success text styled with `color: #16a34a`, centered, Manrope 14px/500

(The separate `errorMessage` block shown when `!hasRequiredParams` lives inside the error-state section, not here.)

---

## What Does NOT Change

- All existing TypeScript methods: `createPasskey()`, `recoverAccount()`, `bypassAuthID()`, `debugMissingParams()`, `loadSavedData()`, `saveDataToLocalStorage()`, `validateRequiredParams()`
- Route params / localStorage logic
- `registerForm` reactive form setup
- All existing Ionic component imports (only `IonFooter` is added)

---

## File Checklist

| File | Change |
|---|---|
| `authfinalize.component.html` | Full rewrite of template structure |
| `authfinalize.component.scss` | Full rewrite matching fi-plan-results token set |
| `authfinalize.component.ts` | Add: `emailTouched`, `env`, `goBack()`, `IonFooter` import, `environment` import |
| `environment.ts` | Add `local: true` |
| `environment.dev.ts` | Add `local: false` |
| `environment.prod.ts` | Add `local: false` |
| `environment.test.ts` | Add `local: false` |
