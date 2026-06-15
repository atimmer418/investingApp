# FRED-193 — Remove dark mode from tab-switcher, tab1, tab2, ai-chat (light-only for now)

## Before (from backlog.md)
> remove dark mode from ion-tabs aka the tab-switcher; remove dark mode from tab1 and tab2 and ai-chat page

## After

**Summary:** Remove dark mode from the app for now so everything renders in light styling regardless of the device's OS Dark Mode setting. The originating surfaces are the tab-switcher (ion-tabs), tab1, tab2, and the AI chat page, but because global background flips drive dark styling app-wide, the clean fix is to strip dark mode across the app and make it light-only for now. The theme infrastructure (the settings-service `'light' | 'dark' | 'auto'` machinery) stays in place so a planned future story can implement a full, properly-supported dark mode across the app — this story just turns dark off for now without burning that bridge.

### Files / systems involved
- **Per-surface dark blocks (the named surfaces):**
  - Tab-switcher: `frontend/src/app/tabs/tabs.page.scss` (~L23, L89)
  - tab1 content: `frontend/src/app/components/portfolio-dashboard/portfolio-dashboard.component.scss` (~L305, L349, L730, L789) — rendered only in tab1
  - tab2 content: `frontend/src/app/components/retirement-planning/retirement-planning.component.scss` (~L67, L111) — rendered only in tab2
  - ai-chat: `frontend/src/app/pages/ai-chat/ai-chat.page.scss` (~L380)
- **Global dark blocks (drive dark app-wide — remove for light-only):**
  - `frontend/src/app/theme/variables.scss` (~L11 — flips `--ion-background-color`, `--ion-text-color`, `--ion-color-primary`)
  - `frontend/src/app/global.scss` (~L181 — flips `--app-background`, `--app-card-background`, `--app-card-border`; ~L676 & L702 — dark scrollbar)
- **Other stray per-component dark blocks (sweep so nothing is left half-dark):**
  - `frontend/src/app/components/monthly-freedom-update/monthly-freedom-update.component.scss` (~L683)
- **Theme infrastructure — KEEP (do not rip out):** `frontend/src/app/services/settings.service.ts` — the `'light' | 'dark' | 'auto'` setting, `applyTheme()`, and `body.dark` toggle stay so the future full dark-mode story has a foundation. The effective default resolves to light for now so nothing renders dark.

### Doc references
- `.claude/CONTEXT.md` — Frontend conventions; "no dead code" rule (prefer clean removal over leaving commented-out dark SCSS); test 1 (light, calm, premium).
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — light-mode design intent; `index.html` already sets `<meta name="color-scheme" content="light">`.

### Acceptance Criteria
1. With the device/OS set to **Dark Mode**, the **whole app renders in light styling** — verified specifically on the tab-switcher, tab1, tab2, and the ai-chat page (each identical to Light Mode: backgrounds, cards, text, borders, bubbles, tab bar). No surface shows a dark/near-black background, dark border, or inverted text.
2. All `@media (prefers-color-scheme: dark)` blocks are removed from the four named surfaces' SCSS (`tabs.page.scss`, `portfolio-dashboard.component.scss`, `retirement-planning.component.scss`, `ai-chat.page.scss`).
3. The global dark flips in `theme/variables.scss` (~L11) and `global.scss` (~L181) are removed (or made inert) so they no longer darken any page background; the dark scrollbar blocks (`global.scss` ~L676, L702) and the stray `monthly-freedom-update.component.scss` (~L683) dark block are removed too, so no part of the app is left half-dark.
4. **No dead code:** no empty `@media` wrappers, no orphaned SCSS variables, no commented-out dark blocks left behind — clean removal per CONTEXT.md.
5. The theme infrastructure in `settings.service.ts` is preserved (the `'light' | 'dark' | 'auto'` type, `applyTheme()`, and `body.dark` toggle remain) and the effective default is light, so nothing renders dark now. If a dark/theme toggle is surfaced in any settings UI, it is hidden or disabled for now (confirm whether one exists).
6. Frontend compiles cleanly — `cd frontend && npx tsc --noEmit` / the project's scoped build passes with no new SCSS or TS warnings from this change.

### Edge cases / Open Questions / Follow-ups
- **Scope decision (resolved by Andy):** light-only **app-wide** for now — remove dark mode from the app entirely, not just the four named surfaces.
- **Future full dark mode:** Andy plans a full, properly-supported dark mode across the app later. This story deliberately keeps the theme infrastructure so that future work isn't blocked. → recommend a follow-up backlog story: **"Implement full supported dark mode across the app."** (Offer to add it.)
- `<meta name="color-scheme" content="light">` does **not** suppress `@media (prefers-color-scheme: dark)` — that query reflects the OS preference — so these blocks are live code; verification must be done with the OS actually in Dark Mode.
- Before declaring done, re-grep `prefers-color-scheme` across `frontend/src` to confirm no dark block remains (known set: tabs, portfolio-dashboard, retirement-planning, ai-chat, monthly-freedom-update, theme/variables.scss, global.scss ×3).

### Estimate & label
- **Estimate:** `1-3hr` (removal is mechanical; the time is in sweeping every dark block app-wide, keeping the theme infra coherent, and verifying the key surfaces in the simulator under OS Dark Mode).
- **Label:** `[code]`
