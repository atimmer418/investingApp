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

## FRED-188 — Add null userId guard to processChat
`ChatService.java` `processChat()` calls `userRepository.findById(request.userId())` without a null guard. Add the same guard that was added to `streamChat()`: `request.userId() != null ? userRepository.findById(request.userId()).orElse(null) : null`.

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
