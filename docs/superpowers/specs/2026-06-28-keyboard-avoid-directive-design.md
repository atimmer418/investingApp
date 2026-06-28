# Keyboard-Avoid Directive — Design

**Date:** 2026-06-28
**Author:** andy + Claude
**Status:** Approved design, pending spec review

## Problem

On the native iOS (Capacitor) build, when the soft keyboard opens it *overlays* the
webview rather than shrinking it. The webview keeps its full height, so a focused input
near the bottom of the screen can sit hidden behind the keyboard with no automatic
correction.

Two onboarding components already solve this with a hand-rolled mechanism, but it is
**copy-pasted** and only present in those two places. Every other input-bearing screen
relies only on a weak global fallback.

## What exists today (verified)

1. **Global fallback** — `app.component.ts:100-107` adds a `focusin` listener that calls
   `target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on any focused
   `INPUT/TEXTAREA/SELECT`, app-wide. This is insufficient on native iOS: because the
   webview does not shrink, `scrollIntoView` believes a covered field is already visible.
   It **is** the only thing that works on web (the Capacitor Keyboard plugin never fires
   in a browser).

2. **The good mechanism** — present only in `kyc-verification.component.ts` and
   `investment-schedule.component.ts`. The function is named
   **`scrollFocusedInputIntoView`** (not "scrollToInput"). It has four parts:
   - `Keyboard.addListener('keyboardWillShow'/'keyboardWillHide')` to capture the real
     `keyboardHeight` and set a `spacerHeight`.
   - A spacer `<div [style.height.px]="spacerHeight">` at the bottom of `<ion-content>`
     so bottom fields have room to scroll above the keyboard.
   - `(focusin)="scrollFocusedInputIntoView($event)"` on `<ion-content>`.
   - The method: wait 300ms, bail if no keyboard, compute
     `overshoot = fieldRect.bottom − (innerHeight − keyboardHeight − margin)`, and
     `content.scrollByPoint(0, overshoot, 150)` if positive.

   The two copies differ only in the field-wrapper selector (`.form-field` vs
   `.field-row`) and the bottom margin (`8` vs `32`).

## Goal

Replace the duplicated mechanism with **one reusable Angular attribute directive** and
apply it to every screen that has a keyboard-triggering text input. Keep the web fallback.

## Approach: `appKeyboardAvoid` directive

A standalone attribute directive applied to `<ion-content>`. It folds all four parts of
the current mechanism into one place. Per screen, the entire change is adding the
attribute (and importing the directive in the standalone component's `imports`).

```html
<ion-content appKeyboardAvoid>...</ion-content>
<!-- or, to bring a whole field wrapper (incl. validation text) into view: -->
<ion-content [appKeyboardAvoid]="'.form-field'">...</ion-content>
```

### File

`frontend/src/app/directives/keyboard-avoid.directive.ts` (new — first directive in the
app; establishes the `directives/` folder).

### Reference implementation

```ts
import { Directive, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { Keyboard } from '@capacitor/keyboard';

@Directive({
  selector: '[appKeyboardAvoid]',
  standalone: true,
})
export class KeyboardAvoidDirective implements OnInit, OnDestroy {
  /**
   * Optional CSS selector for the field WRAPPER to bring fully into view (so any
   * validation/helper text below the input also clears the keyboard). Falls back to the
   * focused element itself when omitted. Bound via the directive's own attribute:
   *   <ion-content [appKeyboardAvoid]="'.form-field'">
   */
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
    if (!this.keyboardHeight) return;            // web / no keyboard → no-op

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

### Design decisions

- **Inject `IonContent` (not `ElementRef`).** Same API the working code already uses
  (`getScrollElement()`, `scrollByPoint()`), so behavior is identical. Angular provides
  the host component instance to a directive on the same element.
- **Padding-bottom on the scroll element replaces the spacer `<div>`.** Setting inline
  `paddingBottom` on the cached scroll element gives the same extra scroll range with
  **zero template edits** (no per-screen spacer markup). On hide we clear it back to the
  CSS-var default. *Contingency:* if Ionic 8 overrides inline padding on `.inner-scroll`,
  fall back to a light-DOM spacer the directive creates and appends once — same effect.
- **Bottom margin standardized to 16px** (the two copies used 8 and 32), overridable via
  `keyboardAvoidMargin`.
- **Wrapper selector is optional.** Default scrolls the focused element; pass a selector
  to scroll the whole labeled field. No imperative change detection is needed because the
  directive manipulates the DOM directly rather than through template bindings.

## Scope

### New application (11 screens) — add attribute + import only

| # | Component / Page | Path (under `frontend/src/app/`) | Notes |
|---|---|---|---|
| 1 | add-beneficiary | `beneficiaries/add-beneficiary.page` | text×8, tel, number, email |
| 2 | authfinalize | `components/authfinalize` | email |
| 3 | portfolio-customize | `components/portfolio-customize` | number + stock searchbar |
| 4 | retirement-planning | `components/retirement-planning` | number×6 |
| 5 | stockselection | `components/stockselection` | stock searchbar |
| 6 | lump-sum-investment | `lump-sum-investment/lump-sum-investment.page` | text, number |
| 7 | change-email | `pages/change-email` | email |
| 8 | my-profile | `pages/my-profile` | text, number×2 |
| 9 | recovery | `pages/recovery` | text, email |
| 10 | recurring-investments | `recurring-investments/recurring-investments.page` | number |
| 11 | sell-withdraw | `sell-withdraw/sell-withdraw.page` | number |

For screens with more than one `<ion-content>`, apply the attribute to the one that wraps
the form inputs. A searchbar that lives in a sticky `<ion-toolbar>` (outside `ion-content`)
needs no avoidance — it is already pinned above the keyboard.

### Migrate existing 2 (remove duplication)

| # | Component | Remove | Replace with |
|---|---|---|---|
| 12 | `components/kyc-verification` | `Keyboard` import, `kbShowListener`/`kbHideListener`, `keyboardHeight`/`spacerHeight`, `scrollFocusedInputIntoView`, the two `cdr.detectChanges()` in the kb callbacks, listener teardown in `ngOnDestroy`, and the spacer `<div>` in the template | `[appKeyboardAvoid]="'.form-field'"` on `<ion-content>` + import directive |
| 13 | `components/investment-schedule` | same set, plus its spacer `<div>` | `[appKeyboardAvoid]="'.field-row'"` on `<ion-content>` + import directive |

Behavior stays identical except bottom scroll room becomes the full keyboard height
instead of `height − 84` (removes a magic number; harmless).

### Out of scope (no change)

- **`surveyinitial`** (range sliders only), **`document-upload`** (file picker),
  **`investmentconfirmation`** (checkbox/button only) — no text keyboard.
- **`ai-chat`** — its `<ion-textarea>` is in an `<ion-footer>` (already above the keyboard)
  and has bespoke scroll-to-bottom logic; leave it alone.
- **Global `focusin` handler in `app.component.ts`** — stays as the web fallback. It
  already coexists with the mechanism on the two live screens today, so no regression.

## Edge cases & risks

- **Web/browser:** `Keyboard` never fires → `keyboardHeight` stays 0 → directive no-ops.
  Global fallback handles web. (So this is only truly testable on the iPhone build.)
- **Multiple `ion-content` per screen:** apply to the form one; verify per screen.
- **ion-input / ion-searchbar / ion-textarea:** render an inner native `input`/`textarea`;
  `focusin` bubbles to `ion-content` and `event.target` matches the selector. OK.
- **Padding contingency:** documented fallback to a created spacer div if needed.

## Testing / acceptance

Per-screen manual check on the Capacitor build: focus the bottom-most input on each of the
13 screens; the field should scroll clear of the keyboard. Regression-check the two
migrated screens specifically (kyc step 1 + step 2; investment-schedule amount/date rows).

Build gate: `cd frontend && npx tsc --noEmit` (and the normal Angular build) must pass —
the directive must be added to every consuming standalone component's `imports`, or the
template will fail to compile.

### Acceptance Check Manifest

- [ ] `keyboard-avoid.directive.ts` created; compiles; selector `[appKeyboardAvoid]`.
- [ ] Directive imported and applied on all 11 new screens' form `ion-content`.
- [ ] kyc-verification migrated: old mechanism fully removed; `.form-field` passed; no
      dangling `keyboardHeight`/`spacerHeight`/`Keyboard` references.
- [ ] investment-schedule migrated: same, `.field-row` passed.
- [ ] No spacer `<div>` left bound to a now-deleted `spacerHeight`.
- [ ] `app.component.ts` global focusin handler untouched.
- [ ] `npx tsc --noEmit` clean; Angular build succeeds.
- [ ] Excluded screens (surveyinitial, document-upload, investmentconfirmation, ai-chat)
      unchanged.
