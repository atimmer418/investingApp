# FRED ITPM Routine Memory

> Maintained by the ITPM routine. Entries compress automatically after 7 daily entries to weekly, 5 weekly to monthly.

---

## Monthly Summaries

*(none yet)*

---

## Weekly Summaries

### Week of 2026-05-30 → 2026-06-09 — ITPM launch + settings-page UI overhaul push

**Shipped:**
- **FRED-124 (Change Bank Account)** — full UI overhaul to the hero-led blue-header-over-white pattern (Option C), reskin-only, zero `.ts` logic change; also fixed a pre-existing `accountSubType`/`accountSubtype` field-case bug. Reworked 06-07 for a notch/safe-area clip seen on a real iPhone (`env(safe-area-inset-top)`). Last *standalone* settings page migrated → Pages 70%→73%.
- **FRED-116** (native App Store review prompt after first MFU dismiss) selected 05-31.

**Planned / decided (not shipped in-window):**
- **FRED-100 (RAG chunks)** picked 06-03 (+FRED-188) and again 06-04, then **SKIPPED by Andrew on 06-04** in favor of the bank-account UI (7-day hard exclusion, expired 06-11). Disambiguated Andrew's "FRED-141" guess → the real bank-account-UI story is FRED-124.
- **FRED-192 (Tab 3 redesign)** direction pick on 06-09 — three phone mockups (A Elevated Grouped Cards [rec], B Hero Stat Header, C iOS Inset List), all keeping the blue-header concept; chosen direction becomes its own build story.

**Metrics journey:** Readiness 55 (05-30 baseline) → 67 (05-31) → 71 → 72 (06-09); Piggy 70%→77.5%; Pages ~70%→73%; Burndown 32.9% (28/85) → 34.8% (31/89); Launch 60%→64.3%; Days-since-blocker 0→9.

**Lessons retained:**
- A raw header `div` inside `ion-header` must carry `safe-area-top` / `env(safe-area-inset-top)` or it clips under the notch (FRED-124 rework).
- The linkplaid `.illustration-card` transplants cleanly when its `--plaid-*` vars are swapped for FRED palette literals; the tab3 hero `&::after` cutout bg must match `ion-content --background`.
- Static-only verification is an acceptable FLOOR when the sandbox can't serve a browser; live device-render confirmation (390×844 / 430×932) must be explicitly handed to Andrew via "Looks Good," never implied or claimed as screenshotted.
- One-story-per-day rule enforced from 06-04 onward.
- A `**Skipped:**` story is a 7-day hard exclusion — honor it.

---

## Daily Entries

### 2026-06-15 (Revision) — FRED-100 skipped, repicked FRED-196 (tab3 Freedom Age resilience)

**Skipped:** FRED-100 (2026-06-15) — Andrew skipped today's RAG-chunks story via the dashboard ("pick a different single story"). No replacement named, so re-ran the pick with FRED-100 as a hard exclusion (7-day window).
**Priorities selected:** FRED-196 — tab3 Freedom Age blanks on flaky KYC call
**Tier:** 1 (A/C ready) — FRED-196 carries a full Acceptance Criteria block in `backlog.md`; build-ready, no triage gap.
**Rationale:** Of the Tier-1 stories, FRED-196 is the strongest in-sandbox pick: a well-scoped, additive frontend resilience fix that hardens the error-state coverage of the tab3 stat strip just shipped in FRED-192's rework. The other A/C-ready stories are gated — FRED-191 (load-perf) needs a real-device Capacitor build the sandbox can't run; FRED-195 (pig avatars) needs SVGs from the `PersonalTypeshit/FRED Logo` sibling dir outside the repo; FRED-194 (uniform settings headers) is a large 9-page UI overhaul that can't be visually verified in-sandbox. FRED-196 is Medium, tsc-verifiable, low architectural risk, and closes a real user-facing reliability gap ("complete retry/error states" is core to the production-readiness mission). FRED-101 (emailer) remains founder-gated; FRED-169 (14-day trial) is App Store Connect config.
**Metrics:** Readiness 74/100, Piggy 77.5% (31/40), Pages 76%, Burndown 36.0% (32/89), Launch 65.9% (carried from 06-13 — no new work shipped since)
**Days since last blocker:** 14 (no blocker today; build shipped clean)
**Blockers active:** none
**Notes:** Exclusion set for the repick = FRED-100 (skipped today). No other skips within the last 7 days (the early-June FRED-100 skip window expired 06-11). Tomorrow's likely picks unchanged: FRED-188 (chat null guard), FRED-189 (bank-subtype field-case bug), FRED-186 (debounce + switchMap).

**Built & shipped (approval, 2026-06-15):** FRED-196 — tab3 Freedom Age resilient to flaky KYC.
- **What shipped:** `frontend/src/app/tab3/tab3.page.ts` — the KYC observable in `loadStatStrip()` (call #3, `alpacaService.getKycData()`) is now wrapped with `timeout(10_000)` + a bounded transient-only `retry({count:2})` (transient = TimeoutError / status 0 / status ≥ 500; non-transient re-throws via `throwError`; backoff `timer(400·2^(attempt-1))`), mirroring `auth.service.ts loadUserProgress()` verbatim. Imports extended with `timeout, retry, timer, throwError`. The existing error handler (`kycDone=true; tryRender()`) was left untouched so the render gate still settles. Per Andrew's authoritative directive, the failed state stays a plain "—" with NO manual retry affordance — the auto-retry self-heals transient blips. `frontend/src/app/tab3/tab3.page.spec.ts` gained 7 fakeAsync specs (all pass); `frontend/karma.conf.js` gained a `ChromeHeadlessNoSandbox` launcher for CI/sandbox.
- **Verifier verdict:** APPROVED, 0 in-scope failures. The adversarial AC-1b spec proves a 401 is NOT retried (`callCount===1`) — the fix can't mask an auth failure as a retryable blip. tsc clean. Shipped through a CI-gated PR on `verify/FRED-196` (backend-frontend job).
- **Readiness needle:** closes a real user-facing reliability gap (honest error/retry states on the tab3 stat strip just rebuilt in FRED-192) — "complete retry/error states" is core to the production-readiness mission. Readiness 74 → 75.
- **Lessons:** the canonical `loadUserProgress` retry block transplants cleanly to any observable needing transient-only resilience — reuse it verbatim (same predicate, same backoff, non-transient `throwError`) rather than re-deriving. The non-transient re-throw is the load-bearing safety property: without it, a retry on 401/403 would mask auth failures.
- **Out-of-scope discoveries surfaced for Andrew's confirm before backlog-add:** (1) [DEV] package-lock.json `libc` field churn — reverted in this PR to keep the diff minimal; consider standardizing the repo npm version. (2) [DEV] `karma.conf.js ChromeHeadlessNoSandbox` launcher now committed — confirm it should live in the repo. (3) [DEV] pre-existing Ionicons `book-outline` not-registered warning on tab3 render (addIcons gap).
**Status:** Complete

---

### 2026-06-13 (Morning Brief) — RAG Knowledge Chunks (single-story)

**Priorities selected:** FRED-100
**Tier:** 1 (A/C ready) — FRED-100 carries a full Acceptance Criteria block in `backlog.md`; build-ready, no triage gap.
**Rationale:** With FRED-192 (Tab 3) shipped, FRED-100 is the **only build-ready Tier-1 story that can ship today**. The other A/C-ready stories are all gated: FRED-101 (emailer) is founder-gated on an email-provider decision + SMTP creds; FRED-169 (14-day trial) is App Store Connect config, not code; FRED-191 (load-perf) needs a running Capacitor build on a real device the sandbox can't provide. FRED-100 is pure additive backend content — three canonical chunks in `FredKnowledge.java` (count 28→31) — that builds + verifies in-sandbox. It was deprioritized twice in early June for the bank-account/Tab-3 UI work, but that thread is done and the 06-04 skip window (expired 06-11) has lapsed, so it's cleanly re-eligible. Not a UI overhaul → standard A/B/C options (A: 3 chunks exactly per A/C [rec]; B: +4th core-calc chunk; C: full KB audit).
**Metrics:** Readiness 74/100, Piggy 77.5% (31/40), Pages 76%, Burndown 36.0% (32/89), Launch 65.9%
**Trends (vs 06-06 ~1wk):** Burndown ↑ +1 done (31→32, FRED-192 shipped), Pages ↑ +3 (73→76), Readiness ↑ +2 (72→74), Launch ↑ +1.9 (64.0→65.9), Piggy → no change (77.5%), Days-since-blocker ↑ +7 (6→13).
**Days since last blocker:** 13 (same calendar day as the FRED-192 ship entry, which recorded 13; no new blocker and no new day elapsed, so held flat)
**Blockers active:** none (FRED-101 founder-gated on email provider + SMTP creds — a prerequisite, not a logged blocker)
**Data-hygiene note:** FRED-192 shipped and reached `looks_good`, but its backlog heading still lacks a ✓ — burndown counts it as the 32nd done; recommend `triage --done=FRED-192` to mark it formally so the checkmark count and the metric agree.
**Notes:** Re-pick of FRED-100 is legitimate now that its skip window has lapsed. Tomorrow's likely picks: FRED-188 (chat `processChat()` null guard), FRED-189 (bank-account subtype field-case bug), FRED-186 (debounce + switchMap on API searches).
**Status:** Pending approval from Andrew

---

### 2026-06-13 — Tab 3 (Settings) Page UI Redesign — SHIPPED (FRED-192, Option B)

**Priorities selected:** FRED-192 implementation (Andrew approved on 2026-06-12, executed 06-13)
**Direction chosen:** **Option B — Hero Stat Header.** Andrew: "i think option B and everything that comes with option B." Per-option note: keep the design, but first copy the current tab3 "FRED" wordmark SCSS for both the clickable white-shadow version and the non-white unclickable version. Approved execution order was explicit: HTML + SCSS only, no `.ts` logic rewrite.
**What shipped:** Rebuilt `frontend/src/app/tab3/tab3.page.{html,scss}` to Option B — expanded blue gradient hero header (`.custom-profile-header`, carries the global `.safe-area-top` class for notch clearance) with avatar + `profileActionRequired$` badge + "My Account" greeting + "FRED" wordmark; an overlapping white rounded card (`.sections-card`, margin-top:-20px, radius 16px, `box-shadow:0 6px 16px rgba(15,23,42,0.06)`, 1px #e5e7eb border) holding three flat-row groups (`.setting-item`, 14px/20px, #f1f5f9 dividers, `.section-group-spacer` between groups) over a centered footer. The existing `.header-branding` SCSS was carried over **verbatim for both states** (default watermark opacity:0.25/pointer-events:none; `.mfu-active` opacity:0.85/pointer-events:auto/text-shadow/-webkit-text-stroke 0.6px/&:active scale) per Andrew's note. **Zero `.ts` changes** (0-line `tab3.page.ts` diff) — settingSections, *ngFor rows, onSettingClick routing, goToMyProfile, onFredLogoClick MFU tap, and the profile badge all preserved. Existing `ion-icon`s kept in FRED blue (not swapped to Material Symbols, since that would touch the data array). Row subtitles dropped from the HTML render only (Option B is single-line); `subtitle` field left in the data.
**Key decision — stat strip omitted:** Option B's mockup showed "Freedom date / Ahead of 85%" tiles. Omitted deliberately: tab3 has no real freedom-date data and the directive was "no .ts rewrite," so building the tiles would have meant shipping hardcoded mock financial numbers (against the no-mock-data rule). Surfaced to Andrew in the completion card as an optional follow-up (wire to real projection data later).
**Verification:** verifier-agent — **zero in-scope code failures.** AC-2 (wordmark both states verbatim), AC-3 (0-line .ts diff), AC-4 (tsc: stash-compared, only the two pre-existing TS5101/TS5107 tsconfig deprecations, zero new errors) fully sealed with evidence. AC-1/AC-5/AC-6/AC-7 passed at the static/binding/SCSS level. **Caveat (same as FRED-124):** no served frontend + no browser MCP tools in the sandbox, so the 390×844 / 430×932 device screenshots and live click-through could not be auto-captured — left for Andrew's eyeball via the "Looks Good" button. safe-area-lint exit-1 on the header div is a confirmed false positive (notch padding comes from the global `.safe-area-top` class the linter can't see). Carried the FRED-124 lesson forward: the tab3 hero applies `.safe-area-top`, so the notch clipping that bit FRED-124 was pre-empted here.
**Readiness needle:** finishes the settings-hub migration (the hub every settings page hangs off) — Pages Migrated 73% → ~76%, Prod Readiness 72 → mid-70s (UI coverage weighted 40 pts). Closes the last visible "old FRED" seam on the most-visited settings surface before private beta.
**Metrics (updated):** Readiness ~73/100, Piggy 77.5% (31/40), Pages ~76%, Burndown ~36.0% (32/89), Launch ~65%.
**Days since last blocker:** 13 (06-09 recorded 9; +4 clean elapsed days through 06-13; no blocker today)
**Blockers active:** none
**Lessons learned:** When carrying the tab3 hero pattern, the `.safe-area-top` class on the header div is what clears the notch — keep it (FRED-124 was reworked for exactly this). Static-only verification is acceptable as a floor when the sandbox can't serve a browser, but device-render confirmation must be explicitly handed to Andrew, not implied. When a picked mockup contains a data-backed flourish (stat strip) that the "no .ts" constraint forbids filling with real data, omit it rather than ship placeholders, and offer it as a follow-up.
**Out-of-scope follow-ups flagged (await Andrew's confirm before backlog-add):** (1) wire header greeting to real user first name (shows "Hi, Firstname"); the freedom stat strip follow-up below is now DONE.
**Reworked (2026-06-13):** Andrew rejected the omitted stat strip — "do not omit the strip… you can add .ts in no .ts rewrites because that is not a rewrite." Re-scoped: "no .ts rewrite" relaxed to "additive .ts only, don't change existing logic." Added the three-tile hero stat strip wired to REAL data (no mock numbers): **Freedom date** = `AuthService.getUserProgress().currentFreedomEstimate` (year); **Freedom age** = `currentFreedomEstimate − birthYear`, birthYear parsed from `AlpacaService.getKycData().dateOfBirth` (YYYY-MM-DD); **Dollars away** = `max(0, retirementIncome/0.04 − PortfolioService.getPortfolioDashboard().summary.equity)` (retirementIncome confirmed ANNUAL, so `/0.04` direct, no ×12), shown via a compact `$K/$M` formatter. New code is purely additive in `tab3.page.ts` (2 service injections, 4 props, `loadStatStrip()` + `formatCompactCurrency()`, one additive ngOnInit call) — every existing method/property byte-for-byte unchanged in behavior. Strip lives in `.custom-profile-header` (3 `.stat-tile` at flex:1, translucent-white on the blue gradient, `min-height:58px` to prevent layout shift, header padding-bottom 36→40px for card-overlap clearance). UX states: loading + null/error + empty-user all resolve to `—`/`$0` — no NaN/undefined can reach the DOM; all 3 subscriptions use `takeUntil(destroy$)` + error handlers. Mirrors how `my-profile.page.ts` already loads the same data (no MFU side-effect endpoint).
**Rework verification:** verifier-agent — **APPROVED, zero in-scope failures.** AC-8…AC-13 all pass with evidence: dollars-away arithmetic correct (no ×12), diff genuinely additive, tsc clean (only the two pre-existing TS5101/TS5107 deprecations, stash-baseline confirmed), loading/error/empty paths NaN-safe, strip placed in the hero header. Same sandbox caveat as the base build: no served frontend / no browser MCP, so 390×844 / 430×932 device render of the 3-tile fit is static-reasoned (3×flex:1 + min-width:0 + ellipsis ⇒ no overflow path), not screenshotted — handed to Andrew via "Looks Good."
**Lesson added:** "no .ts rewrite" ≠ "no new .ts" — when Andrew constrains a build that way, ADDING wiring (new props/methods/injections) is allowed; only refactoring/altering existing logic is off-limits. And a data-backed mockup flourish should be wired to a real same-data page (here my-profile) rather than omitted, once the constraint is clarified.
**Reworked #2 (2026-06-13):** Andrew: "the cards … do not look like option B. i thought the ngFor … would be one long card that was rounded at the top and saw a little on the blue header part?" The base build rendered the three setting groups as THREE separate-looking cards because a full-bleed gray `.section-group-spacer` (8px bar, 16px margins) sat between groups, chopping the single `.sections-card` visually into three. Fixed to match the Option B mockup exactly: removed the `.section-group-spacer` div + SCSS rule; `.sections-card` → `border-radius:16px` (all four corners, was `16px 16px 0 0`), `margin-left/right:12px`, `overflow:hidden`, kept `margin-top:-20px` so it overlaps the blue hero; group separation now a subtle in-card divider via `.settings-group:not(:first-child) .group-header { border-top:6px solid #f8fafc }` (first group no top divider), group-header padding `11px 20px 4px`; `.footer-content` background `#ffffff` → `transparent` so the floating card reads cleanly on the page bg. HTML/SCSS only — `tab3.page.ts` byte-for-byte unchanged (0-line diff). No new colors (#f8fafc/#f1f5f9/#e5e7eb already in the system).
**Rework #2 verification:** verifier-agent — **APPROVED, zero in-scope failures.** REWORK 2 manifest AC-R2-1…R2-8 all pass: spacer gone from BOTH HTML+SCSS (zero-match grep), single all-corner-rounded overflow-clipped card overlapping the blue, 6px in-card divider on 2nd/3rd groups only, footer transparent, tablet breakpoint preserved, `.ts` git-proven unchanged, tsc only the two pre-existing TS5101/TS5107 deprecations. Same sandbox caveat: no served browser, so the one-card render vs the mockup is static-confirmed (every structural property present) and handed to Andrew via "Looks Good."
**Lesson added #2:** A faithful-to-mockup directive means matching the mockup's CONTAINER structure, not just its rows — a full-bleed spacer between groups reads as separate cards even when the markup is one card. For "one continuous card" looks, separate groups with an in-card border/inset divider, never a full-width gap bar.
**Status:** Complete (reworked twice — pending Andrew's visual "Looks Good" confirmation)

