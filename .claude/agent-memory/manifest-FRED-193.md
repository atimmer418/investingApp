# Acceptance Check Manifest — FRED-193 (Remove dark mode, force light-only)

Story: FRED-193 — Remove dark mode from tab-switcher, tab1, tab2, ai-chat (force app light-only for now).
Approach: Option A — Spec-exact surgical removal. Theme infra in `settings.service.ts` preserved for FRED-146. No light/dark toggle surfaces anywhere.

All paths relative to `frontend/`.

## AC-1: With OS set to Dark Mode, the whole app renders in light styling — verified on tab-switcher, tab1, tab2, ai-chat (each identical to Light Mode). No surface shows a dark/near-black background, dark border, or inverted text.
- Type:     ui-acceptance
- Check:    Load tabs / portfolio-dashboard (tab1) / retirement-planning (tab2) / ai-chat with the browser emulating `prefers-color-scheme: dark`. Each surface's background, cards, text, borders, bubbles, and tab bar render in the light palette (no `#1xxxxx`/near-black backgrounds, no inverted text). Compare against the same pages under light emulation — visually identical.
- Evidence: COULD-NOT-EXECUTE in sandbox — VERIFIER independently re-probed: tunnel https://local.fredvested.com → HTTP 403 (host not in egress allowlist); dev server :4200 → 000 (down); backend :8080/hello → 000 (down). No running frontend, no browser reachable. Static proof re-confirmed by verifier in lieu of render: (1) AC-2/AC-3 grep — ZERO `@media (prefers-color-scheme: dark)` blocks remain in all 7 SCSS files (re-ran, exit 1); (2) verifier grep for `body.dark`/`.dark` selectors across `src/**/*.scss` returns ZERO matches (exit 1) and no Ionic dark palette `@import` is active (all commented out in global.scss) — so the `body.dark` class that `applyTheme('auto')` can still toggle (settings.service.ts:110) is fully INERT with no CSS keyed to it; therefore no code path can apply dark styling under OS dark mode. Visual confirmation screenshots deferred to CI/device.
- Status:   could-not-execute (sandbox cannot serve/reach app) — static evidence supports light-only; visual confirmation deferred to CI/device

## AC-2: All `@media (prefers-color-scheme: dark)` blocks removed from the four named surfaces' SCSS (tabs.page.scss, portfolio-dashboard.component.scss, retirement-planning.component.scss, ai-chat.page.scss).
- Type:     frontend-unit
- Check:    `cd frontend && grep -rn "prefers-color-scheme: dark" src/app/tabs/tabs.page.scss src/app/components/portfolio-dashboard/portfolio-dashboard.component.scss src/app/components/retirement-planning/retirement-planning.component.scss src/app/pages/ai-chat/ai-chat.page.scss` returns ZERO matches (exit 1).
- Evidence: VERIFIER RE-RAN INDEPENDENTLY — grep returned no output, exit=1 (ZERO matches across all four named files). Confirmed. PASS.
- Status:   PASS

## AC-3: Global dark flips in theme/variables.scss (~L11) and global.scss (~L181) removed/inert; dark scrollbar blocks (global.scss ~L676, L702) and stray monthly-freedom-update.component.scss (~L683) dark block removed.
- Type:     frontend-unit
- Check:    `cd frontend && grep -rn "prefers-color-scheme: dark" src/global.scss src/theme/variables.scss src/app/components/monthly-freedom-update/monthly-freedom-update.component.scss` returns ZERO matches (exit 1). No page background is darkened by a global flip.
- Evidence: VERIFIER RE-RAN INDEPENDENTLY — grep returned no output, exit=1 (ZERO matches across global.scss, variables.scss, monthly-freedom-update.component.scss). Diff confirms the global `:root` flip, both scrollbar dark blocks, and the mfu dark block are all deleted. PASS.
- Status:   PASS

## AC-4: No dead code — no empty `@media` wrappers, no orphaned SCSS variables, no commented-out dark blocks left behind (clean removal).
- Type:     frontend-unit
- Check:    `cd frontend && grep -rn "prefers-color-scheme" src/` returns matches ONLY in `settings.service.ts` (theme infra). No empty `@media {}` wrappers and no commented `// dark` blocks remain in the touched SCSS (manual diff review confirms clean deletions).
- Evidence: VERIFIER RE-RAN INDEPENDENTLY — `grep -rn "prefers-color-scheme" src/` returns EXACTLY ONE match: `src/app/services/settings.service.ts:109` (the allowed `auto`-mode JS listener). Empty-wrapper scan `grep -rnE "@media[^{]*\{\s*\}" src/` → none found. Orphaned `$background-dark` var confirmed removed (grep `background-dark` across src/ → zero; diff line `-$background-dark: #101822;`). No commented-out dark blocks introduced by the diff. (Note: the pre-existing `/* Dark mode disabled — FRED forces light mode globally */` comment at global.scss:37 sits among the default Ionic commented-out dark-palette `@import` scaffold — it is NOT in this diff and is not a leftover dark CSS block.) PASS.
- Status:   PASS

## AC-5: Theme infrastructure in settings.service.ts preserved (`'light' | 'dark' | 'auto'` type, applyTheme(), body.dark toggle remain); effective default is light. Any dark/theme toggle surfaced in settings UI is hidden/disabled. No light/dark toggle surfaces anywhere.
- Type:     frontend-unit
- Check:    `cd frontend && grep -n "applyTheme\|body.dark\|'light' | 'dark' | 'auto'\|light' | 'dark" src/app/services/settings.service.ts` confirms type/applyTheme/body.dark intact. Search settings UI templates for a theme/dark toggle control — if present it is hidden or disabled; confirm none is visible/active anywhere.
- Evidence: VERIFIER RE-RAN INDEPENDENTLY (and read the file) — confirmed `theme: 'light' | 'dark' | 'auto'` (L5), default `theme: 'auto'` (L41), `applyTheme(theme: 'light' | 'dark' | 'auto')` (L107), `document.body.classList.toggle('dark', ...)` (L110, L112) all intact. No theme/dark toggle in any HTML template (`grep -rniE "toggleTheme|dark.?mode|theme.?toggle" src/ --include=*.html` → none). Tab3 `toggleTheme()`/`case 'theme':` is unreachable: `grep -rniE "action:\s*'theme'" src/app/tab3/tab3.page.ts` → no match (no `action:'theme'` item in `settingSections`). No theme toggle rendered/active anywhere; effective default is light. PASS.
- Status:   PASS

## AC-6: Frontend compiles cleanly — `cd frontend && npx tsc --noEmit` passes with no new SCSS/TS warnings from this change.
- Type:     frontend-unit
- Check:    `cd frontend && npx tsc --noEmit` exits 0.
- Evidence: VERIFIER RE-RAN INDEPENDENTLY — `npx tsc --noEmit` on the current tree emits ONLY the two known baseline tsconfig deprecations (TS5101 baseUrl, TS5107 moduleResolution=node10), exit 2. Verified these are baseline by `git stash push -- 'src/*'` and re-running: identical two-line TS5101/TS5107 output with changes stashed (then `git stash pop`). Zero NEW errors introduced by this story (diff is SCSS-only; no .ts touched). PASS (pre-existing tsconfig deprecations are out of scope per manifest).
- Status:   PASS
