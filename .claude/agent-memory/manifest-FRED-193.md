# Acceptance Check Manifest — FRED-193 (Remove dark mode, force light-only)

Story: FRED-193 — Remove dark mode from tab-switcher, tab1, tab2, ai-chat (force app light-only for now).
Approach: Option A — Spec-exact surgical removal. Theme infra in `settings.service.ts` preserved for FRED-146. No light/dark toggle surfaces anywhere.

All paths relative to `frontend/`.

## AC-1: With OS set to Dark Mode, the whole app renders in light styling — verified on tab-switcher, tab1, tab2, ai-chat (each identical to Light Mode). No surface shows a dark/near-black background, dark border, or inverted text.
- Type:     ui-acceptance
- Check:    Load tabs / portfolio-dashboard (tab1) / retirement-planning (tab2) / ai-chat with the browser emulating `prefers-color-scheme: dark`. Each surface's background, cards, text, borders, bubbles, and tab bar render in the light palette (no `#1xxxxx`/near-black backgrounds, no inverted text). Compare against the same pages under light emulation — visually identical.
- Evidence: screenshots of each of the four surfaces under dark-scheme emulation + assertion that computed background-color matches the light value.
- Status:   pending

## AC-2: All `@media (prefers-color-scheme: dark)` blocks removed from the four named surfaces' SCSS (tabs.page.scss, portfolio-dashboard.component.scss, retirement-planning.component.scss, ai-chat.page.scss).
- Type:     frontend-unit
- Check:    `cd frontend && grep -rn "prefers-color-scheme: dark" src/app/tabs/tabs.page.scss src/app/components/portfolio-dashboard/portfolio-dashboard.component.scss src/app/components/retirement-planning/retirement-planning.component.scss src/app/pages/ai-chat/ai-chat.page.scss` returns ZERO matches (exit 1).
- Evidence: grep output showing no matches across the four files.
- Status:   pending

## AC-3: Global dark flips in theme/variables.scss (~L11) and global.scss (~L181) removed/inert; dark scrollbar blocks (global.scss ~L676, L702) and stray monthly-freedom-update.component.scss (~L683) dark block removed.
- Type:     frontend-unit
- Check:    `cd frontend && grep -rn "prefers-color-scheme: dark" src/global.scss src/theme/variables.scss src/app/components/monthly-freedom-update/monthly-freedom-update.component.scss` returns ZERO matches (exit 1). No page background is darkened by a global flip.
- Evidence: grep output showing no matches in these files.
- Status:   pending

## AC-4: No dead code — no empty `@media` wrappers, no orphaned SCSS variables, no commented-out dark blocks left behind (clean removal).
- Type:     frontend-unit
- Check:    `cd frontend && grep -rn "prefers-color-scheme" src/` returns matches ONLY in `settings.service.ts` (theme infra). No empty `@media {}` wrappers and no commented `// dark` blocks remain in the touched SCSS (manual diff review confirms clean deletions).
- Evidence: grep output (only settings.service.ts) + diff review note.
- Status:   pending

## AC-5: Theme infrastructure in settings.service.ts preserved (`'light' | 'dark' | 'auto'` type, applyTheme(), body.dark toggle remain); effective default is light. Any dark/theme toggle surfaced in settings UI is hidden/disabled. No light/dark toggle surfaces anywhere.
- Type:     frontend-unit
- Check:    `cd frontend && grep -n "applyTheme\|body.dark\|'light' | 'dark' | 'auto'\|light' | 'dark" src/app/services/settings.service.ts` confirms type/applyTheme/body.dark intact. Search settings UI templates for a theme/dark toggle control — if present it is hidden or disabled; confirm none is visible/active anywhere.
- Evidence: grep output proving infra intact + note confirming no active theme toggle is surfaced.
- Status:   pending

## AC-6: Frontend compiles cleanly — `cd frontend && npx tsc --noEmit` passes with no new SCSS/TS warnings from this change.
- Type:     frontend-unit
- Check:    `cd frontend && npx tsc --noEmit` exits 0.
- Evidence: command output / exit code 0.
- Status:   pending
