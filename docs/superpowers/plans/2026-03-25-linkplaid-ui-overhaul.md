# LinkPlaid UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the LinkPlaid component's generic HTML/SCSS with the approved FRED design-system UI, preserving all TypeScript logic unchanged.

**Architecture:** Two files are fully rewritten (HTML + SCSS) and the component's `imports` array gets a minimal cleanup (add `IonFooter`, remove five unused Ionic components). No logic, no routes, no services touched.

**Tech Stack:** Angular 17 standalone components, Ionic 7, SCSS, Material Symbols Outlined, Manrope (Google Fonts — already loaded via `index.html`)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `frontend/src/app/components/linkplaid/linkplaid.component.scss` | Full rewrite | New FRED design-system styles |
| `frontend/src/app/components/linkplaid/linkplaid.component.html` | Full rewrite | New layout with all TS bindings reconnected |
| `frontend/src/app/components/linkplaid/linkplaid.component.ts` | Minimal edit | `imports` array only: add `IonFooter`, remove 5 unused components |

---

## Task 1: Rewrite the SCSS

**Files:**
- Modify: `frontend/src/app/components/linkplaid/linkplaid.component.scss`

- [ ] **Step 1: Replace the entire SCSS file with the following**

```scss
// --- Force light mode regardless of system theme ---
:host {
  --plaid-primary: #2563EB;
  --plaid-bg: #f8fafc;
  --plaid-text: #0f172a;
  --plaid-gray: #6b7280;

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
  color: var(--plaid-text);
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
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.015em;
  text-align: center;
  flex: 1;
  margin: 0;
  padding-right: 40px;
  color: var(--plaid-text);
}

// --- Content ---
ion-content {
  --background: var(--plaid-bg);
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

ion-content::part(scroll) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.content-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 18px 24px;
  font-family: 'Manrope', sans-serif;
}

// --- Hero (top-pinned) ---
.hero-section {
  flex-shrink: 0;
  padding-bottom: 16px;
}

.hero-title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.2;
  text-align: center;
  margin: 0 0 8px 0;
  color: var(--plaid-text);
}

.hero-subtitle {
  font-size: 14px;
  color: var(--plaid-gray);
  margin: 0;
  line-height: 1.5;
  text-align: center;
  padding: 0 12px;
}

// --- Center zone (vertically centered in remaining space) ---
.center-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
}

// --- Illustration card ---
.illustration-card {
  background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%);
  border-radius: 16px;
  padding: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  border: 1px solid #bfdbfe;
  min-height: 110px;
}

.illus-blob {
  position: absolute;
  border-radius: 50%;

  &--top {
    top: -20px;
    right: -20px;
    width: 80px;
    height: 80px;
    background: rgba(37, 99, 235, 0.12);
    filter: blur(20px);
  }

  &--bottom {
    bottom: -16px;
    left: -16px;
    width: 64px;
    height: 64px;
    background: rgba(139, 92, 246, 0.1);
    filter: blur(16px);
  }
}

.illus-icons {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  height: 64px;
}

.illus-main {
  width: 64px;
  height: 64px;
  background: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  transform: rotate(-6deg);
  z-index: 2;

  .material-symbols-outlined {
    font-size: 32px;
    color: var(--plaid-primary);
    font-variation-settings: 'FILL' 1;
  }
}

.illus-secondary {
  width: 48px;
  height: 48px;
  background: #dbeafe;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  right: -24px;
  top: -4px;
  transform: rotate(12deg);
  border: 2px solid white;
  z-index: 1;

  .material-symbols-outlined {
    font-size: 20px;
    color: var(--plaid-primary);
  }
}

// --- Security badge ---
.security-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 14px;

  .material-symbols-outlined {
    font-size: 16px;
    color: var(--plaid-gray);
    font-variation-settings: 'FILL' 1;
  }

  span:last-child {
    font-size: 12px;
    color: var(--plaid-gray);
    font-weight: 500;
  }
}

// --- Benefits list ---
.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.benefit-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.benefit-icon-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;

  .material-symbols-outlined {
    font-size: 20px;
    color: var(--plaid-primary);
    font-variation-settings: 'FILL' 1;
  }
}

.benefit-text {
  h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--plaid-text);
    margin: 0 0 3px 0;
  }

  p {
    font-size: 13px;
    color: var(--plaid-gray);
    line-height: 1.45;
    margin: 0;
  }
}

// --- Feedback zone ---
.feedback-zone {
  text-align: center;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

.feedback-error { color: #dc2626; }
.feedback-success { color: #16a34a; }

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
    background: #111827;
    color: white;
    box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.35);

    &:active {
      transform: scale(0.99);
      background: #1f2937;
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

  ion-spinner {
    width: 18px;
    height: 18px;
    color: white;
  }
}

// --- Loading veil ---
.loading-veil {
  position: fixed;
  inset: 0;
  background: var(--plaid-bg);
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
git add frontend/src/app/components/linkplaid/linkplaid.component.scss
git commit -m "feat(linkplaid): rewrite SCSS — FRED design system tokens"
```

---

## Task 2: Rewrite the HTML

**Files:**
- Modify: `frontend/src/app/components/linkplaid/linkplaid.component.html`

- [ ] **Step 1: Replace the entire HTML file with the following**

```html
<ion-header class="ion-no-border">
  <ion-toolbar>
    <div class="header-inner">
      <button class="back-btn" (click)="goBack()">
        <span class="material-symbols-outlined">arrow_back_ios_new</span>
      </button>
      <h2 class="header-title">Link Bank Account</h2>
    </div>
  </ion-toolbar>
</ion-header>

<ion-content class="plaid-content">
  <div class="content-inner">

    <!-- Hero — top-pinned -->
    <div class="hero-section">
      <h1 class="hero-title">Seamless investing<br>starts here.</h1>
      <p class="hero-subtitle">Link your primary checking account to enable automatic deposits and see your timeline update in real-time.</p>
    </div>

    <!-- Center zone — vertically centered in remaining space -->
    <div class="center-zone">

      <!-- 1. Illustration card -->
      <div class="illustration-card">
        <div class="illus-blob illus-blob--top"></div>
        <div class="illus-blob illus-blob--bottom"></div>
        <div class="illus-icons">
          <div class="illus-main">
            <span class="material-symbols-outlined">account_balance</span>
          </div>
          <div class="illus-secondary">
            <span class="material-symbols-outlined">sync_alt</span>
          </div>
        </div>
      </div>

      <!-- 2. Security badge -->
      <div class="security-badge">
        <span class="material-symbols-outlined">verified_user</span>
        <span>Secured by Plaid • AES-256 Encryption</span>
      </div>

      <!-- 3. Benefits list -->
      <div class="benefits-list">
        <div class="benefit-item">
          <div class="benefit-icon-wrap">
            <span class="material-symbols-outlined">calendar_month</span>
          </div>
          <div class="benefit-text">
            <h3>Schedule investments</h3>
            <p>Align transfers with your pay frequency so you never miss a beat.</p>
          </div>
        </div>
        <div class="benefit-item">
          <div class="benefit-icon-wrap">
            <span class="material-symbols-outlined">lock</span>
          </div>
          <div class="benefit-text">
            <h3>Bank-level security</h3>
            <p>Your data is protected with 256-bit encryption and never stored locally.</p>
          </div>
        </div>
        <div class="benefit-item">
          <div class="benefit-icon-wrap">
            <span class="material-symbols-outlined">tune</span>
          </div>
          <div class="benefit-text">
            <h3>Full control</h3>
            <p>Adjust timing and amounts instantly. Pause or cancel anytime.</p>
          </div>
        </div>
      </div>

      <!-- Status feedback (non-loading only) -->
      <div *ngIf="statusMessage && !isLoading" class="feedback-zone">
        <span
          [class.feedback-error]="statusMessage.includes('Error') || statusMessage.includes('error') || statusMessage.includes('Could not')"
          [class.feedback-success]="!(statusMessage.includes('Error') || statusMessage.includes('error') || statusMessage.includes('Could not'))">
          {{ statusMessage }}
        </span>
      </div>

    </div>
  </div>
</ion-content>

<ion-footer class="ion-no-border">
  <div class="cta-footer">
    <button
      class="cta-btn"
      type="button"
      (click)="openPlaid()"
      [disabled]="isLoading || !isPlaidReady">
      <ng-container *ngIf="!isLoading && isPlaidReady">
        <span>Connect with Plaid</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </ng-container>
      <ng-container *ngIf="!isLoading && !isPlaidReady">
        <span>Preparing secure connection...</span>
      </ng-container>
      <ng-container *ngIf="isLoading">
        <ion-spinner name="crescent"></ion-spinner>
        <span>{{ statusMessage || 'Establishing secure connection...' }}</span>
      </ng-container>
    </button>
  </div>
</ion-footer>

<div class="loading-veil" [class.veil-hidden]="isPlaidReady"></div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/components/linkplaid/linkplaid.component.html
git commit -m "feat(linkplaid): rewrite HTML — FRED design system, footer CTA, centered layout"
```

---

## Task 3: Update component imports

**Files:**
- Modify: `frontend/src/app/components/linkplaid/linkplaid.component.ts`

The new HTML uses `<ion-footer>` (not in the current imports) and no longer uses `IonButton`, `IonIcon`, `IonText`, `IonButtons`, `IonBackButton`, or `IonProgressBar`. Without `IonFooter` imported, Angular will silently swallow the footer element.

- [ ] **Step 1: Update the import statement and `imports` array**

Replace the Ionic import line (line 7–9) and `imports` array (lines 32–36) with:

```typescript
import {
  IonHeader, IonToolbar, IonContent, IonFooter, IonSpinner, NavController
} from '@ionic/angular/standalone';
```

And update the `imports` array in `@Component`:

```typescript
imports: [
  CommonModule,
  FormsModule,
  IonHeader, IonToolbar, IonContent, IonFooter, IonSpinner
],
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/components/linkplaid/linkplaid.component.ts
git commit -m "fix(linkplaid): add IonFooter import, remove unused Ionic component imports"
```

---

## Task 4: Verify in the browser

- [ ] **Step 1: Serve the app**

```bash
servlocal
```

Navigate to the LinkPlaid screen in the onboarding flow (after authfinalize).

- [ ] **Step 2: Check each visual state**

| State | How to trigger | Expected |
|---|---|---|
| Loading / initializing | Page load (first 1.5s sim) | Spinner in CTA, "Establishing secure connection..." text, button disabled |
| Ready | After 1.5s | "Connect with Plaid" + arrow, button enabled |
| Not ready + not loading | Force `isPlaidReady = false` in devtools | "Preparing secure connection..." text, button disabled |
| Status message (error) | Trigger a failed token fetch | Red text below benefits list |

- [ ] **Step 3: Check loading veil**

On page load the `#f8fafc` veil should cover the screen, then fade out once `isPlaidReady` becomes true (~1.5s).

- [ ] **Step 4: Check back button**

Tap the back button — confirm `navCtrl.back()` fires and navigation works.
