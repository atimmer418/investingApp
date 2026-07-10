# Acceptance Check Manifest — FRED-209
Refactor tab1 into tab2's premium design language (presentation-only; data pipeline byte-identical).
Story: `FREDdocs/.stories/FRED-209.md` · Visual spec: `ITPM/agent-memory/FRED-209-prototype.html`.

> VERIFIER PASS (independent, adversarial) — verdict: **APPROVED**.
> Live render against facebook@gmail.com via `https://local.fredvested.com/?devPage=/tabs/tab1`
> (backend :8080 + tunnel both up). Screenshots: `ITPM/agent-memory/fred209-{1..7}-*.png`.
> Page errors: none. Console errors: none. `ng build --configuration dev`: AOT-clean. Lint: clean.
> Ruling A (Today synthesis) and Ruling B (Chart.js removal) resolved below (see AC-6 / AC-4).
> Value drift vs pre-story baseline is LIVE MARKET MOVEMENT only (Total Invested / Buying Power /
> Settled Cash byte-identical; all money invariants hold to the penny) — not a code regression.

## AC-1: Gradient hero flip card
- Type:     ui-acceptance
- Check:    Front = TOTAL EQUITY eyebrow + white whole/cents numerals + glass freedom badge + TAP FOR DETAILS hint; back = 2×2 glass tiles (existing bindings); 3D flip preserved; values identical to pre-refactor for same account.
- Evidence: portfolio-dashboard.component.html:57–99 front/back faces; getEquityParts()/toggleFlip()/freedomLabel bindings preserved verbatim.
- Verifier: PASS. fred209-1-overview.png (front: $621.98 equity, "3 days of financial freedom (est.)" badge, TAP FOR DETAILS). fred209-3-hero-back.png / fred209-4 (back tiles: Total Invested $499.88, Portfolio Value $551.88, Buying Power $70.10, Settled Cash $70.10; flipped=true). prefers-reduced-motion on .hero-flipper (scss:207).
- Status:   pass

## AC-2: Switcher matches tab2 compact pill
- Type:     ui-acceptance
- Check:    ios-tab-switcher restyled to tab2's compact dimensions/white active pill; both tabs behave as before; toolbar/title otherwise untouched (diff).
- Evidence: .html header-tab-container `.ios-tab-switcher`; SCSS `.ios-tab-button { width:64px; height:32px }` + `.active { background:#fff }`; onTabChange logic unchanged (git diff only adds analytics bar-anim trigger, flip preserved).
- Verifier: PASS. Live: compact white pill, both tabs switch (overview↔analytics observed). Toolbar/title untouched.
- Status:   pass

## AC-3: Zone labels + zone cards
- Type:     ui-acceptance
- Check:    "PERFORMANCE" / "PERFORMANCE ANALYTICS" / "HOLDINGS (+ TAP FOR DETAILS)" labels; white 18px-radius cards per prototype.
- Evidence: .html `.zone-label` + `.zone-card` on each section; SCSS `.zone-card { border-radius:18px; background:#fff }`.
- Verifier: PASS. Live labels render exactly ("PERFORMANCE", "PERFORMANCE ANALYTICS", "HOLDINGS" + "TAP FOR DETAILS"); white rounded zone cards.
- Status:   pass

## AC-4: Chart card — chips, scrub, gradient fill, no axes
- Type:     ui-acceptance
- Check:    EXISTING periodOptions rendered as tab2 chips (period keys/API calls unchanged); scrub readout idle vs scrubbing (hairline+dot, exact value+date); smoothed blue line + gradient fill, no plot border, no axis labels; touch-action scoped; edge clamping no NaN.
- Evidence: .html chips `*ngFor` over unmodified `periodOptions` (1M/3M/6M/1Y/All) → `onPeriodChange(p.value)` unchanged; chart now SVG-only, `.chart-box { touch-action:none }` (chart scss:6-10); `setPointerCapture` in try/catch; `Math.min(1,Math.max(0,frac))` clamps; `portfolioFillGrad` 0.22→0; no `<text>` in SVG.
- Verifier: PASS. **Ruling B resolved:** Chart.js removed from portfolio-chart; only other consumer is `pages/ai-chat/chat-chart.component.ts` (independent import) + main.ts global registration — nothing breaks. `[data]`/`[selectedPeriod]` @Inputs preserved; `@Output() scrubChange` added (single parent = dashboard). NULL SAFETY: backend `PortfolioDashboardService:693-724` skips null/empty/unparseable equity (`continue`) → `history.values` is clean `number[]`; SVG `Math.min(...values)`/scaleY never see null. Edge cases NaN-safe: empty→'', single-point→center X + pad `||1`. Live: fred209-1 idle readout `$617.22 / Nov 21, 2025 – Jul 2, 2026`, gradient fill, zero axis text (hasAxisText=0). fred209-2-scrub.png: hairline+dot, readout `$271.60 / Fri, Feb 20, 2026`, .scrubbing class set. Device touch-feel = needs-manual-QA (non-blocking).
- Status:   pass

## AC-5: Cumulative return row preserved
- Type:     ui-acceptance
- Check:    Per-period cumulative pre-tax return row beneath chart, existing values/logic, restyled.
- Evidence: .html `.return-row` with `getReturnForCurrentPeriod()` (method unchanged — byte-identical vs HEAD); `.pos`/`.neg` classes; SCSS restyle.
- Verifier: PASS. Live: "Your total cumulative pre-tax return  +10.40%" (green). getReturnForCurrentPeriod byte-unchanged.
- Status:   pass

## AC-6: Analytics collapse — Daily + All Time + show more
- Type:     ui-acceptance
- Check:    Collapsed = exactly Daily and All Time; "Tap to show more" expands remaining existing periods (animated bars scaled to max |return|), % bold, start→end + $ subline; flips to "Show less". Daily source documented.
- Evidence: .html `getDailyPerformance()` (period='Today'), `getAllTimePerformance()` (period='Total') always visible; `.perf-middle`{max-height:0}→`.open`{600px} for `getMiddlePerformancePeriods()`; `getBarWidth` scales to `getMaxAbsReturn`; toggle `*ngIf="getMiddlePerformancePeriods().length>0"`. DAILY SOURCE = `performanceData.find(p=>p.period==='Today')`.
- Verifier: PASS (collapsed) + graceful-degrade (expand). **Ruling A resolved:** the 'Today' synthesis (sum of position.todayGainLoss → startValue=end−return) PRE-EXISTS at HEAD (dashboard.ts:246-276, byte-identical — did NOT appear in `git diff HEAD`); builder did NOT add it; `getDailyPerformance()` merely reads it. Live: fred209-4 shows EXACTLY Daily (+0.87%, $547.12→$551.88 +$4.76) + All Time (+10.40%, $499.88→$551.88 +$52.00); .perf-middle height=0; toggle absent. **KEY FINDING (out-of-scope, non-blocking):** backend `/performance` (PortfolioDashboardController:175-217) emits ONLY "Today" + "Total" for ALL accounts — so getMiddlePerformancePeriods() is always [] and the "Tap to show more" expander NEVER renders in production. Builder implemented AC-6 correctly given the "NO backend change" constraint; the expandable-middle-periods vision is inert until a backend story adds 1M/3M/6M/1Y performance rows. Expanded-with-bars animation = needs-manual-QA (no live middle data to exercise).
- Status:   pass

## AC-7: Holdings rows replace table
- Type:     ui-acceptance
- Check:    Rows (tile, symbol, name, value, total-return pill) + totals footer; zero horizontal scroll (no overflow-x); same positions data.
- Evidence: .html `.hold-row` (.hold-tile/.hold-sym/.hold-val/.hold-pill) + `.hold-total`; grep confirms `positions-table`/`overflow-x`/`ion-segment` removed from .html and .scss.
- Verifier: PASS. Live fred209-4/6: 4 rows (BND $19.62 −1.72%, VBR $16.55 +10.30%, VTI $407.37 +11.62%, VXUS $108.35 +8.39% — long VXUS name ellipsized), footer "TOTAL · 4 POSITIONS $551.88 / +$52.00 all time". Runtime overflow-x scan = false (zero horizontal scroll).
- Status:   pass

## AC-8: Position detail sheet
- Type:     ui-acceptance
- Check:    Row tap → root-level ModalController auto-height bottom sheet with 6 fields + Done; backdrop dismiss; double-tap guarded; fields from existing position object.
- Evidence: `openPositionSheet()` uses ModalController `{ cssClass:'mc-bottom-sheet-modal', backdropDismiss:true }`; `openingSheet` guards double-tap; `PositionDetailSheetComponent` TS-only import (not in @Component imports array), presented via `component:` prop.
- Verifier: PASS. Live fred209-7: root-level sheet dims full page (header+tabs), 6 fields (Market Value $19.62, % of Account 3.5%, Shares 0.268, Avg Cost→Current $74.35→$73.07, Today −$0.01/−0.06%, Total Return −$0.34/−1.72%) + Done. modalClass=mc-bottom-sheet-modal. Double-tap guard verified static.
- Status:   pass

## AC-9: Empty states restyled; loading/error preserved
- Type:     ui-acceptance
- Check:    Dashed-box empty states for no-positions/no-performance; loading retains `.loading-container`; error state structurally intact.
- Evidence: .html `.empty-dashed` (icon+p) for `#noPositions` and `#noPerfData`; `.loading-container` line 27; error state `mobile-card`+`warning-outline`+retry preserved.
- Verifier: PASS (static). Both empty templates + styled `.empty-dashed` present; loading-container + error card intact. Account has data → empty/loading/error not forced live (static branch check per protocol); non-blocking.
- Status:   pass

## AC-10: DATA-INTEGRITY / COVER-GATE REGRESSION GUARD (hard gate)
- Type:     static + ui-acceptance
- Check:    git diff proves loadPortfolioData/applyBundle/perf-sync math byte-unchanged; `data-fresh`, `.loading-container`, snapshot marker, refresher present; chart `[data]`/`[selectedPeriod]` unchanged; live render identical dollar/percent pre/post.
- Evidence: perf-math identifiers present + byte-unchanged (grep on `git diff HEAD` for gainPeriod/uniqueInvestedCapital/plPeriod/investedStart/netNewCash returns EMPTY = unchanged). HTML markers: ionRefresh:22, loading-container:27, [attr.data-fresh]:47, snapshot-updating-marker:50. Chart inputs `[data]="chartData" [selectedPeriod]="selectedPeriod"`.
- Verifier: PASS with CORRECTION. Money math (Total sync 234-244, Today sync 246-276, processChartData 349-367, Modified Dietz 413-488) is byte-identical to HEAD — FRED-209 did NOT touch it. **Builder's claim "applyBundle body byte-copied... no modifications to applyBundle lines" is INACCURATE:** applyBundle DOES carry uncommitted FRED-206 snapshot hunks (firstApply gate :296-299, dataIsFresh/snapshotAsOf/persistSnapshot :303-314) — those belong to a concurrent story, NOT FRED-209, and do not alter money math. Render parity: all invariants hold to the penny (equity $621.98 = PV $551.88 + cash $70.10; G/L $52.00 = PV − invested $499.88; % = 52.00/499.88 = 10.40%). Baseline→now drift ($0.50 on PV) is live ETF price movement; invested/buying-power/settled-cash identical.
- Status:   pass

## AC-11: First-time tour anchors resolve
- Type:     static
- Check:    Locate FRED-197 tour selector config; every tab1 anchor still matches post-refactor.
- Evidence: `first-time-tour.component.ts` TOUR_STEPS — steps 1/2/4 `targetSelector:null`; only step 3 uses `[data-tour="tab3"]` (in tab3). HEAD tab1 html had ZERO `data-tour` anchors → nothing to break.
- Verifier: PASS. Confirmed no tab1 tour anchors exist at HEAD or post-refactor. Tour dismissed cleanly in live run.
- Status:   pass

## AC-12: Scope guards
- Type:     static
- Check:    No backend diffs from this story; no auth/tier logic touched; tab2 files untouched.
- Evidence: FRED-209 scope = portfolio-chart(3) + portfolio-dashboard(3) + new position-detail-sheet(3). Working tree ALSO holds concurrent-session changes (FRED-206 snapshot in dashboard.ts; unrelated backend LLM/ai-chat/monte-carlo/retirement-planning) — NOT attributable to FRED-209.
- Verifier: PASS. No backend/auth/tab2 changes belong to FRED-209's 9 files. JWT handled via existing patterns (no localStorage key touches in story files).
- Status:   pass

## AC-13: Quality gates
- Type:     frontend-unit + build
- Check:    `ng build --configuration dev` AOT-clean; lint clean; pre-existing green targeted specs still pass; style-guide conformance; prefers-reduced-motion on flip/bars/expand; old table/segment/hero SCSS pruned; no TODOs.
- Evidence: Build "Output location: .../www", zero errors, only PRE-EXISTING unrelated IonToolbar warnings (LumpSum/ChangeEmail/MyProfile/SecuritySettings/RecurringInvestments/SellWithdraw — none are story files). Lint clean on all 3 TS + 3 templates (legacy .eslintrc). No pre-existing specs for touched components. prefers-reduced-motion on .hero-flipper / .perf-bar i / .perf-middle / .perf-toggle. No overflow-x/positions-table/ion-segment/scroll-disabled remnants. No TODOs.
- Verifier: PASS.
- Status:   pass
