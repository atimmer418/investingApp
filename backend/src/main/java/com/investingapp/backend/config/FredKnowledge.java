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
        }
}
