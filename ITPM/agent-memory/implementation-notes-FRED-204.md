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
