# Acceptance Check Manifest — FRED-208
Refactor education tab into premium strategy decks (+ Yield-Based Income rename in the simulator).
Story: `FREDdocs/.stories/FRED-208.md` · Visual spec: `ITPM/agent-memory/FRED-208-prototype.html` (approved — port layout/copy/behavior verbatim).

## AC-1: Education landing replaces old section; chrome + simulator untouched; ungated
- Type:     ui-acceptance
- Check:    Education tab shows hero (WITHDRAWAL STRATEGIES / "Make your money last." / sub) + 2×2 grid. `git diff` shows zero changes to ion-header/toolbar/tab-switcher; simulator section changes limited to AC-8..10 scope. No tier blur/lock on education for core users.
- Evidence: screenshot + git diff excerpt
- Status:   pending

## AC-2: Grid stretches to fill height
- Type:     ui-acceptance
- Check:    At 390×844 and 402×874 the grid's bottom edge reaches the content area's bottom padding (no whitespace band); shorter viewport → cards shrink, content never clips.
- Evidence: screenshots at both sizes (or DOM rect measurements via headless run)
- Status:   pending

## AC-3: Card anatomy + lineup + deck launch
- Type:     ui-acceptance
- Check:    Cards = Yield-Based Income (payments), Dynamic Guardrails (tune), Annuity (security), SBLOC (account_balance) with gradient tile, name, tagline, "5 slides · 3 min", arrow chip per prototype; tap opens the right strategy's deck; double-tap presents once.
- Evidence: screenshot + code ref for guard
- Status:   pending

## AC-4: Fullscreen deck modal with FRED-207 fade pattern
- Type:     ui-acceptance
- Check:    ModalController fullscreen (covers tab bar/header/safe areas), blue gradient; enter/leave animation drives wrapper opacity AND transform via keyframes (grep/code review — never opacity-only).
- Evidence: screenshot of takeover + animation code reference
- Status:   pending

## AC-5: Slide navigation mechanics
- Type:     ui-acceptance
- Check:    Horizontal scroll-snap, 5 slides; dots sync on scroll; right-half tap advances / left-edge tap goes back (buttons excluded); X dismisses on every slide; "Swipe to explore" hint gone after first swipe; tall slides scroll vertically without breaking snap.
- Evidence: headless walkthrough (scroll positions + dot classes) or screen recording
- Status:   pending

## AC-6: Slide content verbatim from prototype
- Type:     ui-acceptance
- Check:    Per-strategy slide structure (What/stat-chip, How ×3 steps, Why ×3 rows, Safely ×4 rules + amber disclaimer, Playbook recap) with copy string-equal to the prototype's STRATEGIES data (spot-diff at least 2 full strategies).
- Evidence: diff of TS content vs prototype data
- Status:   pending

## AC-7: Cross-link + Done + teardown
- Type:     ui-acceptance
- Check:    "Stress-test this strategy" dismisses deck → tab2 lands on simulator section (orb visible); "Done" dismisses → education landing; scroll listeners/timers removed on both paths and on X/mid-swipe dismissal (code review of ngOnDestroy).
- Evidence: headless walkthrough + code refs
- Status:   pending

## AC-8: Simulator strategy rename (display) with unchanged math
- Type:     frontend-unit + ui-acceptance
- Check:    Showdown row 1 = "Yield-Based Income" + "Live off dividends and interest — never panic-sell"; simulation function body math identical (diff shows rename-only around it); solver basis unchanged.
- Evidence: git diff of monte-carlo.service.ts (math hunks unchanged) + showdown screenshot + spec green
- Status:   pending

## AC-9: Copy sweep — no user-facing "Traditional" remains
- Type:     static
- Check:    `grep -rn "Traditional" frontend/src/app --include='*.html' --include='*.ts'` returns no user-facing strategy references (comments/spec names acceptable only if non-user-facing; prefer zero).
- Evidence: grep output
- Status:   pending

## AC-10: History compatibility with old strategy key
- Type:     frontend-unit + ui-acceptance
- Check:    Seed localStorage with a pre-rename entry → landing renders without crash (mapped or discarded, as documented in implementation notes); new runs save/re-run correctly.
- Evidence: unit spec or manual localStorage poison test + screenshot
- Status:   pending

## AC-11: Legacy education artifacts removed
- Type:     static
- Check:    edu-card-grid / edu-sheet markup gone from retirement-planning.component.html; strategyData/openStrategy/closeStrategy/openedStrategy* gone from TS; this story's replaced SCSS blocks pruned.
- Evidence: grep proof
- Status:   pending

## AC-12: Quality gates
- Type:     frontend-unit + build
- Check:    `cd frontend && ng build --configuration dev` AOT-clean (zero new warnings on story files); lint clean; `ng test --include='**/monte-carlo.service.spec.ts' --watch=false --browsers=ChromeHeadless` green with rename-updated specs; Manrope/palette/force-light on landing; prefers-reduced-motion degradations present; no TODOs/dead code.
- Evidence: command output verbatim
- Status:   pending
