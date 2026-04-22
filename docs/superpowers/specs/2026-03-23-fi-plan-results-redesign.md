# FI Plan Results — Redesign Spec
**Date:** 2026-03-23
**Status:** Approved by user

---

## Overview

Restyle `fi-plan-results` component to match the `surveyinitial` design language (Manrope font, FRED blue/white/black palette). Additionally: remove the "Recommended" badge, start with no default selection, disable the footer CTA until a selection is made, and update all four strategy card contents.

---

## Design Language (from surveyinitial)

| Token | Value |
|---|---|
| Primary blue | `#2563EB` |
| Background | `#f8fafc` |
| Text dark | `#0f172a` |
| Text gray | `#6b7280` |
| Track/border | `#e5e7eb` |
| Font | Manrope |
| Icon system | Material Symbols Outlined (replacing ionicons) |

### Dark Mode Suppression

The `:host` block in SCSS **must** override Ionic CSS variables to prevent dark mode bleed (same pattern as surveyinitial):

```scss
:host {
  --ion-background-color: #f8fafc;
  --ion-toolbar-background: rgba(248, 250, 252, 0.95);
  --ion-toolbar-color: #0f172a;
  --ion-text-color: #0f172a;
  --ion-color-primary: #2563EB;
  --ion-footer-background: #f8fafc;
}
```

---

## Layout — iPhone 14 (390×844) No-Scroll Fit

All four strategy cards must be visible without scrolling on the minimum supported viewport (iPhone 14: 390×844px).

Ionic's `ion-header` handles the 44px status bar safe area internally. The `ion-footer` is placed above the home indicator safe area (~34px on iPhone 14) automatically. The content area fills the remainder with `flex: 1`.

```
ion-header (incl. status bar):  ~96px  (Ionic-managed)
ion-content padding-top:          0px
Hero section + gap:               64px  (52px text + 12px margin-bottom)
Gap between hero and cards:        0px  (gap included in hero margin)
Card gaps (3 × 8px):              24px
ion-footer (button area only):   ~80px  (Ionic manages home indicator separately)
──────────────────────────────────────
Fixed consumption:               ~264px
Available for 4 cards:           ~580px
Each card (flex:1):              ~145px  ← minimum acceptable: 130px
```

Cards use `flex: 1` inside a flex column — they fill available space equally and adapt to the actual viewport. The footer uses `padding: 14px 18px calc(env(safe-area-inset-bottom, 0px) + 14px)` so the button area stays consistent while the safe-area padding is additive below it.

**Minimum card height guard:** each card should set `min-height: 120px` to prevent content clipping on smaller/older devices. Cards will grow beyond this on iPhone 14.

---

## Header

- Custom back button (same pattern as surveyinitial): 40px circle, `arrow_back_ios_new` material symbol, `color: #0f172a`, transparent background
- Centered title: **"Choose Your Strategy"** (17px, Manrope 700, `#0f172a`)
- Title offset `padding-right: 40px` to visually center past back button
- Toolbar background: `rgba(248, 250, 252, 0.95)` with `backdrop-filter: blur(8px)`
- **Remove from template:** `ion-back-button`, `ion-title`, `ion-progress-bar`
- **Remove from TS imports:** `IonBackButton`, `IonProgressBar`, `IonTitle`
- **Add to TS:** `Location` from `@angular/common`, inject in constructor, `goBack() { this.location.back(); }`

---

## Hero Section

```
Fast Forward to 2047.
Your portfolio hits $1.4M. Pick how you want to live off it.
```

- Title: 22px, Manrope 800, `#0f172a`, `letter-spacing: -0.025em`, `line-height: 1.2`
- Subtitle: 13px, `#6b7280`, `line-height: 1.4`. Portfolio value uses `currency` pipe, bolded in `#0f172a`
- `margin-bottom: 12px`
- Portfolio number formatted with existing `targetPortfolio | currency:'USD':'symbol':'1.0-0'`

---

## Strategy Cards

### Container
```scss
.strategy-cards-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;  // fills available space in ion-content
}
```

### Individual Card
```scss
.strategy-card {
  flex: 1;
  min-height: 120px;
  background: white;
  border-radius: 14px;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &.selected {
    border-color: #2563eb;
    box-shadow: 0 3px 14px rgba(37, 99, 235, 0.13);
  }
}
```

### Selected Checkmark
- 20×20px filled blue circle (`background: #2563eb`), `position: absolute; top: 12px; right: 12px`
- White `✓` via material symbol `check` at 12px
- `[class.selected]="selectedStrategyId === strategy.id"` — keep existing binding

### Card Content Structure (top to bottom)
1. Row: Material Symbol icon (18px) + title (14px, Manrope 800, `#0f172a`) — `gap: 8px`
2. Description (12px, `#6b7280`, `line-height: 1.45`) — 2 lines max
3. `border-top: 1px solid #f1f5f9` + Tags row

### Tags
```scss
.strategy-tags {
  border-top: 1px solid #f1f5f9;
  padding-top: 8px;
  display: flex;
  gap: 5px;
}

.tag {
  white-space: nowrap;
  font-size: 9.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  line-height: 1;
}
```

Tag color classes (explicit hex for all strategies):

| Class | Background | Text | Border |
|---|---|---|---|
| `tag-blue` | `#eff6ff` | `#2563eb` | none |
| `tag-green` | `#f0fdf4` | `#16a34a` | none |
| `tag-gray` | `#f8fafc` | `#6b7280` | `1px solid #e5e7eb` |
| `tag-amber` | `#fffbeb` | `#b45309` | none |

---

## Four Strategies (update `strategies` array in TS)

### 1. Yield-Based Income
- **id:** `'yield'`
- **Icon:** `savings` (material symbol)
- **Description:** "Live off dividends and interest. Principal stays invested — never sell a share."
- **Tags:**
  - `{ label: 'No Selling', type: 'blue' }`
  - `{ label: 'Always Growing', type: 'green' }`
  - `{ label: 'Yield-Dependent', type: 'gray' }`

### 2. Dynamic Guardrails
- **id:** `'guardrails'`
- **Icon:** `tune` (material symbol)
- **Description:** "Spend more in good years, pull back in bad ones. No debt, ever."
- **Tags:**
  - `{ label: 'High Growth', type: 'green' }`
  - `{ label: 'Debt-Free', type: 'green' }`
  - `{ label: 'Flex Spending', type: 'amber' }`

### 3. Sell High, Borrow Low
- **id:** `'sbloc'`
- **Icon:** `swap_vert` (material symbol)
- **Description:** "Sell 4% when markets are up. Borrow against your portfolio when they dip."
- **Tags:**
  - `{ label: 'Protects Gains', type: 'green' }`
  - `{ label: 'App-Managed', type: 'green' }`
  - `{ label: 'Uses Credit', type: 'amber' }`

### 4. Annuity
- **id:** `'annuity'`
- **Icon:** `lock` (material symbol)
- **Description:** "Turn your portfolio into a guaranteed paycheck for life. Zero market risk."
- **Tags:**
  - `{ label: 'Guaranteed', type: 'green' }`
  - `{ label: 'Set & Forget', type: 'green' }`
  - `{ label: 'No Growth', type: 'amber' }`

---

## TypeScript Changes

### `StrategyTag` interface — update `type`
```typescript
export interface StrategyTag {
  label: string;
  type: 'blue' | 'green' | 'gray' | 'amber';
}
```

### `Strategy` interface — update `icon`
Icon field stays `string`, but now holds a Material Symbol name (not an ionicon name).

### Imports to add
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostBinding } from '@angular/core';
import { Location } from '@angular/common';
```

### Imports to remove from `@ionic/angular/standalone`
Remove: `IonBackButton`, `IonButtons`, `IonProgressBar`, `IonTitle`, `IonIcon`, `IonButton`

### Remove
- `import { addIcons } from 'ionicons'`
- `import { star, trendingUp, shieldCheckmark, swapHorizontal, shield } from 'ionicons/icons'`
- `addIcons({...})` call in constructor

### Add to constructor
```typescript
constructor(
  private route: ActivatedRoute,
  private router: Router,
  private authService: AuthService,
  private cdr: ChangeDetectorRef,
  private location: Location   // ADD
) {}
```

### Add methods
```typescript
@HostBinding('class.page-ready') isReady = false;

goBack() {
  this.location.back();
}

private preloadAssets() {
  const fontsReady = Promise.all([
    document.fonts.load('700 16px "Manrope"').catch(() => []),
    document.fonts.load('400 24px "Material Symbols Outlined"').catch(() => []),
  ]);
  const timeout = new Promise<void>(resolve => setTimeout(resolve, 2000));
  Promise.race([fontsReady, timeout]).then(() => { this.isReady = true; });
}
```

Call `this.preloadAssets()` at the end of `ngOnInit()`.

### Default selection
```typescript
selectedStrategyId: string = '';  // was 'optimal'
```

### Fix `saveDataToLocalStorage`
Update the guard that references the hardcoded `'optimal'` string:
```typescript
// OLD:
if (!existingStrategy || this.selectedStrategyId !== 'optimal') {
// NEW:
if (!existingStrategy || this.selectedStrategyId !== '') {
```

### `getSelectedStrategyName()` — no change needed
Already returns `'Strategy'` for unmatched id, which handles empty string.

---

## Selection Behavior

- **Default:** `selectedStrategyId = ''` — no card pre-selected on load
- **Remove:** `[class.recommended]` binding and the recommended badge `<div>` entirely
- Tapping a card calls existing `selectStrategy(id)` — no change needed
- Loading a saved strategy from localStorage still works — strategy ids changed so old saves (`'optimal'`, `'balanced'`, etc.) will not match any new id; user starts fresh with no selection, which is correct behavior

---

## Footer CTA

```scss
ion-footer {
  --background: transparent;
  --border-width: 0;
}

.cta-footer {
  padding: 14px 18px calc(env(safe-area-inset-bottom, 0px) + 14px);
  background: white;
  border-top: 1px solid #f1f5f9;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.06);
}

.cta-btn {
  width: 100%;
  height: 52px;
  border-radius: 12px;
  border: none;
  font-family: 'Manrope', sans-serif;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s ease;
  cursor: pointer;

  &:not(:disabled) {
    background: #2563eb;
    color: white;
    box-shadow: 0 8px 20px -4px rgba(37, 99, 235, 0.4);
    &:active { transform: scale(0.99); background: #1d4ed8; }
  }

  &:disabled {
    background: #e5e7eb;
    color: #9ca3af;
    cursor: not-allowed;
  }
}
```

Template:
```html
<button class="cta-btn" [disabled]="!selectedStrategyId" (click)="confirmSelection()">
  Continue
  <span class="material-symbols-outlined" *ngIf="selectedStrategyId">arrow_forward</span>
</button>
```

Use plain `<button>` — **not** `<ion-button>`. The `IonFooter` import stays.

---

## Error State

Keep the `*ngIf="!timeToFI || !targetPortfolio || timeToFI === 'N/A'"` guard. Replace `<ion-button>` with a plain styled button using `(click)="router.navigateByUrl('/survey-initial')"`. Remove `RouterLink` from TS imports since it's no longer used.

```html
<div *ngIf="!timeToFI || !targetPortfolio || timeToFI === 'N/A'" class="error-state">
  <h2>Missing Survey Data</h2>
  <p>We need your investment details to show your personalized FI strategies.</p>
  <button class="error-cta" (click)="router.navigateByUrl('/survey-initial')">
    Complete Investment Survey
  </button>
</div>
```

Note: `router` must be public (or use a wrapper method `goToSurvey()`) for template access.

---

## Loading Veil

```html
<div class="loading-veil" [class.veil-hidden]="isReady"></div>
```

```scss
.loading-veil {
  position: fixed;
  inset: 0;
  background: #f8fafc;
  z-index: 9999;
  opacity: 1;
  transition: opacity 0.25s ease;
  pointer-events: none;

  &.veil-hidden { opacity: 0; }
}
```

---

## What Is NOT Changing

- `loadSavedData()`, `loadSelectedStrategy()` (logic only — no HTML/SCSS refs)
- `saveDataToLocalStorage()` — except the `'optimal'` guard string (see above)
- `confirmSelection()` navigation
- `getFutureYear()`
- `ngOnDestroy`, `routeSub`
- `selectStrategy()`, `debugCardClick()`, `testSelectStrategy()`
- `calculateTimeToFI()`

---

## Files to Modify

| File | Change |
|---|---|
| `fi-plan-results.component.html` | Full rewrite |
| `fi-plan-results.component.scss` | Full rewrite |
| `fi-plan-results.component.ts` | Targeted: imports, strategies array, HostBinding, preloadAssets, goBack, saveDataToLocalStorage guard, constructor |
