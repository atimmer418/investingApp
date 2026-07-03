# Acceptance Check Manifest — FRED-204

Fix white flash in static→Lottie reauth transition.

REWORK (2026-07-03): Option A (hide on `DOMLoaded`) shipped but Andrew still saw a faint
flash on his device. Reworked to **Option B** per his feedback: hide
`#app-resume-cover-fallback` on the Lottie's FIRST `enterFrame` event (a genuine paint
tick — an actual rendered frame, stronger than DOM-insertion), with a self-detaching
handler (`enterFrame` fires every frame, so the listener removes itself after the first
call). Single file: `frontend/src/index.html`.

## AC-1: No white flash between the static fallback and the coin-drop Lottie on cold start — the white `#app-resume-cover` background is never visible in the gap.
- Type:     ui-acceptance
- Check:    Code-read confirms the fallback is never hidden in the synchronous window between `loadAnimation()` returning and the first frame painting; the only path that sets `fallback.style.display='none'` is inside the first-`enterFrame` render handler. Live cold-start + reauth "flash is gone" confirmation at 430×932 is Andrew's "Looks Good" (device only; sandbox cannot reproduce a cold terminate + reauth).
- Evidence:  `grep -n "fallback.style.display" frontend/src/index.html` → exactly one match (line 85), inside `onFirstEnterFrame` (the handler registered via `window._fredCoverAnim.addEventListener('enterFrame', onFirstEnterFrame)`, line 87). No synchronous hide exists between `loadAnimation()` (line 65-72) and this handler. Code-read portion satisfied; live device confirmation deferred to Andrew (AC-6).
- Verifier:  CONFIRMED (2026-07-03, independent re-run) — `grep -n "fallback.style.display" frontend/src/index.html` → exactly 1 hit at line 85, inside `onFirstEnterFrame`. No synchronous hide between `loadAnimation()` (65-72) and the handler.
- Status:   pass (code-read portion; device-only live confirmation deferred to Andrew's AC-6 "Looks Good")

## AC-2: The static fallback is hidden only AFTER the Lottie renders its first frame (driven by a lottie-web render event, e.g. `DOMLoaded`), not synchronously right after `loadAnimation()` returns.
- Type:     ui-acceptance
- Check:    Code-read of `frontend/src/index.html`: no synchronous hide of the fallback after `loadAnimation()`, and the hide runs inside a first-`enterFrame` handler that self-detaches (`removeEventListener` / one-shot guard) after the first frame. No other synchronous hide of the fallback remains. Verify the bundled `assets/lottie/lottie-web.min.js` emits an `enterFrame` event (grep).
- Evidence:  `grep -o "enterFrame" frontend/src/assets/lottie/lottie-web.min.js | sort | uniq -c` → `3 enterFrame` (event name is real, emitted by the bundled lib, exit 0). Diff (`git diff frontend/src/index.html`): removed synchronous `window._fredCoverAnim.addEventListener('DOMLoaded', function() { fallback.style.display = 'none'; })`; added `var onFirstEnterFrame = function() { window._fredCoverAnim.removeEventListener('enterFrame', onFirstEnterFrame); fallback.style.display = 'none'; }; window._fredCoverAnim.addEventListener('enterFrame', onFirstEnterFrame);` (lines 83-87). `grep -n "fallback.style.display"` = exactly one match, inside the self-detaching handler. Handler removes itself via `removeEventListener('enterFrame', onFirstEnterFrame)` as its first statement, before the hide, guaranteeing one-shot behavior (real removal, not just a guard flag).
- Verifier:  CONFIRMED (2026-07-03, independent re-run) — named `onFirstEnterFrame` (line 83); `removeEventListener('enterFrame', onFirstEnterFrame)` (line 84) uses the SAME ref registered by `addEventListener('enterFrame', onFirstEnterFrame)` (line 87) → genuine self-detach, not anonymous, not guard-flag-only. lottie-web.min.js genuinely dispatches the event: `this.trigger("enterFrame")` (3 string hits). PASS.
- Status:   pass

## AC-3: Seamless transition — no white gap, no flicker, no double-image (a short cross-fade is acceptable but optional).
- Type:     ui-acceptance
- Check:    Code-read confirms the static image stays visible until the first `enterFrame` fires (no gap), the handler detaches after firing once (no repeated work), and there is no path that shows both layers permanently or re-shows the fallback. Live seamlessness is confirmed by Andrew's "Looks Good".
- Evidence:  The static `<img id="app-resume-cover-fallback">` (index.html line 36) is absolutely positioned over the Lottie container (line 35) and stays visible (default `display`) until the first `enterFrame` fires, at which point `onFirstEnterFrame` (1) removes itself as a listener, then (2) hides the fallback exactly once — only one `fallback.style.display` reference in the whole file, so nothing re-shows it. Hard swap on the event (cross-fade optional per AC-3, not required). Code-read portion satisfied; live seamlessness deferred to Andrew (AC-6).
- Verifier:  CONFIRMED (2026-07-03, independent re-run) — static img (line 36) over Lottie container (line 35) stays at default display; hard swap on first enterFrame; single `fallback.style.display` reference means nothing re-shows it and no path shows both layers permanently.
- Status:   pass (code-read portion; live seamlessness deferred to Andrew's AC-6 "Looks Good")

## AC-4: Fallback safety preserved — if the Lottie fails to load (404 / parse error / no render event), the static fallback stays visible; it is removed only on a confirmed first render.
- Type:     ui-acceptance
- Check:    Code-read confirms the fallback hide lives ONLY inside the first-`enterFrame` handler, so a Lottie 404/parse-error/never-render leaves the static image up. No timeout/catch path hides the fallback on failure.
- Evidence:  `grep -nE "catch|onerror|\.error|setTimeout" frontend/src/index.html` returns only the pre-existing 45s `_coverHideTimer` `setTimeout` (line 46). That timer hides the whole `#app-resume-cover` (`cover.style.display`, line 48), NOT the fallback — no fallback-hiding timeout/catch/error path exists. The only `fallback.style.display = 'none'` is inside `onFirstEnterFrame`. If `coin-drop.json` 404s or fails to parse, lottie-web never fires `enterFrame`, so the handler never runs and the static `fred-logo.svg` remains visible (bounded only by the untouched 45s backstop on the whole cover, unchanged from before).
- Verifier:  CONFIRMED (2026-07-03, independent re-run) — `grep -nE "catch|onerror|\.error|setTimeout" frontend/src/index.html` → only the pre-existing 45s `_coverHideTimer` `setTimeout` (line 46), which sets `cover.style.display` (line 48), NOT the fallback. No fallback-hide-on-failure path. PASS.
- Status:   pass

## AC-5: No change to the cover show/hide lifecycle (`showAppCover`/`hideAllCovers`, the 45s `index.html` backstop, `_fredCoverAnim.play()` on resume) beyond the fallback-hide timing.
- Type:     ui-acceptance
- Check:    Code-read confirms the `_coverHideTimer` backstop, `window._cancelCoverHideTimer`, and `window._fredCoverAnim` reference (used by `showAppCover()` to call `.play()`) are all unchanged; the diff touches ONLY the fallback-hide timing. `ng build --configuration=ci` (or `dev`) succeeds; `npx tsc --noEmit` exit 0.
- Evidence:  `git diff frontend/src/index.html` shows the ONLY change is the code comment above `if (fallback) {...}` and the body of that block (DOMLoaded listener → self-detaching enterFrame handler); `_coverHideTimer` (line 46), `window._cancelCoverHideTimer` (line 52), and `window._fredCoverAnim = window.lottie.loadAnimation({...})` (lines 65-72) are byte-for-byte unchanged. `app.component.ts` not touched (not in diff). `npx tsc --noEmit` → exit 0. `npx ng build --configuration=ci` → exit 0, `Output location: /home/user/FRED/frontend/www`; only pre-existing/known warnings present (IonToolbar unused-import, html2canvas non-ESM CJS) — no new warnings or errors. Confirmed built `frontend/www/index.html` carries the `enterFrame`/`onFirstEnterFrame` change verbatim, matching `src/index.html`.
- Verifier:  CONFIRMED (2026-07-03, independent re-run) — `_coverHideTimer` (46), `_cancelCoverHideTimer` (52), `_fredCoverAnim = window.lottie.loadAnimation` (65) byte-unchanged. `npx tsc --noEmit` → exit 0 (node_modules present locally; NO `npm ci` gymnastics needed — clean run). `npx ng build --configuration=ci` → exit 0, output `/home/user/FRED/frontend/www`, only known IonToolbar-unused + html2canvas-CJS warnings. Fresh `www/index.html` lines 83-87 carry `onFirstEnterFrame`+`removeEventListener('enterFrame',…)`; the only remaining `DOMLoaded` in www is inside the explanatory comment (not a listener). Only source/frontend file changed is `index.html` (other working-tree diff entries are agent-memory only). safe-area-lint.mjs on index.html → clean (exit 0). PASS.
- Status:   pass

## AC-6: Verified on a cold start (app fully terminated) with reauth required, on a local Capacitor iOS build (or 430×932 webview): no white flash during the static→Lottie transition.
- Type:     ui-acceptance
- Check:    Deferred to Andrew's "Looks Good" — a full cold terminate + reauth at 430×932 cannot be reproduced in the sandbox. Verifier confirms everything provable statically (AC-1..AC-5) and that the build is clean; this final on-device confirmation is Andrew's.
- Evidence:  Verifier: cold-terminate + reauth on a physical/emulated 430×932 iOS webview is not reproducible in this sandbox (no Capacitor build, no cold-app-launch harness). All statically-provable criteria (AC-1..AC-5) pass and the production build is clean; this final on-device "no white flash" confirmation is Andrew's per the story mandate. Not a verifier failure — awaiting Andrew's "Looks Good".
- Verifier:  CONFIRMED device-only (2026-07-03) — sandbox has no cold-terminate + reauth harness at 430×932; AC-1..AC-5 all independently pass at the static floor and the build is clean, so this is correctly deferred to Andrew's on-device "Looks Good". NOT a verifier failure and does NOT block APPROVED.
- Status:   pending (deferred to Andrew's on-device "Looks Good")
