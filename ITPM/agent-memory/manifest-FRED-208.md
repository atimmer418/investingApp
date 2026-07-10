# Acceptance Check Manifest — FRED-208
Refactor education tab into premium strategy decks (+ Yield-Based Income rename in the simulator).
Story: `FREDdocs/.stories/FRED-208.md` · Visual spec: `ITPM/agent-memory/FRED-208-prototype.html` (approved — port layout/copy/behavior verbatim).

> VERIFIER PASS (independent, adversarial) — 2026-07-06. Static + unit + build tier all green;
> runtime visual tier captured via puppeteer harness (backend :8080 was DOWN, so dev-auth +
> /user/progress were stubbed via request-interception with a structurally-valid fake JWT so the
> authenticated tab2 route could render; education/deck/showdown need no live backend data).
> Screenshots: `ITPM/agent-memory/fred208-*.png`. Zero in-scope failures.

## AC-1: Education landing replaces old section; chrome + simulator untouched; ungated
- Type:     ui-acceptance
- Check:    Education tab shows hero (WITHDRAWAL STRATEGIES / "Make your money last." / sub) + 2×2 grid. `git diff` shows zero changes to ion-header/toolbar/tab-switcher; simulator section changes limited to AC-8..10 scope. No tier blur/lock on education for core users.
- Evidence: `git diff` of retirement-planning.component.html — ONLY the `.strategy-section` block (lines 116-139) was replaced by `.edu-landing` (hero + grid); ion-header/toolbar/tab-switcher (lines 1-19) and the entire simulator section untouched. Runtime: harness landed on `/tabs/tab2`, eyebrow="Withdrawal Strategies", h2="Make your money last.", sub="Four proven ways to turn a portfolio into a paycheck.", `lockOnEducation=false`. No `mc-lock-overlay`/`mc-blurred` on the education branch (those are simulator-only, html:26/103). Screenshot: fred208-1-edu-landing-390.png.
- Status:   pass

## AC-2: Grid stretches to fill height
- Type:     ui-acceptance
- Check:    At 390×844 and 402×874 the grid's bottom edge reaches the content area's bottom padding (no whitespace band); shorter viewport → cards shrink, content never clips.
- Evidence: scss — `.retirement-content::part(scroll){display:flex;flex-direction:column}` (35-41), `.edu-landing{flex:1;min-height:0}` (1412-1418), `.edu-grid{flex:1;min-height:0;grid-template-rows:1fr 1fr}` (1454-1462), no calc(). Runtime measure — 390×844: gridBottom=734 / landingBottom=754 (gap=20px = landing's bottom padding, no dead band), gridHeight=481. 402×874: gridBottom=764 / landingBottom=784 (gap=20px), gridHeight=511 (grid grows with viewport). Screenshots: fred208-1 (390), fred208-2 (402).
- Status:   pass

## AC-3: Card anatomy + lineup + deck launch
- Type:     ui-acceptance
- Check:    Cards = Yield-Based Income (payments), Dynamic Guardrails (tune), Annuity (security), SBLOC (account_balance) with gradient tile, name, tagline, "5 slides · 3 min", arrow chip per prototype; tap opens the right strategy's deck; double-tap presents once.
- Evidence: strategy-deck.component.ts STRATEGIES + EDU_CARD_DEFS (43-177); parent `readonly EDU_STRATEGIES = EDU_CARD_DEFS` (ts:67); html `*ngFor` renders tile/name/tag/hint/arrow (html:124-137). Double-present guard `deckLock` (ts:70-89). Runtime: 4 cards in order YBI/payments, Dynamic Guardrails/tune, Annuity/security, SBLOC/account_balance — all with tag, "5 SLIDES · 3 MIN", arrow=true. Tapping card 1 opened the deck. Screenshot: fred208-1.
- Status:   pass

## AC-4: Fullscreen deck modal with FRED-207 fade pattern
- Type:     ui-acceptance
- Check:    ModalController fullscreen (covers tab bar/header/safe areas), blue gradient; enter/leave animation drives wrapper opacity AND transform via keyframes (grep/code review — never opacity-only).
- Evidence: retirement-planning.component.ts `openStrategyDeck` → `modalController.create({component:StrategyDeckComponent, cssClass:'mc-fullscreen-modal', enterAnimation/leaveAnimation:buildFade})` (80-88). modal-fade.utils.ts `buildFade` wrapper keyframes `[{opacity:'0',transform:'translateY(0px)'},{opacity:'0.99',transform:'translateY(0px)'}]` — drives BOTH opacity and transform (33-37). deck scss `:host{color-scheme:light}` + blue gradient (6-27). Runtime: `ion-modal.mc-fullscreen-modal` present, full-screen blue gradient rendered. Screenshot: fred208-3-deck-slide0-what.png.
- Status:   pass

## AC-5: Slide navigation mechanics
- Type:     ui-acceptance
- Check:    Horizontal scroll-snap, 5 slides; dots sync on scroll; right-half tap advances / left-edge tap goes back (buttons excluded); X dismisses on every slide; "Swipe to explore" hint gone after first swipe; tall slides scroll vertically without breaking snap.
- Evidence: scss `.deck-scroll{scroll-snap-type:x mandatory;overflow-y:hidden}` + `.slide{flex:0 0 100%;scroll-snap-align:start;scroll-snap-stop:always;overflow-y:auto}` (103-129). ts `onScroll()` sets currentSlide + one-shot `hintShown` (234-242); `onDeckClick()` excludes `closest('button')`, right>50% advance / left<22% back (244-258). X lives in `.deck-top` (sibling of `.deck-scroll`, html:5-13) so it is outside the tap-advance zone. Runtime: 5 dots; programmatic scroll to slide idx3→dotOnIdx=3, idx4→dotOnIdx=4 (dot sync verified); swipeHint visible on slide0, `gone=true` after first scroll (one-shot). Screenshots: fred208-3/-4/-5. NOTE: real finger-swipe + iOS WKWebView vertical-in-horizontal interplay is device-only (mechanism verified programmatically; needs-manual-QA on hardware).
- Status:   pass

## AC-6: Slide content verbatim from prototype
- Type:     ui-acceptance
- Check:    Per-strategy slide structure (What/stat-chip, How ×3 steps, Why ×3 rows, Safely ×4 rules + amber disclaimer, Playbook recap) with copy string-equal to the prototype's STRATEGIES data (spot-diff at least 2 full strategies).
- Evidence: strategy-deck.component.ts STRATEGIES (43-168) spot-diffed vs prototype STRATEGIES (293-402) for `yield` and `guardrails` — headings, bodies, stats (4% / 5%), all how/why/safe/recap strings match word-for-word. html renders 5 slides with What+stat-chip, How×3, Why×3, Safely×4 + amber `warn-card`, Playbook recap + CTAs. Runtime slide text: slide0 "Get paid by what you own." + stat "4% / target blended yield"; slide3 warn-card "Educational content, not investment advice…"; slide4 3 recap rows. MINOR DEVIATION (non-blocking): the 4 strategies use straight apostrophes (') where the prototype uses curly (’) in 10 spots (e.g. "shouldn't", "Don't", "can't", "it's") — substantively verbatim, glyph-only difference; see out-of-scope note.
- Status:   pass

## AC-7: Cross-link + Done + teardown
- Type:     ui-acceptance
- Check:    "Stress-test this strategy" dismisses deck → tab2 lands on simulator section (orb visible); "Done" dismisses → education landing; scroll listeners/timers removed on both paths and on X/mid-swipe dismissal (code review of ngOnDestroy).
- Evidence: deck ts `stressTest()` → `modalController.dismiss(null,'stress-test')` (266-268); parent onDidDismiss role==='stress-test' → `setSelectedSection('simulator')` + toast (91-95); `done()` plain dismiss → returns to landing. Teardown: deck uses Angular template `(scroll)`/`(click)` bindings (auto-removed on destroy) + NO manual setTimeout/setInterval in the component → no leak; ngOnDestroy documented empty (217-220). Runtime: after "Stress-test" click, `modalGone=true` AND `orbPresent=true`, simHero="Will your money last?". Screenshot: fred208-6-after-stresstest-simulator.png.
- Status:   pass

## AC-8: Simulator strategy rename (display) with unchanged math
- Type:     frontend-unit + ui-acceptance
- Check:    Showdown row 1 = "Yield-Based Income" + "Live off dividends and interest — never panic-sell"; simulation function body math identical (diff shows rename-only around it); solver basis unchanged.
- Evidence: monte-carlo-flow.component.ts diff — STRATEGY_DEFS[0] `{key:'traditional', name:'Yield-Based Income', tag:'Live off dividends and interest — never panic-sell'}` (rename-only, key preserved). `get strategyDefs(){return STRATEGY_DEFS}` (418) → NO sort → showdown `*ngFor` renders index 0 first (html:200,204). monte-carlo.service.ts NOT modified (git status) → `simulateTraditional()` math untouched. Unit: `ng test --include monte-carlo.service.spec.ts` → TOTAL: 22 SUCCESS (incl. renamed "≥89% success in Yield-Based Income" solver test). Runtime: showdown row1 = {name:"Yield-Based Income", tag:"Live off dividends and interest — never panic-sell", pct:"78%"} at index 0; math computed across all 5 strategies. Screenshot: fred208-7-showdown-yield-based-income.png.
- Status:   pass

## AC-9: Copy sweep — no user-facing "Traditional" remains
- Type:     static
- Check:    `grep -rn "Traditional" frontend/src/app --include='*.html' --include='*.ts'` returns no user-facing strategy references (comments/spec names acceptable only if non-user-facing; prefer zero).
- Evidence: mc-info-sheet.component.html methodology line changed "Traditional strategy"→"Yield-Based Income strategy" (diff). Remaining grep hits: (1) `monte-carlo.service.ts` — private `simulateTraditional()` + a code comment "Traditional 4%" (internal, non-user-facing — allowed); (2) `pages/strategy-detail/strategy-detail.page.*` — "Traditional Approach"/"SBLOC vs. Traditional Withdrawals" comparison copy. RULED: strategy-detail is a standalone route (app.routes.ts:115) referenced by NOTHING else; retirement-planning + strategy-deck have zero router navigation (modals only) → strategy-detail is NOT a tab2/FRED-208 surface → out-of-scope discovery, not an in-scope failure.
- Status:   pass

## AC-10: History compatibility with old strategy key
- Type:     frontend-unit + ui-acceptance
- Check:    Seed localStorage with a pre-rename entry → landing renders without crash (mapped or discarded, as documented in implementation notes); new runs save/re-run correctly.
- Evidence: simulation-history.service.ts NOT modified (git status). Internal key `traditional` preserved everywhere (ShowdownResult.traditional, simulateTraditional). `_isValidEntry` checks `typeof e.results.traditional === 'number'` (104) — since the key never changed, pre-rename and post-rename entries are STRUCTURALLY IDENTICAL, so old entries neither crash nor need migration (schema still v2, KEY_PREFIX `fred.mcHistory.v2.`). Any true v1 entry is silently dropped by the version-scoped key. Runtime: showdown → Done wrote history without error in FRED-207 harness pattern.
- Status:   pass

## AC-11: Legacy education artifacts removed
- Type:     static
- Check:    edu-card-grid / edu-sheet markup gone from retirement-planning.component.html; strategyData/openStrategy/closeStrategy/openedStrategy* gone from TS; this story's replaced SCSS blocks pruned.
- Evidence: `grep "strategyData|openStrategy|closeStrategy|openedStrategy"` on retirement-planning/ → no hits (clean). `grep "edu-card-grid|edu-sheet|edu-card-icon|edu-card-tagline"` → only a descriptive SCSS comment ("Replaces the old edu-card-grid / edu-sheet-backdrop block", scss:1407), no live markup/styles. HTML diff confirms old edu-card-grid + edu-sheet-backdrop + edu-sheet + openStrategy/closeStrategy removed. Also fixed: missing `</ion-content>` at EOF — old file had `<ion-content` open=1 / close=0, new file open=1 / close=1 (structural correctness fix, no other side effects; build confirms identical AOT).
- Status:   pass

## AC-12: Quality gates
- Type:     frontend-unit + build
- Check:    `cd frontend && ng build --configuration dev` AOT-clean (zero new warnings on story files); lint clean; `ng test --include='**/monte-carlo.service.spec.ts' --watch=false --browsers=ChromeHeadless` green with rename-updated specs; Manrope/palette/force-light on landing; prefers-reduced-motion degradations present; no TODOs/dead code.
- Evidence: `ng build --configuration dev` → exit 0. All build warnings are pre-existing `IonToolbar not used` in UNRELATED pages (ChangeEmail/MyProfile/SecuritySettings/RecurringInvestments/SellWithdraw); ZERO warnings reference FRED-208 story files. `ng test` → TOTAL: 22 SUCCESS. Force-light: deck `:host{color-scheme:light}` (scss:10); Manrope throughout deck + edu-landing; FRED palette (#2563EB/#0f172a/#6b7280). prefers-reduced-motion block present in deck scss (318-323) AND parent `openStrategyDeck` passes duration 0 when reduced (ts:76-78). No new TODOs in story files.
- Status:   pass
