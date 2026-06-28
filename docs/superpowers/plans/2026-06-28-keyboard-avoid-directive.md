# Keyboard-Avoid Directive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the copy-pasted iOS keyboard-avoidance mechanism with one reusable `appKeyboardAvoid` directive, apply it to every input-bearing screen, and migrate the two existing hand-rolled copies onto it.

**Architecture:** A standalone Angular attribute directive on `<ion-content>` injects the host `IonContent`, registers Capacitor `Keyboard` show/hide listeners, sets `padding-bottom` on the scroll element to create room, and on `focusin` scrolls the focused field clear of the keyboard using the real keyboard height. Consuming standalone components import the directive and add the attribute. No per-component TypeScript.

**Tech Stack:** Angular 18 standalone components, Ionic 8.5.7 (`@ionic/angular/standalone`), `@capacitor/keyboard`, TypeScript.

## Global Constraints

- **No unit tests.** This project has no test framework (owner preference). The verification gate for every code task is the Angular AOT build: `cd frontend && npx ng build`. Plain `tsc --noEmit` does NOT check template bindings, so it cannot catch a directive that was added to a template but not to the component's `imports` array — always use `ng build`.
- **Behavioral verification is device-only.** The Capacitor `Keyboard` plugin never fires in a desktop/browser build, so the directive is a deliberate no-op on web. Real behavior is only observable on the iPhone/Capacitor build. The web global fallback in `app.component.ts` stays in place and must not be touched.
- **Standalone imports are mandatory.** Every component that uses `appKeyboardAvoid` in its template MUST add `KeyboardAvoidDirective` to its `@Component({ imports: [...] })`, or the AOT build fails.
- **Preserve concurrent working-tree edits.** `portfolio-customize` and `lump-sum-investment` have unrelated uncommitted edits from this session. Apply changes on top of current file state; never revert. Stage only the files each task changes.
- **Anchor by string, not line number.** Line numbers in this plan are hints; the repo is being edited live. Match the exact quoted strings.

---

### Task 1: Create the `KeyboardAvoidDirective`

**Files:**
- Create: `frontend/src/app/directives/keyboard-avoid.directive.ts`

**Interfaces:**
- Produces: `KeyboardAvoidDirective` (standalone, selector `[appKeyboardAvoid]`).
  - Input `appKeyboardAvoid: string` — optional CSS selector for the field wrapper to scroll fully into view; falls back to the focused element. Bind as `[appKeyboardAvoid]="'.form-field'"` or leave bare (`appKeyboardAvoid`).
  - Input `keyboardAvoidMargin: number` — gap in px between field bottom and keyboard top (default `16`).

- [ ] **Step 1: Create the directory and file with the directive**

Create `frontend/src/app/directives/keyboard-avoid.directive.ts` with exactly:

```ts
import { Directive, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Keeps the focused form field visible above the iOS soft keyboard.
 *
 * Apply to an <ion-content> that contains text inputs:
 *   <ion-content appKeyboardAvoid> ... </ion-content>
 *   <ion-content [appKeyboardAvoid]="'.form-field'"> ... </ion-content>
 *
 * On the Capacitor (native) build the keyboard overlays the webview without
 * shrinking it, so scrollIntoView alone fails for bottom fields. This directive
 * uses the real keyboard height to add scroll room and scroll by the exact
 * overshoot. On web the Keyboard plugin never fires, so this is a no-op and the
 * global focusin fallback in app.component.ts handles it.
 */
@Directive({
  selector: '[appKeyboardAvoid]',
  standalone: true,
})
export class KeyboardAvoidDirective implements OnInit, OnDestroy {
  /** Optional wrapper selector to bring the whole labeled field (incl. validation
   *  text below the input) into view. Falls back to the focused element. */
  @Input('appKeyboardAvoid') wrapperSelector = '';

  /** Gap (px) kept between the field bottom and the keyboard top. */
  @Input() keyboardAvoidMargin = 16;

  private keyboardHeight = 0;
  private scrollEl?: HTMLElement;
  private kbShow?: Promise<any>;
  private kbHide?: Promise<any>;

  constructor(private content: IonContent) {}

  async ngOnInit(): Promise<void> {
    // Cache the scroll element once; the keyboard listeners then just toggle padding.
    this.scrollEl = await this.content.getScrollElement();

    this.kbShow = Keyboard.addListener('keyboardWillShow', info => {
      this.keyboardHeight = info.keyboardHeight;
      if (this.scrollEl) this.scrollEl.style.paddingBottom = `${info.keyboardHeight}px`;
    });
    this.kbHide = Keyboard.addListener('keyboardWillHide', () => {
      this.keyboardHeight = 0;
      if (this.scrollEl) this.scrollEl.style.paddingBottom = '';
    });
  }

  @HostListener('focusin', ['$event'])
  async onFocusIn(event: FocusEvent): Promise<void> {
    const el = event.target as HTMLElement;
    if (!el?.matches('input, select, textarea')) return;
    await new Promise(r => setTimeout(r, 300)); // let the keyboard finish animating in
    if (!this.keyboardHeight) return;            // web / no keyboard -> no-op

    const fieldEl =
      (this.wrapperSelector && (el.closest(this.wrapperSelector) as HTMLElement)) || el;
    const rect = fieldEl.getBoundingClientRect();
    const visibleBottom = window.innerHeight - this.keyboardHeight - this.keyboardAvoidMargin;
    const overshoot = rect.bottom - visibleBottom;
    if (overshoot > 0) (this.content as any).scrollByPoint(0, overshoot, 150);
  }

  ngOnDestroy(): void {
    this.kbShow?.then(h => h.remove());
    this.kbHide?.then(h => h.remove());
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx ng build`
Expected: build SUCCEEDS (the directive isn't consumed yet; this confirms it has no type errors). If `ng build` is unavailable in this environment, defer this gate to the first environment that has the Angular CLI and note it.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/directives/keyboard-avoid.directive.ts
git commit -m "feat: add reusable appKeyboardAvoid directive

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Apply the directive to the 10 scrollable input screens

**Files (each: add import statement + add `KeyboardAvoidDirective` to `imports: [...]` + add `appKeyboardAvoid` attribute to the form `<ion-content>`):**
- `frontend/src/app/beneficiaries/add-beneficiary.page.ts` + `.html`
- `frontend/src/app/components/authfinalize/authfinalize.component.ts` + `.html`
- `frontend/src/app/components/portfolio-customize/portfolio-customize.component.ts` + `.html`
- `frontend/src/app/components/retirement-planning/retirement-planning.component.ts` + `.html`
- `frontend/src/app/components/stockselection/stockselection.component.ts` + `.html`
- `frontend/src/app/lump-sum-investment/lump-sum-investment.page.ts` + `.html`
- `frontend/src/app/pages/my-profile/my-profile.page.ts` + `.html`
- `frontend/src/app/pages/recovery/recovery.page.ts` + `.html`
- `frontend/src/app/recurring-investments/recurring-investments.page.ts` + `.html`
- `frontend/src/app/sell-withdraw/sell-withdraw.page.ts` + `.html`

**Interfaces:**
- Consumes: `KeyboardAvoidDirective` from Task 1.

**Import path by folder depth** (used in each `.ts`):
- Under `app/components/*` or `app/pages/*` → `'../../directives/keyboard-avoid.directive'`
- Under `app/<feature>/*` (add-beneficiary, lump-sum-investment, recurring-investments, sell-withdraw) → `'../directives/keyboard-avoid.directive'`

The default (bare `appKeyboardAvoid`, no wrapper selector) is used for all 10 — it scrolls the focused element itself, which is sufficient.

- [ ] **Step 1: add-beneficiary**

In `frontend/src/app/beneficiaries/add-beneficiary.page.ts`, add after the existing import block:
```ts
import { KeyboardAvoidDirective } from '../directives/keyboard-avoid.directive';
```
Add `KeyboardAvoidDirective` to the `imports: [` array (as the last entry).
In `frontend/src/app/beneficiaries/add-beneficiary.page.html`, replace:
```html
<ion-content class="main-content">
```
with:
```html
<ion-content class="main-content" appKeyboardAvoid>
```

- [ ] **Step 2: authfinalize**

In `frontend/src/app/components/authfinalize/authfinalize.component.ts`, add:
```ts
import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';
```
Add `KeyboardAvoidDirective` to its `imports: [` array.
In the `.html`, replace `<ion-content class="auth-content" >` with `<ion-content class="auth-content" appKeyboardAvoid>`.

- [ ] **Step 3: portfolio-customize**

`.ts` import: `import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';` + add to `imports: [`.
`.html`: replace `<ion-content class="portfolio-content">` with `<ion-content class="portfolio-content" appKeyboardAvoid>`.

- [ ] **Step 4: retirement-planning**

`.ts` import: `import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';` + add to `imports: [`.
`.html`: replace `<ion-content class="retirement-content">` with `<ion-content class="retirement-content" appKeyboardAvoid>`.

- [ ] **Step 5: stockselection**

`.ts` import: `import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';` + add to `imports: [`.
`.html`: replace `<ion-content class="ion-padding">` with `<ion-content class="ion-padding" appKeyboardAvoid>`.

- [ ] **Step 6: lump-sum-investment**

`.ts` import: `import { KeyboardAvoidDirective } from '../directives/keyboard-avoid.directive';` + add to `imports: [`.
`.html`: replace the FIRST/main content `<ion-content class="lump-sum-content">` with `<ion-content class="lump-sum-content" appKeyboardAvoid>`. Do NOT touch the nested `<ion-content [scrollY]="false" class="ion-padding">` (it holds no inputs).

- [ ] **Step 7: my-profile**

`.ts` import: `import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';` + add to `imports: [`.
`.html`: replace `<ion-content class="profile-content">` with `<ion-content class="profile-content" appKeyboardAvoid>`.

- [ ] **Step 8: recovery**

`.ts` import: `import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';` + add to `imports: [`.
`.html`: replace `<ion-content class="ion-padding">` with `<ion-content class="ion-padding" appKeyboardAvoid>`.

- [ ] **Step 9: recurring-investments**

`.ts` import: `import { KeyboardAvoidDirective } from '../directives/keyboard-avoid.directive';` + add to `imports: [`.
`.html`: replace `<ion-content class="recurring-content">` with `<ion-content class="recurring-content" appKeyboardAvoid>`.

- [ ] **Step 10: sell-withdraw**

`.ts` import: `import { KeyboardAvoidDirective } from '../directives/keyboard-avoid.directive';` + add to `imports: [`.
`.html`: replace the main `<ion-content class="sell-withdraw-content">` with `<ion-content class="sell-withdraw-content" appKeyboardAvoid>`. Do NOT touch the nested `<ion-content [scrollY]="false" class="ion-padding">`.

- [ ] **Step 11: Build gate**

Run: `cd frontend && npx ng build`
Expected: build SUCCEEDS. A failure like `Can't bind to 'appKeyboardAvoid' since it isn't a known property of 'ion-content'` means the directive was added to a template but not that component's `imports` array — fix the offending component.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/app/beneficiaries/add-beneficiary.page.ts frontend/src/app/beneficiaries/add-beneficiary.page.html \
        frontend/src/app/components/authfinalize/authfinalize.component.ts frontend/src/app/components/authfinalize/authfinalize.component.html \
        frontend/src/app/components/portfolio-customize/portfolio-customize.component.ts frontend/src/app/components/portfolio-customize/portfolio-customize.component.html \
        frontend/src/app/components/retirement-planning/retirement-planning.component.ts frontend/src/app/components/retirement-planning/retirement-planning.component.html \
        frontend/src/app/components/stockselection/stockselection.component.ts frontend/src/app/components/stockselection/stockselection.component.html \
        frontend/src/app/lump-sum-investment/lump-sum-investment.page.ts frontend/src/app/lump-sum-investment/lump-sum-investment.page.html \
        frontend/src/app/pages/my-profile/my-profile.page.ts frontend/src/app/pages/my-profile/my-profile.page.html \
        frontend/src/app/pages/recovery/recovery.page.ts frontend/src/app/pages/recovery/recovery.page.html \
        frontend/src/app/recurring-investments/recurring-investments.page.ts frontend/src/app/recurring-investments/recurring-investments.page.html \
        frontend/src/app/sell-withdraw/sell-withdraw.page.ts frontend/src/app/sell-withdraw/sell-withdraw.page.html
git commit -m "feat: apply appKeyboardAvoid to 10 input screens

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
(If the working tree includes the unrelated portfolio-customize / lump-sum-investment edits, that is expected — they ride along; do not revert them.)

---

### Task 3: Migrate `kyc-verification` onto the directive

**Files:**
- Modify: `frontend/src/app/components/kyc-verification/kyc-verification.component.ts`
- Modify: `frontend/src/app/components/kyc-verification/kyc-verification.component.html`

**Interfaces:**
- Consumes: `KeyboardAvoidDirective` from Task 1.
- Note: `cdr` (ChangeDetectorRef) is used elsewhere in this file (prefill flows) — KEEP it. `IonContent` stays in `imports` (needed for the `<ion-content>` element). Only the `@ViewChild(IonContent)` property is removed.

- [ ] **Step 1: Edit the TypeScript**

Remove this import line:
```ts
import { Keyboard } from '@capacitor/keyboard';
```
Change the Angular core import (remove `ViewChild`):
```ts
import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
```
to:
```ts
import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
```
Add the directive import (near the other relative imports):
```ts
import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';
```
Add `KeyboardAvoidDirective` to the `imports: [` array.
Remove the ViewChild property:
```ts
  @ViewChild(IonContent) private content!: IonContent;
```
Remove the listener fields:
```ts
  private kbShowListener: any;
  private kbHideListener: any;
```
Remove the keyboard state fields:
```ts
  keyboardHeight = 0;
  spacerHeight = 0;
```
Remove the listener setup block in `ngOnInit` (entire block):
```ts
    this.kbShowListener = Keyboard.addListener('keyboardWillShow', info => {
      this.keyboardHeight = info.keyboardHeight;
      this.spacerHeight = info.keyboardHeight + 16 - 100;
      this.cdr.detectChanges();
    });
    this.kbHideListener = Keyboard.addListener('keyboardWillHide', () => {
      this.keyboardHeight = 0;
      this.spacerHeight = 0;
      this.cdr.detectChanges();
    });
```
Remove the whole method:
```ts
  async scrollFocusedInputIntoView(event: FocusEvent) {
    const el = event.target as HTMLElement;
    if (!el.matches('input, select, textarea')) return;
    await new Promise(r => setTimeout(r, 300));
    if (!this.keyboardHeight) return;
    const fieldEl = (el.closest('.form-field') as HTMLElement) ?? el;
    const rect = fieldEl.getBoundingClientRect();
    const visibleBottom = window.innerHeight - this.keyboardHeight - 8;
    const overshoot = rect.bottom - visibleBottom;
    if (overshoot > 0) {
      (this.content as any).scrollByPoint(0, overshoot, 150);
    }
  }
```
Remove the teardown lines in `ngOnDestroy`:
```ts
    this.kbShowListener?.then((h: any) => h.remove());
    this.kbHideListener?.then((h: any) => h.remove());
```

- [ ] **Step 2: Edit the template**

Replace:
```html
<ion-content class="kyc-content" (focusin)="scrollFocusedInputIntoView($event)">
```
with:
```html
<ion-content class="kyc-content" [appKeyboardAvoid]="'.form-field'">
```
Remove the spacer div:
```html
    <div [style.height.px]="spacerHeight"></div>
```

- [ ] **Step 3: Build gate**

Run: `cd frontend && npx ng build`
Expected: build SUCCEEDS with no references to `Keyboard`, `spacerHeight`, `keyboardHeight`, `scrollFocusedInputIntoView`, or `ViewChild` remaining in this component. If the build complains about an unused `IonContent` import, that's wrong — `IonContent` must remain (it's the element); re-check you only removed the `@ViewChild` line.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/components/kyc-verification/kyc-verification.component.ts frontend/src/app/components/kyc-verification/kyc-verification.component.html
git commit -m "refactor: migrate kyc-verification onto appKeyboardAvoid directive

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Migrate `investment-schedule` onto the directive

**Files:**
- Modify: `frontend/src/app/components/investment-schedule/investment-schedule.component.ts`
- Modify: `frontend/src/app/components/investment-schedule/investment-schedule.component.html`

**Interfaces:**
- Consumes: `KeyboardAvoidDirective` from Task 1.
- Note: unlike kyc, `cdr` (ChangeDetectorRef) is used ONLY inside the removed listeners here, so remove it entirely (import + constructor param). `IonContent` stays in `imports` for the element; only the `@ViewChild` property is removed.

- [ ] **Step 1: Edit the TypeScript**

Remove this import line:
```ts
import { Keyboard } from '@capacitor/keyboard';
```
Change the Angular core import (remove both `ChangeDetectorRef` and `ViewChild`):
```ts
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
```
to:
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
```
Add the directive import:
```ts
import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';
```
Add `KeyboardAvoidDirective` to the `imports: [` array.
Remove the ViewChild property:
```ts
  @ViewChild(IonContent) private content!: IonContent;
```
Remove the listener fields:
```ts
  private kbShowListener: any;
  private kbHideListener: any;
```
Remove the keyboard state fields:
```ts
  keyboardHeight = 0;
  spacerHeight = 0;
```
Remove the `cdr` constructor parameter — change:
```ts
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}
```
to:
```ts
    private http: HttpClient
  ) {}
```
Remove the listener setup block in `ngOnInit`:
```ts
    this.kbShowListener = Keyboard.addListener('keyboardWillShow', info => {
      this.keyboardHeight = info.keyboardHeight;
      this.spacerHeight = info.keyboardHeight + 16 - 100;
      this.cdr.detectChanges();
    });
    this.kbHideListener = Keyboard.addListener('keyboardWillHide', () => {
      this.keyboardHeight = 0;
      this.spacerHeight = 0;
      this.cdr.detectChanges();
    });
```
Remove the whole method:
```ts
  async scrollFocusedInputIntoView(event: FocusEvent) {
    const el = event.target as HTMLElement;
    if (!el.matches('input, select, textarea')) return;
    await new Promise(r => setTimeout(r, 300));
    if (!this.keyboardHeight) return;
    const fieldEl = (el.closest('.field-row') as HTMLElement) ?? el;
    const rect = fieldEl.getBoundingClientRect();
    const visibleBottom = window.innerHeight - this.keyboardHeight - 32;
    const overshoot = rect.bottom - visibleBottom;
    if (overshoot > 0) {
      (this.content as any).scrollByPoint(0, overshoot, 150);
    }
  }
```
Remove the teardown lines in `ngOnDestroy`:
```ts
    this.kbShowListener?.then((h: any) => h.remove());
    this.kbHideListener?.then((h: any) => h.remove());
```

- [ ] **Step 2: Edit the template**

Replace:
```html
<ion-content class="schedule-content" (focusin)="scrollFocusedInputIntoView($event)">
```
with:
```html
<ion-content class="schedule-content" [appKeyboardAvoid]="'.field-row'">
```
Remove the spacer div:
```html
    <div [style.height.px]="spacerHeight"></div>
```

- [ ] **Step 3: Build gate**

Run: `cd frontend && npx ng build`
Expected: build SUCCEEDS. If it reports `'cdr' is declared but never read` or an unused `ChangeDetectorRef`, you missed removing the import or constructor param. `IonContent` must remain.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/components/investment-schedule/investment-schedule.component.ts frontend/src/app/components/investment-schedule/investment-schedule.component.html
git commit -m "refactor: migrate investment-schedule onto appKeyboardAvoid directive

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: change-email — verify only (no code change)

`frontend/src/app/pages/change-email/change-email.page.html` uses `<ion-content [scrollY]="false" class="main-content">`. With scrolling disabled, the directive cannot scroll, so applying it would be dead code. The single editable field (`newEmail`, type=email) sits near the top of a short form, above where the keyboard appears.

- [ ] **Step 1: On-device check (Capacitor build)**

Open the change-email screen on the iPhone build, focus the "Enter new email" field. Expected: the field is NOT covered by the keyboard (it's in the top half). No change needed.

- [ ] **Step 2: Escalate only if covered**

If — and only if — the field IS covered on some device, the fix is out of scope for this plan: it requires removing `[scrollY]="false"` (which affects that screen's layout) and then adding `appKeyboardAvoid`. Flag this to the owner rather than changing it silently.

---

### Final Verification

- [ ] **Full build:** `cd frontend && npx ng build` → SUCCEEDS.
- [ ] **No leftovers:** `rg -n "scrollFocusedInputIntoView|spacerHeight|keyboardHeight|kbShowListener|kbHideListener" frontend/src/app/components/kyc-verification frontend/src/app/components/investment-schedule` → returns NOTHING.
- [ ] **Directive adopted everywhere intended:** `rg -ln "appKeyboardAvoid" frontend/src/app --glob '*.html'` → lists exactly the 10 Task-2 screens + kyc + investment-schedule (12 files).
- [ ] **Global fallback untouched:** `git diff develop -- frontend/src/app/app.component.ts` shows no change introduced by this branch to the `focusin` handler.
- [ ] **Excluded screens unchanged:** no `appKeyboardAvoid` in surveyinitial, document-upload, investmentconfirmation, ai-chat.
- [ ] **On-device behavior:** on the Capacitor build, focus the bottom-most input on each of the 12 directive screens; each field scrolls clear of the keyboard. Pay special attention to the two migrated screens (kyc step 1 + step 2; investment-schedule amount/date rows) to confirm no behavioral regression.

## Self-Review (completed by plan author)

- **Spec coverage:** directive (Task 1); 11-screen rollout split into 10 scrollable (Task 2) + change-email special case (Task 5); migrate the 2 (Tasks 3–4); global fallback explicitly untouched; exclusions verified in Final Verification. All spec sections mapped.
- **Placeholders:** none — every edit shows exact before/after strings.
- **Type/name consistency:** directive name `KeyboardAvoidDirective`, selector `appKeyboardAvoid`, inputs `wrapperSelector`(bound via `appKeyboardAvoid`) and `keyboardAvoidMargin` are used identically across Tasks 1–4. Migration cleanup correctly differs (kyc keeps `cdr`, investment-schedule removes it) per verified usage.
