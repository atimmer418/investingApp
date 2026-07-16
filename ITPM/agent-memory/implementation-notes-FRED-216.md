# Implementation Notes — FRED-216

## Design Decisions

- **mc-info-sheet extension strategy**: Added four optional `@Input()` fields (`nudgeTitle`, `nudgeBody`, `nudgeCtaLabel`, `targetTier`) with defaults that exactly reproduce the existing tab2 nudge copy. Existing callers (retirement-planning) required zero changes. The template now interpolates the inputs instead of hardcoding copy.

- **Goal edit affordance**: Chose row tap → opens add-goal sheet in edit mode (with pre-populated fields). A long-press / right-click (contextmenu) also presents an alert with Edit / Delete options. Rationale: tap-to-edit is the lightest interaction; the contextmenu handler is the closest web/Android equivalent of long-press on iOS and still works on actual iOS via 3D Touch context menus. Swipe-to-delete was avoided because the goal rows live in a zone-card (not a native IonList), making swipe affordance invisible.

- **Freedom year in the fp-line sentence**: Uses `freedomStats.stats().freedomAge` (already computed by FreedomStatsService from KYC DOB) rather than re-computing age inline. This keeps math in one place and avoids drift.

- **Goal projection math**: Simplified to `monthsNeeded = ceil(targetAmount / monthlyOutsideFRED)`. No compound interest assumed — users are contributing from external savings, not investing; a linear accumulation model is honest and avoids implying FRED manages these funds. Labeled as projection only. Progress bar shows how far through the time horizon we are, not savings accumulated.

- **TLH heuristic formula**:
  `estimate = round(portfolioValue × 0.003 / 10) × 10`
  — approximately 0.30 %/year of invested value, rounded to the nearest $10.
  Rationale: typical TLH alpha is 0.2–0.5 %/year; 0.30 % is conservative and within that range. Rounded to $10 avoids false precision. Label is always "~$X/yr" to signal estimate. Documented in `tlhEstimate()` function comment in my-profile.page.ts.

- **V1 persistence scope**: `GoalsService` stores goals array and rebalance schedule in per-user localStorage keyed as `fred.goals.v1.<userId>` and `fred.profilePrefs.v1.<userId>`. These are UI/projection features only. FRED's investment engine never reads this data. Backend wiring comes with the real engine stories. Schema version is `SCHEMA_VERSION = 1`; bumping it silently discards old entries.

- **Nudge wiring**:
  - Goals veil tap → `openGoalsVeilNudge()` → `openPlusNudge()` → mc-info-sheet (targetTier='plus') → on 'upgrade' role → `upgradeToPlusClicked()` (same stub as tab2)
  - TLH "Want to save this money?" → `openTlhProNudge()` → mc-info-sheet (targetTier='pro') → on 'upgrade' role → `upgradeToProClicked()` (sibling stub)
  - Both use root-level ModalController with `cssClass: 'mc-bottom-sheet-modal'`

- **Rebalancing chip gating**: On Piggy, chips still render (dimmed via `.locked` class) so the affordance is visible. Tap calls `selectSchedule()` which detects `!isPlusOrPro` and opens the Plus nudge sheet before returning. This matches the prototype behavior.

- **isPiggy definition**: `selectedTier === 'piggy' || selectedTier === 'core' || selectedTier === ''`. The `core` tier appears in the referral offer logic in the original code, suggesting it may be an alias; empty string covers new users with no tier yet.

- **Freedom Date row cursor**: The Freedom Date goal-row has no click handler (it's not editable) — `cursor: pointer` not applied to it. Only user-added goals are tappable/editable.

## Tradeoffs

- **No goal icon selector on add-goal sheet in initial scope**: Actually implemented the icon picker as a row of 8 tile buttons — it's a one-liner in the spec and the UX is materially better without it being a dropdown.

- **`ngOnInit` + `implements OnInit` pattern**: goal-add-sheet uses `ngOnInit` to pre-populate edit fields. The `@Input()` values from ModalController `componentProps` are available by the time `ngOnInit` runs (Angular resolves them before lifecycle hooks). This is the standard pattern for modals.

## Subset-Icons Output (FRED-216 run)

```
Found 93 Material Symbols icons
Subset: 66.3 KB
Written: src/assets/fonts/material-symbols-outlined.woff2
```

New icons added to DYNAMIC_ICONS:
`home`, `health_and_safety`, `flag`, `energy_savings_leaf`, `savings`, `school`, `directions_car`, `photo_camera`, `add_circle`

## Open Questions

- `upgradeToPlusClicked()` and `upgradeToProClicked()` are stubs (console.log). The actual IAP trigger is pending the subscription engine story — same as the tab2 pattern.
- The Pro TLH "Saved this year: $0.00" value is a hardcoded placeholder. A real `savedThisYear` field from a future TLH engine would replace it.
- Goal long-press on native iOS: `contextmenu` event fires on iOS via 3D Touch / haptic long-press in WKWebView (Capacitor). Tested path is tap-to-edit (opens sheet directly). If the contextmenu approach proves unreliable on device, replace with a swipe-delete on an ion-item-sliding wrapper.
