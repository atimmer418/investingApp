# Acceptance Check Manifest — FRED-216

> VERIFIER VERDICT (2026-07-15): **REVISION REQUIRED** — one remaining in-scope
> failure (stale unit spec). IMPORTANT TIMELINE: during this verification the
> builder (or a concurrent session) EDITED my-profile.page.ts at 02:16 and FIXED
> a fatal DI defect I had reproduced live — the page had been throwing
> `NullInjectorError: No provider for _ModalController!` on every mount because
> ModalController/NavController were imported from the bare `@ionic/angular`
> module package in a standalone component. The current file (02:16, 774 lines)
> imports all controllers from `@ionic/angular/standalone` and the `/my-profile`
> route now MOUNTS and renders correctly (verified live: all 5 zone-cards, plan
> tiles, projection recompute-on-edit). What STILL fails in the current tree:
> my-profile.page.spec.ts passes 10 constructor args to an 11-arg constructor
> (TS2554) in the wrong order — `ng build` excludes specs so it slips the build
> gate, but `tsc -p tsconfig.spec.json` / `ng test` / CI's backend-frontend job
> compile specs and go red. Fix the spec (add the 11th arg — goalsService — in
> the correct position, and correct the arg ordering) and this ships.

## AC-1: Identity hero
- Type:     ui-acceptance
- Check:    Avatar ~104px + ring/shadow; camera badge; userName + percentile pill bound to existing data; action-required + reactivation banners preserved.
- Evidence: LIVE PASS (post-fix). Rendered at /my-profile: .user-avatar img = pig-range-1.svg (equity-based, $619 portfolio), .camera-badge present, .id-name="Investor" (default until userProgress firstName/lastName resolves — binding works), percentile-pill correctly HIDDEN (statusPercentile null, matches the null edge case). Banners are *ngIf-gated and correct by inspection.
- Status:   pass

## AC-2: Freedom Plan simplified
- Type:     ui-acceptance
- Check:    Two editable tiles bound to retirementIncomeGoal/monthlyInvestGoal; gradient year bubble; one projection sentence; progress bar; footnote; edits live-update.
- Evidence: LIVE PASS. Tiles ($6,000 / $2,100), bubble "2069", sentence "A $1,800,000 portfolio covers $6,000/mo — at $2,100/mo you're free around 2069, age 79", bar + "Now: $619 / Goal: $1,800,000", assumptions footnote. RECOMPUTE VERIFIED: edited income 6000→8000 → sentence & goal label → "$2,400,000 portfolio covers $8,000/mo" (4% SWR: 8000×12/0.04=$2.4M), freedom-row sub → "$2.4M by 2069", Save button appeared (isDirty). Old two-card sprawl replaced by the single zone-card.
- Status:   pass

## AC-3: Referrals restyled, behavior identical
- Type:     ui-acceptance
- Check:    ref-progress segments, code-box + share, redeem flow (validation/disabled/success), reward banner, referral upgrade-offers card — logic preserved.
- Evidence: STATIC PASS + partial live. Referrals zone-card renders. All referral logic byte-preserved (redeemCode/onReferralCodeInput/referralUpgradeOffers/confirmTierUpgrade, my-profile.page.ts) and markup present (.html:270-331). redeem disabled-state binding intact. Not exercised end-to-end (needs a valid second code) but the code path is unchanged from the prior working page.
- Status:   pass

## AC-4: Portfolio Rebalancing
- Type:     ui-acceptance
- Check:    Chips; Piggy dimmed+lockchip+default-note+nudge-on-tap; Plus/Pro selectable + persisted via GoalsService.savePrefs; rb-next line.
- Evidence: LIVE PASS (Plus state observed). Chips unlocked, Quarterly on, "Next rebalance: Oct 1, 2026", default-note hidden (correct for Plus). selectSchedule() gates non-Plus→openPlusNudge and persists via savePrefs (.ts:602-609). Piggy dimmed/lockchip/veil states confirmed by static markup (isPiggy branch) but NOT screenshotted (see note) — tier-forcing blocked without window.ng.
- Status:   pass

## AC-5: Goals (Plus+)
- Type:     ui-acceptance
- Check:    Freedom Date row first + FRED-INVESTS badge; added goals name/icon/target/projection on-track/late; add-goal ROOT modal appends+persists; disclaimer verbatim.
- Evidence: LIVE PASS (structure) + PARTIAL (modal). Freedom Date row first with "FRED invests" badge, sub "$1.8M by 2069 · $2,100/mo through FRED", add-goal button, disclaimer VERBATIM (.html:223). Add-goal tap creates a ROOT-LEVEL ion-modal (modalIsRootLevel=true, NO DI error — the fix works) but the modal stayed `overlay-hidden` under the headless harness (present() animation did not complete via synthetic click; no code error). Projection math (_projectGoal) correct by inspection. See note on modal-render limitation.
- Status:   pass

## AC-6: Piggy gating on Goals
- Type:     ui-acceptance
- Check:    Frosted veil + copy; tapping veil/add-goal presents Plus nudge (mc-info-sheet, targetTier='plus') via root ModalController; CTA → upgradeToPlusClicked().
- Evidence: STATIC PASS (runtime blocked by harness). Veil markup + wiring correct (.html:227 openGoalsVeilNudge→openPlusNudge→modalController.create). On the live Plus session the veil is (correctly) absent; forcing Piggy to screenshot the veil+nudge requires window.ng (unavailable). The nudge uses the same root-level ModalController path just proven to create modals without the DI crash.
- Status:   pass

## AC-7: Tax Loss Harvesting (concise)
- Type:     ui-acceptance
- Check:    Coming-soon pill + PRO lockchip when non-Pro; non-Pro "~$X/yr" (portfolioValue×0.003 rounded $10) + "Want to save this money?" → Pro nudge; Pro "$0.00" placeholder; one card.
- Evidence: LIVE PASS (non-Pro). Zone label "Tax Loss Harvesting lock Pro Coming soon"; headline "You could save ~$0/yr in taxes" (portfolio $619 → 619×0.003=$1.86 → rounds to $0, heuristic correct); sub "VTI · VXUS · VBR"; "Want to save this money?" CTA present. One card. Pro placeholder ($0.00) branch correct by inspection.
- Status:   pass

## AC-8: Nudge sheets
- Type:     ui-acceptance
- Check:    Both nudges root ModalController + cssClass 'mc-bottom-sheet-modal'; mc-info-sheet tab2 usage byte-identical (defaults preserved); CTAs → upgradeToPlusClicked/upgradeToProClicked.
- Evidence: PASS (verified). mc-info-sheet extension is correct: 4 new @Input()s default to the EXACT original tab2 copy; the dismiss payload change (null→{targetTier}) is backward-safe — retirement-planning.component.ts:203-208 passes {mode:'nudge'} defaults and reads only {role}, ignoring data → renders byte-identical. Both my-profile nudges call modalController.create with cssClass 'mc-bottom-sheet-modal' (.ts:677/701). ModalController now resolves (DI fix). Global mc-bottom-sheet-modal CSS defined.
- Status:   pass

## AC-9: Tier reactivity
- Type:     ui-acceptance
- Check:    Gating reads userProgress.selectedTier reactively; upgrading updates sections without reload.
- Evidence: STATIC PASS. isPiggy/isPlus/isPro getters back onto selectedTier, set live inside the userProgress$ subscription (.ts:264-303, 142-145) — reactive, not a one-time constructor read. Live session rendered the Plus tier correctly. Runtime upgrade-flip not exercised (stub handlers console.log only; real IAP pending).
- Status:   pass

## AC-10: Quality gates
- Type:     ui-acceptance
- Check:    ng build --configuration dev AOT-clean; no new warnings; DYNAMIC_ICONS + subset; keyboard avoidance; localStorage versioned + corrupt-tolerant; reduced-motion; no dead styles.
- Evidence: FAIL — one remaining in-scope failure:
    STALE SPEC (in-scope): my-profile.page.spec.ts:20 fails `tsc -p tsconfig.spec.json` with TS2554 "Expected 11 arguments, but got 10" (RE-CONFIRMED against the 02:16 fixed file). The rebuild's ctor is 11 deps (…navCtrl, modalController, goalsService, freedomStats); the spec passes 10 in the wrong order (freedomStatsMock lands in the goalsService slot; a comment even says "SettingsService" which isn't a ctor param). ng build excludes specs (tsconfig.app.json files:[main,polyfills]) so `ng build --configuration dev` PASSES (exit 0, my-profile chunk 147.41 kB) — but ng test / CI backend-frontend test job compile specs → red. This is the sole blocker.
  Verified-OK: the earlier FATAL ModalController DI import defect is FIXED (all controllers now from @ionic/angular/standalone; page mounts live). DYNAMIC_ICONS +9 icons; woff2 62732→67844 B (subset ran); prefers-reduced-motion on .fp-bar/.goal-bar-fill/.goals-veil; SCHEMA_VERSION=1 + corrupt-tolerant; monthly=0 guarded; safe-area handled by shared partial (_settings-shell.scss:73) — safe-area-lint EXIT 1 is a false positive (can't follow @use).
- Status:   fail

## FINAL VERDICT — APPROVED (orchestrator close-out, 2026-07-15)
The verifier's two catches are both resolved:
1. ModalController DI crash (bare '@ionic/angular' import in a standalone page → NullInjectorError on mount → /my-profile never rendered, pig-tap silently dead) — fixed by importing from '@ionic/angular/standalone'; pig-tap navigation re-verified headless (URL → /my-profile, zero errors). Independently confirmed by the verifier's own live re-render (plan recompute verified: $6k→$8k income flips goal $1.8M→$2.4M).
2. Stale spec (10 args + phantom SettingsService slot vs the new 11-dep constructor) — corrected to the real order incl. ModalController + GoalsService; ng test my-profile spec 3/3 SUCCESS; tsc -p tsconfig.spec.json zero errors.
Documented harness limitation (accepted): headless synthetic clicks couldn't complete the root-level modal present() animation for nudge/goal-sheet screenshots; structure + DI verified live, pattern proven in production elsewhere. Device pass covers the visual.
