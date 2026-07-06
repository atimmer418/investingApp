# FRED-208 — Refactor education tab into premium strategy decks

## Before (backlog entry, verbatim)

> ## FRED-208 — Refactor education tab into premium strategy decks
> Replicate the FRED-207 Monte Carlo styling in tab2's Education tab. Landing: hero (eyebrow WITHDRAWAL STRATEGIES, h2 "Make your money last.", sub "Four proven ways to turn a portfolio into a paycheck.") + a 2×2 card grid that stretches to fill the remaining screen height (no whitespace gap). Four strategies: Yield-Based Income, Dynamic Guardrails, Annuity, SBLOC — each card has a gradient icon tile, name, tagline, "5 slides · 3 min" hint, arrow chip. Tapping a card opens a fullscreen blue-gradient deck (same sub-theme as the simulator) of 5 swipeable slides: What it is → How it works → Why it works → Do it safely (with disclaimer) → The playbook (recap + "Stress-test this strategy" CTA that closes the deck and switches to the simulator section). Swipe + dots navigation, X always available. Education stays ungated (all tiers).
> Also: Yield-Based Income REPLACES Traditional 4% in the Monte Carlo simulator — same survival math (spend funded through ~4% yield first, principal gap-fills), renamed display + taglines + assumptions copy, so every strategy you can learn is one you can stress-test.
> Approved interactive prototype: ITPM/agent-memory/FRED-208-prototype.html (copy verbatim).

## After (structured ticket)

**One-line summary:** Rebuild tab2's education section as a premium landing (hero + height-filling 2×2 strategy cards) whose cards open fullscreen blue-gradient decks of 5 swipeable slides per strategy (approved copy, safety disclaimer, cross-link CTA into the simulator), and rename the simulator's Traditional 4% strategy to Yield-Based Income across service, showdown, solver context, and assumptions copy.

**Label:** `[code]` · **Time estimate:** `3hr+`

### Files / systems involved

- `frontend/src/app/components/retirement-planning/retirement-planning.component.{html,ts,scss}` — education section content replaced by the new landing; old edu-card-grid + edu-sheet + `strategyData`/`openStrategy` pruned; deck launch + stress-test section switch. ion-header/toolbar/tab-switcher and the simulator section untouched except the strategy rename items below.
- **New** `frontend/src/app/components/strategy-deck/strategy-deck.component.{ts,html,scss}` — standalone fullscreen modal (ModalController, reusing the FRED-207 fade pattern: wrapper opacity+transform keyframes — the WKWebView lesson); horizontal scroll-snap slide deck; strategy content data.
- `frontend/src/app/services/monte-carlo.service.ts` (+ `monte-carlo.service.spec.ts`) — Traditional 4% → Yield-Based Income rename (display + type/key handling); math unchanged.
- `frontend/src/app/components/monte-carlo-flow/monte-carlo-flow.component.{ts,html}` — showdown row name/tagline, assumptions-sheet copy.
- `frontend/src/app/components/mc-info-sheet/mc-info-sheet.component.html` — landing assumptions copy ("Traditional strategy" reference).
- `frontend/src/app/services/simulation-history.service.ts` — schema tolerance for entries carrying the old strategy key.
- **Visual spec:** `ITPM/agent-memory/FRED-208-prototype.html` (approved — port layout, styling, copy, and behavior verbatim).

### Acceptance Criteria

1. **Education landing.** The education section's content is replaced by: the hero (eyebrow "Withdrawal Strategies", h2 "Make your money last.", sub "Four proven ways to turn a portfolio into a paycheck.") and a 2×2 card grid. The ion-header/toolbar/tab-switcher markup and the simulator section are untouched by this item (simulator changes only per A/C 8–10). Education remains ungated for ALL tiers including core (no blur/lock on this section).
2. **Height-filling grid.** The grid stretches to fill the remaining content height (flex column + `grid-template-rows: 1fr 1fr`) with no dead whitespace below on 390×844 and 402×874; on shorter viewports cards shrink gracefully (content never overflows a card).
3. **Cards.** Four cards — Yield-Based Income (`payments`), Dynamic Guardrails (`tune`), Annuity (`security`), SBLOC (`account_balance`) — each with the gradient mini-orb icon tile, name, tagline, "5 slides · 3 min" uppercase hint, and arrow chip, styled per the prototype. Tap opens that strategy's deck (double-present guarded).
4. **Deck modal.** Presented via ModalController as a true fullscreen takeover (tab bar + header + safe areas covered) on the blue-gradient sub-theme, using the proven FRED-207 fade animation (wrapper keyframes driving opacity AND transform — never opacity alone).
5. **Slide navigation.** 5 slides per strategy in a horizontal scroll-snap container: swipe works; progress dots sync to scroll position; tapping the right half advances, left edge goes back (button taps excluded); X on every slide dismisses to the landing; a "Swipe to explore" hint fades permanently after the first swipe. Slides with tall content scroll vertically without breaking horizontal snapping.
6. **Content.** Slide structure per strategy: What it is (hook h1 + body + stat chip) → How it works (3 numbered glass steps) → Why it works (3 icon rows) → Do it safely (4 rules + amber "educational content, not investment advice" disclaimer card) → The playbook (recap checklist + CTAs). All copy verbatim from the approved prototype's `STRATEGIES` data.
7. **Cross-link.** The playbook slide's white "Stress-test this strategy" CTA dismisses the deck and switches tab2 to the simulator section (orb landing visible); the ghost "Done" dismisses back to the education landing. Both clean up scroll listeners/timers (no leaks; dismissal mid-swipe safe).
8. **Simulator rename.** The showdown's first strategy displays "Yield-Based Income" with the tagline "Live off dividends and interest — never panic-sell" (replacing "Traditional 4%"/its tagline). Survival math is UNCHANGED (the yield-first, gap-selling model is numerically identical); the monthly-withdrawal-estimate solver keeps this strategy as its basis.
9. **Copy sweep.** No user-facing "Traditional 4%"/"Traditional" strategy references remain anywhere (flow showdown, assumptions sheets in both surfaces, hints): grep gate on the frontend templates + TS user-facing strings. The mc-info-sheet methodology line now references the Yield-Based Income strategy.
10. **History compatibility.** Previously saved history entries (old strategy key) never crash the landing or re-run: mapped to the new key or silently discarded via the versioned-schema tolerance — builder documents which. New entries save/re-run correctly with the renamed strategy.
11. **Legacy removal.** Old education markup (edu-card-grid, edu-sheet backdrop/sheet) and TS (`strategyData`, `openStrategy`, `closeStrategy`, related fields) are removed; unused SCSS from this story's touched blocks pruned (pre-existing unrelated dead styles may stay per convention).
12. **Quality gates.** `ng build` passes AOT (plain or `--configuration dev`, NEVER "development"); lint clean on touched files; `monte-carlo.service.spec.ts` updated for the rename and green via targeted `ng test --include`; Manrope + FRED palette + force light mode on the landing; `prefers-reduced-motion` degrades deck fades/snap animations; no TODOs or dead code introduced.

### Edge cases

- Double-tap a card → one modal; rapid X spam → clean single dismissal.
- Deck opened, app backgrounded, resumed → state intact; dismissal after resume clean.
- Very long strategy names/taglines wrap inside cards without breaking the grid.
- Landing on smallest supported viewport: grid shrinks, no card content clipped.
- Old history entry with `traditional` key present in localStorage when the landing loads → no crash (A/C 10).
- Scroll-snap + vertical overflow interplay on iOS (WKWebView): vertical scrolling a tall slide must not fight horizontal swiping.

### Open questions (non-blocking)

- Whether the internal strategy KEY renames (`traditional` → `yield`) with a history schema bump, or only the display label changes — builder decides, documents in implementation notes, A/C 10 governs either way.
- The stress-test CTA toast ("Simulator ready — tap the piggy") from the prototype is optional polish — include if trivial.
