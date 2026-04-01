# Investment Schedule UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the HTML and SCSS of `InvestmentScheduleComponent` to match the FRED design system (Manrope, #2563EB blue, #f8fafc bg, material-symbols-outlined icons, native elements, IonFooter CTA), while keeping all TypeScript logic completely intact.

**Architecture:** Three files change: the SCSS is a full rewrite to the FRED token system; the HTML is a full rewrite replacing Ionic form components with native elements styled to match KYC/LinkPlaid/SurveyInitial patterns; the TS gets two minimal additions (`isReady` property + `ngOnInit` timer) and an imports array cleanup. No service, routing, or business logic changes.

**Tech Stack:** Angular 17+ standalone components, Ionic 7 (`IonContent`, `IonHeader`, `IonToolbar`, `IonTitle`, `IonFooter`, `IonSpinner`), native HTML inputs/selects/buttons, SCSS with CSS custom properties, Manrope font, material-symbols-outlined icons.

**Reference spec:** `docs/superpowers/specs/2026-04-01-investment-schedule-ui-overhaul-design.md`

---

### Task 1: Minimal TypeScript changes — add `isReady` and clean up imports

**Files:**
- Modify: `frontend/src/app/components/investment-schedule/investment-schedule.component.ts`

- [ ] **Step 1: Update the imports array and add `IonFooter`**

Replace the entire import block and `imports[]` array. Open the file and make these exact changes:

Replace the Ionic import line:
```typescript
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonItem, IonLabel,
  IonSelect, IonSelectOption, IonInput, IonNote, IonIcon, IonCard, IonCardContent,
  IonCardHeader, IonCardTitle, IonButtons, IonBackButton, IonProgressBar, IonSpinner,
  IonCheckbox, IonPopover
} from '@ionic/angular/standalone';
```

With:
```typescript
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonFooter, IonSpinner
} from '@ionic/angular/standalone';
```

Replace the `imports` array inside `@Component`:
```typescript
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonFooter, IonSpinner
  ]
```

- [ ] **Step 2: Add `isReady` property and loading veil timer**

Add `isReady: boolean = false;` to the class properties (next to `isSubmitting`):
```typescript
  isSubmitting: boolean = false;
  isReady: boolean = false;
```

In `ngOnInit()`, add a 50ms timer at the end of the method body:
```typescript
  ngOnInit() {
    console.log('[InvestmentScheduleComponent] ngOnInit - Initializing Investment Schedule Page.');
    
    // Mark this step as incomplete when user enters/returns to this page
    this.authService.markStepIncomplete('investmentSchedule').subscribe({
      next: () => console.log('InvestmentSchedule step marked as incomplete'),
      error: (err) => console.error('Failed to mark InvestmentSchedule step as incomplete:', err)
    });
    
    this.loadUserFinancialData();
    // Set default next pay date to tomorrow (user can adjust)
    this.schedule.startDate = this.getInvestmentDate();

    // Let Manrope render before revealing content
    setTimeout(() => this.isReady = true, 50);
  }
```

- [ ] **Step 3: Add `goBack()` method**

Add this method to the class (after `ngOnInit`):
```typescript
  goBack(): void {
    this.router.navigate(['/kyc-verification']);
  }
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/components/investment-schedule/investment-schedule.component.ts
git commit -m "feat(investment-schedule): add isReady, goBack, clean up Ionic imports"
```

---

### Task 2: Rewrite SCSS

**Files:**
- Modify: `frontend/src/app/components/investment-schedule/investment-schedule.component.scss`

- [ ] **Step 1: Replace the entire SCSS file with the following**

```scss
// --- Force light mode regardless of system theme ---
:host {
  --schedule-primary: #2563EB;
  --schedule-bg: #f8fafc;
  --schedule-text: #0f172a;
  --schedule-gray: #6b7280;
  --schedule-border: #e5e7eb;

  --ion-background-color: #f8fafc;
  --ion-toolbar-background: #f8fafc;
  --ion-toolbar-color: #0f172a;
  --ion-text-color: #0f172a;
  --ion-color-primary: #2563EB;
  --ion-footer-background: #f8fafc;
}

// --- Toolbar ---
ion-toolbar {
  --background: #f8fafc;
  --border-width: 0;
  --min-height: 52px;
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
  color: var(--schedule-text);
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
  color: var(--schedule-text);
}

// --- Content ---
ion-content {
  --background: var(--schedule-bg);
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

ion-content::part(scroll) {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.content-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 18px 32px;
  font-family: 'Manrope', sans-serif;
}

// --- Hero ---
.hero-section {
  flex-shrink: 0;
  margin-bottom: 28px;
}

.hero-title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.2;
  text-align: center;
  margin: 0;
  color: var(--schedule-text);
}

.hero-subtitle {
  font-size: 14px;
  color: var(--schedule-gray);
  margin: 8px 0 0 0;
  line-height: 1.4;
  text-align: center;
}

// --- Field label (shared by all sections) ---
.field-label {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--schedule-gray);
  margin: 0 0 10px 0;
}

// --- Form sections ---
.form-section {
  margin-bottom: 28px;
}

// --- Frequency pill grid ---
.freq-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.freq-pill {
  background: white;
  border: 2px solid var(--schedule-border);
  border-radius: 10px;
  padding: 12px 10px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &.selected {
    border-color: var(--schedule-primary);
    background: #eff6ff;

    .freq-pill-title {
      color: var(--schedule-primary);
    }

    .freq-pill-desc {
      color: var(--schedule-primary);
      opacity: 0.8;
    }
  }

  &:active {
    opacity: 0.85;
  }
}

.freq-pill-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--schedule-text);
  margin: 0 0 3px 0;
}

.freq-pill-desc {
  font-size: 11px;
  color: var(--schedule-gray);
  margin: 0;
  line-height: 1.3;
}

// --- Date / amount field ---
.field-row {
  display: flex;
  align-items: center;
  border-bottom: 2px solid var(--schedule-primary);
  padding-bottom: 6px;
}

.field-prefix {
  font-size: 17px;
  font-weight: 500;
  color: var(--schedule-gray);
  margin-right: 4px;
  flex-shrink: 0;
}

.field-input {
  font-family: 'Manrope', sans-serif;
  font-size: 17px;
  font-weight: 500;
  color: var(--schedule-text);
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
  -webkit-appearance: none;

  &::placeholder {
    color: #cbd5e1;
    font-weight: 400;
  }
}

input[type='date'].field-input {
  color-scheme: light;
}

input[type='number'].field-input {
  -moz-appearance: textfield;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
  }
}

// --- Info tip (recommendation) ---
.info-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.07);
  border: 1px solid rgba(37, 99, 235, 0.18);
  margin-top: 12px;
}

.info-tip-icon {
  color: var(--schedule-primary);
  font-size: 18px;
  flex-shrink: 0;
  font-variation-settings: 'FILL' 1;
  margin-top: 1px;
}

.info-tip-text {
  font-size: 13px;
  color: var(--schedule-primary);
  margin: 0;
  line-height: 1.5;
  font-weight: 500;
}

// --- Projections ---
.projection-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.projection-card {
  background: white;
  border: 1px solid var(--schedule-border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.projection-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--schedule-primary);
  margin: 0 0 4px 0;
  letter-spacing: -0.01em;
}

.projection-label {
  font-size: 12px;
  color: var(--schedule-gray);
  margin: 0;
  font-weight: 500;
}

.goal-comparison {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Manrope', sans-serif;

  .material-symbols-outlined {
    font-size: 17px;
    flex-shrink: 0;
    font-variation-settings: 'FILL' 1;
  }

  &.on-track {
    color: #16a34a;
  }

  &.short {
    color: #b45309;
  }
}

// --- ACATS transfer section ---
.transfer-section {
  border-top: 1px solid var(--schedule-border);
  padding-top: 20px;
}

.disclosure-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.disclosure-text {
  flex: 1;

  h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--schedule-text);
    margin: 0 0 3px 0;
    font-family: 'Manrope', sans-serif;
  }

  p {
    font-size: 13px;
    color: var(--schedule-gray);
    margin: 0;
    line-height: 1.4;
    font-family: 'Manrope', sans-serif;
  }
}

.toggle-btn {
  flex-shrink: 0;
  min-width: 52px;
  height: 30px;
  border-radius: 15px;
  border: 1.5px solid var(--schedule-border);
  background: #f1f5f9;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: var(--schedule-gray);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.toggle-on {
    background: var(--schedule-primary);
    border-color: var(--schedule-primary);
    color: white;
  }

  &:active {
    transform: scale(0.96);
  }
}

.transfer-form {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// Select wrapper for brokerage dropdown
.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border-bottom: 2px solid var(--schedule-primary);

  .select-arrow {
    position: absolute;
    right: 0;
    font-size: 18px;
    color: var(--schedule-gray);
    pointer-events: none;
  }
}

.field-select {
  font-family: 'Manrope', sans-serif;
  font-size: 17px;
  font-weight: 500;
  color: var(--schedule-text);
  background: transparent;
  border: none;
  padding: 6px 24px 6px 0;
  outline: none;
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.field-hint {
  font-size: 12px;
  color: var(--schedule-gray);
  margin-top: 6px;
  font-family: 'Manrope', sans-serif;
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
    background: #2563EB;
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
  background: var(--schedule-bg);
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
git add frontend/src/app/components/investment-schedule/investment-schedule.component.scss
git commit -m "feat(investment-schedule): rewrite SCSS — FRED design system tokens"
```

---

### Task 3: Rewrite HTML

**Files:**
- Modify: `frontend/src/app/components/investment-schedule/investment-schedule.component.html`

- [ ] **Step 1: Replace the entire HTML file with the following**

```html
<ion-header class="ion-no-border">
  <ion-toolbar>
    <div class="header-inner">
      <button class="back-btn" (click)="goBack()">
        <span class="material-symbols-outlined">arrow_back_ios_new</span>
      </button>
      <h2 class="header-title">Investment Schedule</h2>
    </div>
  </ion-toolbar>
</ion-header>

<ion-content class="schedule-content">
  <div class="content-inner">

    <!-- Hero -->
    <div class="hero-section">
      <h1 class="hero-title">Set your pace.</h1>
      <p class="hero-subtitle">Align your investments with your paycheck.</p>
    </div>

    <!-- Section 1: Pay Frequency -->
    <div class="form-section">
      <p class="field-label">How often are you paid?</p>
      <div class="freq-grid">
        <div
          *ngFor="let freq of frequencyOptions"
          class="freq-pill"
          [class.selected]="schedule.payFrequency === freq.value"
          (click)="onFrequencyChange(freq.value)">
          <p class="freq-pill-title">{{ freq.label }}</p>
          <p class="freq-pill-desc">{{ freq.description }}</p>
        </div>
      </div>
    </div>

    <!-- Section 2: Next Pay Date -->
    <div class="form-section">
      <p class="field-label">Next pay date</p>
      <div class="field-row">
        <input
          class="field-input"
          type="date"
          [(ngModel)]="schedule.startDate"
          (change)="onStartDateChange($any($event).target.value)"
          [min]="getMinDate()" />
      </div>
    </div>

    <!-- Section 3: Investment Amount -->
    <div class="form-section">
      <p class="field-label">Investment amount per {{ getSelectedFrequencyDetails()?.label?.toLowerCase() || 'payment' }}</p>
      <div class="field-row">
        <span class="field-prefix">$</span>
        <input
          class="field-input"
          type="number"
          [(ngModel)]="schedule.investmentAmount"
          (blur)="onAmountChange()"
          placeholder="0"
          min="1" />
      </div>

      <!-- Recommendation tip -->
      <div class="info-tip" *ngIf="monthlyGoal > 0">
        <span class="material-symbols-outlined info-tip-icon">info</span>
        <p class="info-tip-text">
          Recommended: <strong>{{ formatCurrency(monthlyGoal / (getSelectedFrequencyDetails()?.paychecksPerMonth || 1)) }}</strong>
          to meet your <strong>{{ formatCurrency(monthlyGoal) }}/mo</strong> goal
        </p>
      </div>
    </div>

    <!-- Section 4: Projections (conditional) -->
    <div class="form-section" *ngIf="schedule.investmentAmount > 0">
      <p class="field-label">Projections</p>
      <div class="projection-grid">
        <div class="projection-card">
          <p class="projection-value">{{ formatCurrency(getMonthlyProjection()) }}</p>
          <p class="projection-label">Per Month</p>
        </div>
        <div class="projection-card">
          <p class="projection-value">{{ formatCurrency(getAnnualProjection()) }}</p>
          <p class="projection-label">Per Year</p>
        </div>
      </div>

      <div class="goal-comparison on-track" *ngIf="monthlyGoal > 0 && getMonthlyProjection() >= monthlyGoal">
        <span class="material-symbols-outlined">check_circle</span>
        You're on track to meet your goal!
      </div>
      <div class="goal-comparison short" *ngIf="monthlyGoal > 0 && getMonthlyProjection() < monthlyGoal">
        <span class="material-symbols-outlined">warning</span>
        {{ formatCurrency(monthlyGoal - getMonthlyProjection()) }} short of your monthly goal
      </div>
    </div>

    <!-- Section 5: ACATS Transfer -->
    <div class="form-section transfer-section">
      <div class="disclosure-row">
        <div class="disclosure-text">
          <h3>Transfer existing assets?</h3>
          <p>Move your portfolio from Robinhood, Fidelity, or another brokerage directly into this account.</p>
        </div>
        <button
          type="button"
          class="toggle-btn"
          [class.toggle-on]="showTransferOptions"
          (click)="showTransferOptions = !showTransferOptions">
          <span>{{ showTransferOptions ? 'Yes' : 'No' }}</span>
        </button>
      </div>

      <div class="transfer-form" *ngIf="showTransferOptions">

        <!-- Brokerage -->
        <div>
          <p class="field-label">Brokerage</p>
          <div class="select-wrapper">
            <select class="field-select" [(ngModel)]="transferBrokerageDtc">
              <option value="" disabled>Select your current brokerage</option>
              <option *ngFor="let broker of brokerageOptions" [value]="broker.dtc">
                {{ broker.name }}
              </option>
            </select>
            <span class="select-arrow material-symbols-outlined">expand_more</span>
          </div>
        </div>

        <!-- Account Number -->
        <div>
          <p class="field-label">Account Number</p>
          <div class="field-row">
            <input
              class="field-input"
              type="text"
              [(ngModel)]="transferAccountNumber"
              placeholder="Enter account number" />
          </div>
          <p class="field-hint">Found in your monthly statements or account settings.</p>
        </div>

      </div>
    </div>

  </div>
</ion-content>

<ion-footer class="ion-no-border">
  <div class="cta-footer">
    <button
      class="cta-btn"
      type="button"
      [disabled]="!canProceed() || isSubmitting"
      (click)="goToStockPreferences()">
      <ng-container *ngIf="!isSubmitting">
        <span>Review &amp; Finalize</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </ng-container>
      <ng-container *ngIf="isSubmitting">
        <ion-spinner name="crescent"></ion-spinner>
        <span>Setting up schedule...</span>
      </ng-container>
    </button>
  </div>
</ion-footer>

<div class="loading-veil" [class.veil-hidden]="isReady"></div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/components/investment-schedule/investment-schedule.component.html
git commit -m "feat(investment-schedule): rewrite HTML — FRED design system, pill freq selector, footer CTA"
```

---

### Task 4: Verify in browser

**Files:** None

- [ ] **Step 1: Run the frontend dev server**

```bash
cd frontend && npx ionic serve --port 8100
```

Open http://localhost:8100/investment-schedule in your browser.

- [ ] **Step 2: Check these things manually**

| Check | Expected |
|---|---|
| Header | Back arrow (←) left, "Investment Schedule" centered, no progress bar |
| Hero | "Set your pace." large bold, gray subtitle below |
| Frequency pills | 2×2 grid, selecting a pill highlights it blue |
| Changing frequency | `getInvestmentDate()` recalculates the date field |
| Date field | Native date picker, styled with blue underline |
| Amount field | `$` prefix, number input, blue underline |
| Recommendation tip | Blue info box appears when `monthlyGoal > 0` |
| Projections section | Only appears after entering an amount; two white cards |
| Goal comparison | Green check if on track, amber warning if short |
| ACATS toggle | Starts as "No"; tapping switches to "Yes" and reveals form |
| ACATS brokerage | Native select with expand_more arrow |
| Footer CTA | Disabled (gray) until amount + date filled; blue when ready |
| Submit spinner | "Setting up schedule..." with spinner while submitting |
| Navigation | Tapping back navigates to /kyc-verification |
| Finalize | Submits schedule and navigates to /investment-confirmation |

- [ ] **Step 3: Commit if all good**

```bash
git add -p  # nothing to stage
git commit --allow-empty -m "chore(investment-schedule): verify UI overhaul complete"
```

_(Skip this commit if there's nothing to stage — it's just a checkpoint marker.)_
