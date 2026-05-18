# Pricing Savings Chip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact, toggle-aware savings chip to each tier card in `investmentconfirmation` step 2, surfacing yearly-vs-monthly savings and the larger savings unlocked with the referral-driven lifetime price — without growing the card's height.

**Architecture:** Three coordinated edits in a single Angular component: (1) extend `PricingTier` with three numeric fields and populate them; (2) add a `savingsChipCopy()` helper on the component class; (3) insert a styled chip between the lifetime line and the pitch paragraph, bound to the existing `@crossfade` animation. SCSS compensates for the chip's added height by trimming existing margins so the card's total height is unchanged.

**Tech Stack:** Angular 19 standalone component (`CUSTOM_ELEMENTS_SCHEMA`), Swiper Element v11, Material Symbols Outlined, native SCSS. No tests — this is a frontend visual change verified manually at the 430×932 reference viewport.

**Spec:** `docs/superpowers/specs/2026-05-16-pricing-savings-chip-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.ts` | Extend `PricingTier` interface (3 numeric fields); populate fields on all 3 entries in `PRICING_TIERS`; add `savingsChipCopy(tier)` helper. |
| `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.html` | Insert `.tier-card__savings-chip` element between `.tier-card__lifetime` (line ~218) and `.tier-card__pitch` (line ~219); bind `[@crossfade]="billingPeriod"`. |
| `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.scss` | Add `.tier-card__savings-chip` rule; trim `.tier-card__lifetime` margin-bottom and `.tier-card__pitch` margin-bottom (and divider margin-bottom if needed) to keep card height unchanged. |

All edits live in one component. No cross-cutting changes.

---

## Task 1: Extend `PricingTier` interface and populate fields

**Files:**
- Modify: `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.ts:47-61` (interface), `:63-71` (Core entry), `:103-111` (Plus entry), `:154-162` (Pro entry)

- [ ] **Step 1.1: Extend the `PricingTier` interface**

Current shape (lines 47–61):

```ts
interface PricingTier {
  id: 'core' | 'plus' | 'pro';
  name: string;
  accent: string;
  price: number;
  lifetimeLine: string;
  yearlyPrice: number;
  yearlyLifetimeLine: string;
  pitch: string;
  ctaLabel: string;
  badgeLabel: string;
  badgeTextColor: string;
  features: PricingFeature[];
}
```

Add three numeric fields immediately after `yearlyLifetimeLine`:

```ts
interface PricingTier {
  id: 'core' | 'plus' | 'pro';
  name: string;
  accent: string;
  price: number;
  lifetimeLine: string;
  yearlyPrice: number;
  yearlyLifetimeLine: string;
  yearlySavings: number;
  maxYearlySavings: number;
  referralsRequired: number;
  pitch: string;
  ctaLabel: string;
  badgeLabel: string;
  badgeTextColor: string;
  features: PricingFeature[];
}
```

- [ ] **Step 1.2: Populate fields on the Core tier**

In the Core entry (around line 64–71), add the three fields after `yearlyLifetimeLine`:

```ts
{
  id: 'core',
  name: 'Piggy Plan',
  accent: '#FFA1B5',
  price: 8,
  lifetimeLine: '$5/mo lifetime with 3 referrals',
  yearlyPrice: 75,
  yearlyLifetimeLine: '$50/yr lifetime with 3 referrals',
  yearlySavings: 21,
  maxYearlySavings: 46,
  referralsRequired: 3,
  pitch: 'Automated investing. Works while you work.',
  // ...rest unchanged
}
```

Math check: `8 * 12 = 96`, `96 - 75 = 21` ✓, `96 - 50 = 46` ✓.

- [ ] **Step 1.3: Populate fields on the Plus tier**

In the Plus entry (around line 103–111), add the three fields after `yearlyLifetimeLine`:

```ts
{
  id: 'plus',
  name: 'Piggy Plus Plan',
  // ...
  price: 15,
  lifetimeLine: '$10/mo lifetime with 2 referrals',
  yearlyPrice: 150,
  yearlyLifetimeLine: '$100/yr lifetime with 2 referrals',
  yearlySavings: 30,
  maxYearlySavings: 80,
  referralsRequired: 2,
  // ...rest unchanged
}
```

Math check: `15 * 12 = 180`, `180 - 150 = 30` ✓, `180 - 100 = 80` ✓.

- [ ] **Step 1.4: Populate fields on the Pro tier**

In the Pro entry (around line 154–162), add the three fields after `yearlyLifetimeLine`:

```ts
{
  id: 'pro',
  name: 'Piggy Pro Plan',
  // ...
  price: 40,
  lifetimeLine: '$20/mo lifetime with 1 referral',
  yearlyPrice: 400,
  yearlyLifetimeLine: '$200/yr lifetime with 1 referral',
  yearlySavings: 80,
  maxYearlySavings: 280,
  referralsRequired: 1,
  // ...rest unchanged
}
```

Math check: `40 * 12 = 480`, `480 - 400 = 80` ✓, `480 - 200 = 280` ✓.

- [ ] **Step 1.5: Verify TypeScript compiles**

Run: `cd /Users/andrewtimmer/PersonalTypeshit/FRED/frontend && npx tsc --noEmit -p tsconfig.app.json`

Expected: no errors. If errors mention missing fields on `PRICING_TIERS` entries, the interface and tier objects are out of sync — re-check Steps 1.2–1.4.

---

## Task 2: Add `savingsChipCopy()` helper method

**Files:**
- Modify: `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.ts` near `pitchHtml()` at line 677

- [ ] **Step 2.1: Add the helper method**

Locate `pitchHtml(pitch: string)` at line 677:

```ts
pitchHtml(pitch: string): string {
  return pitch.replace(/\. /g, '.<br>');
}
```

Add the new helper immediately after it (before `onSlideChange` at line 681):

```ts
pitchHtml(pitch: string): string {
  return pitch.replace(/\. /g, '.<br>');
}

savingsChipCopy(tier: PricingTier): string {
  const verb = this.billingPeriod === 'yearly' ? 'Saving' : 'Save';
  const yearlyPart = this.billingPeriod === 'yearly'
    ? `$${tier.yearlySavings}/yr`
    : `$${tier.yearlySavings}/yr yearly`;
  const refs = tier.referralsRequired === 1
    ? '1 referral'
    : `${tier.referralsRequired} referrals`;
  return `${verb} ${yearlyPart} · up to $${tier.maxYearlySavings}/yr with ${refs}`;
}
```

- [ ] **Step 2.2: Verify TypeScript compiles**

Run: `cd /Users/andrewtimmer/PersonalTypeshit/FRED/frontend && npx tsc --noEmit -p tsconfig.app.json`

Expected: no errors. If `Property 'yearlySavings' does not exist on type 'PricingTier'` appears, Task 1 wasn't completed correctly.

---

## Task 3: Insert chip element into the tier card

**Files:**
- Modify: `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.html:218-219`

- [ ] **Step 3.1: Insert the chip between lifetime line and pitch**

Locate lines 218–219:

```html
<p class="tier-card__lifetime" [@crossfade]="billingPeriod">{{ billingPeriod === 'yearly' ? tier.yearlyLifetimeLine : tier.lifetimeLine }}</p>
<p class="tier-card__pitch" [innerHTML]="pitchHtml(tier.pitch)"></p>
```

Insert the chip element between them:

```html
<p class="tier-card__lifetime" [@crossfade]="billingPeriod">{{ billingPeriod === 'yearly' ? tier.yearlyLifetimeLine : tier.lifetimeLine }}</p>

<div class="tier-card__savings-chip-wrap" [@crossfade]="billingPeriod">
  <span class="tier-card__savings-chip">
    <span class="material-symbols-outlined">savings</span>
    <span>{{ savingsChipCopy(tier) }}</span>
  </span>
</div>

<p class="tier-card__pitch" [innerHTML]="pitchHtml(tier.pitch)"></p>
```

The wrapper `.tier-card__savings-chip-wrap` exists to (a) carry the `@crossfade` animation on a block-level element and (b) center the inline-flex chip independent of whether `.tier-card` is a flex column or block flow — fixing the `align-self: center` ambiguity flagged in the spec.

- [ ] **Step 3.2: Save and confirm Angular template compiles**

Run dev server in the background:

```bash
cd /Users/andrewtimmer/PersonalTypeshit/FRED/frontend && npm start
```

Watch terminal output for template errors. Expected: no template compilation errors. Visually the chip will be unstyled (raw inline-flex with default colors) — this is fine; Task 4 styles it.

---

## Task 4: Add chip styles and compensate spacing to preserve card height

**Files:**
- Modify: `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.scss:882-897` (existing rules), then add new rule

- [ ] **Step 4.1: Trim existing spacing**

Locate the current rules at lines 882–897:

```scss
.tier-card__lifetime {
  font-size: 12px;
  font-weight: 500;
  font-style: italic;
  color: var(--tier-accent, #2563EB);
  margin: 0 0 14px;
  line-height: 1.4;
}

.tier-card__pitch {
  font-size: 13px;
  font-style: italic;
  line-height: 1.5;
  color: var(--confirm-gray);
  margin: 0 0 12px;
}
```

Reduce `.tier-card__lifetime` margin-bottom from `14px` → `4px` and `.tier-card__pitch` margin-bottom from `12px` → `4px`:

```scss
.tier-card__lifetime {
  font-size: 12px;
  font-weight: 500;
  font-style: italic;
  color: var(--tier-accent, #2563EB);
  margin: 0 0 4px;
  line-height: 1.4;
}

.tier-card__pitch {
  font-size: 13px;
  font-style: italic;
  line-height: 1.5;
  color: var(--confirm-gray);
  margin: 0 0 4px;
}
```

Total margin reduction: 10px + 8px = **18px reclaimed**.

- [ ] **Step 4.2: Add chip styles**

Immediately after the `.tier-card__pitch` rule (around line 898, before `.tier-card__divider`), add:

```scss
.tier-card__savings-chip-wrap {
  display: flex;
  justify-content: center;
  margin: 0 0 6px;
}

.tier-card__savings-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--tier-accent, #2563EB) 12%, transparent);
  color: var(--tier-accent, #2563EB);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
  white-space: nowrap;

  .material-symbols-outlined {
    font-size: 14px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
  }
}
```

Chip dimensions: text line-height `11 × 1.3 = ~14.3px` + padding `4px × 2 = 8px` ≈ **22.3px chip height**. Plus wrap margin-bottom `6px`. Net added: **~28.3px**.

Net card height delta: `+28.3px (chip+gap) - 18px (margin trim) = +10.3px`.

- [ ] **Step 4.3: If card grew by >2px, trim further**

Hot-reload and visually compare card height. If the card is noticeably taller than before:

Option A — trim `.tier-card__lifetime` margin-bottom to `0` (saves another 4px).
Option B — reduce `.tier-card__divider` margin-bottom from `10px` to `4px` (saves 6px). Located at SCSS line ~899:

```scss
.tier-card__divider {
  border: none;
  border-top: 1px solid var(--confirm-border);
  margin: 0 0 4px;   // was 10px
}
```

Apply A and/or B until the card matches the pre-change height within ±2px. Acceptance: CTA button + trial copy sit at the same y-coordinate as before.

- [ ] **Step 4.4: Verify dev server still hot-reloads cleanly**

Watch the terminal running `npm start`. Expected: no SCSS errors. Open the app in Chrome devtools at 430×932 and visually confirm:
- Chip is visible on every tier (Core, Plus, Pro)
- Chip uses the tier's accent color as text + tinted background
- Chip text is on a single line, no wrapping

---

## Task 5: End-to-end manual verification

**Files:** None (runtime verification only)

- [ ] **Step 5.1: Browser verification at 430×932**

With `npm start` running:

1. Open the app, navigate through onboarding to `investmentconfirmation` step 2 (toggle ToS → Confirm on step 1).
2. Devtools at 430×932 (iPhone 14 Pro Max preset).
3. For each tier (swipe left/right or use pagination dots):

   | Tier | Monthly toggle copy | Yearly toggle copy |
   |---|---|---|
   | Core | `Save $21/yr yearly · up to $46/yr with 3 referrals` | `Saving $21/yr · up to $46/yr with 3 referrals` |
   | Plus | `Save $30/yr yearly · up to $80/yr with 2 referrals` | `Saving $30/yr · up to $80/yr with 2 referrals` |
   | Pro  | `Save $80/yr yearly · up to $280/yr with 1 referral` | `Saving $80/yr · up to $280/yr with 1 referral` |

4. Confirm Pro tier shows **singular** "1 referral", Core/Plus show plural.
5. Toggle Monthly ↔ Yearly several times — chip should crossfade in sync with price row and lifetime line (no flicker, no out-of-sync transition).

- [ ] **Step 5.2: Card height regression check**

If a screenshot of the pre-change card is available, overlay or visually compare. Otherwise compare:
- The y-coordinate of the CTA button before/after.
- The y-coordinate of the "Try FRED free for 14 days" trial copy before/after.

Tolerance: ±2px. If the card grew by more, return to Task 4 Step 4.3 and trim further.

- [ ] **Step 5.3: State-restore check**

Reload the page mid-step-2 (state restore via `ionViewWillEnter` path). The chip should appear immediately, no tap required.

- [ ] **Step 5.4: iOS verification**

```bash
cd /Users/andrewtimmer/PersonalTypeshit/FRED/frontend && npx cap sync ios && npx cap open ios
```

Run on the iPhone 14 Pro Max simulator. Repeat Steps 5.1–5.3. Confirm:
- Chip renders identically on the device
- The Material `savings` icon appears (no missing-glyph box)
- Tapping the toggle still crossfades cleanly

---

## Self-Review Notes

**Spec coverage:**
- ✅ Placement (between lifetime and pitch) — Task 3 Step 3.1
- ✅ Visual style (accent-tinted, 11px, savings icon) — Task 4 Step 4.2
- ✅ Toggle-aware copy (Save vs Saving, singular/plural) — Task 2 Step 2.1
- ✅ Animation crossfade — Task 3 Step 3.1 (`[@crossfade]="billingPeriod"` on wrap)
- ✅ Data model (3 new fields, keep existing strings) — Task 1
- ✅ Height neutrality (margin trim + tunable fallback) — Task 4 Steps 4.1, 4.3
- ✅ Verification (browser + iOS, height tolerance, state restore) — Task 5

**Placeholder scan:** None. All values, code, and commands are concrete.

**Type consistency:** `PricingTier` shape defined in Task 1 matches usage in `savingsChipCopy(tier)` in Task 2 and template binding in Task 3. Field names (`yearlySavings`, `maxYearlySavings`, `referralsRequired`) consistent throughout.

**Notes on user workflow:**
- This user does not write tests. The "verify" steps are manual browser/iOS checks rather than automated test runs.
- This user prefers to commit changes themselves. No `git commit` steps in the plan — user commits when satisfied.
