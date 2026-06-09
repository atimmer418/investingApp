# FRED ITPM Routine Memory

> Maintained by the ITPM routine. Entries compress automatically after 7 daily entries to weekly, 5 weekly to monthly.

---

## Monthly Summaries

*(none yet)*

---

## Weekly Summaries

*(none yet)*

---

## Daily Entries

### 2026-06-09 — Tab 3 (Settings) Page UI Redesign — DIRECTION PICK (FRED-192)

**Priorities selected:** FRED-192 — Redesign Tab 3 (Settings) Page UI
**Tier:** 1 (A/C ready) — FRED-192 already carries a Summary + Acceptance Criteria block in `backlog.md`, so no triage gap; build-ready.
**Rationale:** Natural successor to FRED-124 (which shipped 06-06). FRED-124 migrated the last *standalone* settings page, but Tab 3 — the hub every settings page hangs off — is still on the old look. FRED-192 is a UI overhaul, so per the skill it's presented as three phone-frame mockups (not text options); the chosen direction becomes its own build story. Pure visual lift (HTML+SCSS only, no backend/auth/schema), Medium difficulty, guaranteed completion, directly advances the #1 strategic priority (complete UI overhaul on all remaining pages). Tier-1 candidates today were only FRED-192 and FRED-191; FRED-191 (perf measurement) needs a running Capacitor build/real device the sandbox can't guarantee, so FRED-192 was the cleaner, lower-risk pick under the Easy/Medium bias (readiness 72 < 75).
**Mockups presented:** A — Elevated Grouped Cards (Recommended; white-section-card pattern consistent with security-settings/my-profile/change-bank-account); B — Hero Stat Header (blue header carries a Freedom-date / "Ahead of 85%" stat strip); C — iOS Inset Grouped List (Apple-Settings-style inset rows, airy/flat). All three keep the blue-header concept (avatar + "My Account" welcome + "FRED" wordmark) and preserve all content/actions.
**Metrics:** Readiness 72/100, Piggy 77.5% (31/40), Pages 73%, Burndown 34.8% (31/89), Launch 64.3%
**Trends (vs 05-31 baseline):** Burndown ↑ +3 done (28→31; note burndown % dipped 36.5%→34.8% only because the denominator grew 85→89 as new stories FRED-185–192/DEV-190/LPFRED-184 were added — completed count rose). Piggy ↑ +7.5, Pages ↑ +3, Readiness ↑ +5, Launch ↑ +4.3, Days-since-blocker ↑ +8.
**Days since last blocker:** 9 (06-06 recorded 6; +3 clean days for 06-07/08/09 — routine did not run 06-07/06-08, so caught up by elapsed clean days rather than a flat +1)
**Blockers active:** none
**Notes:** FRED-191 parked as a future pick (needs live-build/device measurement). Tomorrow's likely pick: the FRED-192 implementation story once a direction is approved.
**Status:** Pending approval from Andrew

---

### 2026-06-06 — Change Bank Account Page Redesign — SHIPPED (FRED-124)

**Priorities selected:** FRED-124 (approved by Andrew on 2026-06-06)
**Tier:** 2 — proposed A/C approved as written; written into `FREDdocs/backlog.md` under FRED-124 before build.
**What shipped:** Full UI overhaul of `frontend/src/app/change-bank-account/change-bank-account.page.{html,scss}` — reskin only, zero `.ts` logic changes. Implemented **Option C (Hero-Led)** per Andrew's feedback: blue gradient hero header with a concave white cutout (tab3 `.custom-profile-header` pattern), white content sitting over the blue, **centered** header title with left back button (security-settings pattern). Card order top-to-bottom: current-account display → linkplaid **illustration card** (account_balance + sync_alt tiles, reused from linkplaid.component) → **"Connect a New Bank" CTA card** with Plaid trust messaging. All four UX states designed (loading spinner / empty dashed "No bank linked yet" card / error + retry button / success confirmation). Plaid flow + step-up PIN check (`openPlaid()`) preserved untouched. Also fixed a pre-existing field-case bug surfaced by the verifier: template bound `accountSubType` but backend returns `accountSubtype` — corrected both bindings so the real account type now displays instead of always falling back to "Checking".
**Verification:** verifier-agent APPROVED — all 8 A/C pass, type-clean (only pre-existing repo-wide tsconfig deprecation warnings), no palette/font violations, no regressions (only entry point is tab3 route; `goBack()` + success path intact). **Caveat:** verifier Phases 2 (live API) and 3 (browser render at 390×844 / 430×932) could NOT run in the sandbox (backend down, `local.fredvested.com` host blocked, Angular CLI absent) — live API status codes and the rendered four states should be spot-checked by Andy in a running environment before release.
**Readiness needle:** FRED-124 was the last unmigrated settings page, so shipping it moves **Pages Migrated 70% → ~73%** and nudges **Prod Readiness 71 → ~72** (UI coverage weighted 40 pts). Closes the "no half-old/placeholder pages" gate for this screen ahead of private beta.
**Metrics (updated):** Readiness ~72/100, Piggy 77.5% (31/40), Pages ~73%, Burndown ~36.5% (31/85), Launch ~64%.
**Days since last blocker:** 6 (incremented; no blocker today)
**Blockers active:** none
**Lessons learned:** The linkplaid illustration card transplants cleanly when its `--plaid-*` CSS vars are substituted with FRED palette literals. The tab3 blue-header-over-white pattern needs the `&::after` cutout bg to exactly match `ion-content --background`. Pre-existing `accountSubType`/`accountSubtype` case mismatch is now fixed here; `formatAccountDisplay()` in the TS still has the old casing but is no longer called by the template.
**Reworked (2026-06-07):** Andrew reviewed on a real iPhone — the blue hero header (back button + "Change Bank Account" title) was rendering under the notch/status bar and getting clipped. Root cause: the hero is a plain `<div class="blue-hero-header">` inside `<ion-header>` with no `ion-toolbar`, so it never received Ionic's automatic top safe-area padding. Fix: changed the `.blue-hero-header` top padding from a flat `10px` to `calc(env(safe-area-inset-top, 0px) + 10px)` — clears the notch on notched iPhones (390×844, 430×932) and keeps a 10px gap, while resolving to exactly 10px (no regression) on non-notched devices. One-line SCSS change, scope-confirmed to `change-bank-account.page.scss` only; `.ts`/`.html`/backend untouched. verifier-agent APPROVED (5/5 checks; static safe-area lint clean; tsc clean). **Lesson:** when copying the tab3 hero pattern, carry the `safe-area-top` handling too — tab3 applies the global `.safe-area-top` class on its header div; any raw-div-in-ion-header pattern must explicitly honor `env(safe-area-inset-top)` or it will sit under the notch.
**Status:** Complete (reworked 2026-06-07)

---

### 2026-06-04 (revised) — Bank Account UI Overhaul (single-story)

**Priorities selected:** FRED-124 (was FRED-100 — skipped by Andrew)
**Tier:** 2 (UI overhaul; no A/C in backlog → proposed A/C generated for approval)
**Rationale:** Andrew skipped FRED-100 and asked for "the bank account UI story… FRED-141?". FRED-141 is actually a post-beta feedback/reviews item; the real bank-account-UI story is FRED-124 ("change bank account ALMOST DONE needs entire UI lift"). Re-planned around FRED-124: it's the last unmigrated settings page, so it's the only pick that moves Pages Migrated off 70% and lifts the readiness score (UI coverage weighted 40 pts). Pure visual lift on an existing, working Plaid flow — no backend/auth/schema. Dashboard regenerated as a UI-overhaul brief: three phone-frame design directions (A Airy Minimal [rec], B Trust-Forward, C Hero-Led) + a proposed-A/C section for approval.
**Metrics:** Readiness 71/100, Piggy 75% (30/40), Pages 70%, Burndown 35.3% (30/85), Launch 62.7% — all unchanged (nothing shipped yet; re-plan only).
**Trends:** Flat vs the earlier 06-04 plan. If FRED-124 ships, Pages → ~73% and Readiness ticks up.
**Days since last blocker:** 5 (unchanged same-day re-plan)
**Blockers active:** none
**Skipped:** FRED-100 (2026-06-04) — hard exclusion; do not re-pick before 2026-06-11.
**Notes:** Andrew's story-number guess (FRED-141) was off; logged the disambiguation so future picks map "bank account UI" → FRED-124. Open question carried into the plan: pure reskin vs. adding multi-account management (recommended reskin-only, multi-account as a follow-on story).
**Status:** Pending approval from Andrew

---

### 2026-06-04 — RAG Knowledge Chunks (single-story)

**Priorities selected:** FRED-100
**Tier:** 1 (A/C ready)
**Rationale:** Skill now mandates exactly ONE story per day. FRED-100 is the only cleanly buildable Tier-1 A/C-ready story left (FRED-101 founder-gated on email provider/SMTP, FRED-169 is App Store Connect config); it grounds Ask Fred in canonical knowledge — Boglehead thesis, exact MFU math, app navigation. Nothing shipped since 06-03 (FRED-100 still 💤), so it remains the top build-ready item. FRED-188 parked to tomorrow rather than picked as a second story.
**Metrics:** Readiness 71/100, Piggy 75% (30/40), Pages 70%, Burndown 35.3% (30/85), Launch 62.7%
**Trends:** All flat day-over-day (no build shipped since 06-03). Week-over-week vs 05-31: Burndown ↑ +2, Piggy ↑ +5.0, Readiness ↑ +4, Launch ↑ +2.7, Pages → no change.
**Days since last blocker:** 5 (incremented; no blocker logged in 06-03 entry)
**Blockers active:** none (FRED-101 founder-gated on email provider + SMTP creds — a prerequisite, not a logged blocker)
**Notes:** Prior 06-03 brief picked FRED-100 + FRED-188 (two stories) and closed to looks_good without either shipping to the backlog. Re-picked FRED-100 alone under the one-story rule.
**Status:** Pending approval from Andrew

---

### 2026-06-03 — RAG Knowledge Chunks + Chat Null Guard

**Priorities selected:** FRED-100 (+ FRED-188)
**Tier:** Mixed — #1 FRED-100 is Tier 1 (A/C ready); #2 FRED-188 is Tier 2 (A/C generated by triage, pending approval)
**Rationale:** FRED-100 is the only cleanly buildable A/C-ready story left (FRED-101 blocked on founder email-provider decision, FRED-169 is App Store Connect config); it grounds Ask Fred in canonical knowledge. With Tier 1 exhausted after that, the #2 slot dropped to a Tier 2 quick win, FRED-188, a one-line NPE guard in chat.
**Metrics:** Readiness 71/100, Piggy 75%, Pages 70%, Burndown 35.3% (30/85), Launch 62.7%
**Trends:** Burndown ↑ +2 (28→30 completed; FRED-116 + FRED-117 shipped since 05-31), Piggy ↑ +5.0, Readiness ↑ +4, Launch ↑ +2.7, Pages flat (FRED-124 still unshipped)
**Days since last blocker:** 4
**Blockers active:** none (FRED-101 is founder-gated on email provider + SMTP creds — a prerequisite, not a logged blocker)
**Notes:** Piggy metric methodology carried forward from prior run (completed core stories / 40). Trend baseline is the 05-31 entry (no entry exists ~7 days back; 06-01/06-02 had no ITPM run).
**Status:** Pending approval from Andrew

---

### 2026-05-31 — Bank Account UI + Review Prompt

**Priorities selected:** FRED-124 + FRED-116
**Rationale:** FRED-124 is the last major unpolished settings page — migrating it directly lifts pages-migrated % and readiness score. FRED-116 wires the App Store review prompt at peak user satisfaction (first MFU dismiss) with no backend changes — highest-leverage retention action in the backlog.
**Metrics:** Readiness score: 67/100 | Piggy Tier: 70.0% | Pages migrated: 70% | Burndown: 32.9% (28/85) | Launch readiness: 60.0%
**Days since last blocker:** 1
**Status:** Pending approval from Andrew

---

### 2026-05-30 — ITPM Initialized

- ITPM routine established and committed to repo
- fred_vision.md seeded with FRED mission, philosophy, UI principles, and strategic direction
- Cloudflare Pages project to be created for today.fredvested.com pointing to ITPM/routine/
- 9am EST daily schedule to be activated
- Metrics baseline:
  - % pages migrated to new UI/UX: ~70% (onboarding series complete, some settings/tab pages remaining)
  - Days since last production-ready blocker: tracking begins today (0)
  - Production readiness score: 55/100 (estimated baseline)
