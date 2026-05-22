# B6 — Tab 3 Settings UI Overhaul

**Goal:** Apply the established FRED onboarding-flow theme to every settings page reachable from Tab 3 ("My Account"). Functionality preserved — HTML bindings, TypeScript, services, lifecycle hooks must not change.

---

## Theme Sources — Read These First

Before touching any settings page, read 2–3 of these reference components to internalize the visual language:

| Component | Files |
|-----------|-------|
| get-started | `frontend/src/app/components/get-started/get-started.component.{ts,html,scss}` |
| surveyinitial | `frontend/src/app/components/surveyinitial/surveyinitial.component.{ts,html,scss}` |
| fi-plan-results | `frontend/src/app/components/fi-plan-results/fi-plan-results.component.{ts,html,scss}` |
| authfinalize | `frontend/src/app/components/authfinalize/authfinalize.component.{ts,html,scss}` |
| kyc-verification | `frontend/src/app/components/kyc-verification/kyc-verification.component.{ts,html,scss}` |
| linkplaid | `frontend/src/app/components/linkplaid/linkplaid.component.{ts,html,scss}` |
| investment-schedule | `frontend/src/app/components/investment-schedule/investment-schedule.component.{ts,html,scss}` |
| investmentconfirmation | `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.{ts,html,scss}` |

Also read: `FREDdocs/FRED_UI_STYLE_GUIDE.md` for the canonical design rules.

**Key theme rules (from style guide + onboarding components):**
- Font: Manrope (all weights)
- Primary CTA color: `#2563EB` (blue); primary text: `#111827`
- Icons: `material-symbols-outlined` class
- Force light mode: no dark mode variables
- Section cards: white background, `border-radius: 12px`, subtle shadow or border
- CTAs: full-width rounded buttons with `#2563EB` fill, white text
- Loading/transition: loading veil pattern from onboarding components
- Spacing: generous vertical padding, consistent horizontal margins (match onboarding pages)
- No Ionic default chrome — suppress default toolbar styling where onboarding pages do

---

## Pages to Overhaul (process in order)

| # | Route | Component files |
|---|-------|----------------|
| 1 | `/my-profile` | `frontend/src/app/pages/my-profile/my-profile.page.{ts,html,scss}` |
| 2 | `/recurring-investments` | `frontend/src/app/recurring-investments/recurring-investments.page.{ts,html,scss}` |
| 3 | `/lump-sum-investment` | `frontend/src/app/lump-sum-investment/lump-sum-investment.page.{ts,html,scss}` |
| 4 | `/portfolio-customize` | `frontend/src/app/components/portfolio-customize/portfolio-customize.component.{ts,html,scss}` |
| 5 | `/sell-withdraw` | `frontend/src/app/sell-withdraw/sell-withdraw.page.{ts,html,scss}` |
| 6 | `/security-settings` | `frontend/src/app/pages/security-settings/security-settings.page.{ts,html,scss}` |
| 7 | `/change-bank-account` | `frontend/src/app/change-bank-account/change-bank-account.page.{ts,html,scss}` |
| 8 | `/tax-documents` | `frontend/src/app/pages/tax-documents/tax-documents.page.{ts,html,scss}` |
| 9 | `/beneficiaries` | `frontend/src/app/beneficiaries/beneficiaries.page.{ts,html,scss}` |
| 10 | `/faq` | `frontend/src/app/faq/faq.page.{ts,html,scss}` |

---

## Per-Page Workflow

For each page:

1. **Read** the page's `.ts`, `.html`, `.scss`.
2. **Read** 1–2 reference onboarding components (rotate through the list above — don't read the same two every time).
3. **Update `.html`** — restructure layout to match onboarding visual patterns. Use the same section-card structure, typography hierarchy, icon usage, and CTA button layout found in the reference components.
4. **Update `.scss`** — replace existing styles with onboarding-consistent variables and rules. Match spacing, font sizes, colors, border-radius, shadows.
5. **Do NOT touch `.ts`** — no changes to service calls, subscriptions, lifecycle hooks, or imports (unless adding a purely cosmetic `@ViewChild` or similar that doesn't affect behavior).
6. **Run:** `npx tsc --noEmit` — must exit 0 before committing.
7. **Visual verify** at `local-b6.fredvested.com` using Claude-in-Chrome MCP:
   - Navigate to the page.
   - Screenshot and compare to an onboarding page screenshot — confirm visual consistency.
   - Click every interactive element (buttons, toggles, inputs) — confirm no functional regression.
8. **Commit:** `git commit -am "ui: B6 — overhaul <route> to onboarding theme"`
9. **Check the Done box** for this page in the section below.
10. Move to the next page.

---

## Functionality Preservation Guard

The following elements in `.html` files must be preserved exactly — do not rename, remove, or restructure their bindings:

- `(click)="..."` — event bindings
- `[formGroup]="..."`, `formControlName="..."` — reactive forms
- `*ngFor`, `*ngIf`, `*ngSwitch` — structural directives
- `[(ngModel)]="..."` — two-way bindings
- `(ionChange)`, `(ionBlur)`, `(ionFocus)` — Ionic events
- `[src]`, `[href]`, `[routerLink]` — dynamic attribute bindings
- `#templateRef` — template reference variables

You may freely:
- Change element types (e.g., `<div>` → `<ion-card>`) as long as all bindings are transferred
- Add or remove CSS classes
- Restructure the layout hierarchy
- Add new purely-decorative elements (icons, dividers, section labels)

---

## Done

- [ ] 1. `/my-profile`
- [ ] 2. `/recurring-investments`
- [ ] 3. `/lump-sum-investment`
- [ ] 4. `/portfolio-customize`
- [ ] 5. `/sell-withdraw`
- [ ] 6. `/security-settings`
- [ ] 7. `/change-bank-account`
- [ ] 8. `/tax-documents`
- [ ] 9. `/beneficiaries`
- [ ] 10. `/faq`
