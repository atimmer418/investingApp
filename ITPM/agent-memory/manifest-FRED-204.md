# Acceptance Check Manifest — FRED-204

Fix white flash in static→Lottie reauth transition. Approved approach (Option A):
hide `#app-resume-cover-fallback` on the Lottie's `DOMLoaded` render event instead of
synchronously after `loadAnimation()` returns. Single file: `frontend/src/index.html`.

## AC-1: No white flash between the static fallback and the coin-drop Lottie on cold start — the white `#app-resume-cover` background is never visible in the gap.
- Type:     ui-acceptance
- Check:    Code-read confirms the fallback is never hidden in the synchronous window between `loadAnimation()` returning and the first frame painting; the only path that sets `fallback.style.display='none'` is inside the render-event handler. Live cold-start + reauth "flash is gone" confirmation at 430×932 is Andrew's "Looks Good" (device only; sandbox cannot reproduce a cold terminate + reauth).
- Evidence:
- Status:   pending

## AC-2: The static fallback is hidden only AFTER the Lottie renders its first frame (driven by a lottie-web render event, e.g. `DOMLoaded`), not synchronously right after `loadAnimation()` returns.
- Type:     ui-acceptance
- Check:    Code-read of `frontend/src/index.html`: the synchronous `if (fallback) fallback.style.display='none'` after `loadAnimation()` is removed, and the hide now runs inside a `window._fredCoverAnim.addEventListener('DOMLoaded', ...)` (or equivalent first-render) handler. No other synchronous hide of the fallback remains.
- Evidence:
- Status:   pending

## AC-3: Seamless transition — no white gap, no flicker, no double-image (a short cross-fade is acceptable but optional).
- Type:     ui-acceptance
- Check:    Code-read confirms the static image stays visible until the render event fires (no gap), and there is no path that shows both layers permanently or re-shows the fallback. Live seamlessness is confirmed by Andrew's "Looks Good".
- Evidence:
- Status:   pending

## AC-4: Fallback safety preserved — if the Lottie fails to load (404 / parse error / no render event), the static fallback stays visible; it is removed only on a confirmed first render.
- Type:     ui-acceptance
- Check:    Code-read confirms the fallback hide lives ONLY inside the render-event handler, so a Lottie 404/parse-error/never-render leaves the static image up. No timeout/catch path hides the fallback on failure.
- Evidence:
- Status:   pending

## AC-5: No change to the cover show/hide lifecycle (`showAppCover`/`hideAllCovers`, the 45s `index.html` backstop, `_fredCoverAnim.play()` on resume) beyond the fallback-hide timing.
- Type:     ui-acceptance
- Check:    Code-read confirms the `_coverHideTimer` backstop, `window._cancelCoverHideTimer`, and `window._fredCoverAnim` reference (used by `showAppCover()` to call `.play()`) are all unchanged; the diff touches ONLY the fallback-hide timing. `ng build --configuration=ci` (or `dev`) succeeds; `npx tsc --noEmit` exit 0.
- Evidence:
- Status:   pending

## AC-6: Verified on a cold start (app fully terminated) with reauth required, on a local Capacitor iOS build (or 430×932 webview): no white flash during the static→Lottie transition.
- Type:     ui-acceptance
- Check:    Deferred to Andrew's "Looks Good" — a full cold terminate + reauth at 430×932 cannot be reproduced in the sandbox. Verifier confirms everything provable statically (AC-1..AC-5) and that the build is clean; this final on-device confirmation is Andrew's.
- Evidence:
- Status:   pending
