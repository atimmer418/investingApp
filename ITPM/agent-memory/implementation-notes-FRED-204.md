# Implementation Notes — FRED-204

- Implemented Option A verbatim as specified: removed the synchronous
  `if (fallback) fallback.style.display='none'` right after `loadAnimation()`
  returns, replaced with `window._fredCoverAnim.addEventListener('DOMLoaded', ...)`
  that hides the fallback only once lottie-web has built the first frame's SVG.
  No deviation from the approved approach.
- Confirmed the bundled `frontend/src/assets/lottie/lottie-web.min.js` exposes
  a `DOMLoaded` event before making the change (grep match).
- Guard preserved: hide is still gated on `if (fallback)` before attaching the
  listener, matching the spec's instruction to keep that null-check intent.
- `frontend/node_modules` was absent in this sandbox; ran `npm ci` to install
  before running `tsc --noEmit` / `ng build`, otherwise both fail immediately
  on missing `ng`/deep type resolution. This is a sandbox environment fact,
  not a code change — no package.json/package-lock.json changes.
- `npx tsc --noEmit` without node_modules installed reports TS5101/TS5107
  tsconfig deprecation errors (pre-existing, unrelated to this change — verified
  identical on `git stash`). After `npm ci`, `tsc --noEmit` exits 0 cleanly.
- `ng build --configuration=ci` succeeds (exit 0); only pre-existing warnings
  unrelated to this change (unused IonToolbar imports on unrelated pages,
  html2canvas CJS warning, stencil empty-glob warning).
- Diff is exactly `frontend/src/index.html`, 10 insertions / 1 deletion,
  scoped entirely to the fallback-hide timing inside the existing
  `s.onload` handler. No other file touched. No auth/JWT, no schema, no
  Angular-side (.ts) changes.
- Left uncommitted per instructions — execute routine handles commit/push.

## REWORK (2026-07-03) — Option B: enterFrame

- Andrew reported a faint flash still visible on-device with Option A
  (`DOMLoaded`). Reworked per his explicit instruction to use Option B:
  hide the fallback on the Lottie's first `enterFrame` event (a genuine
  paint tick) instead of `DOMLoaded` (SVG-in-DOM but not necessarily
  painted yet). This is a stronger signal than `DOMLoaded` — `enterFrame`
  fires once lottie-web has actually advanced/rendered a frame via
  `requestAnimationFrame`, closing the sub-frame gap Andrew saw.
- Implementation: replaced the `DOMLoaded` listener with a named
  `onFirstEnterFrame` function passed to
  `window._fredCoverAnim.addEventListener('enterFrame', onFirstEnterFrame)`.
  Inside the handler, `removeEventListener('enterFrame', onFirstEnterFrame)`
  runs FIRST (before the hide), guaranteeing the listener only ever fires
  once even though `enterFrame` fires every frame — a true self-detaching
  one-shot, not just a guard-flag no-op (per Andrew's explicit requirement:
  "a one-shot guard flag alone is not enough — actually remove the
  listener").
- Verified the bundled `lottie-web.min.js` actually emits `enterFrame`
  before relying on it (`grep -o "enterFrame" ... | sort | uniq -c` → `3`,
  confirming it's a real lottie-web event name, not assumed/invented).
- No synchronous hide added; the ONLY `fallback.style.display='none'`
  in the file is inside `onFirstEnterFrame` — preserves fallback-safety
  (AC-4): a 404/parse-error/never-render Lottie means `enterFrame` never
  fires, so the static `fred-logo.svg` stays visible indefinitely (bounded
  only by the untouched 45s whole-cover backstop, which hides the whole
  overlay, not just the fallback image).
- Updated the inline code comment above the `if (fallback) {...}` block to
  explain the enterFrame-vs-DOMLoaded rationale (why DOMLoaded was
  insufficient) instead of the old DOMLoaded-only comment.
- Diff is scoped to `frontend/src/index.html` only — same block as before,
  no `app.component.ts` change, no cover show/hide lifecycle change,
  `_coverHideTimer` / `_cancelCoverHideTimer` / `window._fredCoverAnim =
  window.lottie.loadAnimation({...})` assignment all byte-for-byte
  unchanged (confirmed via `git diff`).
- `frontend/node_modules` was again absent in this sandbox; ran `npm ci`
  (not `npm install`, to respect the committed lockfile) before running
  `tsc --noEmit` / `ng build`, per the 2026-07-02 finding — otherwise
  `npx tsc` silently resolves to a global TypeScript and `npx ng` fails
  outright with "could not determine executable to run".
- `npx tsc --noEmit` → exit 0 (after `npm ci`).
- `npx ng build --configuration=ci` → exit 0; built `frontend/www/index.html`
  confirmed to carry the `enterFrame`/`onFirstEnterFrame` change verbatim.
  Only pre-existing/known warnings present (8x IonToolbar unused-import,
  html2canvas CJS) — no new warnings introduced by this change.
- Manifest (`ITPM/agent-memory/manifest-FRED-204.md`) filled in for
  AC-1..AC-5 (all `pass` at the code-read/build level); AC-6 left
  `pending`, deferred to Andrew's on-device "Looks Good" per the story.
- Left uncommitted per instructions — execute routine handles commit/push.
