# FRED BACKLOG

> Auto-organized by status: Ready → Sleeping → Blocked → Done.
> The ITPM Looks-Good trigger checkmarks the finished story and re-sorts this file.

# ✅ READY — Most Suitable for Next Work
_No status marker. These are the candidates the ITPM routine should pick from first._

## LPFRED-184 — Update LP calculator to net-income yield model
Update the landing page calculator so it calculates based on a net income per month (instead of yearly pre-tax salary). Logic: multiply desired monthly net income by 12 → divide by 0.04 (4% tax-exempt yield) to get target portfolio value. Then use 10% annual growth with compound interest and DRIP to calculate how long it takes to reach that value given the user's monthly investable income.

## FRED-186 — Update API searches to use debounce and switchMap
update all api searches to use debounce and switchMap

## FRED-187 — Investigate Plaid paycheck-triggered investment flow
check on if its possible to trigger an investment when the user's paycheck is seen via Plaid

## FRED-189 — Fix bank account subtype always showing Checking
Backend `GET /api/plaid/primary-bank-account` returns the field `accountSubtype` (lowercase t) at `PlaidController.java:177`. The frontend `change-bank-account.page.ts` stores the raw response (`this.currentBankAccount = response`, line 85), then `formatAccountDisplay()` reads `this.currentBankAccount.accountSubType` (capital T, line 232) — always undefined, so the displayed subtype always falls back to 'Checking' regardless of the user's real account type (Savings, etc.). Fix: read `accountSubtype` (lowercase t) at `change-bank-account.page.ts:232` to match the backend; `plaid.service.ts:80-82` already reads it correctly. Pre-existing, user-facing; related to FRED-124.

## DEV-190 — Resolve @capacitor peer conflict (drop --legacy-peer-deps)
`@capacitor/push-notifications@8.1.1` requires `@capacitor/core@>=8`, but the repo pins `@capacitor/core@7.2.0` (the rest of `@capacitor/*` is on 7.x). A plain `npm install` ERESOLVE-fails and only succeeds with `--legacy-peer-deps`, which silences all peer-dependency checks and can mask real breakage. Fix: either downgrade `@capacitor/push-notifications` to a 7.x-compatible release, or upgrade the whole `@capacitor/*` suite to 8.x together.

## FRED-191 — Measure and optimize app loading performance
use network waterfall and core web vitals to measure loading time for app and then optimize initial loading time and other timings that could be optimized

### Summary
Baseline the app's cold-load performance — network waterfall + Core Web Vitals, including the Capacitor iOS webview — rank the biggest contributors, then optimize the top 2–3 using existing patterns and re-measure on a local build to prove a measurable improvement. No hard time target.

### Acceptance Criteria
1. Baseline captured on a local build, measuring the Capacitor iOS webview cold start (desktop Chrome for waterfall detail): network waterfall + Core Web Vitals (LCP, FCP, TTI, TBT, CLS), largest contributors listed.
2. Top contributors to initial load ranked by impact.
3. Top 2–3 bottlenecks optimized using existing-pattern techniques only (lazy-load gaps, eager providers, font/image preload, deferred startup work in app.component.ts, build budgets) — no new architecture.
4. Same-method re-measurement shows a measurable reduction (no specific time target required).
5. `npx tsc --noEmit` exits 0 and `ng build` succeeds within budgets.
6. Before/after numbers written up.

## FRED-195 — Equity-range pig avatar for profile & MFU
in the directory PersonalTypeshit/FRED Logo, there are 5 pig directories with ranges each containing an svg. these svgs (the non-blackandwhiteversion) should be copied to an assets directory on the frontend of FRED, the ranges should be the range of the user's total equity, so when the user's total equity is within that range, the profile picture in the my profile link from tab 3 should display that svg and same with the actual profile picture within the my profile page. also, the mfu achievement that displays in the mfu should show this svg as well when that respective new bottom range of total equity has been achieved

### Summary
Copy the 5 non-B&W pig SVGs (one per total-equity range: $0–1k, $1k–10k, $10k–100k, $100k–1m, $1m+) from `PersonalTypeshit/FRED Logo/FREDpig$*` (a sibling of the FRED repo — `PersonalTypeshit` contains both `FRED` and `FRED Logo`) into `frontend/src/assets/images/`, then drive three avatars off the user's total-equity range: the profile picture on tab3's "My Profile" link, the avatar on the My Profile page, and the pig in the MFU achievement. The two profile avatars use the user's LIVE total equity (`summary.equity`); the MFU achievement reflects the equity tier achieved in that MFU. The new 5-range art fully replaces the existing `pig-level-1..6.svg` set (old files deleted), mapping the backend `equityLevel` levels 5 & 6 → the single $1m+ pig. Done when each of the three spots shows the SVG matching the right equity range.

### Acceptance Criteria
1. The 5 non-B&W pig SVGs (`pig$*.svg`, not `blackandwhiteversion.svg`) are copied from `PersonalTypeshit/FRED Logo/FREDpig$*/` (sibling of the FRED repo) into `frontend/src/assets/images/` with URL-safe filenames (source names contain `$`/`+` and must be sanitized); the range→file mapping is documented.
2. A single shared helper maps a total-equity value → one of the 5 range SVGs ($0–1k, $1k–10k, $10k–100k, $100k–1m, $1m+). Backend `equityLevel` L5 & L6 both map to the $1m+ pig. No duplicated threshold logic across the three spots.
3. The tab3 "My Profile" link avatar (`tab3.page.html`, currently a hardcoded Ionic placeholder) shows the pig SVG for the user's LIVE total-equity range (`summary.equity`).
4. The My Profile page avatar shows the same range pig driven by LIVE total equity (`summary.equity`), replacing the old `pig-level-${level}.svg` that read the stale MFU `equityLevel`.
5. The MFU achievement shows the range pig for the equity tier achieved in that MFU (MFU-derived), replacing `pig-level-${validLevel}.svg`, when a non-DEFAULT milestone is achieved.
6. The two profile avatars are consistent for the same user (both off live equity); zero/null/empty equity falls back to the $0–1k pig — no broken `<img>`.
7. The old `pig-level-1..6.svg` assets are deleted entirely (full replacement); frontend compiles cleanly with no broken image references and no remaining references to the old files.

Decisions (Andy): profile avatars use LIVE equity; old pig-level art fully replaced; L5 & L6 → $1m+ (5 ranges only). Est. 1-3hr, [code].

## DEV-198 — Eliminate package-lock.json libc-field churn in diffs
npm writes platform-specific `libc`/`os`/`cpu` fields into `package-lock.json` that differ between environments (the itpm routine cloud sandbox vs local vs GitHub Actions CI), producing noisy lockfile diffs that have to be reverted to keep PRs clean. Find a stable fix so `package-lock.json` stays identical across the routine sandbox, CI, and local — e.g. an `.npmrc` setting, pinning the npm version used everywhere, a normalize/commit-hook step, or omitting the optional-deps platform fields. Surfaced by the verifier during an itpm run on 2026-06-15.

## FRED-201 — Keep loading screen up during cold-start reauth nav
add story for painting the loading screen while navigation is happening instead of just showing an all blank white screen after a cold start with reauth. the loading screen should stay until the page underneath it is ready to appear and then it should disappear. this only happens on cold starts and after a reauth so that workflow should be the only one adjusted/modified to receive this fix

### Summary
On a cold start that requires reauth, after the passkey ceremony succeeds the app shows an all-blank white screen during navigation instead of the loading cover. Keep the existing loading cover (the `coin-drop` Lottie over white — `#app-resume-cover` in `index.html`) painted continuously through the cold-start → reauth → navigate sequence, and only hide it once the destination page underneath has actually rendered. Scope is strictly the cold-start + reauth workflow.

### Acceptance Criteria
1. Cold start (app fully terminated, not a resume) with reauth required (JWT expired and/or App Lock on) → after passkey success, no all-blank white screen during navigation; the loading cover (coin-drop Lottie over white) stays painted.
2. The loading cover remains continuously visible from native-splash hide → passkey reauth → route navigation, with no intermediate white frame.
3. The cover is hidden only after the destination routed view has actually painted beneath it — "page ready" detection is strengthened beyond `preloadAssetsForRoute`'s font/image preload + rAF (e.g. await the routed component's view being present/stable in the DOM) so the cover never hides over a blank view.
4. Scope limited to cold-start + reauth only: the background-resume path, the normal cold-start-without-reauth path, and the dev `?devPage=` path keep their current cover timing (no regressions).
5. Safety nets intact: the 12s `hideAllCovers()` watchdog in `ngOnInit`, the 20s `index.html` backstop, and `forceRecovery()` still force-hide the cover so a user is never permanently trapped behind it.
6. Clean single handoff: no new white flash, no double-hide, no cover flicker at the cover→page transition.
7. `npx tsc --noEmit` exits 0; verified on a local Capacitor iOS build (or 430×932 webview) by reproducing the cold-start + reauth flow and confirming a seamless cover-to-page handoff.

## FRED-202 — Standardize input fields to onboarding styling (except profile)
except for my profile, standardize all text and character input fields to be like how the onboarding's are in terms of styling. [Confirmed: the onboarding input styling = the `.field-input` / `.field-label` pattern, defined in kyc-verification and investment-schedule. surveyinitial uses range sliders, stockselection uses an ion-searchbar, investmentconfirmation uses TOS checkboxes, get-started/linkplaid have no inputs.]

### Summary
Make every text/character form input in the app look like the onboarding's fields — the `.field-input` / `.field-label` Manrope underline style (Manrope 17px/500 text, 11px/700 uppercase #6b7280 label, transparent bg, 2px #2563EB bottom-border, red error state). Replicate that style into one shared SCSS source for the non-onboarding pages and apply it there. Onboarding, My Profile, recovery, and authfinalize are finalized/excluded and must not be touched.

### Acceptance Criteria
1. A shared SCSS source of truth replicating the onboarding `.field-label` + `.field-input` underline style (new `theme/_form-fields.scss` imported via `global.scss`, or equivalent) is created for the non-onboarding pages. The onboarding component SCSS is NOT modified — the shared partial mirrors the canonical values (intentional duplication is acceptable to avoid touching finalized onboarding).
2. Every text/character form input that is NOT in My Profile, NOT in onboarding, and NOT already-finalized (recovery, authfinalize) is restyled to match: add-beneficiary (12), retirement-planning (6), lump-sum-investment (2), change-email (2), portfolio-customize (1), recurring-investments (1), sell-withdraw (1) — 25 fields across 7 files.
3. Labels, placeholders, focus state, and error/validation state on those fields all match the onboarding pattern (uppercase #6b7280 label, blue underline, red error treatment).
4. Left completely untouched: My Profile; ALL onboarding components (kyc-verification, investment-schedule, surveyinitial, stockselection, investmentconfirmation, get-started, linkplaid); recovery; authfinalize.
5. No visual regression on any untouched surface (onboarding, My Profile, recovery, authfinalize).
6. Not restyled as form fields (documented exclusions): the `document-upload` `type="file"` control; and — pending Andy's call — the `<ion-searchbar>` search fields and the `ai-chat` `<ion-textarea>` composer.
7. `npx tsc --noEmit` exits 0; `ng build` succeeds within budget; every restyled field verified at 430×932 (and 390×844) with no broken alignment, clipped labels, or lost validation.

Open questions (Andy to confirm): (a) are the `<ion-searchbar>` search fields and ai-chat `<ion-textarea>` composer in scope? (recommend exclude); (b) convert `<ion-input>` → native `<input class="field-input">` for a pixel match, or approximate via Ionic CSS vars? (recommend convert).

## FRED-203 — KYC edit page blue header + part-1 gating
make the update/edit KYC page linked to from security-settings have the blue header that security settings has for both parts of the kyc update. also, a user should not be able to proceed from part 1 to part 2 in kyc if the data in part 1 has not been updated from its current values. make sure that the kyc page only has the blue ion header in editMode and not the 'Identity Verification' onboarding flow step

### Summary
The KYC component serves two flows: onboarding "Identity Verification" (`editMode = false`) and the edit-KYC page from security-settings (`editMode = true`). EditMode-only: (1) give the edit flow the shared blue hero header security-settings uses, on both step 1 and step 2; (2) keep the blue header out of onboarding (keeps its plain header); (3) block advancing part 1 → part 2 until the user changes at least one step-1 field from its current on-file value.

### Acceptance Criteria
1. In editMode, the page renders the shared blue hero header (blue gradient + concave white cutout + centered white title + back button), the same `blue-hero-header` security-settings uses, on BOTH step 1 and step 2.
2. The blue header renders ONLY in editMode; onboarding mode (`editMode = false`, "Identity Verification") keeps its existing non-blue header, and the blue-hero styles do NOT leak into onboarding (the partial must be scoped since one component serves both modes).
3. The editMode header reuses the `theme/_blue-hero-header.scss` partial via `@use` (not a re-implemented copy); back button calls existing `goBack()`; title is "Edit Identity".
4. In editMode, the user cannot proceed part 1 → part 2 unless at least one step-1 field changed from its on-file value: the continue button is disabled AND `proceedToStep2()` is a no-op while step 1 still equals the prefilled values.
5. "Changed" = current step-1 form value vs a snapshot of the Alpaca-prefilled values captured after the prefill HTTP resolves (re-typing the same value is not a change); existing `!step1Valid` validation still applies.
6. Gating applies only in editMode; onboarding step 1 → step 2 is unaffected.
7. The existing localStorage step-1 draft restore and step-transition animation still work; a restored draft equal to on-file values counts as "not changed."
8. `npx tsc --noEmit` exits 0; verified at 430×932: editMode blue header on both steps, onboarding original header, part-1 gate enables/disables correctly.

## FRED-204 — Fix white flash in static→Lottie reauth transition
on a cold start and reauth is needed. when the static transitions into the lottie, there is a very brief white screen that displays (im talking like 0.1s like its just a slight flash) that we do not want to see. we want this transition to be seamless

### Summary
On a cold start (most visible when reauth keeps the cover up), the loading cover swaps its static fallback image for the coin-drop Lottie and a ~0.1s white flash shows through. Cause: `index.html` hides the static `#app-resume-cover-fallback` synchronously the instant `lottie.loadAnimation()` returns — before the Lottie paints its first frame — exposing the white `#app-resume-cover` background. Fix: hide the static fallback only after the Lottie's first frame renders, so the handoff is seamless.

### Acceptance Criteria
1. On cold start, no white flash between the static fallback image (`#app-resume-cover-fallback`) and the coin-drop Lottie — the white `#app-resume-cover` background is never visible in the gap.
2. The static fallback is hidden only AFTER the Lottie renders its first frame (driven by a lottie-web render event, e.g. `DOMLoaded` / first `enterFrame`), not synchronously right after `loadAnimation()` returns (current `index.html` line 70).
3. Seamless transition: no white gap, no flicker, no double-image (a short cross-fade is acceptable but optional).
4. Fallback safety preserved: if the Lottie fails to load (404 / parse error / no render event), the static fallback stays visible — it is removed only on a confirmed first render.
5. No change to the cover show/hide lifecycle (`showAppCover`/`hideAllCovers`, the 20s `index.html` backstop, `_fredCoverAnim.play()` on resume) beyond the fallback-hide timing.
6. Verified on a cold start (app fully terminated) with reauth required, on a local Capacitor iOS build (or 430×932 webview): no white flash during the static→Lottie transition.


# 💤 SLEEPING — Backlog (not yet started)
_Queued but not prioritized. Promote to READY (remove the 💤) when ripe._

## FRED-100 — 💤 RAG chunks for app knowledge and philosophy
we want RAG/canonical chunks for knowing the application itself (to answer questions with exact directions on where to find things or an overview of just about every how process in the app works that there needs to be known about such as the calculations for the MonthlyFreedomUpdate and also a chunk on the boglehead philosophy) and its context as to how this helps the user achieve a good retirement. also, are there any good RAG/canonical chunks that would be valuable for the user to have FRED know in the FREDdocs .md files?

### Acceptance Criteria
1. `bogleheads_philosophy_v1` — Bogle/Vanguard origin, three tenets (diversify broadly, minimize costs, stay the course), why index funds beat active managers, how FRED's default portfolio + automation implements this
2. `monthly_freedom_update_explained_v1` — every MFU modal section: periodProgressDelta (endEquity − startEquity), returnRate formula ((delta − contributions) / startEquity), daysBoughtBack formula, statusPercentile, currentStreak, bestNextMove card, quarterly compare trigger (every 3rd MFU)
3. `app_navigation_guide_v1` — where to find every major feature: Tab 1 (portfolio dashboard, chart, holdings), Tab 2 (education/strategies), Tab 3 (Ask Fred chat), recurring investments, one-time investments, portfolio customization, account settings (security, email, beneficiaries, bank, sell/withdraw, tax docs)
4. All three use existing `CanonicalChunk(id, title, content, version, topic, riskLevel, active)` signature with `active: true`
5. `./gradlew build -x test` exits 0

## FRED-101 — 💤 Set up emailer for all transactional notifications
set up emailer for ach deposit/withdraw notifications of confirmation it went thru, placing trades (and sending the trade confirmation document to their email?) and acquiring the positions confirmation email and account verification email. the only notifications from the app will come thru email (account statements? trade confirmations? tax forms available? and implement the pseudocode for the acats transfer emails, the one email should be sent to two recipients: alpaca and help@fredvested.com) and recovery email otp for if you already had an account. we should send a successful transfer completion notification email to the user; add in my profile somewhere that will show a warning that your email has not been verified yet; check if updating email works too

### Acceptance Criteria
1. [Founder unblocks] Choose email provider (Resend or SendGrid rec'd), add SMTP credentials to Railway env + local .env
2. Add `spring-boot-starter-mail` dependency to `build.gradle`
3. `JavaMailSender` wired into `EmailService` — when `app.email.enabled=false` (local) logs only, otherwise sends HTML+text email
4. `RecoveryController` sends OTP to user's inbox instead of printing to stdout
5. ACATS pseudocode in `AlpacaService` (lines 990–1008) activated — sends to `support@alpaca.markets` + `help@fredvested.com`
6. `User.java` gets `emailVerified` boolean (default false)
7. My Profile shows "Email not verified" warning if `emailVerified: false`
8. Both `./gradlew build -x test` and `npx tsc --noEmit` exit 0
9. Manual smoke: account recovery OTP arrives in inbox

## FRED-102 — 💤 Preserve 430x932 layout across all iPhone models
I am on the 14 Max Pro iPhone model display on inspect element/devTools (430x932), I want the current layout of the app as for how it displays on this iPhone 14 Max Pro model (i.e. 430x932) ENTIRELY PRESERVED, which regards the spacing, the positioning of all elements and how everything looks exactly how it looks currently (which includes how all the text is positioned and not wrapping onto a new line in this display), should display with the same spacing and that same positioning on all the other models. How should we do this? Should we convert all css to use vw/vh and rem/em? Should we add these css media queries (@media screen and (max-width: 400px))? Should we convert everything to a flexbox display/grid layout? Should we give the current html and scss code to a bootstrap or tailwind css optimizer or something that can take it and make it a response design based on the original width and height we want the layout preserved on?

## FRED-103 — 💤 iOS Xcode plugin build target and EXPO investigation
After syncing capacitor copy ios, you'll need to ensure the new KeychainSyncPlugin.swift is included in the Xcode project's build target. Capacitor custom plugins placed in App/App/ are typically picked up automatically, but double-check in Xcode that the file appears under the App target's "Compile Sources" build phase. look into EXPO for deploying to app store?

## FRED-104 — 💤 Give Claude JWT testing and frontend navigation tools
give claude a way to verify things like...
- a jwt token to test its code outputs for the backend
- a way for claude to navigate to any frontend page and test functionality

## FRED-105 — 💤 MCP setup for Railway and MySQL databases
[MCP Setup]: add mcp for railway (user-scoped) and mysql (local-scoped)

## FRED-109 — 💤 Change investment question to work-optional framing
Instead of: "How much do you want to invest?", Ask: "When do you want work to be optional?"

## FRED-121 — 💤 Check for tax documents in Feb/March 2026
check for tax documents in feb/march 2026

## FRED-128 — 💤 Tax documents verify PDF display on phone
tax documents page is ALMOST DONE; need to verify how it pdfs look and work on phone

## FRED-132 — 💤 Three shirt designs plus limited founders edition
for the shirts, make 3 unique front and back designs and then 1 limited edition founders design. talk to Han

## FRED-134 — 💤 Test profile picture quality and speed on phone
test pfp quality and speed of loading pictures on phone

## FRED-135 — 💤 Test scrollbar height and fade on phone
test scrollbar height and scrollbar fade on phone

## FRED-137 — 💤 Check Ethan's Plaid account transaction details
Check the Ethan plaid account for transaction details

## FRED-138 — 💤 Add legal information and TOS to app
add legal information and TOS
[merged from FRED-127: legal info ALMOST DONE just needs privacy policy and TOS]

## FRED-139 — 💤 Secure securities attorney and Alpaca review
this app needs to be reviewed by a securities attorney, then alpaca; the core ACCEPTABLE concept is "Based on these assumptions, if x, then y"

## FRED-140 — 💤 Plan landing page go-to-market strategy
once app is released, use landing page to sell. have mobile and web version. mobile will link them to the download, web will quiz and ask them for their email maybe or another way to get them to download?

## FRED-141 — 💤 Respond to feedback and prompt in-app reviews
respond to user feedback and ask for reviews

## FRED-142 — 💤 Add monthly MFU notification first day 8am
add mfu notification? (first day of every month at like 8am)

## FRED-143 — 💤 Activate referral rewards merch and price discount
activate user's referrals (for founder members: merch, non-founder members: price discount)

## FRED-144 — 💤 Apple Business Connect KYC wallet verification setup
set up verify with wallet for kyc part on apple business connect

## FRED-145 — 💤 Convert Angular frontend to native Xcode app
convert angular to xcode

## FRED-146 — 💤 Dark mode with phone-inherited color scheme
we want to make a dark mode, give me all the colors that fred currently uses and we want to find negatives of them that are UI/UX compliant. the light or dark mode should be inherited from whatever the phone is currently in at the moment

### Summary
Build a full, properly-supported dark mode driven by the theme infrastructure already in `settings.service.ts` (`'light' | 'dark' | 'auto'` + `body.dark` toggle; `auto` inherits the phone's current scheme). Catalog every color FRED uses, define a UI/UX-compliant (WCAG-AA-contrast) dark palette — proper dark equivalents, not naive inversions — and theme the app through a single CSS-variable layer under `body.dark`. Done when toggling the device (or the in-app setting) into dark renders every surface in an accessible dark theme with no light bleed, and `auto` follows the phone. Realistically a multi-day epic; depends on FRED-193 (light-only cleanup) landing first.

### Acceptance Criteria
1. A documented dark palette exists: every current FRED color mapped to a dark-mode equivalent meeting WCAG AA contrast for its use (text/background/interactive), with rationale — not auto-inverted.
2. Colors are driven through semantic CSS variables themed under `body.dark`; the worst hardcoded-hex offenders (`#2563EB`, `#0f172a`, `#f8fafc`, `#6b7280`, `#e5e7eb`, and the rest of the high-count list — ~600+ hardcoded values today) are migrated to those tokens so they respond to the theme.
3. `auto` mode inherits the phone's scheme (light phone → light app, dark phone → dark app) via the existing `settings.service` `body.dark` toggle; switching the phone scheme updates the app.
4. A working in-app light / dark / auto control is available (the `settings.service` setting persists and applies on load) — full support, not phone-inherited only.
5. All key surfaces render correctly in dark with no light-mode bleed and no illegible/low-contrast text: tab-switcher, tab1, tab2, tab3 + all settings pages, ai-chat, onboarding, modals, toasts, charts, and Lottie animations.
6. No regressions to light mode; light remains the default until dark is fully verified.
7. `index.html` `color-scheme` updated to support dark once shipped.

Notes: depends on FRED-193 first. Likely split into sub-stories — (1) consolidate to one semantic token set + migrate hardcoded hex → tokens, (2) define/document the compliant dark palette, (3) apply under `body.dark` + wire the settings toggle, (4) QA contrast across every surface (incl. charts/Lottie/brand assets). Palette derivation is design-heavy and should get a design/approval pass before it's applied.

## FRED-147 — 💤 Export MFU as shareable image with Fred art
let users export their monthly freedom updates. (it could be fred holding up the mfu as pitchfork sign) change the location of the close button to be on the left and the export on the right. the close button could also become the back button

## FRED-148 — 💤 Switch account recovery to phone number OTP
switch recovery process to use phone otp instead of email? more secure that way?

## FRED-149 — 💤 Fix star alignment in customize portfolio screen
fix star aligning with title in customize portfolio

## FRED-150 — 💤 Upgrade to latest GPT model via OpenAI
upgrade gpt model (thru OpenAI API)

## FRED-151 — 💤 Update Fred pre-generated questions to be RAG-focused
update fred pre generated questions to be more specifically about rag chunks, boglehead philosophy, and things that a user would actually want to know

## FRED-152 — 💤 Build Android variant of FRED app
make android variant

## LPFRED-153 — 💤 Add emailer to FRED landing page
add emailer

## LPFRED-154 — 💤 Update landing page wording for RIA status
update wording of main page and ToS and PP to reflect soon-to-be RIA status

## LPFRED-155 — 💤 Update landing page default calculation values
update default calculations to show an age of 49 to be retired; 22, $1k/mo

## LPFRED-156 — 💤 Update landing page comparison chart
update comparison chart

## LPFRED-157 — 💤 Claude landing page audit using Hormozi strategies
have claude ingest the ultimate landing page, give our landing page a rating and asking where to improve

Alex Hormozi's Landing Page Strategy for 2026 (https://www.youtube.com/watch?v=zA0B-VwOPn4)
4 Proven Steps to Build a MILLION DOLLAR Landing Page (https://www.youtube.com/watch?v=KneaEGicMZ4)
Brutally Honest Landing Page Advice from Alex Hormozi (https://www.youtube.com/watch?v=Qgtq-xxA00I)
The NEW Way Of Landing Pages in 2026 (https://www.youtube.com/watch?v=1gvPLQzrbmM)

## LPFRED-158 — 💤 Optimize landing pages for maximum conversions
landing pages need to be optimized for maximum conversions

## LPFRED-159 — 💤 Adjust landing page comparison table for accuracy
landing page comparison table needs to be adjusted

## LPFRED-160 — 💤 Change Desired Freedom Income to retirement framing
change Desired Freedom Income text to Desired Retirement Income

## LPFRED-161 — 💤 Build three subscription pricing tiers for launch
BUILD A PRODUCT THAT IS GOOD, REFINE THE LANDING PAGE TO REFLECT THE PRODUCT BETTER, MAKE TWO TIERS ON TOP OF CURRENT
$8, $15, $40 (as low as $5, $10, $20)

## LPFRED-162 — 💤 Add private beta testimonials to landing page
add private beta user testimonials

## FRED-163 — 💤 Show calculation assumptions for credibility
B) Open Assumptions
Show:
* Expected return: 12%
* Inflation: 2–3%
* Withdrawal rate: 3.5–4%
Explain risks.
This builds credibility.

## FRED-164 — 💤 Historical simulator for bad market year scenarios
C) Historical Simulator
Show:
"If you started in 2000, 2008, 2020…"
What happens?
Even bad years.
Transparency = trust.

## FRED-165 — 💤 Early beta user case studies social proof
D) Case Studies (Early)
From beta users:
"Jake, 26 → +$14k → -2 years"
Screenshot + quote.
Real names (with permission).

## FRED-166 — 💤 What FRED won't do transparency section
E) What FRED won't do:
This is powerful.
Example:
We don't:
* Pick stocks
* Promise returns
* Encourage leverage
* Push trading
Signals integrity.

## FRED-167 — 💤 Redesign Ask Fred UI like Cloudflare Ask AI
make ask fred look like cloudflare's ask AI

## FRED-169 — 💤 Reduce free trial to 14 days
make the fred free trial 14 days to allow for one automated paycheck investing and force them to make a decision

### Acceptance Criteria
1. In App Store Connect, update subscription product free trial to 14 days.
2. Test on sandbox account: new user gets 14-day trial before billing.
3. Confirm frontend subscription gate correctly reflects 14-day window.

## LPFRED-172 — 💤 Build calculator page for email collection
make calculator page for optimal email collection

## FRED-177 — 💤 Remove back button from two onboarding pages (ONBOARDING)
Remove the back button from 2 pages in the onboarding flow.

## FRED-182 — 💤 Add 3 Monte Carlo piggy bank visual states
add 3 forms of piggy banks based on monte carlo simulation results (mint condition, cracked condition, exploded into pieces condition)

## FRED-197 — 💤 First-time tour highlights My Profile link
update the first time tour to show the my profile icon on tab 3 as a link to a page (so it should darken the rest of the page while showing click here to access your profile); this can be put as sleeping for now and we can enrich it later


# 🚫 BLOCKED — Waiting on Something
_Cannot proceed until a dependency or external party clears._

## FRED-173 — 🚫 Lock referral entry until 30 days post-trial
A new subscriber must be a subscriber for at least 30 days after their 14-day free trial ends before they can access the referral entry point. Lock the referral UI until that condition is met.

## FRED-175 — 🚫 Initiate ACATS API transfer during onboarding (ONBOARDING)
ACATS API transfer needs to be initiated as part of the onboarding flow.

## FRED-179 — 🚫 Export monthly freedom update as shareable image
Add export ability for monthly freedom update (export to insta story and what not)


# ✓ DONE — Completed
_Shipped. Kept for history; never re-picked._

## FRED-99 — ✓ Implement all features from tiered pricing
implement all features from tiered pricing

### Acceptance Criteria
1. `User.java` gets `selectedTier` (nullable VARCHAR(10)) and `billingPeriod` (nullable VARCHAR(10)); Flyway migration adds both columns to the `user` table
2. `PUT /user/profile` accepts and persists `selectedTier` + `billingPeriod`
3. `GET /user/me` (or equivalent) returns `selectedTier` and `billingPeriod` in its response
4. `selectTier()` in the component calls `authService.updateUserProfile({ selectedTier, billingPeriod })`, waits for resolve, then calls `authorizeRecurringInvestment()` — errors logged but don't block
5. `authService.updateUserProfile()` TypeScript interface widened to include `selectedTier?` and `billingPeriod?`
6. `npx tsc --noEmit` exits 0; `./gradlew build -x test` exits 0
7. Smoke: select Pro (yearly) → tap CTA → profile API returns `selectedTier: "pro"`, `billingPeriod: "yearly"`

## FRED-106 — ✓ Auto-start ACATS transfer if localStorage flag set
make it so that when a user signs up, check the localStorage to see if they had set up for an ACATS transfer and if they had, start that process

### Acceptance Criteria
1. `AlpacaService.initiateAcatsTransfer()` replaced with real Alpaca ACAT API HTTP call per https://docs.alpaca.markets/us/docs/acat-api. Remove the email pseudocode stub.
2. After the user confirms their subscription (final onboarding step), frontend checks `localStorage.getItem('pendingAcats')`.
3. If `pendingAcats` is present, frontend calls the ACATS backend endpoint with `{ dtc, accountNumber }` parsed from the saved JSON.
4. On API success, clear `localStorage.removeItem('pendingAcats')` and show a brief toast: "Transfer request submitted."
5. On API error, show a toast with a retry option; do NOT clear `pendingAcats` so a retry is possible.
6. If `pendingAcats` is absent at subscription completion, do nothing.
7. Update `investment-schedule.component.ts` to also save `accountType` inside `pendingAcats` JSON.
8. `./gradlew build -x test` exits 0; `npx tsc --noEmit` exits 0.

## FRED-110 — ✓ Overhaul tab 2 education with four strategies
go fix and clean up tab 2 and its content so that it matches the 4 strategies we are educating on (yield-based income, dynamic guardrails, annuity, sbloc 4% borrowing in downturn combined with traditional 4% selling when market is up), also make the cards on the education page smaller so that all 4 can appear on one page (2 on top half, 2 on bottom half). add a slide on brief instructions for how to do each strategy

### Acceptance Criteria
1. Education section replaced with a 2×2 card grid showing all 4 strategies, all visible without scrolling on 430×932.
2. Strategies: Yield-Based Income, Dynamic Guardrails, Annuity, SBLOC + 4% Rule.
3. Each card has: strategy name, one-line tagline, material-symbols-outlined icon.
4. Tapping a card opens a bottom-sheet slide with 3–5 bullet how-to instructions.
5. SBLOC copy explains hybrid: borrow against portfolio in down years, sell at 4% in up years.
6. Yield-Based Income copy written fresh (not in existing dropdown).
7. Monte Carlo section and strategy-selector dropdown untouched.
8. Builder must study the onboarding component series (surveyinitial, investment-schedule, kyc-verification, investmentconfirmation) before writing new UI — new components must feel native to that visual system.
9. `npx tsc --noEmit` exits 0. Layout verified on 430×932.

## FRED-111 — ✓ Equity milestone locks with blur and unlock animation
add $100k Total Equity lock for monte carlo, add $250k lock for retirement strategy education (frame it as a milestone and not to overwhelm the users) and also add a locked RETIRE button somewhere; we want the lock button to have the content locked (not the title such as monte carlo or retirement strategies...) and we want a big lock to display over the content with a big amount of blur on the content that is behind the lock. we want to make it so that when the user's equity is $100k/$250k, a button to unlock appears and it has a satisfying unlock animation and then the whole blurred background and the lock fades to reveal the page details

### Acceptance Criteria
1. `UserProgress` interface gains `selectedTier?: 'core' | 'plus' | 'pro'`. Backend `/user/progress` returns `selectedTier` in its response.
2. `retirement-planning.component` reads `selectedTier` from `authService.userProgress$` (not localStorage).
3. Monte Carlo section: `selectedTier === 'core'` (or null/undefined) → content blurred + lock icon overlaid. Section title "Monte Carlo" visible above lock.
4. Lock overlay: lock icon + "Available on Plus and Pro" text + "Upgrade" button.
5. "Upgrade" button triggers Plus subscription prompt (Apple IAP). Leave as `// TODO: trigger Plus subscription IAP` pseudocode for now.
6. `selectedTier === 'plus' | 'pro'` → no blur, Monte Carlo renders normally.
7. null/undefined tier treated as Core.
8. Education section lock dropped — only Monte Carlo is gated by tier.
9. `npx tsc --noEmit` exits 0; `./gradlew build -x test` exits 0.

## FRED-112 — ✓ Subscription prompt, risk reversal, expired sub handling
we want to prompt our apple subscription on the selection of the user's tier aka when they click the "Join The Pig Leagues" button. there should be a placeholder already for this function. we need to find out how we can prompt for the apple subscription. also, make it so that a user with an expired apple subscription can only access the tab 3 and provide a way for them to be able to reactivate their subscription.

### Acceptance Criteria
1. Research Capacitor IAP plugin for Apple subscriptions (RevenueCat's `@revenuecat/purchases-capacitor` recommended). Document final choice in code comment before implementing.
2. `selectTier()` triggers Apple IAP native purchase sheet before calling `updateUserProfile()`. On IAP purchase success → call `updateUserProfile({ selectedTier, billingPeriod })` (FRED-99 variables) then `authorizeRecurringInvestment()` and navigate forward. On IAP cancel/fail → abort, stay on screen.
3. Expired gate: if `investmentConfirmationCompleted === true` AND `selectedTier === null` → Tab 1, Tab 2, and Chat tabs are visually disabled (grayed, non-tappable). Tab 3 (My Profile) remains accessible.
4. My Profile shows a "Reactivate" CTA when in expired state → triggers Apple IAP resubscription (`// TODO: trigger Apple IAP resubscription` pseudocode until FRED-174).
5. Private beta users (`privateBeta === 1`, FRED-113) bypass the expired gate entirely.
6. If IAP plugin not yet available, skip item 2 and focus on expired gate (items 3–5) only.
7. `npx tsc --noEmit` exits 0.

## FRED-113 — ✓ Private beta code, founder status, app store reauth
we want different code if the user is from the private beta. such as not prompting them for the subscription and also changing the referral reward text to say that you can claim a limited edition FRED outfit by having 3 people use your code (beta or non beta users). also showing FOUNDER STATUS somewhere such as like the loading screen in gold color. we also want to make sure their deviceId/iCloudKeychain is used to prompt them to login when they have downloaded the non-private beta version. i was thinking something along the lines of adding a privateBeta variable to the user model and setting it to value 1 for all people that sign up during that build but how will the prompting for reauth work if they are downloading the app off the app store for the first time?

### Acceptance Criteria
1. `User.java` gains `privateBeta` boolean (default false). Flyway migration adds `private_beta` column. User progress response returns `privateBeta`.
2. `UserProgress` interface gains `privateBeta?: boolean`.
3. If `privateBeta === true`: bypass subscription gate (FRED-112) — all tabs accessible regardless of `selectedTier`.
4. Referral reward copy: prize text reads "Claim limited edition FRED merch" for all users (beta and non-beta).
5. Loading screen: display "FOUNDER STATUS" in gold (`#FBC926`) when `privateBeta === true`.
6. App Store reauth for private beta users is already handled by `keychainSyncService.getAccountEmail()` — no new code needed; verify end-to-end in testing.
7. `privateBeta` is set manually in DB for all private beta signups (SQL update after beta period).
8. `npx tsc --noEmit` exits 0; `./gradlew build -x test` exits 0.

## FRED-114 — ✓ Referral reward for three uses, founders vs non-founders
add referral code for users who have had 3 people use their code. for founders we want it to send them an email about asking them what kinda clothing piece they want the limited edition design on and then for non-founders, is it possible to update a user current apple subscription from being $8/mo to being $5/mo without them having to do anything special?

### Acceptance Criteria
1. Real-time referral code validator: `distinctUntilChanged + switchMap` calls `GET /user/referral/validate?code=XXX`. Apply button disabled until code matches a real user.
2. One referral per user: if `hasAppliedReferral === true`, block entry and show "You've already applied a referral code."
3. When Apply is tapped, backend checks subscription state:
   - **Founder user (`privateBeta=true`):** takes effect immediately — increment referrer's `referralCount`.
   - **Just signed up / no subscription:** save code + timestamp; show "Complete the 14-day free trial and 1 month of paying to apply."
   - **Trial done but < 30 days paid:** save code; show "Stay a paying subscriber for 1 month after trial."
   - **30+ days paying subscriber:** apply immediately — increment referrer's `referralCount`.
4. `ReferralValidationScheduler` runs daily: validates pending referrals at the 30-day subscription mark.
5. Reward thresholds: Core=3 referrals → $5/mo lifetime, Plus=2 → $10/mo, Pro=1 → $20/mo, Founder=3 → merch email.
6. Founder reward: `EmailService.sendMerchSelectionEmail()` stub until FRED-101. Non-founder reward: IAP promotional offer stub until FRED-174.
7. `User.referralRewardTriggered` boolean prevents double-trigger.
8. New backend columns: `referralAppliedAt` timestamp, `subscriptionStartedAt` timestamp, `referralRewardTriggered` boolean. Flyway migration for all.
9. My Profile shows X/Y referral progress toward reward.
10. `./gradlew build -x test` exits 0; `npx tsc --noEmit` exits 0.

## FRED-115 — ✓ Add eye-catching referral progress bar
add referral progress bar, make it eye catching

### Acceptance Criteria
1. Referral card in My Profile gets a segmented progress bar with N segments (Core=3, Plus=2, Pro=1, Founder/privateBeta=3). Each segment fills when a referral is redeemed.
2. Filled segments: `#2563EB`. Empty segments: subdued gray.
3. All segments filled → subtle completion animation (pulse or shimmer, iOS-native feel).
4. "X / N Redeemed" label positioned below the bar.
5. Falls back to N=3 if FRED-114 dynamic threshold not yet shipped.
6. `npx tsc --noEmit` exits 0.

## FRED-116 — ✓ Prompt users for review after first MFU
prompt users to leave a review after first monthly freedom update

### Acceptance Criteria
1. After user dismisses their first MFU modal, check `localStorage.getItem('hasSeenFirstMFU')`.
2. If first time: call the native iOS in-app rating prompt via `SKStoreReviewController.requestReview()` using `@capacitor/rate-app` (install if not present). This renders the native Apple star-rating sheet — no custom UI.
3. After triggering: set `localStorage.setItem('hasSeenFirstMFU', 'true')`. Fires at most once per install.
4. Prompt fires after `modalController.dismiss()` completes — does not block or delay the modal close.
5. `npx tsc --noEmit` exits 0.

## FRED-117 — ✓ First-time tour ending with what's your story
make a first time tour that ends with what's your story fred

### Acceptance Criteria
1. Tour fires once after first navigation to Tab 1 post-onboarding. Gated by `localStorage.getItem('hasSeenFirstTimeTour')`.
2. Step 1 — Portfolio: Highlight portfolio section on Tab 1. Label: "Your portfolio lives here."
3. Step 2 — Education / Monte Carlo: Navigate to Tab 2. Highlight retirement/education section. Label: "Explore retirement strategies and run simulations here."
4. Step 3 — My Profile: Highlight Tab 3 (person icon) tab button. Label: "Your settings and referral code are here."
5. Step 4 — Ask Fred: Navigate to AI chat. Highlight the `FRED_STORY_TRIGGER` suggestion chip ("What's your story FRED?"). Label: "Tap to start your first conversation."
6. Tapping the chip: marks tour complete (`localStorage.setItem('hasSeenFirstTimeTour', 'true')`); chip fires normally.
7. Skip button present on every step — sets flag and exits tour immediately.
8. Dark semi-transparent backdrop with cutout highlight around target element. iOS-native fade motion.
9. `npx tsc --noEmit` exits 0.

## FRED-120 — ✓ Audit npm vulnerabilities and all warnings
go thru npm audit vulnerabilities, frontend warnings, backend warnings

### Acceptance Criteria
1. Run `npm audit` in `/frontend`: fix all `critical` and `high` severity vulnerabilities. Document `moderate`/`low` if no fix available.
2. `ng build` (or `npx ng build`) in `/frontend`: zero application-level WARNING lines.
3. `./gradlew build` in `/backend`: zero warnings from application code.
4. `npx tsc --noEmit` exits 0.
5. `./gradlew build -x test` exits 0.

### Audit Summary (2026-05-23)

**Frontend — npm audit**

Fixed (CRITICAL):
- `swiper` upgraded from `^11.2.8` to `^12.1.4` — prototype pollution (GHSA-hmx5-qpq5-p643).

Fixed (HIGH — direct deps):
- All `@angular/*` runtime packages upgraded from `^19.0.0` to `^19.2.22` — patched XSS in compiler/i18n (GHSA-v4hv-rgfq-gp49, GHSA-jrmj-c5cx-3cw6, GHSA-g93w-mfhg-p222), XSS in core i18n (GHSA-prjf-86w9-mfqv, GHSA-g93w-mfhg-p222), XSRF token leakage in common (GHSA-58c5-g7wp-6w37).
- `@angular/cli` + `@angular-devkit/build-angular` upgraded to `19.2.26`.
- `vite` upgraded from `^6.3.5` to `^6.4.2` — path traversal issues (GHSA-g4jq-h2w9-997c, GHSA-jqfw-vq24-v9c3, GHSA-4w7w-66w2-5vf9, GHSA-p9ff-h696-f583).
- `serve` upgraded from `^14.2.4` to `^14.2.6`.
- `@capacitor/cli` upgraded from `7.2.0` to `^7.6.5` — resolves transitive `tar` vulnerability chain.

Fixed (HIGH — transitive, via `overrides` in package.json):
- `pacote` forced to `>=21.5.0` (was 20.0.0 — vulnerable range).
- `tar` forced to `>=7.5.15`.
- `glob` forced to `>=11.1.0`.
- `minimatch` forced to `>=10.2.5`.
- `lodash` forced to `>=4.18.1`.
- `fast-uri` forced to `>=3.1.2`.
- `flatted` forced to `>=3.4.2`.
- `socket.io-parser` forced to `>=4.2.6`.
- `picomatch` forced to `>=4.0.4`.
- `@babel/plugin-transform-modules-systemjs` forced to `>=7.29.4`.
- `serialize-javascript` forced to `>=7.0.5`.

Fixed (TypeScript errors — spec files):
- 4 spec files had wrong casing in imported class names (`InvestmentconfirmationComponent` → `InvestmentConfirmationComponent`, `LinkplaidComponent` → `LinkPlaidComponent`, `StockselectionComponent` → `StockSelectionComponent`, `SurveyinitialComponent` → `SurveyInitialComponent`). Fixed to match actual exported class names.

Accepted with reason (MODERATE — 4 remaining):
- `uuid < 11.1.1` → `sockjs` → `webpack-dev-server` → `@angular-devkit/build-angular`: No fix available without upgrading to Angular CLI v21 (major version break). `sockjs` requires `uuid@^8.3.2` API; forcing `uuid >= 11.1.1` would break `sockjs` at runtime. This chain is dev-only (webpack-dev-server is not included in production builds). Acceptable risk.

**Backend — Gradle**

Fixed (application code deprecation warnings):
- `SecurityConfig.java`: replaced deprecated `new DaoAuthenticationProvider()` no-arg constructor + `setUserDetailsService()` setter with `new DaoAuthenticationProvider(userDetailsService)` (Spring Security 6 constructor-injection API).
- `WebAuthnService.java:290`: replaced deprecated `result.getUserHandle()` with `result.getCredential().getUserHandle()` (Yubico webauthn-server-core 2.7.0 API).
- Added `-Xlint:deprecation` to `compileJava` tasks in `build.gradle` so future deprecations surface immediately.

Result: `./gradlew clean build -x test` exits 0 with zero application-code warnings.

## FRED-122 — ✓ My profile final polish and compliance language check
my profile page ALMOST DONE needs badge of ahead of 85%, fred pfps, and fixing ui spacing. also, update my profile language to be complaint? maybe wait till after securities attorney review

### Acceptance Criteria
1. My Profile shows "Ahead of X% of investors" badge using `statusPercentile` from the latest MFU data. Hidden if no MFU data yet.
2. Replace placeholder `ionicframework.com` demo avatar with FRED pig art. Use existing pig art assets in `src/assets/`; fall back to a simple pig icon if FRED-131 art isn't available.
3. Audit and fix spacing/alignment issues on My Profile visible on 430×932.
4. Compliance language update deferred — do not implement until FRED-139 (securities attorney review) clears.
5. `npx tsc --noEmit` exits 0.

## FRED-123 — ✓ Account security add KYC form editing
account security ALMOST DONE needs ability to update kyc form
[merged from FRED-107: allow kyc to be changed in account security setting page]

### Acceptance Criteria
1. Security settings KYC info row gets an "Edit" button (same style as the "Change" email button).
2. Tapping "Edit" navigates to `kyc-verification` in edit mode, pre-filled with existing KYC data.
3. Edit mode CTA reads "Update" instead of "Submit."
4. On submit: calls Alpaca PATCH account API (https://docs.alpaca.markets/us/reference/patchaccount). On success → toast + return to security settings.
5. On Alpaca API error: descriptive error toast; form stays open for retry.
6. `npx tsc --noEmit` exits 0; `./gradlew build -x test` exits 0.

## FRED-124 — ✓ Change bank account page full UI overhaul
change bank account ALMOST DONE needs entire UI lift
[merged from FRED-108: make change bank account setting page look clean]

Scope: reskin only — keep the single-account swap flow; multi-account management (list, set-default, remove) is a separate follow-on story.

Acceptance criteria (approved 2026-06-06, Option C — Hero-Led):
1. `change-bank-account.page` (.html + .scss) is rebuilt on the FRED design system — Manrope, the FRED palette only, white section cards with #e5e7eb borders, Material Symbols icons — matching security-settings, my-profile, and the tab3 blue-header-over-white pattern.
2. Hero-led layout: a blue gradient header at the top with the white page content sitting over top of it (same pattern as tab3 settings). The header title is centered (not left-aligned), matching the centered ion-header in security-settings, with the back button on the left.
3. The current linked account is shown clearly (bank name, account type, masked number — e.g. "Chase · Checking") sourced from the existing `GET /api/plaid/primary-bank-account` — no new endpoints.
4. Directly under the current-account display, show the linkplaid illustration card (the gradient illustration card with the account_balance / sync_alt icons), and under that illustration card show the "Connect a New Bank" CTA card.
5. The single primary CTA opens the existing Plaid Link flow; the existing step-up PIN check before opening Plaid is preserved exactly.
6. The Plaid security/trust messaging ("credentials never stored", "takes effect at your next scheduled investment") is kept and styled into the new layout.
7. Loading state while Plaid initializes (button shows a spinner / "Preparing secure connection…"), empty state when no account is linked yet, and error + retry state if the token exchange fails — all designed, not placeholder.
8. Success path shows a confirmation toast and refreshes the displayed account, exactly as today.
9. No backend, auth, or schema changes. `npx tsc --noEmit` exits 0. Layout verified at 390×844 and 430×932.

## FRED-125 — ✓ Recurring investments streak badge and pause warning
recurring investments ALMOST DONE needs monthly streak badge and are you sure you want to pause your investments, this will break your investing streak and reset it to 0 and that it may be better to do less than none

### Acceptance Criteria
1. `monthly_streak INT NOT NULL DEFAULT 0` added via Flyway migration.
2. Scheduler increments streak by 1 when investment runs in a new calendar month (tracks via `lastStreakIncrementDate`). Same-month investments don't multi-count.
3. `pauseSchedule()` resets streak to 0. `resumeSchedule()` does not.
4. `monthlyStreak` exposed in DTO + TypeScript interface.
5. Streak badge in Investment Schedule card when streak > 0: "5-month streak" pill, `#2563EB` fill, `material-symbols-outlined` flame icon (`local_fire_department`).
6. Hidden when streak === 0.
7. Tapping "Pause Investments" shows `AlertController` confirmation: "Pause Investments?" / "This will reset your X-month investing streak to 0. Investing less is better than investing nothing — consider reducing your amount instead." / Cancel + Pause Anyway.
8. If streak === 0, skip confirmation and pause immediately.
9. `npx tsc --noEmit` exits 0; `./gradlew build -x test` exits 0.

## FRED-126 — ✓ One-time transactions needs added ACATS API functionality
one-time transactions ALMOST DONE it just needs ACATS API functionality once it has been implemented

### Acceptance Criteria
1. **Depends on FRED-106** (real Alpaca ACAT backend must be in place first).
2. Transfer type = `BROKERAGE` — already hardcoded, no selector needed.
3. `submitAcatsTransfer()` reads `transferId` from response, toast reads: "Transfer submitted — ref: <transferId>".
4. Submit disabled until both DTC + account number filled (existing guard).
5. Error toast: "Transfer request failed. Please try again."
6. `npx tsc --noEmit` exits 0.

## FRED-129 — ✓ Add pig art to MFU equity milestones
add pig for certain equity milestones on MFU and also unlocking of monte carlo at $100k and unlocking of retirement strategies at $250k

### Acceptance Criteria
1. Asset prerequisite: Andy drops `pig-level-1` through `pig-level-6` (svg or png) into `src/assets/images/` first.
2. Backend adds `equityLevel` (1–6) to `MonthlyFreedomUpdateDTO`: <$1k=1, $1k–$10k=2, $10k–$100k=3, $100k–$1M=4, $1M–$5M=5, ≥$5M=6.
3. Frontend `MonthlyFreedomUpdateData` interface gains `equityLevel: number`. Component `milestoneEquityPigSrc` getter maps level to asset path.
4. Milestone card: when type ≠ `DEFAULT`, show pig image; when `DEFAULT`, keep `sentiment_satisfied` icon.
5. Pig image: 56×56px, object-fit: contain.
6. `npx tsc --noEmit` exits 0; `./gradlew build -x test` exits 0.

## FRED-130 — ✓ Update Fred's story to lazy pig perspective
update fred's story about so that it matches the perspective of a lazy pig and update the paycheck prison idea to work with fred the pig

### Acceptance Criteria
1. Andy writes new `FRED_STORY_ORIGIN` from the pig's perspective — preserve 18-year timeline, $2k biweekly, $2.37M, quit at 45. Reframe through a lazy pig's voice.
2. Andy writes new Chunk 17 "Why Fred Wears The Suit" adapting the paycheck prison metaphor for a pig character.
3. New copy replaces Java string literals in `FredConstitution.java` (`FRED_STORY_ORIGIN`) + `FredKnowledge.java` Chunk 17.
4. `FRED_STORY_STRATEGY` left unchanged unless pig voice requires it.
5. Financial disclaimers preserved verbatim.
6. `./gradlew build -x test` exits 0.

## FRED-131 — ✓ Design five Fred faces for equity level ranges
make 5 fred faces for accounts over $0 to $1000, $1000 to $10k, $10k to $100k, $100k to $1m, $1m+, add them to their respective mfu milestones

### Acceptance Criteria
1. 6 pig face illustrations (one per equity level: $0-$1k=L1 through $5M+=L6), progression baby → king pig.
2. Saved as `pig-level-1` through `pig-level-6` in `frontend/src/assets/images/` (SVG preferred).
3. Works at 56×56px and as circular avatar ~64px for My Profile.
4. FRED-129 `milestoneEquityPigSrc` getter auto-picks them up.
**✓ Done**

## FRED-133 — ✓ Design piggy bank Fred loading screen
loading screen (piggy bank fred)

## FRED-136 — ✓ Test close account feature end to end
test close account feature

## FRED-168 — ✓ Referral-discounted tier upgrade on profile page
Add ability to upgrade tiers in my profile page. if they already have had 1 referral, they can go to $20/mo instead of $40/mo. if they already have had 2 referrals, they can go to $10/mo instead of $15/mo

### Acceptance Criteria
1. Show "Upgrade your plan" section in My Profile when referralCount >= 1 (not already on discounted tier).
2. 1 referral → "upgrade to Premium for $20/mo (normally $40/mo)"; 2 referrals → "Standard for $10/mo (normally $15/mo)".
3. AlertController confirmation before applying upgrade.
4. On confirm, call updateUserProfile({ selectedTier, billingPeriod: 'monthly' }) + success toast.
5. Section hides after upgrade is applied.
6. No backend changes needed beyond existing PATCH /api/users/profile.

## FRED-170 — ✓ Optimize loading screen timings
Optimize loading screen timings.

### Acceptance Criteria
1. Verify whether whenPiggybanksFly-3.jpg exists; fix ROUTE_IMAGE_PRELOADS filename if not.
2. Measure loading screen duration on real iPhone at key timestamps.
3. Tune timeouts based on measurements (waitForCoverImageReady 1500ms, preloadAssetsForRoute 3000ms).
4. No visual regression: cover hides only once route content is painted.
5. Test on real iPhone.

## FRED-171 — ✓ Payday lifecycle emails and push notifications
lifecycle emails regarding investing in FRED. Then time your lifecycle emails and push notifications around it:

Day before payday: "Your paycheck hits tomorrow. FRED will auto-invest $X — your Freedom Date moves up 6 days."
Day of payday: "💰 $X invested. New Freedom Date: [date]."
Day after payday: "You just got 6 days closer to freedom without lifting a finger."

### Acceptance Criteria
1. Email D-1: day before nextInvestmentDate — "Your investment hits tomorrow" with $X and freedom date gain.
2. Email D+0: after investment runs — "💰 $X invested. New Freedom Date: [date]."
3. Email D+1: "You just got N days closer to freedom without lifting a finger."
4. Push via FCM: same three messages; new PATCH /api/users/push-token endpoint; store device_push_token on user.
5. New Flyway migration for device_push_token column on users table.
6. Users without push token still receive emails; no error if push disabled.

## FRED-174 — ✓ Wire up Apple subscription to pricing tiers (ONBOARDING)
Apple subscription needs to be set up with the pricing tiers section on investmentconfirmation.

### Acceptance Criteria
1. App Store Connect: 6 subscription products created (3 tiers × monthly/yearly) with correct prices and 14-day trial.
2. Flyway migration: subscription_start_date DATE NULL on users table.
3. POST /api/users/subscription/confirm endpoint: sets selectedTier, billingPeriod, subscriptionStartDate on confirm.
4. On expiry/cancellation webhook: backend sets selectedTier = null (FRED-112 expired gate activates).
5. All FRED-99 data fields (selectedTier, billingPeriod) continue working correctly.

## FRED-176 — ✓ Connect email list opt-in checkbox to emailer (ONBOARDING)
The "Keep me updated" marketing checkbox needs to be wired up to the FRED email list.

### Acceptance Criteria
1. agreedToMarketing flag sent to backend on onboarding completion.
2. Flyway migration: agreed_to_marketing column on users table.
3. If true: backend has a // TODO pseudocode comment stub for email provider API call (provider TBD).
4. If false: no action, no error.
5. Data captured and stored; actual list subscription wired in a future story.

## FRED-178 — ✓ Rebrand passkey auth to Face ID variant
Change passkey to face-ID passkey variant

### Acceptance Criteria
1. Research: LAContext biometric vs WebAuthn assertion for app-lock — are they security-equivalent?
2. Determine if ASAuthorizationController can auto-select passkey without the "Use this passkey" sheet.
3. Prototype the feasible approach and document result; include impact on login/registration + step-up auth.
4. If feasible: write implementation plan covering all three auth touch points before coding.
5. If not feasible: document why and propose best available alternative.

## FRED-180 — ✓ Add time-to-freedom visual on profile page
Add time to freedom date visual on the my profile page (the whenPiggybanksFly picture that lives in surveyinitial)

### Acceptance Criteria
1. Backend: expose currentFreedomEstimate and timeToFI in UserProgressResponse (GET /api/users/progress).
2. Frontend: add currentFreedomEstimate? and timeToFI? to UserProgress interface.
3. My Profile: "Freedom Timeline" card showing projected year, years remaining, with whenPiggybanksFly pig art as background.
4. Placeholder shown if currentFreedomEstimate is null.

## FRED-181 — ✓ Share Monte Carlo simulation results
Allow sharing of monte carlo results

### Acceptance Criteria
1. Share icon button added to Monte Carlo results section.
2. Tapping it: html2canvas captures results card as PNG → iOS share sheet opens with image.
3. Shared image shows success probability, median end value, and trajectory chart.
4. Error toast if capture or share fails.
5. Works on real iPhone.

## FRED-183 — ✓ Change request/response for ai chat page to use token streaming via SSE
update the ai chat response endpoint to send token's via SSE and spring boot's flux streaming

### Acceptance Criteria
1. GET /api/chat/stream endpoint streams tokens as text/event-stream.
2. OpenAI called with stream:true; token deltas parsed and forwarded.
3. Frontend appends each token to message bubble in real time.
4. Stream ends on data:[DONE]; frontend marks message complete.
5. On error/timeout: show error state.
6. Old POST /api/chat preserved for fallback.
Note: JWT must be passed as query param (EventSource doesn't support custom headers in WKWebView).

## FRED-185 — ✓ Update app calculator to net-income yield model
Update the in-app calculator to use the same net-income-based model: (monthly net income × 12) / 0.04 = target portfolio value. Use 10% average annual rate with compound interest and DRIP reinvestment to determine time to reach that portfolio value based on the user's monthly investable income input.

## FRED-188 — ✓ Add null userId guard to processChat
`ChatService.java` `processChat()` calls `userRepository.findById(request.userId())` without a null guard. Add the same guard that was added to `streamChat()`: `request.userId() != null ? userRepository.findById(request.userId()).orElse(null) : null`.

## FRED-192 — ✓ Redesign tab3 settings page UI (keep blue header)
redesign the UI of tab3 (settings) page. we want to keep the blue header with the my profile and welcome and "FRED" but we kinda want a cleaner design. refer to the FRED UI Style Guide for how to come up with more designs for tab3 while still keeping that blue header idea. there should be 3-5 options for how it could look

### Summary
Produce 3–5 cleaner tab3 settings designs as static HTML/CSS mockups posted in today.html, each keeping the blue-header concept (avatar + "My Account"/welcome + "FRED") — header and greeting copy may be restyled — all grounded in the FRED UI Style Guide, for Andrew to pick from before implementation.

### Acceptance Criteria
1. 3–5 options, each keeping the blue-header concept (avatar + "My Account"/welcome + "FRED" present); the header itself and greeting copy may be restyled.
2. Every option grounded in the FRED UI Style Guide — FRED palette, Manrope type scale, Material Symbols icons, established card/row patterns; no ad-hoc colors or spacing.
3. All content + actions preserved (Investment Management / Account & Security / Support & Legal groups, profile action badge, FRED-logo MFU interaction) — visual only, no nav/behavior changes.
4. Options meaningfully distinct (e.g., grouped cards vs. flat inset list vs. iOS-grouped vs. hero-stat header), not trivial reskins.
5. Each option annotated — how it's cleaner + trade-offs.
6. Delivered as static HTML/CSS mockups posted in today.html; chosen option becomes a separate implementation story.

## FRED-193 — ✓ Remove dark mode from tab-switcher, tab1, tab2, ai-chat
remove dark mode from ion-tabs aka the tab-switcher; remove dark mode from tab1 and tab2 and ai-chat page

### Summary
Remove dark mode from the app for now so everything renders in light styling regardless of the device's OS Dark Mode setting. The originating surfaces are the tab-switcher (ion-tabs), tab1, tab2, and the AI chat page, but because global background flips drive dark app-wide, the clean fix is to strip dark mode across the app and make it light-only for now. The theme infrastructure (the settings-service `'light' | 'dark' | 'auto'` machinery) stays in place so a planned future story can implement a full, properly-supported dark mode across the app — this story just turns dark off for now without burning that bridge.

### Acceptance Criteria
1. With the device/OS set to Dark Mode, the whole app renders in light styling — verified specifically on the tab-switcher, tab1, tab2, and the ai-chat page (each identical to Light Mode: backgrounds, cards, text, borders, bubbles, tab bar). No surface shows a dark/near-black background, dark border, or inverted text.
2. All `@media (prefers-color-scheme: dark)` blocks are removed from the four named surfaces' SCSS (`tabs.page.scss`, `portfolio-dashboard.component.scss`, `retirement-planning.component.scss`, `ai-chat.page.scss`).
3. The global dark flips in `theme/variables.scss` (~L11) and `global.scss` (~L181) are removed/made inert so they no longer darken any page background; the dark scrollbar blocks (`global.scss` ~L676, L702) and the stray `monthly-freedom-update.component.scss` (~L683) dark block are removed too, so no part of the app is left half-dark.
4. No dead code: no empty `@media` wrappers, no orphaned SCSS variables, no commented-out dark blocks left behind (clean removal per CONTEXT.md).
5. The theme infrastructure in `settings.service.ts` is preserved (the `'light' | 'dark' | 'auto'` type, `applyTheme()`, and `body.dark` toggle remain) and the effective default is light, so nothing renders dark now. If a dark/theme toggle is surfaced in any settings UI, it is hidden or disabled for now (confirm whether one exists).
6. Frontend compiles cleanly — `cd frontend && npx tsc --noEmit` / the scoped build passes with no new SCSS or TS warnings from this change.

Follow-up: a future story will implement full, properly-supported dark mode across the app — the theme infrastructure is intentionally kept for it.

## FRED-194 — ✓ Uniform ion-header styling across tab3 settings pages
change all settings page linked to from tab3 to have the exact same styling in their ion-headers as change-bank-account does. while youre at it, each page should also have similar styling usage so confirm that they do and if they dont, make them have uniform styling across each settings page

### Summary
Make every settings page linked from tab3 use the exact same ion-header as `change-bank-account` — the `.blue-hero-header` (blue gradient + concave white cutout + back button / centered title / spacer) — replacing each page's current `<ion-toolbar>` + `.header-inner` header. Then audit each page's broader styling (content background, section cards, spacing, CTAs) and bring any divergence into line so all settings pages look uniform. Done when every listed page renders a header identical to change-bank-account and the pages share consistent body styling.

### Acceptance Criteria
1. Each of the 9 pages — recurring-investments, portfolio-customize (a component rendered as a page; treated identically), sell-withdraw, security-settings, tax-documents, faq, lump-sum-investment, my-profile, beneficiaries — renders an ion-header visually identical to change-bank-account: blue gradient `linear-gradient(90deg, #2a5ae0, #1d4ed8)`, concave white cutout, safe-area-inset-top padding, `arrow_back_ios_new` back button on the left, centered title, spacer on the right. All are in scope.
2. Each page's old `<ion-toolbar><div class="header-inner">…</div></ion-toolbar>` is replaced by the `<div class="blue-hero-header"><div class="hero-nav">…<div class="back-btn-spacer"></div></div></div>` structure. Each page keeps its own title text and existing `goBack()` behavior; no navigation regressions.
3. The hero-header styling lives in one shared SCSS partial/mixin (e.g., `theme/_blue-hero-header.scss`) included by all listed pages, and change-bank-account is refactored to consume the same source — no duplicated gradient/cutout SCSS copy-pasted across files. (Per-file duplication is an allowed fallback if preferred.)
4. Body styling uniformity ("while you're at it"): every settings page uses the same content background (`#f8fafc`) and consistent section-card, spacing, and CTA styling per the FRED Style Guide. Each page is explicitly confirmed; any divergence is corrected. (If this clause balloons, split it into its own follow-up story rather than blocking the header work.)
5. No page-specific header content is lost. If a page needs extra header content (e.g., my-profile avatar/subtitle), it sits inside `.blue-hero-header` like change-bank-account's (commented) `hero-account-peek` — not via the old toolbar.
6. Headers render correctly on a notched device — `env(safe-area-inset-top)` honored — and the concave cutout meets the page background seamlessly with no seam/gap.
7. Frontend compiles cleanly (`cd frontend && npx tsc --noEmit` / scoped build) with no new warnings; spot-check each page's happy path for visual regressions.

## FRED-196 — ✓ tab3 Freedom Age blanks on flaky KYC call
tab3 Freedom Age stat shows "-" when the Alpaca GET /alpaca/account/kyc call (its birthYear source, a third call separate from the two that feed Freedom Date and To Go) fails or returns no DOB on weak connections — the KYC error handler opens the render gate without setting birthYear, so Freedom Date and To Go render real values while Freedom Age silently blanks. Give Freedom Age its own fallback/retry (e.g. retry the KYC call on transient errors, and/or a clearer placeholder) so a flaky Alpaca call doesn't silently blank it.

### Summary
The tab3 stat strip's "Freedom Age" tile silently shows "—" whenever the Alpaca KYC call (`GET /alpaca/account/kyc`) — the only source of the user's birth year — fails or returns no usable date_of_birth, while "Freedom Date" and "To Go" still render real values. Make Freedom Age resilient: retry the KYC fetch on transient failures and give it an honest state (loading vs unavailable) so a brief Alpaca/connection hiccup doesn't blank it. Done when a flaky/failed KYC call no longer silently blanks Freedom Age and the happy path (valid DOB) is unchanged.

### Acceptance Criteria
1. The KYC fetch feeding Freedom Age retries on transient failures only — TimeoutError / HTTP status 0 / status ≥ 500 — with bounded backoff; never 401/403/404. Mirror `loadUserProgress`'s retry shape for consistency.
2. On ultimate KYC failure, Freedom Age is visually distinct from the empty placeholder (retry affordance / "unavailable") — a failure must not look identical to "still loading".
3. "Missing data" vs "failed to load" handled distinctly — a genuine no-DOB (pre-KYC user) shows the normal "—" with no error treatment.
4. Freedom Date and To Go are unaffected — they render from `/user/progress` + `/portfolio/dashboard` regardless of KYC outcome.
5. The render gate still opens once all three calls settle — no hang on a permanently-failing KYC call.
6. Happy path unchanged — with a valid DOB, Freedom Age = `resolvedFreedomYear − birthYear`. Est. 1-3hr, [code].

## FRED-199 — ✓ Skip step-up auth section when not enabled
change the security settings loading animation for people without step up auth enabled to just load the security settings instead of showing that section; for people who do have step up auth, they should have that section still along with the prompting of the actual stepup auth pin entering

### Summary
On the Account Security page, only users with Step-Up Authentication enabled (a PIN set) should see the "Security Verification" overlay and be prompted for their step-up PIN. Users without step-up auth currently still flash that "verify your identity / Verifying…" overlay during the async `hasPin()` PIN-status check before the page loads — they should skip it entirely and land directly on the loaded security settings. Done when no-step-up users never see the verification overlay and step-up users keep the overlay + PIN prompt exactly as today. Root cause: `security-settings.page.ts` defaults to the unauthenticated overlay at first paint, then `await`s the async `GET /user/pin/status` before it knows whether step-up is even on.

### Acceptance Criteria
1. No step-up auth (`hasPin()` → false): the "Security Verification" overlay (shield + "Please verify your identity…" + "Verifying…") is never shown; the user lands directly on the loaded security settings. A neutral, non-"verify" loading indicator during the initial check/fetch is acceptable; the "verify your identity" framing is not.
2. Step-up auth enabled (`hasPin()` → true): the verification section AND the step-up PIN modal (`promptPin('verify')`) behave exactly as today — success loads settings; cancel/fail routes back to `/tabs/tab3`. No regression.
3. No misleading flash: because `hasPin()` is an async network call, add a distinct interim "checking" state so the verify overlay only ever renders for step-up users, and PIN users never briefly see the settings content before the PIN prompt (no content leak either direction).
4. Post-gate behavior preserved: once the gate passes (no PIN, or PIN verified), `loadSessions()` and `syncAlpacaAccountNumber()` still populate Trusted Devices + Alpaca account as today.
5. No new dead code (CONTEXT.md): if the change leaves the legacy "Verify Identity" button (HTML L27–30) and `authenticateUser()` (TS L160–167) unreachable, remove or wire them — no orphaned code.
6. `cd frontend && npx tsc --noEmit` exits 0, no new SCSS/TS warnings. Both paths verified at 430×932 (spot-checked 390×844): no-PIN user loads straight into settings with no overlay; PIN user sees overlay + PIN modal and reaches settings only after verifying.

Open questions (Andy): (a) `hasPin()` currently fails open on network error (treats error as no-PIN) — preserve (default, safer for availability) or harden? (b) the "Verify Identity" button looks vestigial — confirm OK to remove. Est. 1-3hr, [code].

## FRED-200 — ✓ Always-loaded tab3 stat strip via signals service
The tab3 stat strip (Freedom date / Freedom age / To go) re-fetches three separate calls on every cold load — `authService.getUserProgress()`, `portfolioService.getPortfolioDashboard()`, `alpacaService.getKycData()` — coordinated in `loadStatStrip()` (`tab3.page.ts` ~285–428). It shows `—` dashes until all three settle, caches nothing, and doesn't reflect a My Profile edit until the component is recreated (tab3 never subscribes to the `userProgress$` BehaviorSubject that My Profile's `saveChanges()` already updates via `loadUserProgress()`).

Goal: keep this data always loaded so the strip is instant after first load, and auto-update it when an input changes (e.g. editing monthly investment / retirement income in My Profile).

Approach (Option 2 + signals): create a dedicated reactive `FreedomStatsService` that owns the three fetches and the derived freedom-date/age/dollars-away math, caches the result in memory so it stays warm across tab navigation, and exposes the stats for tab3 to render. Use Angular signals as the reactive primitive — bridge the existing `authService.userProgress$` via `toSignal`, fetch portfolio equity + KYC dob and `.set()` their signals, expose a `computed()` stats signal; tab3 reads the signal in its template (dropping the manual `subscribe` + `takeUntil` teardown). Refresh on My Profile save (the `userProgress$` bridge updates automatically; equity/KYC get an explicit `refresh()`). Keep the bounded transient-retry shape from FRED-196 / `loadUserProgress` at the HTTP layer. Note: this introduces signals as a new pattern in the app (currently all BehaviorSubject) — an intentional pilot in a well-bounded service.

### Summary
Move the tab3 stat strip's data and its freedom date/age/dollars-away math out of `tab3.page.ts` into a dedicated singleton `FreedomStatsService` that holds the result reactively with Angular signals (`toSignal(userProgress$)` + writable signals for equity/birth-year + a `computed()` for the stats). The data stays warm across tab navigation so the strip is instant after first load — no more `—` dashes or a fresh three-call round on every visit — it persists a user-scoped snapshot to `localStorage` so it's instant even on a cold app launch (then a background refresh corrects it), and it re-derives automatically when an input changes, e.g. editing monthly investment / retirement income in My Profile. This is the app's first signals usage, an intentional pilot in a well-bounded service (a deliberate deviation from the documented BehaviorSubject convention). Done when the strip is instant on cold launch (hydrated from the snapshot) and on re-entry, a My Profile edit updates it with no manual reload, and FRED-196's KYC resilience plus the tab3 income-based-vs-MFU contribution-based split are preserved.

### Acceptance Criteria
1. A new `frontend/src/app/services/freedom-stats.service.ts` (`@Injectable({ providedIn: 'root' })`) owns the three fetches and the freedom-date / freedom-age / dollars-away calculation currently inlined in `tab3.page.ts` `loadStatStrip()`. The math is preserved exactly: 4% safe-withdrawal target (`retirementIncome / 0.04`, $1.5M default), the existing client-side freedom-year projection, `freedomAge = freedomYear − birthYear`, `dollarsAway = max(0, target − equity)` — identical displayed numbers to today for the same inputs.
2. Signals are the reactive primitive: `authService.userProgress$` bridged via `toSignal` (`@angular/core/rxjs-interop`); portfolio equity + KYC birth-year held in writable signals set via `.set()`; a `computed()` produces the stats plus a loading signal. tab3 renders from the signal; the old `loadStatStrip()` orchestration (the `progressDone/portfolioDone/kycDone` flags, `tryRender()`, and the manual `subscribe`/`takeUntil` for the strip) is removed. A short code comment notes this is the first signals usage and an intentional, approved deviation from the BehaviorSubject convention (CONTEXT.md §Services).
3. Always loaded across navigation: because the service is a singleton holding the computed stats, leaving tab3 and returning shows the last values instantly — no `—` dashes and no second cold round of three fetches on re-entry. (First load of the session still fetches once.)
4. Auto-updates on My Profile change: after `my-profile.page.ts` `saveChanges()` succeeds, the stat strip reflects the new monthly-investment / retirement-income values without a manual reload or tab3 recreation — driven by `loadUserProgress()` → `userProgress$` → the `toSignal` bridge (and/or an explicit `freedomStatsService.refresh()`).
5. FRED-196 resilience preserved: the KYC fetch keeps the bounded, transient-only retry (TimeoutError / status 0 / status ≥ 500, never 401/403/404; bounded backoff), and Freedom Age still degrades honestly (loading vs unavailable vs genuine no-DOB). Freedom Date and To Go render independently of the KYC outcome. No regression.
6. tab3-vs-MFU split intact: the service computes tab3's income-based freedom year only; it does not read or converge with the MFU's contribution-based projection. The two remain intentionally separate.
7. Unhappy path (CONTEXT.md): first-load shows the existing `—` placeholder via the loading signal; null/zero equity → To Go falls back via `max(0, …)`; a failed userProgress or portfolio fetch degrades gracefully (no crash, no user eject, no raw error string). `liveEquity` (profile-avatar pig input) continues to be fed.
8. Instant on cold launch (persisted snapshot): after the stats compute, the service persists a **user-scoped** snapshot of the displayed values (freedom year / age / dollars-away) to `localStorage`; on app cold launch the strip hydrates from that snapshot and renders real numbers immediately (no `—`), even before the network returns, then a background refresh replaces them once fresh data loads. The snapshot is keyed to / validated against the current user and cleared on logout (alongside the existing JWT/data clear) so a logged-out or switched user never sees another user's figures; a missing, corrupt, or foreign snapshot falls back to the normal `—` loading state (no crash). Stores derived display values only — no tokens or new PII beyond what the app already persists.
9. No new debt; compiles clean: old `loadStatStrip()` machinery is deleted (not commented out); no orphaned imports or dead `destroy$` plumbing. `cd frontend && npx tsc --noEmit` exits 0 and the scoped build passes with no new TS/SCSS warnings. Stat strip verified at 430×932 — instant on cold launch from snapshot, instant on re-entry, and updates after a My Profile edit.

Decisions (Andy): Option 2 (dedicated service) + Angular signals as the reactive primitive (first signals usage in the app, approved); plus a persisted user-scoped localStorage snapshot for instant cold-launch (folded in from Option 3). Est. 3hr+, [code].
