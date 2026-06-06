# FRED-191 — Measure and optimize app loading performance

## Before (from backlog.md)

> ## FRED-191 — Measure and optimize app loading performance
> use network waterfall and core web vitals to measure loading time for app and then optimize initial loading time and other timings that could be optimized

## After (ticket)

**Summary:** Establish a baseline of the app's load performance with the Chrome DevTools network waterfall + Core Web Vitals, rank the biggest contributors to slow initial load, then implement and re-measure targeted optimizations — using existing patterns, no new architecture.

**Files / systems involved**
- `frontend/angular.json` — production build config: `optimization`, `outputHashing`, `sourceMap`, and the `budgets` block (initial/anyComponentStyle); confirm minification + chunking are on for prod
- `frontend/src/main.ts` — bootstrap path (`bootstrapApplication` + eagerly-provided providers that run before first paint)
- `frontend/src/app/app.component.ts` — startup work that blocks first render (AppLock init, `navigateBasedOnProgress`, any synchronous calls); candidates for deferral
- `frontend/src/app/app.routes.ts` + `frontend/src/app/tabs/tabs.routes.ts` — route-level lazy loading already uses `loadComponent`/`loadChildren`; verify every heavy page is actually lazy and no large page is eagerly imported
- Measurement tooling: Chrome DevTools **Network** panel (waterfall) + **Lighthouse** + `web-vitals` / Performance panel
- Note: this is an Ionic + Angular **Capacitor iOS** app, so real "load" = webview cold start (`index.html` → polyfills → main chunk → first route)

**Doc references**
- `.claude/CONTEXT.md` — frontend conventions; run locally via `servlocal` (port 8100), backend `./gradlew bootRun` (8080)
- `FREDdocs/CLOUDFLARE_SETUP.md` — only if measuring over the tunnel rather than localhost

**Acceptance criteria**
1. **Baseline captured** — on a **local build**, measuring the **Capacitor iOS webview cold start** (desktop Chrome used for waterfall detail): network-waterfall + Core Web Vitals (LCP, FCP, TTI, TBT, CLS) for a cold load, with the largest contributors listed (bundle chunks, fonts, images, render-blocking/sequential requests).
2. **Bottlenecks ranked** — top contributors to initial load identified and ordered by impact.
3. **Top 2–3 optimized** — using existing-pattern techniques only (close any lazy-loading gaps, trim eager providers, preload critical fonts/images, defer non-critical startup work in `app.component.ts`, tighten build budgets). No new architecture or libraries.
4. **Improvement proven** — post-change measurement, captured the same way as the baseline, shows a measurable reduction (e.g., LCP/FCP down by X%). No specific time target required.
5. **No regressions** — `npx tsc --noEmit` exits 0 and `ng build` succeeds within configured budgets.
6. **Written up** — before/after numbers + what changed recorded (this `.stories` file or a short FREDdocs perf note).

**Resolved decisions** (from A/C gate)
- Measurement target: **local build** (not a prod build or over the tunnel).
- **Measure the Capacitor iOS webview cold start** — yes, it's the real load surface; desktop Chrome for the detailed waterfall.
- **No hard perf budget** — a measurable improvement is sufficient for this pass.

**Time estimate:** `3hr+`  ·  **Label:** `[code]`
