# Implementation Notes — FRED-207

## Design decisions

- **Annuity+Growth formula**: used prototype's `Math.min(annual/0.06, startV)` rather than the 50% default from existing service — prototype is the authoritative visual spec and the ticket says "existing essential-expenses recommendation logic" which maps to this formula.

- **Full annuity two-phase**: when `yearsToRetirement > 0`, each path accumulates stochastically and only the final accumulated value feeds the full-annuity calculation. When `yearsToRetirement = 0`, no accumulation paths are run (cost saving, matches prototype).

- **Accumulation formula**: `v = v * (1+r) + contribMo * 12 * (1 + r/2)` — prototype used annual compounding with mid-year contribution approximation, not monthly compounding. Kept this exactly.

- **Landing scenario chips**: placed on the landing screen so user selects scenario before entering the flow. Non-Pro users see chips with opacity 0.5 and a gold "Pro" lock badge next to them; tapping does nothing (pointer-events none via `chips-locked` class).

- **Outside accounts toggle placement**: landing only shows toggle when `isPlus` (Plus or Pro). The toggle drives `includeOutsideAccts` which is passed as `includeOutside` @Input to the modal. The modal decides whether to show the "outside accounts" step based on this flag.

- **MonteCarloFlowComponent not in parent's imports array**: passed as `component` value to ModalController.create(), so it only needs a TypeScript import, not an Angular template declaration.

- **Keyboard avoidance (post go-back 2)**: implemented directly in MonteCarloFlowComponent using `Capacitor Keyboard.addListener('keyboardWillShow'/'keyboardWillHide')` — the same detection source as KeyboardAvoidDirective. On `keyboardWillShow`, waits 300ms (matching directive), measures overshoot of the focused input vs `window.innerHeight - keyboardHeight - 16px`, and applies `translateY(-overshoot)` to the active `.fscreen` queried by `this.el.nativeElement.querySelector('.fscreen.on')`. Restores on `keyboardWillHide`, step change (`showStep()`), and dismissal (`ngOnDestroy` → `_cancelTimers` → `_teardownKeyboardAvoid`). No-op on web (Keyboard plugin never fires).

- **Assumptions sheet on landing**: implemented as a fixed bottom sheet in the parent component (retirement-planning.component) with its own backdrop + mc-assump-sheet. The modal's results step has a separate info button wired to the modal's own assumpSheetOpen signal. Both use the same static content (assumptions table) but are independent elements — avoiding prop threading between parent and modal.

- **`flowLock` reset at 600ms, not on dismiss**: the double-present guard resets 600ms after `modal.present()`, not after `onDidDismiss()`. This prevents double-tap without blocking a second modal after the first one closes.

- **History refresh**: `loadHistory()` is called both in `ngOnInit()` (to show history on entry) and after `modal.onDidDismiss()` (to pick up newly-saved run). This is a simple polling approach; no event bus needed.

- **Box-Muller RNG direction**: in unit tests, `() => 0.5` produces z ≈ -1.18 (negative returns via cos(π) = -1), while `() => 0.9999` produces z ≈ +0.014 (near-mean positive returns). This is counterintuitive but follows from Box-Muller math: small uniform → large absolute z, large uniform → small z.

## Deviations from spec

- **`IonContent` removed from parent imports**: the spec said to remove IonCard, IonRange etc. but didn't explicitly list IonContent. Kept it in the parent since it's used for `<ion-content class="retirement-content">` which must remain untouched.

- **Assumptions sheet placement**: the spec says "assumptions link" on the landing. Implemented as a fixed bottom sheet with the full assumptions table — not a simple link/navigation. This matches the modal's assumptions sheet pattern and is consistent with the prototype behavior.

- **IonCard, IonItem etc. removed from parent**: these were all in the old simulator section and are no longer needed. Removed them to avoid unused-import warnings. Education section doesn't use any ion-card elements.

## Tradeoffs

- **Constant RNG in unit tests**: using `() => 0.9999` makes ALL 1000 simulation paths identical (deterministic). This is fine for testing the math logic but doesn't exercise the stochastic distribution. The determinism test separately verifies that different seeds produce different outputs, covering the RNG injection contract.

- **SCSS kept large**: the parent component SCSS retains all the legacy simulator styles (quick-guide-card, financial-inputs-card, etc.) even though the HTML no longer references them. This is safe dead code — removing it in the same PR would risk merge conflicts and is a separate concern. Added only the new landing styles at the bottom.

## Open questions (post go-back 1)

- The `retireAge` getter in MonteCarloFlowComponent computes from `birthYear()` which is fetched async from KYC. If the user hasn't completed KYC, birthYear() stays 0 and `retireDisplayLabel` falls back to "Retire in N years" which is correct per spec.

- The landing empty-state copy ("Run a simulation to see how your plan holds up across 1,000 market scenarios") — is this the final copy or should it match the prototype more closely?

## Go-back 1 decisions (2026-07-03)

- **Fix 1 (IonContent + KeyboardAvoidDirective)**: wrapped in `<ion-content [scrollY]="false" appKeyboardAvoid>`. SUPERSEDED by go-back 2 (this was a silent no-op — the wrapper silenced the import warnings but delivered zero actual keyboard handling because `.fscreen` panels are `position:absolute/inset:0` outside the ion-content scroll flow).


- **Fix 2 (_calcLineTimer)**: assigned `this._calcLineTimer = setTimeout(...)` in `_fadeCalcLine`. `_cancelTimers` already cleared it; now the clear actually tracks the right timer handle.

- **Fix 3 (subscription leak)**: added `Subject` + `takeUntil` to MonteCarloFlowComponent. `destroy$.next()` called in `ngOnDestroy` after `_cancelTimers`.

- **Fix 4 (chip nudge)**: Plus users tapping a scenario chip now open `chipNudgeOpen` bottom sheet with the same Pro upgrade content as the flow's nudge sheet. Used `.mc-assump-sheet.mc-nudge-sheet` modifier class to share sheet chrome.

- **Fix 5 (assumptions copy)**: replaced "monthly log-normal returns" with "annual returns from normal distributions (Box-Muller) calibrated to S&P 500 and Bloomberg Aggregate bond data, 1926–2024".

- **Fix 6 (orb labels)**: removed standalone "Run Simulator" button. Wrapped orb + two labels ("Run a simulation" / "About 30 seconds") in `.mc-orb-wrap` with the click handler. Orb is now the sole CTA per prototype.

- **Fix 7 (X always visible during calc)**: removed `[style.visibility]` binding from the X close button. It is now always visible on every step including calc, matching the prototype and AC-5 (mid-calc dismissal cancels timers via `closeFlow()` → `_cancelTimers()`).

- **Build result (go-back 1)**: `ng build --configuration dev` passes with zero errors; no TS-998113 warnings for `monte-carlo-flow` or `retirement-planning` components. 22/22 tests still green.

## Go-back 2 decisions (2026-07-03)

- **Keyboard avoidance (real fix)**: removed the inert `<ion-content>` wrapper and both imports (`IonContent`, `KeyboardAvoidDirective`). Implemented component-local keyboard avoidance in MonteCarloFlowComponent using `Capacitor Keyboard.addListener` (same detection source as the shared directive). `ElementRef` injected for scoped DOM queries (`this.el.nativeElement.querySelector/.querySelectorAll`). `focusin` listener on the host element tracks the active input. On `keyboardWillShow`: 300ms settle wait → measure overshoot of focused input rect vs keyboard top − 16px → `translateY(-overshoot)` on `.fscreen.on`. Restored on `keyboardWillHide`, `showStep()`, `closeFlow()`, and `ngOnDestroy` via `_teardownKeyboardAvoid()`. `.fscreen` SCSS transition extended to `opacity 0.38s ease, transform 250ms ease` so restoration is smooth. `prefers-reduced-motion` block already has `transition: none !important` on `.fscreen` covering both. Web no-op preserved (Keyboard plugin never fires on web).

- **Build result (go-back 2)**: `ng build --configuration dev` — zero errors, zero TS-998113 warnings for either FRED-207 component. 22/22 tests green.
