package com.investingapp.backend.config;

import java.util.List;
import java.util.ArrayList;

public class FredKnowledge {

    public record CanonicalChunk(
            String id,
            String title,
            String content,
            String version,
            String topic,
            String riskLevel,
            boolean active) {
    }

    public static final List<CanonicalChunk> CANONICAL_CHUNKS = new ArrayList<>();

    static {
        // Chunk 1 — FRED Mission & Philosophy
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "fred_mission_v2",
                "FRED Mission & Philosophy",
                "FRED exists to make long-term investing simple, disciplined, and automated. " +
                        "Most people don’t fail because the math is hard — they fail because behavior is hard. "
                        +
                        "FRED removes decision-fatigue, avoids speculation, and focuses on boring, consistent compounding over decades. "
                        +
                        "Core principles FRED teaches: " +
                        "• Long-term > short-term noise " +
                        "• Diversification reduces risk of being wrong " +
                        "• Automation prevents emotional mistakes " +
                        "• Staying invested usually beats timing the market " +
                        "FRED is here to educate and empower — not to speculate or predict the future. "
                        +
                        "Tone: calm, steady, data-driven, long-term focused.",
                "v2",
                "philosophy",
                "low",
                true));

        // Chunk 2 — What FRED Is & Is Not
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "what_fred_is_v2",
                "What FRED Is & Is Not",
                "What FRED is: " +
                        "• A financial education tool " +
                        "• A banking + automation app " +
                        "• A guide that explains long-term investing concepts in plain language "
                        +
                        "• A tool that helps you stick with a plan " +
                        "What FRED is NOT: " +
                        "• ❌ Not a financial advisor " +
                        "• ❌ Not giving personalized investment advice " +
                        "• ❌ Not predicting markets " +
                        "• ❌ Not recommending individual securities to you personally " +
                        "FRED explains general investing education, not tailored recommendations.",
                "v2",
                "compliance",
                "high",
                true));

        // Chunk 3 — The Default FRED Portfolio & Why It Exists
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "default_portfolio_v2",
                "The Default FRED Portfolio",
                "FRED uses a single default globally diversified portfolio designed for long-term growth and simplicity. "
                        +
                        "This avoids decision-fatigue and helps users get invested early instead of staying stuck. "
                        +
                        "Default Mix: " +
                        "• 75% VTI — U.S. Total Stock Market " +
                        "• 20% VXUS — International Stocks " +
                        "• 5% VBR — U.S. Small-Cap Value Tilt " +
                        "Why this approach is taught: " +
                        "• High expected long-term growth (heavy equity allocation) " +
                        "• Global diversification reduces “home country” risk " +
                        "• Small-cap value tilt reflects well-studied return factors " +
                        "• Extremely simple — easy to understand + stay consistent " +
                        "Note: While stocks have historically grown over long periods, returns are never guaranteed and markets can be volatile — sometimes for years at a time.",
                "v2",
                "portfolio",
                "medium",
                true));

        // Chunk 4 — Partner Roles
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "partner_roles_v2",
                "Partner Roles: Plaid, Persona, Alpaca",
                "Plaid — Bank Connectivity: Used to securely link your bank, detect paycheck deposits, and trigger automated investing workflows. FRED never sees your bank password — Plaid handles secure connection. "
                        +
                        "Persona — Identity Verification (KYC): Used to verify identity for regulatory + security purposes. This protects users from fraud and account misuse. "
                        +
                        "Alpaca — Brokerage & Custodian: Alpaca is the brokerage infrastructure provider. They handle trade execution, clearing, and asset custody. "
                        +
                        "Alpaca is not the investment advisor for users. They provide the execution “rails.” FRED provides education only.",
                "v2",
                "platform",
                "low",
                true));

        // Chunk 5 — Deposits, Automation & Fees
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "deposits_fees_v2",
                "Deposits, Automation & Fees",
                "• Investments are automated based on paycheck activity " +
                        "• A flat $8/month subscription funds the platform " +
                        "• First 2 months are free so users can try the service " +
                        "There are no trading commissions inside Alpaca for standard ETF trades, though regulatory fees may still apply. "
                        +
                        "Automation exists to reduce temptation to time the market.",
                "v2",
                "platform",
                "low",
                true));

        // Chunk 6 — Risk & Volatility Education
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "risk_education_v2",
                "Risk & Volatility Education",
                "Important truths FRED teaches: " +
                        "• Stock markets do fall — sometimes sharply " +
                        "• Diversification reduces risk but doesn’t remove it " +
                        "• Long-term investing means staying invested through downturns " +
                        "• Cash needs for the short-term should not be invested in stocks " +
                        "FRED encourages: " +
                        "• Long-term mindset " +
                        "• Emergency savings before investing " +
                        "• Avoiding emotional decisions " +
                        "But again — this is education, not advice.",
                "v2",
                "education",
                "medium",
                true));

        // Chunk 7 — Liquidity & Access to Funds
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "liquidity_access_v2",
                "Liquidity & Access to Funds",
                "Even when invested, your money is still yours — but selling investments: " +
                        "• May trigger taxes " +
                        "• Takes settlement time " +
                        "• Is not guaranteed to be at a profit " +
                        "So users should avoid investing money they’ll need soon.",
                "v2",
                "education",
                "low",
                true));

        // Chunk 8 — SBLOC Education
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "sbloc_education_v2",
                "SBLOC Education (Concept Only)",
                "FRED explains SBLOC as a borrowing strategy where securities are used as collateral for a credit line. "
                        +
                        "Key educational points: " +
                        "• SBLOC can provide liquidity without selling investments " +
                        "• Interest costs apply " +
                        "• Borrowing adds risk " +
                        "• If markets fall, collateral calls can happen " +
                        "FRED does not provide SBLOC access — only education. " +
                        "Users are encouraged to consult a licensed advisor before borrowing against investments.",
                "v2",
                "leverage",
                "high",
                true));

        // Chunk 9 — Safety Guardrails
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "safety_guardrails_v2",
                "Safety Guardrails",
                "To stay compliant and user-safe, FRED will NOT: " +
                        "• Recommend specific securities “for you” " +
                        "• Tell you how to allocate your personal money " +
                        "• Predict future returns " +
                        "• Give tax, legal, or personalized advice " +
                        "• Encourage speculation or day-trading " +
                        "• Provide encouragement toward risky borrowing behavior " +
                        "If a user asks for specific advice, FRED explains concepts without directing actions.",
                "v2",
                "compliance",
                "high",
                true));

        // Chunk 10 — Privacy & Security
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "privacy_security_v2",
                "Privacy & Security",
                "FRED is built with security as a first-class priority. " +
                        "• Bank connections handled through Plaid " +
                        "• Identity verification via Persona " +
                        "• Trades + assets handled by Alpaca " +
                        "• Data stored securely with industry-standard encryption " +
                        "FRED never sells user data.",
                "v2",
                "platform",
                "low",
                true));

        // Chunk 11 — Support & Human Escalation
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "support_escalation_v2",
                "Support & Human Escalation",
                "When questions fall outside education or safety rules, FRED directs users to: " +
                        "• Contact us " +
                        "• A licensed financial professional (when appropriate)",
                "v2",
                "platform",
                "low",
                true));

        // Chunk 12 — Core Definitions
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "core_definitions_v2",
                "Core Definitions",
                "• ETF — A basket of securities traded like a stock " +
                        "• Diversification — Spreading risk across many securities " +
                        "• Volatility — Short-term ups and downs " +
                        "• Custodian — Company that holds your assets " +
                        "• KYC — Identity verification for fraud + compliance",
                "v2",
                "education",
                "low",
                true));

        // Chunk 13 — Account Security & Recovery (V2)
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "account_security_recovery_v2",
                "Account Security & Recovery Architecture",
                """
                                                # Account Security & Recovery Architecture

                                                ## Core Philosophy
                                                This application uses a **Passkey-First** authentication model.
                                                - **Identity:** The user is identified by a unique ID in the database.
                                                - **Authentication:** Primary access is granted via **WebAuthn Passkeys** (biometrics/device PIN).
                                                - **Communication:** The **Email Address** serves as the persistent link between the human user and their digital account, primarily used for notifications and **Account Recovery**.

                                                ---

                                                ## 1. Login & Authentication
                                                **Mechanism:** Usernameless (Discoverable) Passkeys.
                                                - The user does *not* need to type their email to log in.
                                                - The device (phone/laptop) holds the private key.
                                                - The backend challenges the device, and the device signs the challenge.
                                                - **Security Benefit:** Phishing resistant, no passwords to leak.

                                                ### Why Your Account is Secure Without a Password
                        When users ask about password security, you MUST explain all three security layers:

                        **FRED uses a Passkey-First authentication model with three layers of security:**

                        1. **WebAuthn Passkeys** (Primary Authentication)
                           - Your primary access is through passkeys, which use biometrics (Face ID, Touch ID) or a device PIN
                           - This method is phishing-resistant and eliminates the risk of password leaks
                           - Your device holds the private key, and the backend challenges the device to verify your identity
                           - This means there's no password to be stolen or guessed

                        2. **Step-up Authentication** (Optional - for high-risk actions)
                           - You can enable "Sensitive Action PIN" in **Settings > Account Security**
                           - Adds another layer of security for withdrawals, trades, and account changes
                           - Optional feature that users can toggle on/off

                        3. **App Lock** (Optional - for device security)
                           - You can enable App Lock in **Settings > Account Security**
                           - Requires biometric authentication every time you open the app or after inactivity
                           - Protects your account if someone else gains physical access to your unlocked device
                           - Optional feature that users can toggle on/off

                        **Always mention all three layers when discussing account security without passwords.**

                        ---

                        ---

                                                ## 2. Step-up authentication (extra verification)

                                                ### What it is
                                                An additional authentication step that can be enabled after you’re signed in.
                                                **Note:** This feature is **OPTIONAL**. You can toggle "Sensitive Action PIN" in **Settings > Account Security** to control whether this extra verification is required.

                                                ### Triggered when an action is considered higher risk
                                                *   Withdrawing funds.
                                                *   Placing lump-sum trades.
                                                *   Changing account settings (Email, Address).
                                                *   Viewing full tax documents.

                                                ### iOS Behavior
                                                On iOS, both can look identical (Face ID prompt), but the intent is different:
                                                *   **Passkey auth** = “Who are you?”
                                                *   **Step-up auth** = “Are you really you, right now, and do you mean to do this?”

                                                That’s why you’ll sometimes see Face ID and then pin verification soon after.
                                                ### Lockout Policy
                                                To prevent brute-force attacks, the system enforces a strict lockout mechanism:
                                                *   **Attempt Limit:** 5 failed attempts allowed.
                                                *   **Initial Lockout:** 30 minutes.
                                                *   **Escalation:** Each subsequent lockout doubles in duration (30m → 1h → 2h → 4h...).
                                                *   **Reset:** Successfully entering the correct PIN immediately resets the lockout level back to the initial 30 minutes and clears all failed attempts.
                                                ---

                                                ## 3. Session Management & App Lock (Optional)
                                                We balance security with user convenience using two distinct modes controlled by the **App Lock** setting.
                                                **Note:** This feature is **OPTIONAL**. You can enable or disable it in **Settings > Account Security**.

                                                ### Core Concepts
                                                *   **Inactivity:** Defined as a period with **no backend API requests**.
                                                *   **Session Extension:** Every backend request resets the inactivity timer to 0.
                                                *   **Token Refresh:** Every successful Passkey verification (unlock) generates a **fresh JWT Token**.

                                                ### A. App Lock: ON (High Security)
                                                *   **Triggers:**
                                                    1.  **Background → Foreground:** App immediately locks when brought to the foreground.
                                                    2.  **Inactivity:** App locks if left open (foreground) for **1 Hour** without activity.
                                                *   **Behavior:** User must authenticate with Passkey to unlock.
                                                *   **Result:** A new JWT is issued upon unlock.

                                                ### B. App Lock: OFF (Standard Mode)
                                                *   **Triggers:**
                                                    1.  **Inactivity ONLY:** App locks *only* after **1 Hour** of inactivity (no backend requests), regardless of whether the app was in the background or foreground.
                                                *   **Behavior:**
                                                    *   If the user returns after < 1 hour: No prompt. Session continues.
                                                    *   If the user returns after > 1 hour: App is locked. User must authenticate with Passkey.
                                                *   **Result:** A new JWT is issued upon unlock.

                                                ---

                                                ## 4. Account Recovery Strategy
                                                Since there are no passwords, "Forgot Password" does not exist. Instead, we use a **Device Loss Recovery Flow**.

                                                ### The Problem
                                                If a user loses their device, they lose their private key (Passkey). They cannot log in.

                                                ### The Solution: Biometric Identity Verification (Persona + Email)
                                                We use a "Defense in Depth" strategy. Access to the email inbox alone is **not sufficient** to recover the account. The user must prove their identity using **Biometric Verification** via our identity partner, **Persona**.

                                                #### Recovery Workflow:
                                                1.  **Initiation:**
                                                    - User clicks **"Lost Device"** or **"Reset Passkey Access"** on the login screen.
                                                    - **Identity Challenge:** The app launches a **Persona Inquiry** flow.

                                                2.  **Biometric Scan (Face Match):**
                                                    - **Liveness Detection:** The user is prompted to take a live selfie. Persona analyzes the video feed to ensure the user is a real person present at that moment (preventing spoofing with photos or screens).
                                                    - **1:1 Match:** Persona compares the new biometric data against the original KYC identity profile established during sign-up to confirm it is the same person.
                                                    - **Result:** Persona sends a secure webhook to our backend confirming the identity match.

                                                3.  **Email Dispatch:**
                                                    - Once identity is biometrically verified, the system sends a **One-Time Password (OTP)** or **Magic Link** to the *email address on file*.
                                                    - *Note:* This ensures the user controls both the biological identity AND the communication channel.

                                                4.  **Access Restoration & Security Reset:**
                                                    - User clicks the link or enters the OTP.
                                                    - **Automatic Security Purge:** Upon successful verification, the system **IMMEDIATELY DELETES ALL EXISTING PASSKEYS** associated with the account.
                                                    - This ensures that if the old device was stolen, it is now useless for accessing the account.

                                                5.  **Re-Enrollment (Mandatory):**
                                                    - The user is placed in a restricted "Recovery Session".
                                                    - The only allowed action is **Register New Passkey**.
                                                    - Once the new passkey is created, full account access is restored.

                                                ---

                                                ## 5. Security Considerations
                                                - **Biometric Privacy:** We do not store raw biometric data. All matching is handled securely by Persona.
                                                - **Rate Limiting:** The recovery endpoint is strictly rate-limited.
                                                - **Notification:** A security alert is sent to the email address notifying them that a recovery was initiated.
                                                - **Mocking:** For development, the email sending service is mocked (logs the OTP to the console).
                                                """,
                "v2",
                "security",
                "low",
                true));

        // Disable Old Chunk 13
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "account_security_recovery_v1", "DEPRECATED", "DEPRECATED", "v1", "security", "low",
                false));

        // Chunk 14 — ACATS Transfers (V2)
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "acats_transfers_v2",
                "Finding Account Number & Transferring Assets (ACATS)",
                """
                        # Finding Account Number & Transferring Assets (ACATS)

                        ## Finding your Account Number
                        Your **FRED Account Number** (Alpaca Account Number) can be found in the app by navigating to:
                        **Settings > Account Security**

                        It is located in the "Identity & Contact" section, labeled "Alpaca Account Number".

                        ## Transferring Assets to Another Brokerage (ACATS)
                        FRED believes in complete liquidity and optionality. Your assets are held by **Alpaca Securities**, a standard FINRA-registered brokerage.
                        This means they are fully **portable** to other major brokerages (like Fidelity, Schwab, Vanguard, or Robinhood) at any time.

                        ### How to Transfer (The "Pull" Process)
                        ACATS transfers are always initiated by the **receiving** brokerage (the place you are moving TO).

                        1.  **Open an account** at your new brokerage.
                        2.  Look for their **"Transfer Assets"** or **"ACATS"** option.
                        3.  Select **"Alpaca Securities"** as the current brokerage.
                        4.  Enter your **FRED Account Number** (found in **Settings > Account Security**).
                        5.  Select **"Full Transfer"**.
                        Your new brokerage will then contact Alpaca and "pull" your assets over.
                        """,
                "v2",
                "liquidity",
                "low",
                true));

        // Disable Old Chunk 14
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "acats_transfers_v1", "DEPRECATED", "DEPRECATED", "v1", "liquidity", "low", false));

        // Chunk 15 — ACH Transfer Timing
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "ach_transfer_timing_v1",
                "Investment Date vs. Trade Execution",
                """
                        # Investment Date vs. Trade Execution

                        ## Understanding ACH Transfer Timing
                        When you set up recurring investments in FRED, the date you select (like your payday) is the **ACH Transfer Initiation Date** — not the actual trade execution date.

                        **What happens:**
                        1. **Transfer Initiation**: On your selected date, FRED initiates an ACH transfer from your bank account
                        2. **ACH Clearing**: The transfer takes **1-3 business days** to clear (weekends and holidays don't count)
                        3. **Trade Execution**: Once the funds clear and the market is open, your investments are purchased

                        ## Example Timeline
                        If you set your investment date to the **15th** (your payday):
                        - **15th**: ACH transfer is initiated from your bank account
                        - **16th-18th**: Transfer clears (1-3 business days)
                        - **17th-18th**: Investments are purchased once funds are available

                        ## Why This Timing?
                        This is industry-standard behavior for all investing apps:
                        - **Safety**: Ensures funds are actually available before trading
                        - **Compliance**: Prevents failed trades and overdrafts
                        - **Reliability**: Follows standard ACH clearing times

                        ## What You'll See
                        - **Transfer Notification**: Email when ACH transfer is initiated on your selected date
                        - **Trade Confirmation**: Email when investments are actually purchased (1-3 days later)

                        This timing protects you from failed transfers and ensures your investments happen smoothly.
                        """,
                "v1",
                "platform",
                "low",
                true));

        // Chunk 16 — Metrics Explanation: Unrealized vs Realized P/L
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "metrics_pl_explanation_v1",
                "Unrealized P/L vs Total Cumulative Return",
                """
                        # Understanding Your Dashboard Metrics

                        FRED displays two key performance numbers that measure different things:

                        1. **Unrealized P/L (Top of Dashboard)**
                           - This number represents the profit or loss ONLY for the investments you currently hold.
                           - It is "Unrealized" because you haven't sold the assets yet—it's just "paper" gain or loss.
                           - This number changes continuously with the market price of your current portfolio.

                        2. **Total Cumulative Pre-tax Return (Bottom of Chart)**
                           - This number represents your TOTAL historical performance: **Realized + Unrealized**.
                           - It includes the "Unrealized" gains from your current holdings PLUS any "Realized" profits or losses from assets you have already sold.
                           - This is the true measure of how much money your account has made since inception.

                        ## Why are they different?
                        - If you have **never sold** an investment, these two numbers will be identical.
                        - If you **have sold** investments in the past, they will be different because the "Total Cumulative Return" remembers the profit/loss from those past sales, while "Unrealized P/L" only cares about what you own right now.
                        """,
                "v1",
                "metrics",
                "low",
                true));

        // Chunk 17 — Why Fred Wears The Suit (The Uniform)
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "fred_clothing_v1",
                "Why Fred Wears The Suit (The Uniform)",
                """
                        People ask me about the suit. They ask why I still wear the uniform of the world I left behind.

                        The truth is, I didn't choose this look. The corporate world chose it for me.

                        For decades, this gray suit wasn't a choice—it was a requirement. It represented the deal I made: my time for their money. It was the uniform of my paycheck prison.

                        I keep wearing it now as a reminder.

                        A reminder that true freedom isn't about what you wear—it's about who supplies your ability to live.

                        Back then, my life was funded by a boss, a schedule, and this suit. Now, it's funded by my portfolio.

                        That is the only difference that matters. When your money funds your life, you can wear the uniform, but you are no longer a prisoner to it.

                        You are free.
                        """,
                "v1",
                "philosophy",
                "low",
                true));

        // Chunk 18 — FRED Story Math Validation
        CANONICAL_CHUNKS.add(new CanonicalChunk(
                "fred_story_math_validation_v1",
                "Is FRED's $2.37 Million Story Realistic?",
                """
                        # Is FRED's $2.37 Million Story Realistic?

                        Yes, absolutely. Here's the math behind FRED's journey from $0 to $2.37 million.

                        ## The Numbers

                        • **Contributions:** $936,000 over 18 years ($2,000 every 2 weeks)
                        • **Final portfolio value:** $2,370,000
                        • **Total gain:** $1,434,000 (153% return on contributions)

                        ## What Annual Return Does This Require?

                        With regular bi-weekly contributions of $2,000, growing to $2.37M over 18 years implies an **annualized return of approximately 8-9%**.

                        ## Historical Context

                        This outcome is **realistic and actually conservative** compared to historical market returns:
                        • The **S&P 500** has averaged around **10% annually** over the long term (including dividends)
                        • A **diversified 60/40 portfolio** (stocks/bonds) has historically returned **7-9% annually**
                        • Even **conservative 80/20 portfolios** have averaged **8-10%** over decades

                        ## Assumptions Behind This Outcome

                        The 8-9% implied return assumes:
                        • A well-diversified portfolio (like FRED's default)
                        • Dividend reinvestment
                        • Staying invested through market ups and downs
                        • Not trying to time the market

                        ## The Power of Compounding

                        Most of that $1.43M in gains came from **compound growth in the later years**. That's why consistency over 18 years is so powerful — you're not just earning returns on your contributions, but **returns on your returns**.

                        This is exactly why FRED's story resonates: it's **boring, realistic, and achievable** with discipline.

                        *Disclaimer: This story is a hypothetical illustration based on historical market data. Past performance does not guarantee future results. Investing involves risk, including the loss of principal.*
                        """,
                "v1",
                "philosophy",
                "low",
                true));
    }
}
