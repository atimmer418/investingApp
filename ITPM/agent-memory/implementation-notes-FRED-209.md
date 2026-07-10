# Implementation Notes — FRED-209

## Chart approach
- Replaced Chart.js internals with a hand-rolled SVG using `preserveAspectRatio="none"` in a fixed 1000×170 coordinate space. This eliminates Chart.js's interaction overhead and matches the prototype's pointer-event scrub model exactly.
- Paths use `L` commands with `stroke-linejoin="round"` / `stroke-linecap="round"`, which looks smooth for dense financial data (same as prototype).
- `setPointerCapture` is wrapped in try/catch as instructed.
- `touch-action: none` is scoped only to `.chart-box` (vertical page scroll unaffected outside the chart area).
- `PortfolioDataPoint` interface and `@Input() data` / `@Input() selectedPeriod` are preserved at the same export location — dashboard's import is unchanged.
- Added `@Output() scrubChange = new EventEmitter<{value: number; date: string} | null>()` to emit scrub state up to the dashboard's readout row.

## Daily source for analytics collapse
- The "Daily" row uses `performanceData.find(p => p.period === 'Today')`.
- This 'Today' entry is synthesized in `applyBundle` by summing `position.todayGainLoss` across all positions and deriving `startValue = endValue - totalReturn`. No API daily period is consumed — it is purely position-level day G/L. This matches the existing logic and requires no backend change.

## Analytics bar animation
- Outer bars (Daily + All Time) use `[style.width]="analyticsActive ? (getBarWidth(p) + '%') : '0%'"`. `analyticsActive` is set to `false` immediately on tab entry, then `true` after a 60 ms timeout, triggering the CSS `transition: width 0.8s` animation.
- Middle bars use `[style.width]="analyticsExpanded ? ... : '0%'"` so they animate only on expand.

## First-time tour
- `TOUR_STEPS` in `first-time-tour.component.ts`: step 1 has `targetSelector: null` — no DOM anchor for tab1. No tour config changes needed.

## Position detail sheet
- New component under `components/position-detail-sheet/`. Presented via `ModalController` with `cssClass: 'mc-bottom-sheet-modal'` (already defined in `global.scss`). No new global CSS required.
- `PositionDetailSheetComponent` is imported as a TypeScript module in dashboard TS but NOT listed in the Angular `imports` array — it is used only as `component:` prop in `ModalController.create()`, the same pattern as `MonthlyFreedomUpdateComponent`.
- Double-tap guard via `openingSheet: boolean` flag.

## Material symbols
- No new icon ligatures introduced. `verified_user`, `expand_more`, `pie_chart`, `insights` were all already in the subset font. No `npm run subset-icons` run required.

## Switcher icons
- Kept `ion-icon name="bar-chart-outline"` and `ion-icon name="analytics-outline"` (Ionic icons) matching the existing code and tab2's pattern, avoiding the need to add `bar_chart`/`monitoring` to the Material Symbols subset.

## onTabChange deviation
- Original `onTabChange` set `isFlipped = this.selectedTab === 'analytics'`. Added analytics bar animation trigger (`analyticsActive` flag) and `analyticsExpanded = false` reset on tab entry. The flip behavior is fully preserved.

## Scroll behavior
- Removed `[class.scroll-disabled]="selectedTab === 'overview'"` from `ion-content`. The overview tab now has scrollable content (hero + chart card), so disabling scroll is no longer correct. The chart's `touch-action: none` handles the chart box specifically.

## pre-existing uncommitted Phase 2 changes
- At story start, the on-disk `portfolio-dashboard.component.ts` already contained Phase 2 FRED-206 snapshot logic (`applySnapshot`, `persistSnapshot`, `dataIsFresh`, `snapshotAsOf`, `revalidateFailed`, `firstApply`). These were uncommitted. They were preserved byte-for-byte in the new file.
