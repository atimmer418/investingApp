# Implementation Notes — FRED-208

## Design decisions

- **Internal key `traditional` preserved**: Display label renamed to "Yield-Based Income" in STRATEGY_DEFS and mc-info-sheet. `ShowdownResult.traditional`, `simulateTraditional()`, and localStorage history entries (schema v2) all remain unchanged. Zero migration risk.
- **`buildFade` extracted to shared util**: `frontend/src/app/utils/modal-fade.utils.ts` — avoids duplicating the WKWebView invisible-modal fix (opacity + transform keyframes) across simulator flow and strategy deck. Both callers import from one place.
- **Height-filling grid via flex column, not `calc()`**: Added `display: flex; flex-direction: column` to `ion-content.retirement-content::part(scroll)`. `.edu-landing { flex: 1; min-height: 0 }` then grows naturally to fill the scroll viewport. Avoids fragile viewport-height arithmetic.
- **`EDU_CARD_DEFS` exported from strategy-deck TS**: Parent imports it instead of duplicating the 4-card data array. Single source of truth for card icon/name/tag/hint.
- **Angular template `(scroll)` and `(click)` on `.deck-scroll`**: Preferred over manual `addEventListener` so Angular removes them on component destroy without needing code in `ngOnDestroy`.

## Deviations from spec

- **`deck-x` sibling of `deck-scroll`** (not child): The X dismiss button lives in `.deck-top` which is a sibling of `.deck-scroll`. This prevents X clicks from bubbling into the `onDeckClick` tap-zone handler. The prototype HTML had the same structure; no behavioral difference.
- **`</ion-content>` was missing at EOF**: The HTML edit that replaced the old strategy section omitted the closing `</ion-content>` tag. Fixed by adding it back. AOT build accepted the original (Angular's parser is lenient at EOF) but the tag is required for proper HTML.

## Tradeoffs

- **5 slides per deck = tall on small phones**: The SBLOC "Do it safely" slide has 4 step-rows + warn-card. Each `.slide` gets `overflow-y: auto` so tall content is independently scrollable without breaking horizontal snap. This matches the prototype's approach.
- **No scroll-behavior: smooth on iOS**: The `.deck-scroll` scroll-behavior is left at default (auto) for iOS; setting `scroll-behavior: smooth` on a scroll-snap container can interfere with snap alignment on WKWebView.

## Open questions

- The `strategy-detail.page.*` component uses "Traditional Approach" / "SBLOC vs. Traditional Withdrawals" as comparison copy. This is a different conceptual usage from the FRED-208 rename scope, but it could confuse users who now see "Yield-Based Income" in the education tab. Left untouched pending Andy's decision.
