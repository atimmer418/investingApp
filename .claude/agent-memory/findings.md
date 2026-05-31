# FRED Builder Agent Findings

- 2026-05-30 — build/browserslist — `.browserslistrc` had `iOS >=14` / `Safari >=14` which causes esbuild destructuring errors with Angular 19.2; raising to `>=16` fixes it (FRED targets iOS 16+)
- 2026-05-30 — npm/esbuild — `npm audit fix` can downgrade esbuild (0.28→0.25) which breaks the build; pin esbuild at 0.28.x with explicit `npm install esbuild@0.28.0 --save-dev` after any audit fix run
- 2026-05-30 — mfu — `MonthlyFreedomUpdateData.equityLevel` (1-6) is already computed server-side and available via `checkShouldShow()` — use it for pig avatar level without an extra API call
- 2026-05-30 — angular — after B6 overhaul, ~50 standalone component imports across 20+ files were stale; angular-compiler TS-998113 warnings are the canonical signal to clean them
- 2026-05-30 — typescript — dynamic `import('module-name')` even cast `as any` still triggers TS 2307 if the module has no resolvable types; `// @ts-ignore` on the import line is the minimal fix
- 2026-05-30 — User.java — Lombok @Getter/@Setter on class auto-generates getters for all private fields; only manually-added inline getters (e.g., from Bucket C merge) duplicate what Lombok already provides — watch for duplicates
- 2026-05-30 — ITPM/today.html — dollar sign in date-derived password must use String.fromCharCode(36) not a template literal to avoid any shell/interpolation stripping when the ITPM skill writes the file via heredoc or script
- 2026-05-30 — sse-streaming — Spring SseEmitter emits `data:<json>\n\n` WITHOUT a space after the colon; frontend parsers that gate on `line.startsWith('data: ')` (with a space) will silently drop every event (chat.service.ts:83)
- 2026-05-30 — chat/stream — `GET /api/chat/stream` returns HTTP 500 when `userId` is null because `userRepository.findById(null)` throws; frontend must always supply userId (validated via fetch test against running backend)
- 2026-05-30 — ionic/nav — `NavController` is a service from `@ionic/angular` (not standalone), injected via constructor only — never add it to `imports: []` in a standalone component; use `navigateBack(route)` for back animations
- 2026-05-30 — ionic/nav — `.section-card { padding: 16px }` is a global rule; cards that need edge-bleeding content (e.g. absolutely-positioned images) must explicitly override `padding: 0` and give their inner content wrapper its own `padding: 16px`
- 2026-05-30 — sass/deprecation — `darken()`/`lighten()` in component SCSS must be replaced with `color.adjust($c, $lightness: ±N%)` after adding `@use 'sass:color'` as the first line (before any `@import url(...)`);
