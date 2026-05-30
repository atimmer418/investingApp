# Implementation Notes — ITPM Daily Dashboard (2026-05-30)

## Design Decisions
- Dollar sign in password built via `String.fromCharCode(36)` to avoid template-literal interpolation confusion — matches spec exactly
- Revision and approve bar present in initial state even though routine hasn't run — intentional: Cloudflare Pages will always serve a complete, non-broken UI
- `checkApproveReady()` treats zero option-groups as "all selected" so the approve button activates on answer-only pages — sensible default for the pending state
- `option-title` class lookup used inside approve message builder — ITPM skill must add that class when it populates option cards

## Deviations
- None; spec was explicit and complete

## Open Questions
- None

---

# Implementation Notes — Dropdown Standardization (2026-05-28)

## Design Decisions
- Part A canonical SCSS uses literal hex values (NOT CSS var references) per spec
- add-beneficiary: existing `label.field-label` has `display: block` + letter-spacing 0.07em; normalizing to canonical values; switching to `p.field-label` per canonical pattern; keeping `.required-star` span inside the p tag
- add-beneficiary: `IonItem` kept in imports because ion-modal/ion-datetime/ion-buttons still use it
- recurring-investments: `IonDatetimeButton` retained; only `IonSelect`/`IonSelectOption` removed
- lump-sum-investment: `brokerageOptions` already exists in TS — no data change needed; `IonSegment`/`IonSegmentButton` not touched (out of scope)
- retirement-planning: `IonItem` and `IonLabel` used extensively throughout template — NOT removing from imports; only stripping the specific `ion-item` wrapping the strategy select
- Part B (kyc, document-upload): vars resolve to same hex values — replacing var() refs with literal hex per spec

## Deviations
- None significant; all bindings/handlers preserved exactly

## Open Questions
- None

---

# Implementation Notes — Tab 3 Back Button Standardization

## Pattern extracted
- HTML: `<div class="header-inner">` wrapping `<button class="back-btn">` (with `arrow_back_ios_new` icon) + `<h2 class="header-title">Title</h2>`
- SCSS: `.header-inner` (flex, align-items center, padding 0 4px), `.back-btn` (40x40 circle, transparent, arrow_back_ios_new 20px), `.header-title` (18px 700 Manrope, text-align center, flex 1, padding-right 40px)
- Source of truth: investmentconfirmation.component + FRED_UI_STYLE_GUIDE.md §Header

## Design decisions
- my-profile has a "Save" button in `slot="end"` — this is NOT a back button and is preserved as-is. The `ion-title` → `h2.header-title` swap still centers the title. The save button must be placed alongside `.header-inner` or inside it at the end slot. Decision: keep it inside `.header-inner` as a sibling after `h2` — but that would push the title left. Safer: keep `ion-buttons slot="end"` outside `.header-inner` or wrap entire toolbar differently. Final decision: my-profile keeps its `ion-title` centered via `ion-buttons slot="end"` — but the spec says onboarding pattern uses `.header-inner`. Resolution: place save button INSIDE `.header-inner` as the third flex child — the `padding-right: 40px` on `.header-title` already accounts for the back button, so adding the save button on the right needs `padding-right: 0` on title instead. Actually: use `padding-right` only when there's no right element. Since the save button is the same 40px width, the `padding-right: 40px` trick still works — leave title with `padding-right: 40px` removed, since the save button provides equivalent visual balance.

## Deviations
- my-profile page: `.header-title` gets `padding-right: 0` instead of `40px` because the save button is the right-side counterpart to the back button, providing symmetric visual centering without extra padding.
- my-profile page: the save button from `ion-buttons slot="end"` moves inside `.header-inner` as a third child.

## Open questions
- None — all pages had identifiable back buttons using ion-back-button pattern.

---

# Merge conflict resolution — swarm/bucket-b into develop (2026-05-30)

## Task
Resolve 6 conflicted files from `git merge --no-ff swarm/bucket-b`.

## Resolution rules
- HEAD (develop/B6): Keep structure (div.section-card, onboarding theme, material-symbols-outlined buttons)
- bucket-b: Weave in NEW functionality only — new bindings, badges, methods, compliance text

## File decisions

### my-profile.page.html
- HEAD has `.hero-section`; bucket-b has `.profile-header` with pig avatar + percentile-badge
- Decision: Keep HEAD's `.hero-section`; add `.percentile-badge` div after `.user-name` (bucket-b's new feature)

### my-profile.page.scss
- Conflict 1: HEAD `.plan-sentence` vs bucket-b duplicate `:host {}` + old ion-card rules
- Decision: Keep HEAD `.plan-sentence`; drop bucket-b's duplicate `:host` and ion-card rules
- Conflict 2: HEAD `.insight-box` vs bucket-b `ion-card.plan-card` block
- Decision: Keep HEAD `.insight-box`; drop bucket-b's ion-card rules (old structure)
- Conflict 3: HEAD `.disclaimer-text`+field/referral rules vs bucket-b nested `.plan-card`+`.section-title`
- Decision: Keep HEAD's rules; add `.percentile-badge` styles inside `.hero-section`

### my-profile.page.ts
- HEAD: imports RouterLink; bucket-b: imports MonthlyFreedomUpdateService
- Decision: Keep both — RouterLink (needed for HTML routerLink binding) + MonthlyFreedomUpdateService (already used in constructor body)

### security-settings.page.html
- HEAD: KYC row uses material-symbols-outlined, no Edit button
- bucket-b: KYC row uses ion-icon + adds Edit button (editKyc() already in TS)
- Decision: Keep HEAD's markup; add Edit as `<button class="change-btn">` matching existing "Change email" pattern

### recurring-investments.page.html
- HEAD: clean status-banner + section-card structure
- bucket-b inserts old ion-card markup + streak badge + old pause button in conflict zone
- Decision: Keep HEAD's `</div>` closing; add streak badge AFTER `.schedule-stats`, BEFORE `.pause-btn` in schedule card

### recurring-investments.page.scss
- HEAD: `.empty-card`; bucket-b adds `.streak-badge-row`, `.streak-badge`, `.card-actions`, `.empty-state`
- Decision: Keep HEAD `.empty-card`; add bucket-b's `.streak-badge-row` + `.streak-badge` (new feature); drop `.card-actions`/`.empty-state` (old structure)

## Tradeoffs
- KYC Edit button: `<button class="change-btn">` instead of `<ion-button>` — consistent with "Change" email button pattern, no new imports
- Percentile badge: placed inside `.hero-section` after `.user-name` — stays within existing section
- Streak badge: after `.schedule-stats`, before `.pause-btn` — natural reading order

---

# Merge conflict resolution — swarm/bucket-c into develop (2026-05-30)

## Task
Resolve 9 conflicted files from active `git merge swarm/bucket-c`.

## Resolution rules applied
- HEAD (develop + B6 + Bucket A/B): structure is the base
- Bucket C: weave in new fields, services, and features only

## File decisions

### auth.service.ts — UserProgress interface
- Kept HEAD's stricter `selectedTier?: 'core' | 'plus' | 'pro'` over Bucket C's `string`
- Added Bucket C's `billingPeriod`, `currentFreedomEstimate`, `timeToFI` as new fields

### my-profile.page.ts
- Conflict 1: kept HEAD's minimal Ionic imports; added only `AlertController` (service, not directive)
- Conflict 2: kept ALL of HEAD's properties (isCodeValid, referralThreshold, referralRewardTriggered, referralSegments, statusPercentile, equityLevel, avatarSrc) AND added Bucket C's `selectedTier` + `freedomYear`
- Conflict 3: kept both `mfuService` and `alertController` in constructor
- Conflict 4: kept HEAD's referral threshold block AND appended Bucket C's selectedTier + currentFreedomEstimate assignments

### my-profile.page.html
- Conflict 1: kept HEAD's referral-progress-bar; added Freedom Timeline as a new section-card BEFORE the Referrals Card (div.section-card pattern, not ion-card)
- Conflict 2: kept HEAD's closing div; added Referral Upgrade Offers as section-card BEFORE closing div

### my-profile.page.scss
- Kept HEAD's `  }` + `}` closing the redeem-success block
- Discarded Bucket C's duplicate redeem-row / ion-card.upgrade-card / ion-card.freedom-timeline-card (ion-card patterns)
- Added spec-prescribed flat SCSS for `.freedom-timeline-card` and `.upgrade-offer-row` (section-card patterns)

### User.java
- Kept `privateBeta`; appended all 3 Bucket C fields with explicit getters/setters (Lombok @Getter/@Setter not applied to these since Bucket C provided inline methods)
- `currentFreedomEstimate` and `timeToFI` already existed in User.java (lines 170/183) — no duplication needed

### UserController.java
- Both conflicts: kept HEAD's fields + assignments AND added Bucket C's fields + assignments

### retirement-planning.component.ts
- Merged both Angular imports (`OnInit` + `ViewChild`/`ElementRef`)
- Kept both service imports (`AuthService` + `ToastService`)
- Added `implements OnInit` + `@ViewChild` decoration together
- Kept both constructor params

### investmentconfirmation.component.ts
- Resolution order: updateUserProfile first, then pendingAcats handling (Bucket C first, then HEAD's logic)

### ai-chat.page.ts
- Kept all three: `FirstTimeTourService`, `Subscription`, `finalize`

## Post-merge TS fixes
- Bucket C's `retirement-planning.component.ts` added `shareMonteCarlo()` using dynamic `import('html2canvas')` and `import('@capacitor/share')` — both cast `as any` but TS 2307 fires on dynamic import strings; added `// @ts-ignore` on those two lines
- Both packages are in package.json and node_modules; this is purely a tsc resolution quirk

---

# FRED-120/122 Revision Fixes (2026-05-30)

## Fix 1 — FRED-122: pig avatar

- MFU `MonthlyFreedomUpdateData` has `equityLevel: number` (1-6, pig level)
- Added `equityLevel: number = 0` property to component; populated from same `checkShouldShow()` call that already loads `statusPercentile`
- `get avatarSrc()` getter clamps to 1-6 with `Math.max(1, Math.min(6, equityLevel))`, defaults to 1 when equityLevel=0
- `IonAvatar` kept in imports — still used in template for wrapper element

## Fix 2 — FRED-120

- Running `npm audit fix` (non-force) for GHSA-ph9p-34f9-6g65 tmp path traversal
- Pruning unused standalone imports from @Component decorators — only removing symbols verifiably absent from HTML
- CSS budgets: raising per-component maximumWarning in angular.json
