# Investment Schedule UI Overhaul — Design Spec
_Date: 2026-04-01_

## Goal
Overhaul the HTML and SCSS of the `InvestmentScheduleComponent` to match the FRED design system established in SurveyInitial, FiPlanResults, LinkPlaid, and KycVerification. All TypeScript logic remains unchanged — only the template and styles are rewritten.

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Frequency selector | Tappable pill cards (2×2 grid) | All 4 options visible at once; no dropdown overlay; native-feeling on iOS |
| CTA button color | Blue `#2563EB` | Consistent with the blue used throughout the form (fields, pills, tips) |
| Progress bar | Removed | None of the 4 reference components use one; cleaner header |

---

## Component Structure

### Header
- Native `<button class="back-btn">` with `material-symbols-outlined arrow_back_ios_new` — identical to all reference components
- `<h2 class="header-title">Investment Schedule</h2>` — centered, Manrope 18px/700
- No `IonProgressBar`

### Hero Section (top-pinned)
- `<h1 class="hero-title">Set your pace.</h1>` — 32px, 800 weight, letter-spacing -0.025em, centered
- `<p class="hero-subtitle">Align your investments with your paycheck.</p>` — 14px, gray `#6b7280`, centered

### Section 1 — Pay Frequency
- Field label: `HOW OFTEN ARE YOU PAID?` — uppercase, 11px, 700 weight, letter-spacing 0.08em, gray
- 2×2 pill card grid. Each card:
  - White background, `border: 2px solid #e5e7eb`, `border-radius: 10px`, padding 12px
  - Title: frequency label (e.g. "Bi-weekly"), 14px/700, `#0f172a`
  - Description: frequency description (e.g. "Every 2 weeks"), 11px, gray
  - **Selected state**: `border-color: #2563EB`, `background: #eff6ff`, text in `#2563EB`
- Bindings:
  - `(click)="onFrequencyChange(freq.value)"` on each pill
  - `[class.selected]="schedule.payFrequency === freq.value"`
  - `*ngFor="let freq of frequencyOptions"`

### Section 2 — Next Pay Date
- Field label: `NEXT PAY DATE` — same uppercase label style
- Native `<input type="date">` with KYC field style:
  - `border-bottom: 2px solid #2563EB`, no other border, transparent background
  - Manrope 17px/500
  - `color-scheme: light` to force iOS light date picker
- Bindings:
  - `[(ngModel)]="schedule.startDate"`
  - `(change)="onStartDateChange($event.target.value)"`
  - `[min]="getMinDate()"`

### Section 3 — Investment Amount
- Field label: `INVESTMENT AMOUNT`
- Inline `$` prefix (gray, 17px) + native `<input type="number">` with KYC field style
- Bindings:
  - `[(ngModel)]="schedule.investmentAmount"`
  - `(blur)="onAmountChange()"`
  - `min="1"`
- Info tip (conditional: `monthlyGoal > 0`):
  - Blue info-tip box (same pattern as SurveyInitial `.info-tip`)
  - `material-symbols-outlined info` icon (filled)
  - Text: "Recommended: {{ formatCurrency(monthlyGoal / (getSelectedFrequencyDetails()?.paychecksPerMonth || 1)) }} to meet your {{ formatCurrency(monthlyGoal) }}/mo goal"

### Section 4 — Projections (conditional: `schedule.investmentAmount > 0`)
- Two white metric cards in a 1fr 1fr grid:
  - **Monthly**: `formatCurrency(getMonthlyProjection())` — blue value, "Per Month" gray label
  - **Annual**: `formatCurrency(getAnnualProjection())` — blue value, "Per Year" gray label
  - Card style: white bg, `border: 1px solid #e5e7eb`, `border-radius: 12px`, padding 16px, centered
- Goal comparison line below cards (conditional: `monthlyGoal > 0`):
  - Green `checkmark_circle` + "You're on track!" when `getMonthlyProjection() >= monthlyGoal`
  - Amber `warning` + "Consider increasing to meet your goal (X short)" when under

### Section 5 — Transfer Existing Assets (ACATS)
- Disclosure-style row (like KYC disclosure items):
  - Left: title "Transfer existing assets?" (15px/600) + description (13px, gray)
  - Right: KYC-style Yes/No toggle button — `[class.toggle-on]="showTransferOptions"`, `(click)="showTransferOptions = !showTransferOptions"`
- Collapsible block when `showTransferOptions`:
  - **Brokerage**: field label `BROKERAGE` + native `<select>` with KYC select-wrapper style + `expand_more` arrow icon. Binds `[(ngModel)]="transferBrokerageDtc"`. Options from `*ngFor="let broker of brokerageOptions"`.
  - **Account Number**: field label `ACCOUNT NUMBER` + native `<input type="text">` with KYC field style. Binds `[(ngModel)]="transferAccountNumber"`. A `field-hint` note replaces the old IonPopover: "Found in your monthly statements or account settings."

### Footer
- `ion-footer` + `<div class="cta-footer">` (white bg, top border `#f1f5f9`, box-shadow up)
- Native `<button class="cta-btn">`:
  - Blue `#2563EB`, 52px height, `border-radius: 12px`, Manrope 16px/700
  - `[disabled]="!canProceed() || isSubmitting"`
  - Disabled: `#e5e7eb` bg, `#9ca3af` text
  - Submitting: `IonSpinner` + "Setting up schedule..."
  - Ready: "Review & Finalize" + `arrow_forward` material icon
  - `(click)="goToStockPreferences()"`

### Loading Veil
- `<div class="loading-veil" [class.veil-hidden]="isReady">` outside `ion-content`
- `isReady` is set to `true` in `ngOnInit` via `setTimeout(() => this.isReady = true, 50)` — just long enough to let Manrope render before revealing content
- Add `isReady: boolean = false` to the TS class

---

## SCSS Theme

```scss
:host {
  --schedule-primary: #2563EB;
  --schedule-bg: #f8fafc;
  --schedule-text: #0f172a;
  --schedule-gray: #6b7280;
  --schedule-border: #e5e7eb;

  // Force light mode
  --ion-background-color: #f8fafc;
  --ion-toolbar-background: #f8fafc;
  --ion-toolbar-color: #0f172a;
  --ion-text-color: #0f172a;
  --ion-color-primary: #2563EB;
  --ion-footer-background: #f8fafc;
}
```

Font: `'Manrope', sans-serif` on all elements via `.content-inner` and explicit declarations.

---

## TypeScript Changes

The only TS changes are minimal and additive:
1. Add `isReady: boolean = false` property
2. Add `setTimeout(() => this.isReady = true, 50)` in `ngOnInit`
3. Update `imports[]` array — remove unused Ionic components, add `IonFooter`

**Remove from imports[]:** `IonSelect`, `IonSelectOption`, `IonInput`, `IonNote`, `IonCard`, `IonCardContent`, `IonCardHeader`, `IonCardTitle`, `IonButton`, `IonButtons`, `IonBackButton`, `IonProgressBar`, `IonCheckbox`, `IonPopover`, `IonItem`, `IonLabel`

**Add to imports[]:** `IonFooter`

**Keep:** `IonContent`, `IonHeader`, `IonTitle`, `IonToolbar`, `IonSpinner`, `CommonModule`, `FormsModule`

All methods (`onFrequencyChange`, `onStartDateChange`, `onAmountChange`, `getMonthlyProjection`, `getAnnualProjection`, `getSelectedFrequencyDetails`, `formatCurrency`, `canProceed`, `goToStockPreferences`, etc.) remain completely unchanged.

---

## Files to Change
- `frontend/src/app/components/investment-schedule/investment-schedule.component.html` — full rewrite
- `frontend/src/app/components/investment-schedule/investment-schedule.component.scss` — full rewrite
- `frontend/src/app/components/investment-schedule/investment-schedule.component.ts` — minimal additions only (isReady + imports cleanup)
