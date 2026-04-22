# FI Plan Results Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `fi-plan-results` to match `surveyinitial`'s design language (Manrope, FRED blue/white/black), update the four strategy cards with new content, remove the recommended badge, start with no default selection, and disable the footer CTA until a card is tapped.

**Architecture:** Three files change — the TypeScript gets minimal targeted edits (imports, strategies data, new methods), the HTML gets a full rewrite matching surveyinitial's structural patterns (custom header, flex layout, plain buttons), and the SCSS gets a full rewrite using surveyinitial's exact token values.

**Tech Stack:** Angular 17 standalone components, Ionic 7, SCSS, Material Symbols Outlined (web font), Manrope (web font)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/components/fi-plan-results/fi-plan-results.component.ts` | Modify | Imports, strategy data, HostBinding, preloadAssets, goBack, default selection fix |
| `frontend/src/app/components/fi-plan-results/fi-plan-results.component.html` | Full rewrite | Layout, structure, strategy card loop, footer button |
| `frontend/src/app/components/fi-plan-results/fi-plan-results.component.scss` | Full rewrite | All visual styling, tokens, tag colors, veil |

---

## Task 1: Update TypeScript — Imports, Interface, and Strategies Array

**Files:**
- Modify: `frontend/src/app/components/fi-plan-results/fi-plan-results.component.ts`

- [ ] **Step 1: Replace the import block at the top of the file**

Replace everything from line 1 through the `addIcons` import with:

```typescript
import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostBinding } from '@angular/core';
import { CommonModule, CurrencyPipe, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonContent, IonFooter } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
```

- [ ] **Step 2: Update `StrategyTag` interface**

Replace the `StrategyTag` interface:

```typescript
export interface StrategyTag {
  label: string;
  type: 'blue' | 'green' | 'gray' | 'amber';
}
```

- [ ] **Step 3: Update `@Component` decorator imports array**

```typescript
imports: [CommonModule, CurrencyPipe, IonHeader, IonToolbar, IonContent, IonFooter],
```

- [ ] **Step 4: Replace the `strategies` array**

Replace the entire `strategies: Strategy[] = [...]` property with:

```typescript
strategies: Strategy[] = [
  {
    id: 'yield',
    title: 'Yield-Based Income',
    description: 'Live off dividends and interest. Principal stays invested — never sell a share.',
    icon: 'savings',
    tags: [
      { label: 'No Selling', type: 'blue' },
      { label: 'Always Growing', type: 'green' },
      { label: 'Yield-Dependent', type: 'gray' },
    ]
  },
  {
    id: 'guardrails',
    title: 'Dynamic Guardrails',
    description: 'Spend more in good years, pull back in bad ones. No debt, ever.',
    icon: 'tune',
    tags: [
      { label: 'High Growth', type: 'green' },
      { label: 'Debt-Free', type: 'green' },
      { label: 'Flex Spending', type: 'amber' },
    ]
  },
  {
    id: 'sbloc',
    title: 'Sell High, Borrow Low',
    description: 'Sell 4% when markets are up. Borrow against your portfolio when they dip.',
    icon: 'swap_vert',
    tags: [
      { label: 'Protects Gains', type: 'green' },
      { label: 'App-Managed', type: 'green' },
      { label: 'Uses Credit', type: 'amber' },
    ]
  },
  {
    id: 'annuity',
    title: 'Annuity',
    description: 'Turn your portfolio into a guaranteed paycheck for life. Zero market risk.',
    icon: 'lock',
    tags: [
      { label: 'Guaranteed', type: 'green' },
      { label: 'Set & Forget', type: 'green' },
      { label: 'No Growth', type: 'amber' },
    ]
  }
];
```

- [ ] **Step 5: Fix default selection and add HostBinding**

Change:
```typescript
selectedStrategyId: string = 'optimal';
```
To:
```typescript
@HostBinding('class.page-ready') isReady = false;
selectedStrategyId: string = '';
```

- [ ] **Step 6: Update constructor — add Location, make router public**

Replace the constructor:

```typescript
constructor(
  private route: ActivatedRoute,
  public router: Router,
  private authService: AuthService,
  private cdr: ChangeDetectorRef,
  private location: Location
) {}
```

Note: `router` is changed to `public` so the template can call `router.navigateByUrl(...)` in the error state.

- [ ] **Step 7: Remove `addIcons` call from constructor body**

The old constructor body called `addIcons({ star, trendingUp, shieldCheckmark, swapHorizontal, shield })`. Delete that line entirely — the constructor body should now be empty `{}`.

- [ ] **Step 8: Add `preloadAssets()` and `goBack()` methods**

Add both methods to the class (e.g., after `ngOnInit`):

```typescript
private preloadAssets() {
  const fontsReady = Promise.all([
    document.fonts.load('700 16px "Manrope"').catch(() => []),
    document.fonts.load('400 24px "Material Symbols Outlined"').catch(() => []),
  ]);
  const timeout = new Promise<void>(resolve => setTimeout(resolve, 2000));
  Promise.race([fontsReady, timeout]).then(() => { this.isReady = true; });
}

goBack() {
  this.location.back();
}
```

- [ ] **Step 9: Call `preloadAssets()` at the end of `ngOnInit()`**

Add as the last line of `ngOnInit()`, after the existing `setTimeout` block:

```typescript
this.preloadAssets();
```

- [ ] **Step 10: Fix `saveDataToLocalStorage` guard**

Find this line in `saveDataToLocalStorage()`:
```typescript
if (!existingStrategy || this.selectedStrategyId !== 'optimal') {
```
Change to:
```typescript
if (!existingStrategy || this.selectedStrategyId !== '') {
```

- [ ] **Step 11: Verify the file compiles with no errors**

```bash
cd /Users/andrewtimmer/PersonalTypeshit/FRED/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If errors appear, check that all removed imports (`RouterLink`, `IonButtons`, `IonBackButton`, `IonProgressBar`, `IonTitle`, `IonIcon`, `IonButton`) are gone and no template references to them remain.

- [ ] **Step 12: Commit**

```bash
cd /Users/andrewtimmer/PersonalTypeshit/FRED
git add frontend/src/app/components/fi-plan-results/fi-plan-results.component.ts
git commit -m "refactor(fi-plan-results): update TS for redesign — new strategies, imports, no default selection"
```

---

## Task 2: Rewrite HTML Template

**Files:**
- Modify: `frontend/src/app/components/fi-plan-results/fi-plan-results.component.html`

- [ ] **Step 1: Replace the entire HTML file with:**

```html
<ion-header class="ion-no-border">
  <ion-toolbar>
    <div class="header-inner">
      <button class="back-btn" (click)="goBack()">
        <span class="material-symbols-outlined">arrow_back_ios_new</span>
      </button>
      <h2 class="header-title">Choose Your Strategy</h2>
    </div>
  </ion-toolbar>
</ion-header>

<ion-content class="results-content">

  <!-- Error state: shown when survey data is missing -->
  <div *ngIf="!timeToFI || !targetPortfolio || timeToFI === 'N/A'" class="error-state">
    <h2 class="error-title">Missing Survey Data</h2>
    <p class="error-text">We need your investment details to show your personalized FI strategies.</p>
    <button class="error-cta" (click)="router.navigateByUrl('/survey-initial')">
      Complete Investment Survey
    </button>
  </div>

  <!-- Main content: shown when survey data is present -->
  <div *ngIf="timeToFI && targetPortfolio && timeToFI !== 'N/A'" class="content-inner">

    <!-- Hero text -->
    <div class="hero-section">
      <h1 class="hero-title">Fast Forward to {{ getFutureYear() }}.</h1>
      <p class="hero-subtitle">
        Your portfolio hits <strong>{{ targetPortfolio | currency:'USD':'symbol':'1.0-0' }}</strong>. Pick how you want to live off it.
      </p>
    </div>

    <!-- Strategy cards -->
    <div class="strategy-cards-container">
      <div
        *ngFor="let strategy of strategies"
        class="strategy-card"
        [class.selected]="selectedStrategyId === strategy.id"
        [attr.data-strategy]="strategy.id"
        (click)="selectStrategy(strategy.id)"
        (mousedown)="debugCardClick(strategy.id)">

        <!-- Selected checkmark indicator -->
        <div class="selected-indicator" *ngIf="selectedStrategyId === strategy.id">
          <span class="material-symbols-outlined">check</span>
        </div>

        <!-- Icon + title + description -->
        <div class="card-top">
          <div class="card-header-row">
            <span class="material-symbols-outlined card-icon">{{ strategy.icon }}</span>
            <span class="card-title">{{ strategy.title }}</span>
          </div>
          <p class="card-description">{{ strategy.description }}</p>
        </div>

        <!-- Tags -->
        <div class="strategy-tags">
          <span
            *ngFor="let tag of strategy.tags"
            class="tag"
            [ngClass]="'tag-' + tag.type">
            {{ tag.label }}
          </span>
        </div>

      </div>
    </div>

  </div>
</ion-content>

<ion-footer *ngIf="timeToFI && targetPortfolio && timeToFI !== 'N/A'" class="ion-no-border">
  <div class="cta-footer">
    <button
      class="cta-btn"
      [disabled]="!selectedStrategyId"
      (click)="confirmSelection()">
      Continue
      <span class="material-symbols-outlined" *ngIf="selectedStrategyId">arrow_forward</span>
    </button>
  </div>
</ion-footer>

<div class="loading-veil" [class.veil-hidden]="isReady"></div>
```

Note: `[ngClass]="'tag-' + tag.type"` is used instead of `[class]="..."` because `[class]` binding replaces all classes — `[ngClass]` adds the dynamic class while keeping the base `tag` class intact.

- [ ] **Step 2: Commit**

```bash
cd /Users/andrewtimmer/PersonalTypeshit/FRED
git add frontend/src/app/components/fi-plan-results/fi-plan-results.component.html
git commit -m "feat(fi-plan-results): rewrite HTML template — new layout, strategy cards, no-scroll design"
```

---

## Task 3: Rewrite SCSS

**Files:**
- Modify: `frontend/src/app/components/fi-plan-results/fi-plan-results.component.scss`

- [ ] **Step 1: Replace the entire SCSS file with:**

```scss
// --- Force light mode regardless of system theme ---
:host {
  --results-primary: #2563EB;
  --results-bg: #f8fafc;
  --results-text: #0f172a;
  --results-gray: #6b7280;

  // Override Ionic theme variables so dark.system.css doesn't bleed in
  --ion-background-color: #f8fafc;
  --ion-toolbar-background: rgba(248, 250, 252, 0.95);
  --ion-toolbar-color: #0f172a;
  --ion-text-color: #0f172a;
  --ion-color-primary: #2563EB;
  --ion-footer-background: #f8fafc;
}

// --- Toolbar ---
ion-toolbar {
  --background: rgba(248, 250, 252, 0.95);
  --border-width: 0;
  --min-height: 52px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

// --- Header ---
.header-inner {
  display: flex;
  align-items: center;
  padding: 0 4px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--results-text);
  transition: background 0.2s ease;
  flex-shrink: 0;

  &:active {
    background: rgba(0, 0, 0, 0.05);
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
}

.header-title {
  font-family: 'Manrope', sans-serif;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-align: center;
  flex: 1;
  margin: 0;
  padding-right: 40px;
  color: var(--results-text);
}

// --- Content ---
ion-content {
  --background: var(--results-bg);
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

// Make the ion-content scroll host a flex column so content-inner can grow
ion-content::part(scroll) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.content-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 18px 8px;
  font-family: 'Manrope', sans-serif;
}

// --- Hero ---
.hero-section {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.hero-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.2;
  margin: 0 0 4px 0;
  color: var(--results-text);
}

.hero-subtitle {
  font-size: 13px;
  color: var(--results-gray);
  margin: 0;
  line-height: 1.4;

  strong {
    color: var(--results-text);
    font-weight: 700;
  }
}

// --- Cards Container ---
.strategy-cards-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0; // allow flex children to shrink below their natural size
}

// --- Individual Card ---
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

  &:active {
    opacity: 0.92;
  }
}

// --- Selected Checkmark ---
.selected-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;

  .material-symbols-outlined {
    font-size: 13px;
    color: white;
    font-variation-settings: 'FILL' 1, 'wght' 700;
  }
}

// --- Card Content ---
.card-top {
  flex-shrink: 0;
}

.card-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  padding-right: 28px; // prevent title overlapping the checkmark
}

.card-icon {
  font-size: 18px;
  color: var(--results-primary);
  font-variation-settings: 'FILL' 1;
  flex-shrink: 0;
}

.card-title {
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: var(--results-text);
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.card-description {
  font-size: 12px;
  color: var(--results-gray);
  line-height: 1.45;
  margin: 0;
}

// --- Tags ---
.strategy-tags {
  border-top: 1px solid #f1f5f9;
  padding-top: 8px;
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.tag {
  white-space: nowrap;
  font-size: 9.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  line-height: 1;
  font-family: 'Manrope', sans-serif;
}

.tag-blue {
  background: #eff6ff;
  color: #2563eb;
}

.tag-green {
  background: #f0fdf4;
  color: #16a34a;
}

.tag-gray {
  background: #f8fafc;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.tag-amber {
  background: #fffbeb;
  color: #b45309;
}

// --- Footer ---
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

    &:active {
      transform: scale(0.99);
      background: #1d4ed8;
    }
  }

  &:disabled {
    background: #e5e7eb;
    color: #9ca3af;
    cursor: not-allowed;
    box-shadow: none;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
}

// --- Error State ---
.error-state {
  padding: 40px 24px;
  text-align: center;
  font-family: 'Manrope', sans-serif;
}

.error-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--results-text);
  margin: 0 0 8px;
}

.error-text {
  font-size: 14px;
  color: var(--results-gray);
  margin: 0 0 24px;
  line-height: 1.5;
}

.error-cta {
  background: #2563eb;
  color: white;
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  font-weight: 700;
  padding: 14px 28px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 20px -4px rgba(37, 99, 235, 0.4);
}

// --- Loading Veil ---
.loading-veil {
  position: fixed;
  inset: 0;
  background: var(--results-bg);
  z-index: 9999;
  opacity: 1;
  transition: opacity 0.25s ease;
  pointer-events: none;

  &.veil-hidden {
    opacity: 0;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/andrewtimmer/PersonalTypeshit/FRED
git add frontend/src/app/components/fi-plan-results/fi-plan-results.component.scss
git commit -m "feat(fi-plan-results): rewrite SCSS — FRED design system, no-scroll card layout"
```

---

## Task 4: Visual Verification

**Files:** None (verification only)

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/andrewtimmer/PersonalTypeshit/FRED/frontend
servlocal
```

Server runs on port 8100. Open `http://localhost:8100` in browser dev tools with iPhone 14 viewport (390×844).

- [ ] **Step 2: Navigate to fi-plan-results**

Navigate through the app from Get Started → surveyinitial → tap "See My Plan". Alternatively navigate directly to `/fi-plan-results?t=21.3&rI=65000&mI=1000`.

- [ ] **Step 3: Verify the checklist**

Check each item visually:

- [ ] All 4 strategy cards visible without scrolling on 390×844
- [ ] No card is pre-selected (all cards show gray border)
- [ ] "Continue" button is grayed out (`#e5e7eb` background, `#9ca3af` text)
- [ ] No "Recommended" badge anywhere
- [ ] Header shows custom back button (not Ionic back button) + "Choose Your Strategy" centered
- [ ] Hero shows "Fast Forward to [year]." + bold portfolio value
- [ ] Tapping a card selects it: blue border, blue checkmark circle appears top-right
- [ ] "Continue" button activates (blue, arrow icon appears) after a card is tapped
- [ ] Tapping a different card switches selection correctly
- [ ] Background is `#f8fafc` (off-white), not pure white or iOS gray
- [ ] Strategy 1 tags: "No Selling" (blue pill), "Always Growing" (green pill), "Yield-Dependent" (gray outlined pill)
- [ ] Loading veil fades out after fonts load (no flash of unstyled text)
- [ ] Dark mode (system setting): page stays light — no dark bleed

- [ ] **Step 4: Verify error state**

Navigate to `/fi-plan-results` with no query params to trigger the error state. Confirm it shows the error message and a styled "Complete Investment Survey" button.

- [ ] **Step 5: Verify "Continue" navigates correctly**

Select a strategy and tap "Continue". Confirm navigation proceeds to `/auth-finalize` with correct query params (`plan`, `t`, `p`, `rI`, `mI`).
