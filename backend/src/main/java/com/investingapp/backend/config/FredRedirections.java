package com.investingapp.backend.config;

import com.investingapp.backend.dto.SafetyReason;
import java.util.Map;
import java.util.EnumMap;

public class FredRedirections {

    public static final Map<SafetyReason, String> RESPONSES = new EnumMap<>(SafetyReason.class);

    static {
        RESPONSES.put(SafetyReason.STOCK_PICKING,
                "I can't recommend specific stocks or investments. My role is to help you build a system for long-term growth using diversified portfolios, rather than picking individual winners.");

        RESPONSES.put(SafetyReason.MARKET_TIMING,
                "I don't predict market movements. FRED is built on the belief that time in the market beats timing the market. The best strategy is usually staying consistent regardless of short-term volatility.");

        RESPONSES.put(SafetyReason.SPECIFIC_AMOUNT,
                "I can't tell you exactly how much to invest, as that depends on your personal budget. However, FRED recommends automating a consistent amount that you can sustain for the long term.");

        RESPONSES.put(SafetyReason.COMPARISON,
                "I can't provide a personalized comparison against other specific accounts. Generally, FRED prioritizes automation, simplicity, and flexibility compared to traditional retirement accounts that may lock up your funds.");

        RESPONSES.put(SafetyReason.LEVERAGE,
                "I can't advise on when to use leverage or SBLOCs. These are advanced tools for accessing liquidity without selling assets, but they carry risks and require a stable, diversified portfolio.");

        RESPONSES.put(SafetyReason.TOXIC,
                "I cannot continue this conversation.");

        RESPONSES.put(SafetyReason.NONE, "");
    }

    public static String get(SafetyReason reason) {
        return RESPONSES.getOrDefault(reason,
                "I can't answer that specific question, but I can help you understand FRED's long-term investing principles.");
    }
}
