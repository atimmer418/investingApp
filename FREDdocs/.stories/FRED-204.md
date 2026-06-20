# FRED-204 — Fix white flash in static→Lottie reauth transition

## Before (from backlog.md)
> on a cold start and reauth is needed. when the static transitions into the lottie, there is a very brief white screen that displays (im talking like 0.1s like its just a slight flash) that we do not want to see. we want this transition to be seamless

## After

### Summary
On a cold start (most visible when reauth is needed and the cover stays up), the loading cover swaps its static fallback image for the coin-drop Lottie and a ~0.1s white flash shows through. The flash is caused by `index.html` hiding the static `#app-resume-cover-fallback` synchronously the instant `lottie.loadAnimation()` returns — before the Lottie has painted its first frame — exposing the white `#app-resume-cover` background. Fix: hide the static fallback only after the Lottie's first frame is actually rendered, so the handoff is seamless.

### Systems / files involved
- `frontend/src/index.html` (inline cover bootstrap script, lines 34-74):
  - `#app-resume-cover` — fixed white (`background:#ffffff`) overlay.
  - `#app-resume-cover-fallback` — static `<img src="assets/images/fred-logo.svg">` shown first.
  - `#app-resume-cover-lottie` — the `coin-drop.json` Lottie container.
  - **Line 70 — the bug:** `if (fallback) fallback.style.display = 'none';` runs immediately after `window.lottie.loadAnimation(...)` returns, i.e. before the Lottie SVG has painted → white background shows through for the gap.
- No other files needed; the cover lifecycle (`showAppCover()`/`hideAllCovers()` in `services/app-lock.service.ts`, `_fredCoverAnim.play()`) is unaffected.

### Doc references
- Related backstory: FRED-133 (piggy-bank loading screen), FRED-201 (keep cover up during cold-start reauth nav — same cover system).
- `reference_lottie_ios_rendering` (memory) — lottie-ios rendering quirks; relevant if the fix needs a render-confirmation hook.

### Acceptance criteria
1. On a cold start, the handoff from the static fallback image (`#app-resume-cover-fallback`) to the coin-drop Lottie shows no white flash — the white `#app-resume-cover` background is never visible between the static image and the first Lottie frame.
2. The static fallback is hidden only AFTER the Lottie has rendered its first frame — driven by a lottie-web render event (e.g. `DOMLoaded` / first `enterFrame`), not synchronously right after `loadAnimation()` returns (current line 70).
3. The transition is seamless: no white gap, no flicker, no double-image. (A short cross-fade is acceptable but optional; eliminating the white flash is the requirement.)
4. Fallback safety preserved: if the Lottie fails to load (script 404, parse error, no render event), the static fallback stays visible — it is only removed on a confirmed first render, so a Lottie failure never leaves a blank/white cover.
5. No change to the existing cover show/hide lifecycle (`showAppCover`/`hideAllCovers`, the 20s `index.html` backstop, `_fredCoverAnim.play()` on resume) beyond the fallback-hide timing.
6. Verified on a cold start (app fully terminated) with reauth required, on a local Capacitor iOS build (or 430×932 webview): no white flash during the static→Lottie transition.

### Edge cases / open questions
- **Correct lottie-web event:** confirm which event guarantees pixels on screen for the `svg` renderer — `DOMLoaded` (SVG built + inserted) vs first `enterFrame`. Use the one that fires only once the frame is actually painted.
- **Same box:** the fallback `<img>` and the Lottie container both already use `position:absolute; inset:0`, so swapping shouldn't shift/resize — verify after the change.
- **Content differs:** the static is `fred-logo.svg` and the Lottie is `coin-drop` — they are different artwork. "Seamless" here means eliminating the white flash; confirm with Andy whether a cross-fade between the two is also wanted, or just removing the white gap (default: just remove the white gap).

### Estimate / label
<1hr · [code]
