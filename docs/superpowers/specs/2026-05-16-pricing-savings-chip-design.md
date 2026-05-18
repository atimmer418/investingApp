# Pricing Savings Chip — investmentconfirmation Step 2

## Context

On step 2 of the `investmentconfirmation` flow, each tier card shows a monthly/yearly billing toggle, a price, and a `lifetimeLine` describing the lifetime price unlocked via referrals. None of this surfaces the *savings* a user gets by choosing yearly, nor the larger savings unlocked when yearly is combined with the referral-driven lifetime price.

This spec adds a single compact "savings chip" to each tier card. The chip is toggle-aware: its copy updates depending on whether the user has the toggle on Monthly or Yearly. The card's total height must not grow — existing spacing is compensated so the chip slots into the current layout.

## Goal

Make the yearly + lifetime-via-referrals savings legible at a glance, without changing the visual rhythm of the tier card or the carousel's geometry.

## Decisions (already made during brainstorming)

- **One chip per tier card**, placed near the lifetime line (not two chips).
- **Always visible**, with **toggle-aware copy** (different text on Monthly vs Yearly).
- **Tier-accent color** for the chip — neutral green is a later iteration if accent reads poorly.
- **Keep both** the existing `lifetimeLine`/`yearlyLifetimeLine` strings AND add new numeric fields. No deletion of existing data.
- **Card height must not grow** — compensate via existing margins.

## Design

### Placement
New element inserted between `.tier-card__lifetime` and `.tier-card__pitch` in `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.html` (around current line 218–219):

```html
<p class="tier-card__lifetime" [@crossfade]="billingPeriod">…</p>

<div class="tier-card__savings-chip" [@crossfade]="billingPeriod">
  <span class="material-symbols-outlined">savings</span>
  <span>{{ savingsChipCopy(tier) }}</span>
</div>

<p class="tier-card__pitch" [innerHTML]="pitchHtml(tier.pitch)"></p>
```

### Visual style

Compact accent-tinted pill, center-aligned:

```scss
.tier-card__savings-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: center;          // assumes flex-column parent; tweak if needed
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--tier-accent) 12%, transparent);
  color: var(--tier-accent);
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

Total chip box ≈ 22–24px tall including padding.

### Height-neutrality

The chip adds ~28px including its top margin. Compensate by trimming the existing margin between `.tier-card__lifetime` and `.tier-card__pitch` (and/or `.tier-card__lifetime`'s margin-bottom and `.tier-card__pitch`'s margin-top) by the same total. Final values to be tuned during implementation against the 430×932 reference viewport; acceptance criterion is "card total height unchanged ±2px".

### Animation

Bind `[@crossfade]="billingPeriod"` on the chip element, matching the existing crossfade applied to `.tier-card__price-row` and `.tier-card__lifetime` (HTML lines 213, 218). The chip cross-fades in lockstep with the price/lifetime row when the user flips the toggle.

### Copy (toggle-aware)

| State | Template |
|---|---|
| Monthly | `Save $XX/yr yearly · up to $YY/yr with N referral(s)` |
| Yearly  | `Saving $XX/yr · up to $YY/yr with N referral(s)` |

Pluralization: "1 referral" (Pro), "N referrals" otherwise.

### Per-tier values

| Tier | XX (yearlySavings) | YY (maxYearlySavings) | N (referralsRequired) |
|---|---|---|---|
| Core | 21 | 46 | 3 |
| Plus | 30 | 80 | 2 |
| Pro  | 80 | 280 | 1 |

Derivations (for reference; values stored directly, not computed at runtime):
- `yearlySavings = price * 12 - yearlyPrice`
- `maxYearlySavings = price * 12 - yearlyLifetimePriceInDollars`

### Data model

Extend `PricingTier` in `investmentconfirmation.component.ts`:

```ts
interface PricingTier {
  // …existing fields…
  yearlySavings: number;
  maxYearlySavings: number;
  referralsRequired: number;
}
```

Set values directly on each of the three entries in `PRICING_TIERS` (do not parse the existing `lifetimeLine` strings). The existing `lifetimeLine`/`yearlyLifetimeLine` string fields stay untouched.

### Helper method

Add a single helper on the component class for chip copy:

```ts
savingsChipCopy(tier: PricingTier): string {
  const verb = this.billingPeriod === 'yearly' ? 'Saving' : 'Save';
  const yearlyPart = this.billingPeriod === 'yearly'
    ? `$${tier.yearlySavings}/yr`
    : `$${tier.yearlySavings}/yr yearly`;
  const refs = tier.referralsRequired === 1 ? '1 referral' : `${tier.referralsRequired} referrals`;
  return `${verb} ${yearlyPart} · up to $${tier.maxYearlySavings}/yr with ${refs}`;
}
```

## Files modified

| File | Change |
|---|---|
| `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.ts` | Extend `PricingTier` interface with 3 numeric fields; populate them on all 3 entries in `PRICING_TIERS`; add `savingsChipCopy(tier)` helper. |
| `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.html` | Insert `.tier-card__savings-chip` element between `.tier-card__lifetime` and `.tier-card__pitch`; wire `[@crossfade]="billingPeriod"`. |
| `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.scss` | Add `.tier-card__savings-chip` styles; trim existing `.tier-card__lifetime` / `.tier-card__pitch` margin to keep card height unchanged. |

## Out of scope

- Neutral-green color variant (deferred — try accent first).
- Animating the chip independently of the existing crossfade.
- Real-time computation of savings from price fields (values stored directly).
- Parsing or restructuring the existing `lifetimeLine` strings.
- Any other change to step 2's pricing carousel.

## Verification

1. `cd frontend && npm start`. Open `investmentconfirmation` at devtools 430×932.
2. Complete step 1 (toggle ToS → Confirm) to reach step 2.
3. Swipe through Core / Plus / Pro. Confirm chip appears on every tier between the lifetime line and pitch paragraph.
4. With the toggle on **Monthly**, verify chip reads `Save $XX/yr yearly · up to $YY/yr with N referral(s)` with the right numbers per tier.
5. Flip toggle to **Yearly** — chip should crossfade in sync with the price row and now read `Saving $XX/yr · up to $YY/yr with N referral(s)`.
6. Confirm Pro tier shows "1 referral" (singular), Core/Plus show "3 referrals" / "2 referrals".
7. Visually compare card height to a pre-change screenshot — total card height must be unchanged (±2px tolerance). Especially: the CTA button and trial copy at the card's bottom must sit at the same y-coordinate as before.
8. Reload mid-step-2 to exercise the state-restore path; chip should appear immediately.
9. iOS verification: `cd frontend && npx cap sync ios && npx cap open ios`, run on simulator. Same flow.
