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
                // 1. Automation
                CANONICAL_CHUNKS.add(new CanonicalChunk(
                                "automation_vs_willpower_v1",
                                "Why Automation Works Better Than Willpower",
                                "Human willpower is a depletable resource. Relying on it to make savvy financial decisions every month is a strategy destined for failure. "
                                                +
                                                "By automating your investments—treating them like a bill that must be paid—you remove the emotional friction of manual transfers. "
                                                +
                                                "In volatile markets, manual investors often hesitate, trying to 'time' their entry, whereas automated investors buy consistently, lowering their average cost basis over time (dollar-cost averaging). "
                                                +
                                                "Automation enforces discipline without requiring constant mental effort.",
                                "v1",
                                "automation",
                                "low",
                                true));

                // 2. Fees
                CANONICAL_CHUNKS.add(new CanonicalChunk(
                                "flat_fee_vs_percentage_v1",
                                "Why a Flat Fee Beats a Percentage Fee Over Time",
                                "The financial industry standard is to charge a percentage of assets under management (AUM), typically 1%. "
                                                +
                                                "While 1% sounds small, it compounds aggressively against you. On a $1M portfolio, a 1% fee is $10,000 per year—every year. "
                                                +
                                                "Over 30 years, a 1% fee can erode up to 25-30% of your total potential wealth due to lost compound growth. "
                                                +
                                                "A flat fee (like a gym membership) ensures that as your wealth grows, your costs remain fixed, allowing you to keep the vast majority of your compounding returns.",
                                "v1",
                                "fees",
                                "low",
                                true));

                // 3. Liquidity
                CANONICAL_CHUNKS.add(new CanonicalChunk(
                                "liquidity_matters_v1",
                                "Why Liquidity Matters More Than Maximum Returns",
                                "Many investors chase maximum theoretical returns by locking money into illiquid assets like real estate syndications or retirement accounts with early-withdrawal penalties. "
                                                +
                                                "However, life is unpredictable. True financial independence requires having access to capital when opportunities (or emergencies) arise. "
                                                +
                                                "A slightly lower return on a liquid asset is often superior to a higher return on an asset you cannot sell. "
                                                +
                                                "Liquidity is the ultimate form of optionality, giving you the power to act when others are forced to wait.",
                                "v1",
                                "liquidity",
                                "low",
                                true));

                // 4. No Trading
                CANONICAL_CHUNKS.add(new CanonicalChunk(
                                "no_trading_v1",
                                "Why FRED Doesn’t Offer Trading",
                                "Trading—buying and selling individual stocks in the short term—is statistically a losing game for retail investors. "
                                                +
                                                "Platform incentives are often misaligned; they want you to trade because they profit from volume or payment for order flow. "
                                                +
                                                "FRED is built for 'investing,' not 'trading.' We curate diversified portfolios designed for decades of growth, not minutes of excitement. "
                                                +
                                                "Removing the button to trade individual stocks prevents panic selling during downturns and FOMO buying during peaks.",
                                "v1",
                                "behavior",
                                "low",
                                true));

                // 5. SBLOCs
                CANONICAL_CHUNKS.add(new CanonicalChunk(
                                "sbloc_danger_v1",
                                "What SBLOCs Are — and When They’re Dangerous",
                                "A Securities-Backed Line of Credit (SBLOC) allows you to borrow against your portfolio without selling assets, avoiding taxable events. "
                                                +
                                                "While powerful, it introduces leverage risk. If the market value of your assets drops significantly, the lender can issue a 'margin call,' forcing you to sell assets at the bottom to cover the loan. "
                                                +
                                                "This can destroy decades of compounding in days. FRED advises extreme caution: SBLOCs should only be used by experienced investors with low loan-to-value (LTV) ratios and stable cash flows to service the debt.",
                                "v1",
                                "leverage",
                                "caution",
                                true));

                // 6. Starting Small
                CANONICAL_CHUNKS.add(new CanonicalChunk(
                                "starting_small_v1",
                                "Why Starting Small Still Works",
                                "The most important factor in compounding is time, not the starting amount. " +
                                                "Waiting until you have 'enough' money to invest is a mistake. Investing $50 a month for 40 years can outperform investing $500 a month for the last 10 years. "
                                                +
                                                "Starting small builds the habit (automation) and allows you to make mistakes when the stakes are low. "
                                                +
                                                "Momentum is psychological; seeing a small balance grow motivates you to increase contributions later.",
                                "v1",
                                "getting_started",
                                "low",
                                true));

                // Phase 2 Additions

                // 7. Market Crash
                CANONICAL_CHUNKS.add(new CanonicalChunk(
                                "market_crash_behavior_v1",
                                "What to do during a market crash",
                                "Market crashes are a normal, expected part of the economic cycle, occurring roughly every 7-10 years. "
                                                +
                                                "The natural instinct is to sell to 'stop the bleeding,' but this crystallizes temporary paper losses into permanent actual losses. "
                                                +
                                                "History shows that the best days often follow the worst days. Missing just the 10 best trading days over 20 years can cut your returns in half. "
                                                +
                                                "During a crash, the best action is usually inaction—or, if possible, increasing your automated contributions to buy more shares at discount prices.",
                                "v1",
                                "behavior",
                                "caution",
                                true));

                // 8. Predictions
                CANONICAL_CHUNKS.add(new CanonicalChunk(
                                "fred_no_predictions_v1",
                                "Why FRED avoids predictions",
                                "Financial media is built on predictions because they sell ads, not because they are accurate. "
                                                +
                                                "No one consistently predicts macro events, interest rates, or stock movements. "
                                                +
                                                "FRED treats the future as unknowable. Instead of predicting, we prepare. We build robust, diversified portfolios that can survive multiple economic futures. "
                                                +
                                                "Focusing on what you can control (savings rate, fees, behavior) is far more profitable than guessing what you cannot control (the market).",
                                "v1",
                                "philosophy",
                                "low",
                                true));
        }
}
