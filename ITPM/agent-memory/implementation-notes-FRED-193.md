# Implementation Notes — FRED-193 (Remove dark mode, force light-only)

## Design decisions

- The `toggleTheme` private method in `tab3.page.ts` (~L714) is dead code — no item in `settingSections` has `action: 'theme'`, so it is never called. No template changes needed for AC-5. Reported in final output as "no active theme toggle surfaced."
- `$background-dark: #101822` SCSS variable in `monthly-freedom-update.component.scss` is ONLY referenced inside the dark-mode `@media` block. Removing the dark block orphans it. Removing the variable too per AC-4 (no orphaned vars). Verified by searching for its usage before deleting.
- `global.scss` ~L181 dark block overrides `--app-background`, `--app-card-background`, `--app-card-border`. Those vars are defined in the light `:root` block above; removing the override leaves the light values intact. [NOTE: these were already cleaned in a prior working-tree change before this story ran]
- `variables.scss` dark block overrides Ionic-level `--ion-background-color` and `--ion-text-color`. [NOTE: already cleaned in prior working-tree change]
- Dark scrollbar blocks in `global.scss` L676 and L702 were standalone `@media` wrappers; already cleaned in prior working-tree change.
- No new light-mode values added — purely removing dark overrides per approved approach (Option A).

## Files changed by this story (FRED-193 run)

- `src/app/pages/ai-chat/ai-chat.page.scss` — removed `// Dark mode adjustments` comment + `@media (prefers-color-scheme: dark)` block (lines 379-405)
- `src/app/components/monthly-freedom-update/monthly-freedom-update.component.scss` — removed `// Dark Mode` comment section + `@media (prefers-color-scheme: dark)` block (lines 680-847); removed orphaned `$background-dark` variable (line 11)

## Pre-existing tsc errors

- `npx tsc --noEmit` exits code 2 due to two pre-existing deprecation warnings in `tsconfig.json` (`baseUrl` and `moduleResolution=node10`). Confirmed identical before/after by running tsc on stashed baseline. Zero new errors from this story.

## Deviations

- `global.scss`, `variables.scss`, `tabs.page.scss`, `portfolio-dashboard.component.scss`, `retirement-planning.component.scss` already had no dark blocks — they appear modified in git history from a prior story's cleanup, not this one.

## Tradeoffs

- Chose to remove the `$background-dark` SCSS variable from `monthly-freedom-update.component.scss` since it was only consumed inside the deleted dark block. Leaving it would violate AC-4 (no orphaned vars).

## Open questions

None.
