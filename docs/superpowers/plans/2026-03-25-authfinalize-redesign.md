# authfinalize Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `authfinalize` HTML + SCSS to match the `fi-plan-results` / `surveyinitial` design system, with five targeted UX changes (footer CTA, header style, vertically-centered content, env-gated bypass button, recovery button in content).

**Architecture:** Zero logic changes — additive TS additions only (`emailTouched`, `env`, `goBack()`, `IonFooter` import). Full HTML + SCSS rewrite following the `.header-inner` / `ion-content::part(scroll)` / `.cta-footer` patterns established in `fi-plan-results`.

**Tech Stack:** Angular 17+ standalone components, Ionic 7, SCSS, Manrope font (already loaded), Material Symbols Outlined (already loaded)

**Spec:** `docs/superpowers/specs/2026-03-25-authfinalize-redesign.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/environments/environment.ts` | Modify | Add `local: true` |
| `frontend/src/environments/environment.dev.ts` | Modify | Add `local: false` |
| `frontend/src/environments/environment.prod.ts` | Modify | Add `local: false` |
| `frontend/src/environments/environment.test.ts` | Modify | Add `local: false` |
| `frontend/src/app/components/authfinalize/authfinalize.component.ts` | Modify | Add `emailTouched`, `env`, `goBack()`, `IonFooter` to imports |
| `frontend/src/app/components/authfinalize/authfinalize.component.html` | Rewrite | New template: FRED design system layout |
| `frontend/src/app/components/authfinalize/authfinalize.component.scss` | Rewrite | New styles: fi-plan-results token set |

---

## Task 1: Add `local` flag to all environment files

**Files:**
- Modify: `frontend/src/environments/environment.ts`
- Modify: `frontend/src/environments/environment.dev.ts`
- Modify: `frontend/src/environments/environment.prod.ts`
- Modify: `frontend/src/environments/environment.test.ts`

- [ ] **Step 1: Add `local: true` to `environment.ts`**

```typescript
export const environment = {
  production: false,
  local: true,
  backendApiUrl: 'https://local.fredvested.com/api',
  rpId: 'local.fredvested.com'
};
```

- [ ] **Step 2: Add `local: false` to `environment.dev.ts`**

```typescript
export const environment = {
  production: false,
  local: false,
  backendApiUrl: 'https://api-dev.fredvested.com/api',
  rpId: 'potential-engine-97999gqqw9q4hpj7w-8100.app.github.dev'
};
```

- [ ] **Step 3: Add `local: false` to `environment.prod.ts`**

```typescript
export const environment = {
  production: true,
  local: false,
  backendApiUrl: 'https://api.fredvested.com/api',
  rpId: 'app.fredvested.com'
};
```

- [ ] **Step 4: Add `local: false` to `environment.test.ts`**

```typescript
export const environment = {
  production: false,
  local: false,
  backendApiUrl: 'https://api-test.fredvested.com/api',
  rpId: 'api-test.fredvested.com'
};
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/environments/
git commit -m "chore(env): add local flag to all environment files"
```

---

## Task 2: Additive TypeScript changes to `authfinalize.component.ts`

**Files:**
- Modify: `frontend/src/app/components/authfinalize/authfinalize.component.ts`

Four additive changes — no existing logic is touched.

- [ ] **Step 1: Add `IonFooter` to the imports array**

In the `@Component` decorator, add `IonFooter` to the `imports` array:

```typescript
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonInput, IonButton, IonSpinner, IonText, IonNote, IonProgressBar,
  IonBackButton, IonButtons, IonIcon, IonFooter, NavController
} from '@ionic/angular/standalone';
```

And in `imports: [...]` inside `@Component`:

```typescript
imports: [
  CommonModule,
  FormsModule, ReactiveFormsModule, RouterLink,
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonInput, IonButton, IonSpinner, IonText, IonNote, IonProgressBar,
  IonBackButton, IonButtons, IonIcon, IonFooter
]
```

- [ ] **Step 2: Import the `environment` object**

Add at the top of the file (after the existing imports):

```typescript
import { environment } from '../../../environments/environment';
```

- [ ] **Step 3: Add `emailTouched` and `env` properties**

Inside the class body, alongside the existing `isLoading`, `errorMessage` etc.:

```typescript
emailTouched: boolean = false;
protected env = environment;
```

- [ ] **Step 4: Add `goBack()` method**

Add as a short method alongside `recoverAccount()`:

```typescript
goBack() {
  this.navCtrl.back();
}
```

- [ ] **Step 5: Verify the file compiles cleanly**

Run: `cd frontend && npx ng build --configuration=development 2>&1 | tail -20`

Expected: No TypeScript errors related to `authfinalize`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/components/authfinalize/authfinalize.component.ts
git commit -m "feat(authfinalize): add emailTouched, env, goBack, IonFooter import"
```

---

## Task 3: Rewrite SCSS

**Files:**
- Rewrite: `frontend/src/app/components/authfinalize/authfinalize.component.scss`

Fully replace with the fi-plan-results token set and matching component patterns.

- [ ] **Step 1: Replace the entire SCSS file**

```scss
// --- Force light mode regardless of system theme ---
:host {
  --auth-primary: #2563EB;
  --auth-bg: #f8fafc;
  --auth-text: #0f172a;
  --auth-gray: #6b7280;

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
  color: var(--auth-text);
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
  color: var(--auth-text);
}

// --- Content ---
ion-content {
  --background: var(--auth-bg);
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
  margin-bottom: 12px;
  flex-shrink: 0;
}

.hero-title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.2;
  text-align: center;
  margin: 0;
  color: var(--auth-text);
}

.hero-subtitle {
  font-size: 14px;
  color: var(--auth-gray);
  margin: 8px 0 0 0;
  line-height: 1.4;
  text-align: center;
}

// --- Center zone (vertically centered in remaining space) ---
.center-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
  font-family: 'Manrope', sans-serif;
}

.email-field {
  border-bottom: 2px solid var(--auth-primary);
  padding-bottom: 4px;

  ion-input {
    font-size: 18px;
    font-weight: 500;
    font-family: 'Manrope', sans-serif;
    --padding-start: 0;
    --padding-end: 0;
    --border-style: none;
    --border-width: 0;
    --highlight-height: 0;
  }
}

.error-message {
  margin-top: -8px;
  padding-top: 6px;

  ion-note {
    display: block;
    font-size: 13px;
    font-family: 'Manrope', sans-serif;
  }
}

.passkey-note {
  text-align: center;
  font-size: 14px;
  color: var(--auth-gray);
  line-height: 1.5;
  margin: 0;
}

.bypass-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--auth-gray);
  text-align: center;
  width: 100%;
  padding: 4px 0;

  &:active {
    opacity: 0.7;
  }
}

.divider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.divider-text {
  font-size: 13px;
  color: var(--auth-gray);
  font-weight: 500;
  font-family: 'Manrope', sans-serif;
}

.recovery-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--auth-gray);
  width: 100%;
  padding: 4px 0;

  .material-symbols-outlined {
    font-size: 18px;
  }

  &:active {
    opacity: 0.7;
  }
}

// --- Feedback messages ---
.feedback-zone {
  margin-top: 8px;
  text-align: center;
  font-family: 'Manrope', sans-serif;
  flex-shrink: 0;
}

.feedback-error {
  font-size: 14px;
  font-weight: 500;
  color: #dc2626;
  line-height: 1.4;
}

.feedback-success {
  font-size: 14px;
  font-weight: 500;
  color: #16a34a;
  line-height: 1.4;
}

// --- Error state (missing params) ---
.error-state {
  padding: 40px 24px;
  text-align: center;
  font-family: 'Manrope', sans-serif;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.error-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--auth-text);
  margin: 0 0 8px;
}

.error-text {
  font-size: 14px;
  color: var(--auth-gray);
  margin: 0 0 8px;
  line-height: 1.5;
}

.error-message-text {
  font-size: 13px;
  color: #dc2626;
  margin: 0 0 16px;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
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
  width: 100%;

  &.error-cta-outline {
    background: transparent;
    color: var(--auth-primary);
    border: 1.5px solid var(--auth-primary);
    box-shadow: none;
  }
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
  background: #2563eb;
  color: white;
  box-shadow: 0 8px 20px -4px rgba(37, 99, 235, 0.4);

  &:not(:disabled):active {
    transform: scale(0.99);
    background: #1d4ed8;
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/components/authfinalize/authfinalize.component.scss
git commit -m "feat(authfinalize): rewrite SCSS — FRED design system tokens"
```

---

## Task 4: Rewrite HTML template

**Files:**
- Rewrite: `frontend/src/app/components/authfinalize/authfinalize.component.html`

- [ ] **Step 1: Replace the entire HTML file**

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

<ion-content class="auth-content">

  <!-- Error state: missing plan data -->
  <div *ngIf="!hasRequiredParams" class="error-state">
    <h2 class="error-title">Missing Plan Data</h2>
    <p class="error-text">We need your investment plan details to continue with account creation.</p>
    <div *ngIf="errorMessage" class="error-message-text">{{ errorMessage }}</div>
    <div class="error-actions">
      <button class="error-cta" type="button" (click)="debugMissingParams()">
        Try Loading Saved Data
      </button>
      <button class="error-cta error-cta-outline" type="button" [routerLink]="['/fi-plan-results']">
        Back to Plan Selection
      </button>
      <button class="error-cta error-cta-outline" type="button" [routerLink]="['/survey-initial']">
        Restart Investment Survey
      </button>
    </div>
  </div>

  <!-- Main content: shown when plan data is present -->
  <div *ngIf="hasRequiredParams" class="content-inner">

    <!-- Hero — top-pinned -->
    <div class="hero-section">
      <h1 class="hero-title">Let's lock it in.</h1>
      <p class="hero-subtitle">
        Create an account and be one step closer to making this plan a reality.
      </p>
    </div>

    <!-- Center zone — vertically centered in remaining space -->
    <div class="center-zone">

      <!-- Email input -->
      <form [formGroup]="registerForm" novalidate>
        <div class="email-field">
          <ion-input
            type="email"
            formControlName="email"
            placeholder="Enter your email address"
            (ionBlur)="emailTouched = true"
            required
            email
          ></ion-input>
        </div>
        <div *ngIf="email?.invalid && (email?.dirty || email?.touched)" class="error-message">
          <ion-note color="danger" *ngIf="email?.errors?.['required']">Email is required.</ion-note>
          <ion-note color="danger" *ngIf="email?.errors?.['email']">Please enter a valid email.</ion-note>
        </div>
      </form>

      <!-- Passkey helper text -->
      <p class="passkey-note">
        No passwords needed — just Face ID or fingerprint. Your email is backup recovery if needed.
      </p>

      <!-- Dev-only bypass button (local build only) -->
      <button *ngIf="env.local" class="bypass-btn" type="button" (click)="bypassAuthID()">
        I'm at work (no face or touch ID)
      </button>

      <!-- Divider -->
      <div class="divider-row">
        <div class="divider-line"></div>
        <span class="divider-text">or</span>
        <div class="divider-line"></div>
      </div>

      <!-- Lost Device / Recover Account -->
      <button class="recovery-btn" type="button" (click)="recoverAccount()">
        <span class="material-symbols-outlined">help</span>
        <span>Lost Device / Recover Account</span>
      </button>

    </div>

    <!-- Feedback messages (only when params are valid — avoids double-rendering with error-state block) -->
    <div class="feedback-zone">
      <div *ngIf="errorMessage && hasRequiredParams" class="feedback-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="feedback-success">{{ successMessage }}</div>
    </div>

  </div>

</ion-content>

<!-- Footer: only shown once params are valid and email has been blurred -->
<ion-footer *ngIf="hasRequiredParams && emailTouched" class="ion-no-border">
  <div class="cta-footer">
    <button
      class="cta-btn"
      type="button"
      (click)="createPasskey()"
      [disabled]="isLoading">
      <ion-spinner *ngIf="isLoading" name="crescent"></ion-spinner>
      <ng-container *ngIf="!isLoading">
        <span>Create Account</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </ng-container>
      <span *ngIf="isLoading">Follow browser prompt...</span>
    </button>
  </div>
</ion-footer>
```

- [ ] **Step 2: Serve locally and verify visually**

Run: `servlocal` (starts Angular dev server on port 8100)

Navigate to the authfinalize screen and check:
- [ ] Header shows custom back button + "Create Your Account" title (no progress bar, no ion-back-button)
- [ ] Hero text "Let's lock it in." is top-aligned
- [ ] Email input + passkey note are vertically centered in remaining content space
- [ ] Footer is **hidden** on initial load
- [ ] Footer appears after clicking into and out of the email field (blur)
- [ ] Footer button says "Create Account" with arrow icon
- [ ] "I'm at work" button is **visible** (this is local build)
- [ ] "Lost Device / Recover Account" button is visible below "or" divider
- [ ] Error/success messages appear in the feedback zone when triggered
- [ ] Missing-params error state renders correctly if navigated to without query params

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/components/authfinalize/authfinalize.component.html
git commit -m "feat(authfinalize): rewrite HTML — FRED design system, footer CTA, centered layout"
```
