# Acceptance Check Manifest — FRED-204

Fix white flash in static→Lottie reauth transition. Approved approach (Option A):
hide `#app-resume-cover-fallback` on the Lottie's `DOMLoaded` render event instead of
synchronously after `loadAnimation()` returns. Single file: `frontend/src/index.html`.

## AC-1: No white flash between the static fallback and the coin-drop Lottie on cold start — the white `#app-resume-cover` background is never visible in the gap.
- Type:     ui-acceptance
- Check:    Code-read confirms the fallback is never hidden in the synchronous window between `loadAnimation()` returning and the first frame painting; the only path that sets `fallback.style.display='none'` is inside the render-event handler. Live cold-start + reauth "flash is gone" confirmation at 430×932 is Andrew's "Looks Good" (device only; sandbox cannot reproduce a cold terminate + reauth).
- Evidence:  `frontend/src/index.html` lines 65-82: `if (fallback) fallback.style.display='none'` (formerly synchronous, right after `loadAnimation()`) removed; the only `fallback.style.display='none'` statement now lives inside `window._fredCoverAnim.addEventListener('DOMLoaded', ...)` (line 79-81). Verifier confirmed via `git diff frontend/src/index.html`: the removed line was the synchronous hide; the added block is the listener. Code-read portion satisfied; live device confirmation deferred to Andrew.
- Status:   pass (code-read portion; device-only live confirmation deferred to Andrew)

## AC-2: The static fallback is hidden only AFTER the Lottie renders its first frame (driven by a lottie-web render event, e.g. `DOMLoaded`), not synchronously right after `loadAnimation()` returns.
- Type:     ui-acceptance
- Check:    Code-read of `frontend/src/index.html`: the synchronous `if (fallback) fallback.style.display='none'` after `loadAnimation()` is removed, and the hide now runs inside a `window._fredCoverAnim.addEventListener('DOMLoaded', ...)` (or equivalent first-render) handler. No other synchronous hide of the fallback remains.
- Evidence:  Verifier confirmed bundled `frontend/src/assets/lottie/lottie-web.min.js` emits a `DOMLoaded` event (`grep -o "DOMLoaded" assets/lottie/lottie-web.min.js` matches, exit 0 — the event name is real, not a typo). Diff: removed synchronous `if (fallback) fallback.style.display = 'none';`; added `if (fallback) { window._fredCoverAnim.addEventListener('DOMLoaded', function() { fallback.style.display = 'none'; }); }`. `grep -n "fallback.style.display" index.html` = exactly one match (line 80), inside the listener. No synchronous hide remains.
- Status:   pass

## AC-3: Seamless transition — no white gap, no flicker, no double-image (a short cross-fade is acceptable but optional).
- Type:     ui-acceptance
- Check:    Code-read confirms the static image stays visible until the render event fires (no gap), and there is no path that shows both layers permanently or re-shows the fallback. Live seamlessness is confirmed by Andrew's "Looks Good".
- Evidence:  The static `<img id="app-resume-cover-fallback">` (index.html line 36) is absolutely positioned over the Lottie container (line 35) and stays visible (default `display`) until `DOMLoaded` fires, at which point it is hidden exactly once — no code path re-shows it (only one `fallback.style.display` reference in the whole file). Hard swap on the event, as permitted by AC-3 (cross-fade optional, not required). Code-read portion satisfied; live seamlessness deferred to Andrew.
- Status:   pass (code-read portion; live seamlessness deferred to Andrew)

## AC-4: Fallback safety preserved — if the Lottie fails to load (404 / parse error / no render event), the static fallback stays visible; it is removed only on a confirmed first render.
- Type:     ui-acceptance
- Check:    Code-read confirms the fallback hide lives ONLY inside the render-event handler, so a Lottie 404/parse-error/never-render leaves the static image up. No timeout/catch path hides the fallback on failure.
- Evidence:  Verifier greps: `grep -nE "catch|onerror|.error|setTimeout" index.html` returns only the pre-existing 45s `_coverHideTimer` setTimeout (line 46). That timer hides the whole `#app-resume-cover` (`cover.style.display`, line 48), NOT the fallback — so there is NO fallback-hiding timeout/catch/error path. The only `fallback.style.display = 'none'` is inside `window._fredCoverAnim.addEventListener('DOMLoaded', ...)`. If `coin-drop.json` 404s or fails to parse, lottie-web never fires `DOMLoaded`, so the callback never runs and the static `fred-logo.svg` remains visible (bounded only by the untouched 45s backstop on the whole cover).
- Status:   pass

## AC-5: No change to the cover show/hide lifecycle (`showAppCover`/`hideAllCovers`, the 45s `index.html` backstop, `_fredCoverAnim.play()` on resume) beyond the fallback-hide timing.
- Type:     ui-acceptance
- Check:    Code-read confirms the `_coverHideTimer` backstop, `window._cancelCoverHideTimer`, and `window._fredCoverAnim` reference (used by `showAppCover()` to call `.play()`) are all unchanged; the diff touches ONLY the fallback-hide timing. `ng build --configuration=ci` (or `dev`) succeeds; `npx tsc --noEmit` exit 0.
- Evidence:  `git diff --stat` shows only `frontend/src/index.html` changed (10 insertions, 1 deletion). `git diff frontend/src/index.html` confirms the 45s `_coverHideTimer` block (lines 46-52), `window._cancelCoverHideTimer`, and the `window._fredCoverAnim = window.lottie.loadAnimation({...})` assignment are byte-for-byte unchanged; the only edit is replacing the synchronous `if (fallback) fallback.style.display='none';` with the `DOMLoaded` listener. `showAppCover()`/`hideAllCovers()` live in Angular (`app.component.ts`) and were not touched (no changes outside index.html).
- Verifier (2026-07-02, independent run): node_modules already present in sandbox (no npm ci needed). `npx tsc --noEmit` → exit 0 (clean). `npx ng build --configuration=ci` → exit 0, `Output location: /home/user/FRED/frontend/www` (same pre-existing IonToolbar unused-import + html2canvas-CJS warnings, none tied to index.html or the cover script). `git status --porcelain` restricted to source dirs: only ` M frontend/src/index.html` (findings.md / manifest / implementation-notes are agent-memory, not source; no backend touched). Built `www/index.html` carries the change (`grep -c DOMLoaded www/index.html`=3, `grep -c fallback.style.display www/index.html`=1) — change is in the shipped bundle. CONFIRMED pass.
- Status:   pass

## AC-6: Verified on a cold start (app fully terminated) with reauth required, on a local Capacitor iOS build (or 430×932 webview): no white flash during the static→Lottie transition.
- Type:     ui-acceptance
- Check:    Deferred to Andrew's "Looks Good" — a full cold terminate + reauth at 430×932 cannot be reproduced in the sandbox. Verifier confirms everything provable statically (AC-1..AC-5) and that the build is clean; this final on-device confirmation is Andrew's.
- Evidence:  Verifier: cold-terminate + reauth on a physical/emulated 430×932 iOS webview is not reproducible in this sandbox (no Capacitor build, no cold-app-launch harness). All statically-provable criteria (AC-1..AC-5) pass and the production build is clean; this final on-device "no white flash" confirmation is Andrew's per the story mandate. Not a verifier failure — awaiting Andrew's "Looks Good".
- Status:   pending (deferred to Andrew's on-device "Looks Good")
