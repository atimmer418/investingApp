# FRED-146 — Dark mode with phone-inherited color scheme (💤 snoozed — enriched, not scheduled)

## Before (from backlog.md)
> we want to make a dark mode, give me all the colors that fred currently uses and we want to find negatives of them that are UI/UX compliant. the light or dark mode should be inherited from whatever the phone is currently in at the moment

## After

**Summary:** Build a full, properly-supported dark mode for the app, driven by the theme infrastructure already in `settings.service.ts` (`'light' | 'dark' | 'auto'` + `body.dark` toggle; `auto` inherits the phone's current scheme). This means cataloging every color FRED uses, defining a UI/UX-compliant (WCAG-contrast) dark palette — proper dark equivalents, not naive inversions — and theming the app through a single CSS-variable layer under `body.dark`. Done when toggling the device (or the in-app setting) into dark renders every surface in an accessible dark theme with no light-mode bleed, and `auto` follows the phone.

> ⚠️ This is realistically a multi-day **epic**, not a single sitting — see "Recommended phasing." It is intentionally left **💤 snoozed**; this enrichment just shapes it for when it's picked up. It depends on **FRED-193** landing first (which removes the old scattered `@media (prefers-color-scheme: dark)` blocks and makes the app cleanly light-only, so dark can be rebuilt the right way).

### The real challenge (why this is bigger than "find negative colors")
- A token layer exists (`frontend/src/app/theme/variables.scss`, `frontend/src/app/global.scss`): `--app-background`, `--app-card-background`, `--app-card-border`, `--app-gray-50…900`, `--app-primary`, `--app-danger/success/warning`, `--ion-background-color`, `--ion-text-color`, `--ion-color-primary`. Dark values for **these** are easy to define under `body.dark`.
- **But** components are saturated with **hardcoded hex** that bypass the tokens and won't respond to any toggle — top offenders: `#2563EB` (~152×, CTA blue), `#0f172a` (~140×, near-black text), `#f8fafc` (~118×, light bg), `#6b7280` (~105×, secondary text), `#e5e7eb` (~66×, borders), `#f1f5f9`, `#9ca3af`, `#eff6ff`, `#dc2626`, `#16a34a`, … So real dark support requires **migrating hardcoded colors to semantic tokens first**, then theming the tokens.
- Two overlapping palettes coexist — the older iOS set (`--app-primary #007aff`, `--app-background #f2f2f7`) and the newer Manrope/blue-hero set (`#2563EB`, `#0f172a`, `#f8fafc`). Consolidating to **one semantic token set** is a prerequisite for clean theming. (See [[feedback_fred_design_system]].)
- Nothing currently keys off `body.dark` in component SCSS (old dark styling was all `prefers-color-scheme`, removed by FRED-193). The `body.dark` class toggled by `settings.service.applyTheme()` is the intended driver going forward.

### Files / systems involved
- **Theme/token layer:** `frontend/src/app/theme/variables.scss`, `frontend/src/app/global.scss` (define semantic tokens + their `body.dark` values).
- **Theme controller (already built — reuse):** `frontend/src/app/services/settings.service.ts` (`applyTheme()`, `'light'|'dark'|'auto'`, `body.dark` toggle). `auto` already toggles `body.dark` off `window.matchMedia('(prefers-color-scheme: dark)')`.
- **Settings UI:** wherever the theme picker is/should be surfaced in tab3 settings (FRED-193 may hide/disable it; FRED-146 re-enables a working light/dark/auto control).
- **Every component SCSS with hardcoded colors** (app-wide migration to tokens) — large surface; tackle by area (tabs, tab1/2/3, ai-chat, onboarding, settings pages, charts).
- **Special-case visuals:** charts (portfolio-dashboard / retirement-planning canvases), Lottie animations (see [[reference_lottie_ios_rendering]]), images/logos, and `index.html` `<meta name="color-scheme">` (will need `light dark` once dark is real).

### Doc references
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — current palette + type system; the source for "all the colors FRED uses" and the basis for compliant dark equivalents.
- `.claude/CONTEXT.md` — frontend conventions; quality bar (test 1 looks/feels native; test 3 unhappy paths — verify contrast/legibility everywhere).

### Acceptance Criteria
1. A documented **dark palette** exists: every current FRED color mapped to a dark-mode equivalent that meets WCAG AA contrast for its use (text/background/interactive), with rationale — not auto-inverted.
2. Colors are driven through **semantic CSS variables** themed under `body.dark`; the worst hardcoded-hex offenders (`#2563EB`, `#0f172a`, `#f8fafc`, `#6b7280`, `#e5e7eb`, and the rest of the high-count list) are migrated to those tokens so they respond to the theme.
3. `auto` mode inherits the phone's scheme (light phone → light app, dark phone → dark app) via the existing `settings.service` `body.dark` toggle; switching the phone scheme updates the app.
4. A working in-app **light / dark / auto** control is available (the `settings.service` setting persists and applies on load) — i.e., full support, not phone-inherited only.
5. All key surfaces render correctly in dark with no light-mode bleed and no illegible/low-contrast text: tab-switcher, tab1, tab2, tab3 + all settings pages, ai-chat, onboarding, modals, toasts, charts, and Lottie animations.
6. No regressions to light mode; light remains the default until dark is fully verified.
7. `index.html` `color-scheme` updated to support dark once shipped.

### Edge cases / Open Questions
- **Recommended phasing (likely split into sub-stories):** (1) consolidate to one semantic token set + migrate hardcoded hex → tokens; (2) define + document the compliant dark palette; (3) apply dark values under `body.dark` + wire the settings toggle; (4) QA contrast across every surface incl. charts/Lottie/images. Consider filing (1)–(4) as separate stories when this is unsnoozed.
- **Depends on FRED-193** (light-only cleanup) landing first.
- **Palette derivation is design/research-heavy** — Andy likely wants eyes on the proposed dark palette before it's applied (a design pass / approval step), even though the rest is `[code]`.
- Charts and Lottie need explicit dark treatment (canvas colors, animation fills) — they won't theme via CSS variables automatically.
- Brand assets (FRED logo/art) may need dark variants.

### Estimate & label
- **Estimate:** `3hr+` (in practice a multi-day epic spanning token migration, palette design, theming, and app-wide QA).
- **Label:** `[code]` (with a design/research sub-step for the palette).
