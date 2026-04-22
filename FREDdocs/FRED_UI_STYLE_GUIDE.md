# FRED UI/UX Style Guide

> A living reference for building new screens in FRED. Every rule here is derived from what already exists in the codebase — not aspirational, just documented.

---

## Design Philosophy

FRED feels like a premium iOS financial app, not a generic SaaS web product. The aesthetic is **calm, minimal, and confident**. White space does the heavy lifting. Copy is short and direct. The UI never shouts — it guides.

Three principles drive every screen:

1. **Clarity first.** Every screen has one primary job. Don't crowd it.
2. **Premium without effort.** Thin borders, subtle shadows, tight type — nothing garish.
3. **Motion earns its place.** Transitions exist to communicate state change, not to impress.

> **Important — viewport containment (soft constraint):** Prefer designs that fit entirely within one screen without requiring the user to scroll. This is not a hard rule — some screens genuinely need more space — but it should be the default goal. All layouts must look and feel correct across the primary device range:
>
> | Device | Viewport width | Viewport height |
> |---|---|---|
> | iPhone 14 | 390px | 844px |
> | iPhone 17 | 402px | 874px |
>
> Design to the smaller end (390 × 844) and verify nothing breaks at the larger end. If a screen requires scroll, it should feel intentional — not like content overflowed its container.

---

## Color System

All components force light mode via `:host` overrides. Never rely on system theme.

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#2563EB` | CTAs, active states, highlights, filled icons |
| `text` | `#0f172a` | All body text, headings |
| `gray` | `#6b7280` | Secondary text, labels, placeholders |
| `bg` | `#f8fafc` | Page background (cool off-white) |
| `bg-white` | `#ffffff` | Card surfaces, footer CTA bar |
| `border` | `#e5e7eb` | Card borders, form dividers |
| `card-warm` | `#f5f3ef` | Informational display cards (get-started only) |

### Semantic accent colors (pills/chips only)

| Name | Background | Text | Use for |
|---|---|---|---|
| Amber | `#fef3c7` | `#92400e` | Warnings, "waiting" states |
| Teal | `#ccfbf1` | `#065f46` | Success, DRIP/compound |
| Blue | `#dbeafe` | `#1e40af` | Strategy, info |
| Purple | `#ede9fe` | `#5b21b6` | Automation themes |
| Green | `#dcfce7` | `#14532d` | Readiness, positive |

These only appear in small tag pills (e.g. get-started slide tags, strategy chips). Do not use them as backgrounds for full cards or sections.

---

## Typography

**Font:** `Manrope, sans-serif` — everywhere, always. Set it on `.content-inner` and repeat it on every element that needs it (Ionic resets aggressively).

### Type scale

| Role | Size | Weight | Notes |
|---|---|---|---|
| Hero title | `32px` | `800` | `letter-spacing: -0.025em`, `line-height: 1.2`, centered |
| Header title (toolbar) | `18px` | `700` | `letter-spacing: -0.015em`, centered |
| Section heading | `20px` | `800` | `letter-spacing: -0.015em` (used in kyc disclosures) |
| Card title | `14px` | `800` | `letter-spacing: -0.01em` |
| Body / subtitle | `14px` | `400` | `line-height: 1.4–1.5`, gray color |
| Form value | `17px` | `500` | Used in all field inputs and select elements |
| Field label | `11px` | `700` | UPPERCASE, `letter-spacing: 0.08em`, gray |
| Row label (confirmation) | `10px` | `700` | UPPERCASE, `letter-spacing: 0.08em`, gray |
| Tag/pill text | `9.5px` | `700–800` | UPPERCASE, `letter-spacing: 0.1em` |
| Body strong | — | `700` | Use `<strong>` in body copy for key terms only |

### Hero copy voice

Short. Conversational. One or two clauses max.

**Good examples from the codebase:**
- `"Let's lock it in."` — authfinalize
- `"Set your pace."` — investment-schedule
- `"One last look."` — investmentconfirmation
- `"Invest on autopilot."` — linkplaid
- `"A few more details."` — kyc-verification

Hero subtitles are always 14px gray, centered, 1–2 lines. They explain the job of the screen, not the feature.

---

## Page Layout Structure

Every screen uses the same skeleton. Deviations are intentional and rare.

```
ion-header (borderless toolbar)
ion-content
  .content-inner (flex column, padding: 16px 18px)
    .hero-section (flex-shrink: 0, always at top)
    .center-zone OR form sections (flex: 1)
ion-footer
  .cta-footer (sticky, white, soft shadow)
.loading-veil (fixed overlay, fades out when ready)
```

### Content padding

```scss
.content-inner {
  padding: 16px 18px 24–32px;
}
```

`18px` horizontal is the standard. Never go tighter than `16px`. The hero section adds its own top space (`20px` padding or `12px` margin-bottom from parent).

### Hero positioning

The hero section is **always top-aligned** (`flex-shrink: 0`). The remaining content fills the space below it. On screens with a single centered widget (e.g. authfinalize, linkplaid), a `.center-zone` with `flex: 1; justify-content: center` vertically centers the interactive content without affecting the hero position.

---

## Header

All headers follow the same pattern — no exceptions.

```html
<ion-header class="ion-no-border">
  <ion-toolbar>
    <div class="header-inner">
      <button class="back-btn" (click)="goBack()">
        <span class="material-symbols-outlined">arrow_back_ios_new</span>
      </button>
      <h2 class="header-title">Screen Title</h2>
    </div>
  </ion-toolbar>
</ion-header>
```

```scss
ion-toolbar {
  --background: #f8fafc;
  --border-width: 0;
  --min-height: 52px;
}

.header-inner {
  display: flex;
  align-items: center;
  padding: 0 4px;
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text);
  flex-shrink: 0;
  &:active { background: rgba(0,0,0,0.05); }
  .material-symbols-outlined { font-size: 20px; }
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.015em;
  text-align: center;
  flex: 1;
  margin: 0;
  padding-right: 40px; // offsets the back button to visually center the title
}
```

`padding-right: 40px` on `.header-title` is critical — without it the title appears off-center because the back button pushes it right.

---

## Footer CTA

The sticky footer uses a soft elevation effect to lift off the content below it. It always contains one primary button and occasionally a small disclosure line below it.

```scss
.cta-footer {
  padding: 14px 18px calc(env(safe-area-inset-bottom, 0px) + 14px);
  background: white;
  border-top: 1px solid #f1f5f9;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.06);
}
```

**Always include `env(safe-area-inset-bottom)` in the bottom padding.** This handles iPhone home indicator notch.

### Button variants

There are two CTA colors. Choose based on context:

**Blue CTA** — standard onboarding, survey, planning steps:
```scss
background: #2563EB;
color: white;
box-shadow: 0 8px 20px -4px rgba(37, 99, 235, 0.4);
```

**Dark/black CTA** — trust-sensitive actions (linking bank, final confirmation, submitting KYC):
```scss
background: #111827;
color: white;
box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.35);
```

The dark CTA signals: "this is a real commitment." Use it on the last meaningful action in a flow.

### CTA button base styles

```scss
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

  &:disabled {
    background: #e5e7eb;
    color: #9ca3af;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:active {
    transform: scale(0.99);
  }

  .material-symbols-outlined { font-size: 20px; }
}
```

### Animated CTA (form validation)

On screens with gated actions (kyc-verification, investmentconfirmation), the button **animates in** when the form becomes valid rather than just toggling disabled/enabled:

```scss
.cta-btn {
  background: #e5e7eb;
  color: #9ca3af;
  opacity: 0.7;
  transform: translateY(4px);
  transition: all 0.2s ease;

  &.btn-visible {
    background: #111827;
    color: white;
    box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.35);
    opacity: 1;
    transform: translateY(0);
  }
}
```

Apply `.btn-visible` class when the form is valid. This is more effective than a plain disabled state because it feels intentional rather than locked.

### Loading state inside button

Always replace button content when loading — don't just add a spinner:

```html
<ng-container *ngIf="!isLoading">
  <span>Action Label</span>
  <span class="material-symbols-outlined">arrow_forward</span>
</ng-container>
<ng-container *ngIf="isLoading">
  <ion-spinner name="crescent"></ion-spinner>
  <span>Doing the thing...</span>
</ng-container>
```

Spinner size: `width: 18px; height: 18px; color: white`.

---

## Form Fields

All inputs use a **bottom-border-only** pattern. No box borders, no background fills.

```scss
.field-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--gray);
  margin: 0 0 4–10px 0;
}

.field-input {
  font-family: 'Manrope', sans-serif;
  font-size: 17px;
  font-weight: 500;
  color: var(--text);
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--primary);
  border-radius: 0;
  padding: 6px 0;
  outline: none;
  width: 100%;
  -webkit-appearance: none;

  &::placeholder {
    color: #cbd5e1;
    font-weight: 400;
  }
}
```

### Select dropdowns

Wrap in `.select-wrapper` with a custom arrow icon to hide the native chrome:

```html
<div class="select-wrapper">
  <select class="field-select">...</select>
  <span class="select-arrow material-symbols-outlined">expand_more</span>
</div>
```

```scss
.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border-bottom: 2px solid var(--primary);
  .select-arrow { position: absolute; right: 0; font-size: 18px; pointer-events: none; }
}

.field-select {
  font-family: 'Manrope', sans-serif;
  font-size: 17px;
  font-weight: 500;
  background: transparent;
  border: none;
  padding: 6px 24px 6px 0;
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
}
```

### Validation error states

Label turns red, border turns red, inline error message below:

```scss
.form-field.field-error {
  .field-label { color: #dc2626; }
  .field-input { border-bottom-color: #dc2626; }
}

.error-msg {
  font-size: 12px;
  color: #dc2626;
  margin-top: 2px;
}
```

Only show errors after the field has been `touched`. Never show errors on fresh form load.

---

## Cards & Containers

### Section card (confirmation screens)

White surface, subtle border, no heavy shadow:

```scss
.section-card {
  background: white;
  border-radius: 14px;
  border: 2px solid #e5e7eb;
  padding: 16px;
}
```

The card header row uses a filled Material Symbol icon + bold title + optional action link:

```html
<div class="card-header-row">
  <span class="material-symbols-outlined card-icon">calendar_month</span>
  <h3 class="card-title">Investment Schedule</h3>
  <button class="edit-link">Edit <span class="material-symbols-outlined">arrow_forward</span></button>
</div>
```

Icon size: `18px`, color: primary, `font-variation-settings: 'FILL' 1`.

### Display cards (get-started)

Informational only — warmer surface, slightly less radius:

```scss
background: #f5f3ef;
border-radius: 14px;
padding: 14–16px;
```

Use these for showing data (comparison tables, schedule previews, growth charts) without implying interactivity.

### Selection cards (fi-plan-results)

Tappable cards that show a selected state:

```scss
.strategy-card {
  background: white;
  border-radius: 14px;
  border: 2px solid #e5e7eb;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &.selected {
    border-color: #2563eb;
    box-shadow: 0 3px 14px rgba(37, 99, 235, 0.13);
  }
}
```

Position a selected-checkmark indicator in the top-right corner absolutely:

```scss
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
  .material-symbols-outlined { font-size: 13px; color: white; font-variation-settings: 'FILL' 1; }
}
```

### Trust section (investmentconfirmation)

Intentionally distinct from the section cards — off-white surface with a blue left-border accent instead of full card elevation:

```scss
.trust-section {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-left: 3px solid #2563EB;
  border-radius: 12px;
  padding: 16px;
}
```

This visual distinction signals: "this is informational / disclosure content, not an action item."

### Illustration card (linkplaid)

When you need a visual hero element instead of text:

```scss
.illustration-card {
  background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%);
  border-radius: 16px;
  border: 1px solid #bfdbfe;
  padding: 28px;
  position: relative;
  overflow: hidden;
}
```

Add blurred blob decorations in corners for depth:
```scss
.illus-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(16–20px);
  // top: rgba(37,99,235, 0.12) | bottom: rgba(139,92,246, 0.1)
}
```

Stagger the icons with `transform: rotate(-6deg)` / `rotate(12deg)` to feel less mechanical.

---

## Pills, Tags & Chips

### Category tag pills (get-started)

```scss
.slide-tag {
  display: inline-block;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 5px 12px;
  border-radius: 20px;
  margin-bottom: 20px;
}
```

Each slide gets one color (amber, teal, blue, purple, green). The tag appears above the headline and sets the thematic context for the slide.

### Frequency pills (investment-schedule)

Two-column grid of selectable options:

```scss
.freq-pill {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 10px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &.selected {
    border-color: #2563EB;
    background: #eff6ff;
    .freq-pill-title { color: #2563EB; }
    .freq-pill-desc { color: #2563EB; opacity: 0.8; }
  }
}
```

Title: 14px bold. Description: 11px gray. Keep descriptions to one short line.

### Info tip

Blue-tinted informational callout:

```scss
.info-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.07);
  border: 1px solid rgba(37, 99, 235, 0.18);
}
// Icon: filled "info", 18–20px, primary blue
// Text: 13px, font-weight 500, color primary (not gray)
```

### Toggle button (Yes/No)

```scss
.toggle-btn {
  min-width: 52px;
  height: 30px;
  border-radius: 15px;
  border: 1.5px solid #e5e7eb;
  background: #f1f5f9;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  transition: all 0.2s ease;

  &.toggle-on {
    background: #2563EB;
    border-color: #2563EB;
    color: white;
  }

  &:active { transform: scale(0.96); }
}
```

Use this for Yes/No disclosure toggles (KYC, ACATS transfer). Don't use a native checkbox for binary boolean questions.

### Custom checkbox

Replace native checkboxes with a styled overlay:

```scss
.custom-checkbox {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid #e5e7eb;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &.checked {
    background: #2563EB;
    border-color: #2563EB;
  }
  .material-symbols-outlined { font-size: 14px; color: white; font-variation-settings: 'wght' 700; }
}
```

Stack the native `<input type="checkbox">` on top with `opacity: 0` for accessibility. The `.custom-checkbox` is purely visual.

### Trust badges

Small pill-shaped credentialing elements (FINRA, SIPC, etc.):

```scss
.trust-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  .material-symbols-outlined { font-size: 13px; color: #2563EB; font-variation-settings: 'FILL' 1; }
}
```

---

## Iconography

**Icon library:** `material-symbols-outlined` only. No other icon fonts.

**Filled vs outlined:** Use `font-variation-settings: 'FILL' 1` for icons that represent objects or states (bank, lock, calendar, verified_user). Use outlined (default) for directional/UI icons (arrow_back_ios_new, arrow_forward, expand_more).

**Common icons used and their meaning in FRED:**

| Icon | Usage |
|---|---|
| `arrow_back_ios_new` | Back navigation (header only) |
| `arrow_forward` | Forward CTAs |
| `north_east` | Top-level "Get Started" CTA (get-started) |
| `check` | Selection indicator, custom checkbox |
| `info` | Info tip callout |
| `expand_more` | Select dropdown arrow |
| `calendar_month` | Investment schedule |
| `pie_chart` | Portfolio |
| `verified_user` | Security / FINRA |
| `account_balance` | Bank / brokerage |
| `lock` | Security |
| `tune` | Customization / control |
| `check_circle` | On-track goal state (green, filled) |
| `warning` | Short-of-goal state (amber, filled) |

**Sizes:**
- Navigation/UI icons: `20px`
- Card header icons: `18px`
- Trust badge icons: `13px`
- Inline body icons: `15–17px`

---

## Schedule / Data Rows

For key-value pairs (confirmation screens, get-started schedule preview):

```scss
.schedule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10–14px 0;
  border-bottom: 1px solid #f1f5f9;
  &:last-child { border-bottom: none; }
}

.row-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
}

.row-value {
  font-size: 14–16px;
  font-weight: 700;
  color: #0f172a;
}
```

The divider is `#f1f5f9` — lighter than the default border. This keeps row separators subtle within a card.

---

## Projection / Stat Cards

Two-column grid for displaying numerical projections:

```scss
.projection-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.projection-value {
  font-size: 20px;
  font-weight: 700;
  color: #2563EB;
  margin: 0 0 4px 0;
  letter-spacing: -0.01em;
}

.projection-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}
```

Use `color: #2563EB` for the value to give it emphasis. The label stays gray.

---

## Loading States

### Loading veil

Every screen uses a full-page veil that fades out after fonts and critical data are ready. This prevents a flash of unstyled or mis-sized content.

```scss
.loading-veil {
  position: fixed;
  inset: 0;
  background: #f8fafc; // match page bg
  z-index: 9999;
  opacity: 1;
  transition: opacity 0.25s ease;
  pointer-events: none;

  &.veil-hidden { opacity: 0; }
}
```

In the TS, set `isReady = true` after fonts are loaded and any critical async data resolves. Bind `[class.veil-hidden]="isReady"`.

### Inline loading

For content within a card (portfolio list loading):
```html
<div class="portfolio-loading">
  <ion-spinner name="crescent"></ion-spinner>
  <span>Loading portfolio...</span>
</div>
```
Spinner: `16px`, primary color. Text: 13px gray.

---

## Micro-interactions & Motion

Keep animations subtle and purposeful:

| Interaction | Effect |
|---|---|
| CTA button press | `transform: scale(0.99)` |
| Toggle button press | `transform: scale(0.96)` |
| Back button press | `background: rgba(0,0,0,0.05)` |
| Card selection | `border-color` + `box-shadow` transition `0.2s ease` |
| Page fade-out (get-started) | `opacity: 0` transition `0.4s ease-out` on `.page-wrapper` |
| Veil fade | `opacity: 0` transition `0.25s ease` |
| CTA animate-in (gated actions) | `opacity + translateY(4px → 0)` over `0.2s ease` |
| Step panel transition (KYC) | `opacity + translateY(8px → 0)` over `0.2s ease` |
| Allocation bar fill | `width` transition `0.4s ease` |

**Duration guide:** Page transitions: `0.3–0.4s`. Button/tap feedback: `0.15s`. State changes: `0.2s`. Everything faster than `0.15s` feels broken; everything slower than `0.4s` feels laggy.

---

## Progress Indicators

### Swiper pagination (get-started)

Inactive: small gray dots (`6×6px`). Active: blue elongated pill (`20×6px`, `border-radius: 6px`). This is a common mobile pattern — feels native, not web-app.

### Step dots (kyc-verification)

Linear step flow with two states:

```scss
.step-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #e5e7eb; transition: background 0.3s ease;

  &.active { background: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.2); }
  &.done { background: #10b981; }
}

.step-line {
  width: 32px; height: 2px;
  background: #e5e7eb; margin: 0 8px;
}
```

Done state uses `#10b981` (green), not blue. Signals completion, not just activity.

---

## Get-Started Specific Patterns

The get-started screen is the only full-screen swiper experience. A few patterns that are unique to it:

**Slide anatomy:** Tag pill → bold headline (2 lines, often italic second line) → body text → visual card → footer text.

**Headline italic:** The second line of a slide headline uses `font-style: italic` to add rhythm and personality.

**Comparison grid:** 2-column, `gap: 10px`. Cards use `#f5f3ef` (warm, not cool). Numbers are large (`32px`, `font-weight: 800`, `letter-spacing: -0.03em`). Green for positive (`#166534`), amber for cautionary (`#92400e`).

**Inline SVG charts:** Simple, elegant, no library. Green stroke (`#10b981`), gradient fill (low opacity), endpoint dot, small label. All within a `#f5f3ef` card.

**Strategy chips (3-col grid):** Each chip has a color (blue/teal/purple), title bold, sub text in gray. Used to visually enumerate a concept, not for interaction.

---

## Forcing Light Mode

Every component must include this in its `:host` block. Ionic's dark mode will bleed in via `dark.system.css` otherwise.

```scss
:host {
  --ion-background-color: #f8fafc;
  --ion-toolbar-background: #f8fafc;
  --ion-toolbar-color: #0f172a;
  --ion-text-color: #0f172a;
  --ion-color-primary: #2563EB;
  --ion-footer-background: #f8fafc;
}

ion-content { --background: #f8fafc; }
ion-toolbar { --background: #f8fafc; --border-width: 0; }
```

This is boilerplate. Copy it into every new component without thinking about it.

---

## Benefits List Pattern (linkplaid)

For explaining features or value props with an icon + text layout:

```scss
.benefit-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.benefit-icon-wrap {
  flex-shrink: 0;
  width: 40px; height: 40px;
  border-radius: 50%;
  background: #eff6ff;
  display: flex; align-items: center; justify-content: center;
  .material-symbols-outlined { font-size: 20px; color: #2563EB; font-variation-settings: 'FILL' 1; }
}

.benefit-text h3 { font-size: 15px; font-weight: 600; margin: 0 0 3px 0; }
.benefit-text p  { font-size: 13px; color: #6b7280; line-height: 1.45; margin: 0; }
```

The light blue circle icon container (`#eff6ff`) provides a soft but recognizable visual anchor. Keep to 3 items max.

---

## What Makes FRED Feel Premium

These are the details that elevate the UI from functional to polished:

1. **`letter-spacing: -0.025em` on large headings.** Tight tracking on 32px+ type feels designed. Loose tracking on large type feels like a template.

2. **`box-shadow: 0 8px 20px -4px rgba(37, 99, 235, 0.4)` on the blue CTA.** The colored shadow connects the shadow to the button's own color. It lifts the button without looking like a Bootstrap drop-shadow.

3. **The veil pattern.** Screens never flash in half-rendered. They appear composed.

4. **Bottom-only form borders.** No input boxes. The borderless underline field is a strong iOS-native signal.

5. **Short hero copy.** "Set your pace." does more than "Set Your Investment Schedule." One sentence. Full stop.

6. **The dark CTA at commitment moments.** Blue for exploring/continuing, dark/black for final commitment. The user feels the weight of the action change.

7. **`padding-right: 40px` on centered titles.** A small fix that shows attention to alignment. Without it, the back button makes titles visually off-center.

8. **`safe-area-inset-bottom` in footer padding.** The app respects the device. Nothing clips behind the home indicator.
