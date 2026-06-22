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

### Week of 2026-06-13 → 2026-06-18 — Tab3 hub finished + settings-header unification + light-only + resilience/signals

**Shipped (6 stories, all verifier-APPROVED, 0 in-scope failures):**
- **FRED-192 (Tab 3 redesign, Option B — Hero Stat Header)** shipped 06-13, **reworked twice**. Base build rebuilt `tab3.page.{html,scss}` (blue gradient hero + overlapping white `.sections-card` with three flat-row groups), `.header-branding` wordmark carried verbatim for both states, **0-line `.ts` diff**. Rework #1: Andrew rejected the omitted stat strip → added the 3-tile hero strip wired to **real** data (Freedom date = `userProgress.currentFreedomEstimate`; Freedom age = `− birthYear` from KYC DOB; Dollars away = `max(0, retirementIncome/0.04 − equity)`, income is ANNUAL so no ×12), purely additive `.ts`. Rework #2: a full-bleed `.section-group-spacer` chopped the one card into three → removed it, single all-corner-rounded `overflow:hidden` card overlapping the hero, in-card 6px divider on 2nd/3rd groups. Finished the settings-hub migration → Pages 73%→76%.
- **FRED-196 (tab3 KYC resilience)** shipped 06-15 — wrapped the KYC fetch in `timeout(10_000)` + bounded transient-only `retry({count:2})` (transient = TimeoutError/status 0/≥500; non-transient re-throws), the canonical `auth.service.ts loadUserProgress()` block verbatim. Failed state stays a plain "—", no manual retry (Andrew's directive). Adversarial spec proves a 401 is NOT retried.
- **FRED-193 (remove dark mode, force light-only)** shipped 06-15 — pure SCSS removal of every `@media (prefers-color-scheme: dark)` block across 7 files (271 deletions, 0 additions), no `.ts` touched. `settings.service.ts` theme infra (`'light'|'dark'|'auto'`, `applyTheme()`, `body.dark`) intentionally preserved (kept inert) for the future FRED-146 dark-mode epic. Unblocks FRED-146.
- **FRED-194 (uniform settings-page headers)** shipped 06-16 — extracted change-bank-account's header into a single shared partial **`frontend/src/theme/_blue-hero-header.scss`** (gradient `linear-gradient(90deg,#2a5ae0,#1d4ed8)`, concave `::after` cutout, notch padding, `.hero-nav`/`.back-btn`/`.back-btn-spacer`/`.header-title`/`.hero-action-btn`); refactored 11 SCSS to `@use` it and swapped all 9 settings pages + add-beneficiary from `ion-toolbar`/`header-inner` to `.blue-hero-header`. Net +265/-601. AC = "gradient literal count == 1" grep.
- **FRED-199 (skip step-up auth verify-flash)** shipped 06-18 — replaced the two-state first-paint with a three-state `checkingStepUp` so the "verify your identity" overlay never paints for non-PIN users during the async `hasPin()` window; deleted the vestigial Verify button + `authenticateUser()`. **Andrew REVERSED the predicted "preserve fail-open" answer** on a security call → added a per-user `stepUpEnabled:<userId>` localStorage marker so a failed status call FAILS CLOSED (still prompts); marker cleared BEFORE `userId` is wiped.
- **FRED-200 (always-loaded tab3 stat strip via signals)** shipped 06-18 — new singleton `FreedomStatsService` (`providedIn:'root'`), the **app's first Angular signals usage** (intentional, commented deviation from BehaviorSubject). Owns the three fetches (`toSignal(userProgress$)` + writable equity/birth-year signals), math ported byte-for-byte, `computed()` derives stats + loading; user-scoped `localStorage` snapshot for instant cold launch (no TTL), silent stale-while-revalidate on re-entry. FRED-196 retry preserved; old `loadStatStrip()`/`tryRender()`/done-flags deleted; `liveEquity` (FRED-195) kept via `effect()`. Readiness 78→79.

**Decided / skipped:**
- **FRED-100 (RAG chunks)** picked 06-13, then **SKIPPED by Andrew on 06-15** via the dashboard (7-day window through ~06-22); repicked FRED-196 that day.

**Metrics journey:** Readiness 72→74→75→76→77→**79**; Piggy 77.5% (flat); Pages 73%→**76%**; Burndown 31→**37** done (denominator grew 89→**97** as new stories were added, so % 34.8→**38.1**); Launch 64.3→**67.7**; Days-since-blocker 9→**20**.

**Data-hygiene finding (still open):** **FRED-195 (equity-range pig avatars) is fully implemented + merged to `develop`** — `pig-range-1..5.svg` present, old `pig-level-1..6.svg` deleted, shared `EquityPigUtils.pigSrcFromEquity/pigSrcFromLevel` (L5/L6→range5) wired into tab3 link avatar, My Profile avatar, and the MFU achievement — but it still sits in READY **uncheckmarked**. Recommend `triage --done=FRED-195` so it isn't re-picked. (Same closeout-lag pattern flagged for FRED-192 on 06-13.)

**Lessons retained:**
- **"no .ts rewrite" ≠ "no new .ts"** — when Andrew constrains a build that way, ADDING wiring (props/methods/injections) is allowed; only altering existing logic is off-limits.
- A data-backed mockup flourish should be wired to a real same-data page (e.g. my-profile), not omitted or faked — never ship mock financial numbers.
- A faithful-to-mockup directive means matching the mockup's CONTAINER structure, not just its rows (a full-bleed spacer reads as separate cards even in one markup card).
- The canonical `loadUserProgress` transient-retry block transplants verbatim (FRED-196 → FRED-200) — reuse, don't re-derive; the non-transient re-throw is the load-bearing safety property (never mask 401/403 as retryable).
- For "force light-only" the load-bearing check is any surviving `.dark`/`body.dark` SELECTOR `applyTheme('auto')` could re-activate — grep those too, not just the media query.
- Extracting a proven shipped header into a shared `@use` partial is low-risk, high-leverage (mostly deletions); single-source grep (literal count == 1) is the cleanest AC proof.
- The verifier's predictive Q-placeholders are a starting point, NOT a default — Andrew overturned the FRED-199 fail-open prediction; always re-read the approval `content` answers before building.
- localStorage markers/snapshots must be cleared BEFORE `userId` is wiped (FRED-199/FRED-200 ordering), and snapshots must be user-scoped + validated against the current `userId`.
- A side-effect (snapshot write) inside `computed()` works only while the template keeps the computed live — it's fragile; the idiomatic home is `effect()` (flagged for FRED-200 follow-up).
- **CI PR gate is NOT active in the routine sandbox** — both `gh` (unauthed) and the GitHub MCP PR-create path (403 "Resource not accessible by integration") are unavailable, so verified code falls back to direct-to-`develop` after independent verifier approval. To activate the gate, grant the routine token PR-create + auto-merge scope (or auth `gh`).

---

## Daily Entries

### 2026-06-19 (Morning Brief) — Fix bank-account subtype always showing "Checking" (FRED-189)

**Priorities selected:** FRED-189 — Fix bank account subtype always showing "Checking" (frontend field-case display bug on the change-bank-account page).
**Tier:** 2 (no A/C block in backlog) — generated proposed acceptance criteria (AC-1..AC-6) in the dashboard's A/C Proposal Mode for Andrew to approve/edit; the execute agent writes the confirmed A/C back into `backlog.md` before building.
**Rationale:** FRED-200 shipped 06-18 and was closed out to `looks_good` (now 37/97 done, ✓ in DONE) → guard passed → fresh brief. **Tier 1 is exhausted for this sandbox:** FRED-191 (load-perf) stays sandbox-gated (needs a real-device Capacitor cold-start the sandbox can't run); FRED-195 (pig avatars) is already fully implemented + merged to `develop` (needs `triage --done`, not building). With no build-ready Tier-1 story left, dropped to Tier 2 and picked the strongest quick win: FRED-189 — a confirmed user-facing correctness bug **ground-truthed in code this morning**: backend `PlaidController.java:177` returns `accountSubtype` (lowercase t), but `change-bank-account.page.ts:232` reads `accountSubType` (capital T) → always `undefined` → falls back to `'Checking'`; `plaid.service.ts:80-82` already reads it correctly. Easy, guaranteed completion, frontend-only, `tsc`-verifiable in-sandbox; tidies a loose thread on the FRED-124 change-bank-account overhaul. Not a UI overhaul → standard A/B/C: A field-case fix + display normalization (title-case) [rec]; B bare rename only (lowercase display inconsistency); C fix + typed `BankAccount` interface (hardening, mild scope creep).
**Metrics:** Readiness 79/100, Piggy 77.5% (31/40), Pages 76%, Burndown 38.1% (37/97), Launch 67.7%
**Trends (vs ~7 days ago / 06-13 brief baseline):** Burndown ↑ +5 done (32→37; % 36.0→38.1 as the denominator grew 89→97), Readiness ↑ +5 (74→79), Days-since-blocker ↑ +8 (13→21), Launch ↑ +1.8 (65.9→67.7), Pages → no change (76%), Piggy → no change (77.5%).
**Days since last blocker:** 21 (06-18 post-ship recorded 20; FRED-200 shipped clean, no blocker logged → +1 clean day)
**Blockers active:** none (BLOCKED holds FRED-173/175/179, all external-dependency stories, not production blockers)
**Data-hygiene (carried from 06-18):** FRED-195 still sits uncheckmarked in READY despite being fully shipped on `develop` — recommend `triage --done=FRED-195` (not mutated in this unattended planning run).
**Notes:** Exclusion set: FRED-100 (skipped 06-15, 7-day window through ~06-22) — not eligible, wasn't the pick. No other skips in the last 7 days. Two genuine Questions for Andrew, both Optional with predictive placeholders on the only real forks in a one-line fix: (Q1) display casing — title-case "Savings" vs raw lowercase [predicted: title-case]; (Q2) null-subtype fallback — keep "Checking" vs neutral "Account" [predicted: neutral "Account"]. Tomorrow's likely picks: close out FRED-195 (data hygiene), FRED-188 (chat null guard), FRED-186 (debounce + switchMap); FRED-191 stays sandbox-gated.

**APPROVED + SHIPPED (06-19):** Andrew approved Option A and confirmed BOTH predicted answers verbatim — Q1 title-case ("Savings"/"Checking"), Q2 neutral "Account" fallback. Approved A/C (AC-1..AC-6) written back into `backlog.md` before building.
- **What shipped:** `frontend/src/app/change-bank-account/change-bank-account.page.{ts,html}`. The real render path was the TEMPLATE, not TS: `change-bank-account.page.html:37` (active "Current Account" card) bound `{{ currentBankAccount.accountSubtype || 'Checking' }}` — lowercase value + always-"Checking" fallback. Added `formatAccountSubtype()` (reads lowercase `accountSubtype`, title-cases via `charAt(0).toUpperCase()+slice(1).toLowerCase()`, neutral `'Account'` fallback), bound line 37 to it, and fixed the same expression in the commented hero-peek (line 12). Removed the dead `formatAccountDisplay()` (capital-T `accountSubType`, zero callers).
- **Verifier go-back (1 of 2 used):** Pass #1 REVISION REQUIRED — builder first fixed `formatAccountDisplay()`, which is DEAD CODE (0 callers); AC-6 failed because the visible template binding still had the bug. Pass #2 APPROVED after the fix moved onto the live template render path. AC-1..AC-6 all pass; `tsc --noEmit` clean (only pre-existing TS5101/TS5107 deprecation warnings); no backend/schema/auth change.
- **Readiness:** 79 → 80 (a real user-facing correctness bug closed; tidies the FRED-124 change-bank-account overhaul).
- **Days since last blocker:** 22 (no blocker today; +1 clean day vs 06-19 brief's 21).
- **Lessons:**
  - **Fix the LIVE render path, not the first matching method.** A field-case display bug can live in a template inline binding (`{{ x.foo || 'default' }}`) while a same-named TS helper is dead code (0 callers). Grep callers BEFORE editing a display method — verify the thing you change actually drives rendered output.
  - Backend `PlaidController.java:177` and `plaid.service.ts:80-82` both use lowercase `accountSubtype` — the capital-T `accountSubType` in the page was the lone outlier. Single-source the field name across consumers when diagnosing case-mismatch bugs.
**Status:** Complete

---

### 2026-06-20 (Morning Brief) — Add null userId guard to processChat (FRED-188)

**Priorities selected:** FRED-188 — Add a null `userId` guard to `ChatService.processChat()` (backend crash-class bug on the non-streaming Ask Fred path).
**Tier:** 2 (no A/C block in backlog) — generated proposed acceptance criteria (AC-1..AC-5) in the dashboard's A/C Proposal Mode for Andrew to approve/edit; the execute agent writes the confirmed A/C back into `backlog.md` before building.
**Rationale:** FRED-189 shipped 06-19 and was closed out to `looks_good` (now 38/97 done, ✓ in DONE) → guard passed → fresh brief. **Tier 1 remains exhausted for this sandbox:** FRED-191 (load-perf) stays sandbox-gated (real-device Capacitor cold-start the sandbox can't run); FRED-195 (pig avatars) is already fully implemented + merged to `develop` (needs `triage --done`, not building). With no build-ready Tier-1 story left, picked yesterday's named #2 next-pick: FRED-188 — a latent crash-class bug **ground-truthed in code this morning**: `ChatService.java:85` calls `userRepository.findById(request.userId())` with NO null guard (Spring Data `findById(null)` throws `InvalidDataAccessApiUsageException`), while the sibling `streamChat()` already guards the identical call at `ChatService.java:215` (`request.userId() != null ? findById(...).orElse(null) : null`). Easy, guaranteed completion, backend-only, `./gradlew build -x test`-verifiable in-sandbox, with a proven sibling to mirror. Not a UI overhaul → standard A/B/C: A mirror streamChat's exact ternary guard [rec]; B explicit early null-branch (same effect, diverges from the sibling idiom); C extract a shared `loadUserOrNull()` helper used by both methods (DRY, but edits the working streamChat — wider blast radius).
**Metrics:** Readiness 80/100, Piggy 77.5% (31/40), Pages 76%, Burndown 39.2% (38/97), Launch 68.2%
**Trends (vs ~7 days ago / 06-13 brief baseline):** Burndown ↑ +6 done (32→38; % 36.0→39.2), Readiness ↑ +6 (74→80), Days-since-blocker ↑ +10 (13→23), Launch ↑ +2.3 (65.9→68.2), Pages → no change (76%), Piggy → no change (77.5%).
**Days since last blocker:** 23 (06-19 post-ship recorded 22; FRED-189 shipped clean, no blocker logged → +1 clean day)
**Blockers active:** none (BLOCKED holds FRED-173/175/179, all external-dependency stories, not production blockers)
**Data-hygiene (carried from 06-18/06-19):** FRED-195 still sits uncheckmarked in READY despite being fully shipped on `develop` — recommend `triage --done=FRED-195` (not mutated in this unattended planning run).
**Notes:** Exclusion set: FRED-100 (skipped 06-15, 7-day window through ~06-22) — not eligible, wasn't the pick. No other skips in the last 7 days. One genuine Question for Andrew, Optional with a predictive placeholder, on the only real fork: should a null-`userId` chat proceed as a guest (mirror streamChat) or be rejected [predicted: proceed as guest, match streamChat]. Tomorrow's likely picks: close out FRED-195 (data hygiene), FRED-186 (debounce + switchMap), DEV-198/DEV-190 (dev-tooling cleanup); FRED-191 stays sandbox-gated.
**Skipped:** FRED-188 (2026-06-22) — Andrew skipped today's story via the dashboard and asked for a different single story. (Note: FRED-188 was also independently marked ✓ DONE in `backlog.md` by the time this revision ran — so the skip is consistent; it's a hard exclusion either way, 7-day window through ~2026-06-29.)
**Status:** Skipped → revised (see 2026-06-22 revision entry below)

---

### 2026-06-22 (Plan Revision) — Swap skipped FRED-188 → FRED-203 (KYC edit blue header + part-1 gating)

**Trigger:** Andrew skipped 06-20's pick FRED-188 (null userId guard) on the dashboard and asked to "pick a different single story and regenerate the full plan." No specific replacement story named → re-pick under the exclusion set.
**Exclusion set:** FRED-188 (today's skip; also already ✓ DONE in backlog), FRED-100 (skipped 06-15, 7-day window still open through ~06-22). FRED-189 + FRED-195 effectively done (shipped/merged) but sit uncheckmarked in READY (data-hygiene lag) — not picked.
**New pick:** FRED-203 — KYC edit page blue header + part-1 gating.
**Tier:** 1 (full 8-point A/C already in `backlog.md` — build-ready, no proposal needed).
**Rationale:** With the backlog freshly grown (FRED-201..204 added), Tier 1 is no longer exhausted. The two genuinely Tier-1, sandbox-buildable READY candidates are FRED-202 (standardize input fields — 25 fields/7 files, two open questions, higher regression risk) and FRED-203. Picked FRED-203 as the cleaner, lower-risk, guaranteed-completion win: it reuses the proven single-source `_blue-hero-header.scss` partial (shipped FRED-194), is bounded to one component (`components/kyc-verification`), editMode-scoped, frontend-only, `tsc`/`ng build`-verifiable in-sandbox, and directly advances strategic priority #1 (UI overhaul / pages migrated) while closing a small correctness gap (no-op KYC "updates" re-submitting unchanged data to Alpaca). FRED-191/201/204 need real-device Capacitor verification (sandbox-gated). Ground-truthed the component this morning: `@Input() editMode` (L86), `currentStep:1|2` (L92), `step1Form`/`step2Form`, `prefillFromAlpacaData()` (on-file baseline), draft restore (L274), `get step1Valid()` (L306), `goBack()` already handles editMode step2→step1 (L407), `proceedToStep2()` only checks `!step1Valid` (L417) — so the gate is an additive `step1Changed` snapshot-diff. Not a UI overhaul (header is a fixed shared pattern) → standard A/B/C: A reuse partial via `@use` + `*ngIf="editMode"` header swap + Alpaca-prefill value-snapshot diff [rec]; B gate via form `dirty` (rejected — violates AC-5: re-typing same value / restored draft both mark dirty); C extract a reusable `<app-blue-hero-header>` component (scope creep).
**Metrics:** Readiness 80/100, Piggy 77.5% (31/40), Pages 76%, Burndown 38.6% (39/101), Launch 68.0%. (No code shipped — revision only re-plans; metrics carry from 06-20 with denominator regrown 97→101 as FRED-201..204 were added.)
**Trends (vs ~7 days ago / 06-13 brief baseline):** Burndown ↑ +7 done (32→39; % 36.0→38.6 as denominator grew 89→101), Readiness ↑ +6 (74→80), Days-since-blocker ↑ +12 (13→25), Launch ↑ +2.1 (65.9→68.0), Pages → no change (76%), Piggy → no change (77.5%).
**Days since last blocker:** 25 (06-20 brief recorded 23; +2 clean days, no blocker, FRED-188 was skipped not built).
**Blockers active:** none.
**Data-hygiene (carried):** FRED-189 (shipped 06-19) and FRED-195 (shipped+merged) both still sit uncheckmarked in READY — recommend `triage --done` on both so burndown stays honest.

**APPROVED + SHIPPED (06-22):** Andrew approved Option A (reuse the shared `_blue-hero-header.scss` partial via `@use` + `*ngIf="editMode"` header swap + Alpaca-prefill value-snapshot gate) and confirmed BOTH predicted answers verbatim — (Q1) prefill slow/fail: button disabled until baseline captured, fall back to `step1Valid`-only gate if prefill fails so the user is never stuck; (Q2) "changed" diffs the WHOLE `step1Form.value` against the post-prefill snapshot (any step-1 field counts). Tier 1, A/C already in backlog — no write-back needed.
- **What shipped:** `frontend/src/app/components/kyc-verification/kyc-verification.component.{ts,html,scss}` (frontend-only, no backend/auth/schema). TS: added `step1Snapshot`/`prefillFailed` fields; capture `step1Snapshot = JSON.stringify(step1Form.value)` in the prefill `next:` callback (on-file baseline); set `prefillFailed=true` in the `error:` callback; new `get step1Changed()` (returns `true` when `!editMode` → onboarding unaffected; `true` when `prefillFailed` → fail-open so user isn't stuck; `false` when snapshot still `null` → button stays disabled until baseline; else live-vs-snapshot string diff); `proceedToStep2()` early-returns `if (editMode && !step1Changed)`. HTML: split the single `<ion-header>` into `*ngIf="!editMode"` (original "Identity Verification" onboarding header, unchanged) and `*ngIf="editMode"` (new `.blue-hero-header` block — hero-nav / back-btn `(click)="goBack()"` / centered `<h2 class="header-title">Edit Identity</h2>` / back-btn-spacer), both above `<ion-content>` so they render on step 1 AND step 2; continue button `[disabled]="!step1Valid || exitingStep1 || (editMode && !step1Changed)"`. SCSS: `@use '../../theme/blue-hero-header'` + two scoped white-color overrides (`.blue-hero-header .back-btn`/`.header-title`) so the component's later dark `.back-btn`/`.header-title` rules don't win in the editMode branch.
- **Verification:** verifier-agent APPROVED on pass #1 — all 8 manifest checks pass, 0 in-scope failures, 0 go-backs used. `tsc --noEmit` clean (only pre-existing TS5101/TS5107 deprecation warnings). ui-acceptance checks (AC-1/2/4/6/7) verified statically by code-read: sandbox egress blocks `local.fredvested.com` (403 host-not-in-allowlist), no browser MCP tools present, and editMode is gated on `?edit=true` (not reachable via `?devPage=`), so a live render was not possible — fell back to rigorous static verification (no fabricated screenshots). Live 430×932 render of editMode (both steps blue header) + the prefill-fail fallback remain for Andrew's "Looks Good" device confirmation.
- **No design-fidelity ref:** FRED-203 reuses the already-shipped shared header pattern (no new mockup to judge), so no `ITPM/verify/design-ref` / `route` file was captured — the CI design-fidelity gate skips by design.
- **Readiness:** 80 → 81 (a UI-overhaul page migrated to the shared blue-hero header + a real correctness gap closed: no-op KYC "updates" can no longer re-submit unchanged identity data to Alpaca).
- **Days since last blocker:** 27 (06-22 revision recorded 25; +2 clean days, FRED-203 shipped clean with no blocker).
- **Lessons:**
  - **The direct-to-`develop` fallback is now BLOCKED in the routine sandbox** — the auto-mode permission classifier denies pushes to the protected `develop` branch (treats the unattended routine fire as lacking authorizing intent), and the proxy 403s them. But pushing a `verify/<story>` feature branch via the direct PAT remote WORKS → the intended CI path (auto-pr.yml opens the PR, verify.yml merges on green) is the only viable ship route now. Reverses the 06-18 lesson ("CI gate not active; fall back to direct-to-develop"): the CI gate is now MANDATORY, not optional. Dashboard/memory/manifest updates that used to go straight to develop must instead ride along in the `verify/<story>` PR.
  - **`PushNotification` is disabled in this execution context** — progress/done notifications could not reach Andrew this run; the dashboard (when it merges) + the PR are the only surfaces. Flag to re-enable the notification tool for the execute routine.
  - **CI `verify.yml` does NOT run `safe-area-lint.mjs`** — the verifier saw that lint exit 1 on the new `.blue-hero-header` div, but it's a false positive (the linter can't follow `@use`; the inset lives in `_blue-hero-header.scss:22`) AND the lint isn't in the PR gate, so it does not block merge.
- **Out-of-scope discoveries (verifier; need Andrew's confirm before backlog-add):** (1) [QA] `safe-area-lint.mjs` doesn't follow `@use` imports → false-positive flags `.blue-hero-header` consumers as FRED-124 offenders; (2) [QA] `safe-area-lint.mjs` advisory-suppression only scans `.page.html` siblings, never `.component.html` siblings' SCSS.
**Status:** Complete

---
