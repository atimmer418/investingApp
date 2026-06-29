# Implementation Notes — FRED-195

## Design Decisions

- **Shared helper placement**: Created `frontend/src/app/utils/equity-pig.utils.ts` as a static class, matching the `JwtTokenUtils` pattern already in that folder. No Angular decorator needed — pure static methods, zero deps.
- **Two methods, one threshold table**: `pigSrcFromEquity(equity)` for live dollar values; `pigSrcFromLevel(level)` for backend L1–L6. Both derive from the same internal constants — thresholds only appear once (in `pigSrcFromEquity`; `pigSrcFromLevel` delegates to `Math.min(level, 5)` which implicitly follows the same 5-range mapping).
- **tab3 liveEquity property**: Rather than duplicating the `getPortfolioDashboard()` subscription, I set `this.liveEquity` as a side-effect inside the existing portfolio subscription in `loadStatStrip()`. The getter `pigAvatarSrc` then derives from it. This keeps the single portfolio API call and avoids a second subscription.
- **my-profile avatarSrc**: Switched from `equityLevel` (stale MFU) to `currentPortfolioValue` (already fetched from `getPortfolioDashboard()` at page init). No new API calls needed. The `equityLevel` property is still on the class (used for `statusPercentile` context) — left in place, not dead.

## Deviations

- None from the spec.

## Tradeoffs

- `tab3` `liveEquity` starts at 0, so on initial load before the portfolio API returns, the avatar briefly shows `pig-range-1.svg`. This is correct per AC #6 (zero equity → range 1 fallback) and matches the "loading" state where no better data is available.
- `my-profile` `currentPortfolioValue` is initialized to 0 (line ~49), so same behavior — pig-range-1 until data loads. Consistent with tab3.

## Open Questions

- None. All edge cases were resolved by Andy in the story.
