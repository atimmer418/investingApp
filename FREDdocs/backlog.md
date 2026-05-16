# BIG ONES

## FRED-99 — Implement all features from tiered pricing
implement all features from tiered pricing

## FRED-100 — RAG chunks for app knowledge and philosophy
we want RAG/canonical chunks for knowing the application itself (to answer questions with exact directions on where to find things or an overview of just about every how process in the app works that there needs to be known about such as the calculations for the MonthlyFreedomUpdate and also a chunk on the boglehead philosophy) and its context as to how this helps the user achieve a good retirement. also, are there any good RAG/canonical chunks that would be valuable for the user to have FRED know in the FREDdocs .md files?

## FRED-101 — Set up emailer for all transactional notifications
set up emailer for ach deposit/withdraw notifications of confirmation it went thru, placing trades (and sending the trade confirmation document to their email?) and acquiring the positions confirmation email and account verification email. the only notifications from the app will come thru email (account statements? trade confirmations? tax forms available? and implement the pseudocode for the acats transfer emails, the one email should be sent to two recipients: alpaca and help@fredvested.com) and recovery email otp for if you already had an account. we should send a successful transfer completion notification email to the user; add in my profile somewhere that will show a warning that your email has not been verified yet; check if updating email works too

## FRED-102 — Preserve 430x932 layout across all iPhone models
I am on the 14 Max Pro iPhone model display on inspect element/devTools (430x932), I want the current layout of the app as for how it displays on this iPhone 14 Max Pro model (i.e. 430x932) ENTIRELY PRESERVED, which regards the spacing, the positioning of all elements and how everything looks exactly how it looks currently (which includes how all the text is positioned and not wrapping onto a new line in this display), should display with the same spacing and that same positioning on all the other models. How should we do this? Should we convert all css to use vw/vh and rem/em? Should we add these css media queries (@media screen and (max-width: 400px))? Should we convert everything to a flexbox display/grid layout? Should we give the current html and scss code to a bootstrap or tailwind css optimizer or something that can take it and make it a response design based on the original width and height we want the layout preserved on?

## FRED-103 — iOS Xcode plugin build target and EXPO investigation
After syncing capacitor copy ios, you'll need to ensure the new KeychainSyncPlugin.swift is included in the Xcode project's build target. Capacitor custom plugins placed in App/App/ are typically picked up automatically, but double-check in Xcode that the file appears under the App target's "Compile Sources" build phase. look into EXPO for deploying to app store?

# DEV TOOLING

## FRED-104 — Give Claude JWT testing and frontend navigation tools
give claude a way to verify things like...
- a jwt token to test its code outputs for the backend
- a way for claude to navigate to any frontend page and test functionality

## FRED-105 — MCP setup for Railway and MySQL databases
[MCP Setup]: add mcp for railway (user-scoped) and mysql (local-scoped)

# APP FEATURES

## FRED-106 — Auto-start ACATS transfer if localStorage flag set
make it so that when a user signs up, check the localStorage to see if they had set up for an ACATS transfer and if they had, start that process

## FRED-109 — Change investment question to work-optional framing
Instead of: "How much do you want to invest?", Ask: "When do you want work to be optional?"

## FRED-110 — Overhaul tab 2 education with four strategies
go fix and clean up tab 2 and its content so that it matches the 4 strategies we are educating on (yield-based income, dynamic guardrails, annuity, sbloc 4% borrowing in downturn combined with traditional 4% selling when market is up), also make the cards on the education page smaller so that all 4 can appear on one page (2 on top half, 2 on bottom half). add a slide on brief instructions for how to do each strategy

## FRED-111 — Equity milestone locks with blur and unlock animation
add $100k Total Equity lock for monte carlo, add $250k lock for retirement strategy education (frame it as a milestone and not to overwhelm the users) and also add a locked RETIRE button somewhere; we want the lock button to have the content locked (not the title such as monte carlo or retirement strategies...) and we want a big lock to display over the content with a big amount of blur on the content that is behind the lock. we want to make it so that when the user's equity is $100k/$250k, a button to unlock appears and it has a satisfying unlock animation and then the whole blurred background and the lock fades to reveal the page details

## FRED-112 — Subscription prompt, risk reversal, expired sub handling
we want to prompt our subscription on the investment confirmation page for $8 a month and the first two months free. IMPORTANT: add risk reversal on that page so the user does not feel like they're taking on any risk. also, make it so that a user with an expired apple subscription can only access the "my profile" tab and provide a way for them to be able to reactivate their subscription.

## FRED-113 — Private beta code, founder status, app store reauth
we want different code if the user is from the private beta. such as not prompting them for the subscription and also changing the referral reward text to say that you can claim a limited edition FRED outfit by having 3 people use your code (beta or non beta users). also showing FOUNDER STATUS somewhere such as like the loading screen in gold color. we also want to make sure their deviceId/iCloudKeychain is used to prompt them to login when they have downloaded the non-private beta version. i was thinking something along the lines of adding a privateBeta variable to the user model and setting it to value 1 for all people that sign up during that build but how will the prompting for reauth work if they are downloading the app off the app store for the first time?

## FRED-114 — Referral reward for three uses, founders vs non-founders
add referral code for users who have had 3 people use their code. for founders we want it to send them an email about asking them what kinda clothing piece they want the limited edition design on and then for non-founders, is it possible to update a user current apple subscription from being $8/mo to being $5/mo without them having to do anything special?

## FRED-115 — Add eye-catching referral progress bar
add referral progress bar, make it eye catching

## FRED-116 — Prompt users for review after first MFU
prompt users to leave a review after first monthly freedom update

## FRED-117 — First-time tour ending with what's your story
make a first time tour that ends with what's your story fred

## FRED-119 — Implement ACATS API (support now exists)
ACAT API
ACATS API support exists now

## FRED-120 — Audit npm vulnerabilities and all warnings
go thru npm audit vulnerabilities, frontend warnings, backend warnings

# CALENDAR

## FRED-121 — Check for tax documents in Feb/March 2026
check for tax documents in feb/march 2026

# ALMOST DONE

## FRED-122 — My profile final polish and compliance language check
my profile page ALMOST DONE needs badge of ahead of 85%, fred pfps, and fixing ui spacing. also, update my profile language to be complaint? maybe wait till after securities attorney review

## FRED-123 — Account security add KYC form editing
account security ALMOST DONE needs ability to update kyc form
[merged from FRED-107: allow kyc to be changed in account security setting page]

## FRED-124 — Change bank account page full UI overhaul
change bank account ALMOST DONE needs entire UI lift
[merged from FRED-108: make change bank account setting page look clean]

## FRED-125 — Recurring investments streak badge and pause warning
recurring investments ALMOST DONE needs monthly streak badge and are you sure you want to pause your investments, this will break your investing streak and reset it to 0 and that it may be better to do less than none

## FRED-126 — One-time transactions add ACATS transfer email
one-time transactions ALMOST DONE it just needs ACATS transfer email capability

## FRED-128 — Tax documents verify PDF display on phone
tax documents page is ALMOST DONE; need to verify how it pdfs look and work on phone

# CONTENT / DESIGN

## FRED-129 — Add pig art to MFU equity milestones
add pig for certain equity milestones on MFU and also unlocking of monte carlo at $100k and unlocking of retirement strategies at $250k

## FRED-130 — Update Fred's story to lazy pig perspective
update fred's story about so that it matches the perspective of a lazy pig and update the paycheck prison idea to work with fred the pig

## FRED-131 — Design five Fred faces for equity level ranges
make 5 fred faces for accounts over $0 to $1000, $1000 to $10k, $10k to $100k, $100k to $1m, $1m+, add them to their respective mfu milestones

## FRED-132 — Three shirt designs plus limited founders edition
for the shirts, make 3 unique front and back designs and then 1 limited edition founders design. talk to Han

## FRED-133 — Design piggy bank Fred loading screen
loading screen (piggy bank fred)

# TESTING

## FRED-134 — Test profile picture quality and speed on phone
test pfp quality and speed of loading pictures on phone

## FRED-135 — Test scrollbar height and fade on phone
test scrollbar height and scrollbar fade on phone

## FRED-136 — Test close account feature end to end
test close account feature

## FRED-137 — Check Ethan's Plaid account transaction details
Check the Ethan plaid account for transaction details

# LEGAL / COMPLIANCE

## FRED-138 — Add legal information and TOS to app
add legal information and TOS
[merged from FRED-127: legal info ALMOST DONE just needs privacy policy and TOS]

## FRED-139 — Secure securities attorney and Alpaca review
this app needs to be reviewed by a securities attorney, then alpaca; the core ACCEPTABLE concept is "Based on these assumptions, if x, then y"

# POST-LAUNCH

## FRED-140 — Plan landing page go-to-market strategy
once app is released, use landing page to sell. have mobile and web version. mobile will link them to the download, web will quiz and ask them for their email maybe or another way to get them to download?

# AFTER PRIVATE BETA

## FRED-141 — Respond to feedback and prompt in-app reviews
respond to user feedback and ask for reviews

## FRED-142 — Add monthly MFU notification first day 8am
add mfu notification? (first day of every month at like 8am)

## FRED-143 — Activate referral rewards merch and price discount
activate user's referrals (for founder members: merch, non-founder members: price discount)

## FRED-144 — Apple Business Connect KYC wallet verification setup
set up verify with wallet for kyc part on apple business connect

## FRED-145 — Convert Angular frontend to native Xcode app
convert angular to xcode

# FUTURE UPDATES

## FRED-146 — Dark mode with phone-inherited color scheme
we want to make a dark mode, give me all the colors that fred currently uses and we want to find negatives of them that are UI/UX compliant. the light or dark mode should be inherited from whatever the phone is currently in at the moment

## FRED-147 — Export MFU as shareable image with Fred art
let users export their monthly freedom updates. (it could be fred holding up the mfu as pitchfork sign) change the location of the close button to be on the left and the export on the right. the close button could also become the back button

## FRED-148 — Switch account recovery to phone number OTP
switch recovery process to use phone otp instead of email? more secure that way?

## FRED-149 — Fix star alignment in customize portfolio screen
fix star aligning with title in customize portfolio

## FRED-150 — Upgrade to latest GPT model via OpenAI
upgrade gpt model (thru OpenAI API)

## FRED-151 — Update Fred pre-generated questions to be RAG-focused
update fred pre generated questions to be more specifically about rag chunks, boglehead philosophy, and things that a user would actually want to know

## FRED-152 — Build Android variant of FRED app
make android variant

# LANDING PAGE

## LPFRED-153 — Add emailer to FRED landing page
add emailer

## LPFRED-154 — Update landing page wording for RIA status
update wording of main page and ToS and PP to reflect soon-to-be RIA status

## LPFRED-155 — Update landing page default calculation values
update default calculations to show an age of 49 to be retired; 22, $1k/mo

## LPFRED-156 — Update landing page comparison chart
update comparison chart

## LPFRED-157 — Claude landing page audit using Hormozi strategies
have claude ingest the ultimate landing page, give our landing page a rating and asking where to improve

Alex Hormozi's Landing Page Strategy for 2026 (https://www.youtube.com/watch?v=zA0B-VwOPn4)
4 Proven Steps to Build a MILLION DOLLAR Landing Page (https://www.youtube.com/watch?v=KneaEGicMZ4)
Brutally Honest Landing Page Advice from Alex Hormozi (https://www.youtube.com/watch?v=Qgtq-xxA00I)
The NEW Way Of Landing Pages in 2026 (https://www.youtube.com/watch?v=1gvPLQzrbmM)

## LPFRED-158 — Optimize landing pages for maximum conversions
landing pages need to be optimized for maximum conversions

## LPFRED-159 — Adjust landing page comparison table for accuracy
landing page comparison table needs to be adjusted

## LPFRED-160 — Change Desired Freedom Income to retirement framing
change Desired Freedom Income text to Desired Retirement Income

## LPFRED-161 — Build three subscription pricing tiers for launch
BUILD A PRODUCT THAT IS GOOD, REFINE THE LANDING PAGE TO REFLECT THE PRODUCT BETTER, MAKE TWO TIERS ON TOP OF CURRENT
$8, $15, $40 (as low as $5, $10, $20)

## LPFRED-162 — Add private beta testimonials to landing page
add private beta user testimonials

# LAUNCH NOTES (item 10)

## FRED-163 — Show calculation assumptions for credibility
B) Open Assumptions
Show:
* Expected return: 12%
* Inflation: 2–3%
* Withdrawal rate: 3.5–4%
Explain risks.
This builds credibility.

## FRED-164 — Historical simulator for bad market year scenarios
C) Historical Simulator
Show:
"If you started in 2000, 2008, 2020…"
What happens?
Even bad years.
Transparency = trust.

## FRED-165 — Early beta user case studies social proof
D) Case Studies (Early)
From beta users:
"Jake, 26 → +$14k → -2 years"
Screenshot + quote.
Real names (with permission).

## FRED-166 — What FRED won't do transparency section
E) What FRED won't do:
This is powerful.
Example:
We don't:
* Pick stocks
* Promise returns
* Encourage leverage
* Push trading
Signals integrity.

## FRED-167 — Redesign Ask Fred UI like Cloudflare Ask AI
make ask fred look like cloudflare's ask AI

## FRED-168 — Referral-discounted tier upgrade on profile page
Add ability to upgrade tiers in my profile page. if they already have had 1 referral, they can go to $20/mo instead of $40/mo. if they already have had 2 referrals, they can go to $10/mo instead of $15/mo

## FRED-169 — Reduce free trial to 14 days
make the fred free trial 90 days (because most churn happens in first 3 months)

## FRED-170 — Optimize loading screen timings
Optimize loading screen timings.

## FRED-171 — Payday lifecycle emails and push notifications
lifecycle emails regarding investing in FRED. Then time your lifecycle emails and push notifications around it:

Day before payday: "Your paycheck hits tomorrow. FRED will auto-invest $X — your Freedom Date moves up 6 days."
Day of payday: "💰 $X invested. New Freedom Date: [date]."
Day after payday: "You just got 6 days closer to freedom without lifting a finger."

## LPFRED-172 — Build calculator page for email collection
make calculator page for optimal email collection

## FRED-173 — Lock referral entry until 30 days post-trial
A new subscriber must be a subscriber for at least 30 days after their 14-day free trial ends before they can access the referral entry point. Lock the referral UI until that condition is met.

## FRED-174 — Wire up Apple subscription to pricing tiers (ONBOARDING)
Apple subscription needs to be set up with the pricing tiers section on investmentconfirmation.

## FRED-175 — Initiate ACATS API transfer during onboarding (ONBOARDING)
ACATS API transfer needs to be initiated as part of the onboarding flow.

## FRED-176 — Connect email list opt-in checkbox to emailer (ONBOARDING)
The "Keep me updated" marketing checkbox needs to be wired up to the FRED email list.

## FRED-177 — Remove back button from two onboarding pages (ONBOARDING)
Remove the back button from 2 pages in the onboarding flow.
