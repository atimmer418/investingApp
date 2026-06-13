# Implementation Notes — FRED-192 (Tab 3 Settings Redesign, Option B)

## Design decisions

- **Stat strip omitted intentionally**: The "Freedom date" and "Status" tiles from the Option B mockup are NOT built. tab3.page.ts has no such data; the spec explicitly says "OMIT IT". Flagged to Andrew for follow-up.

- **Header structure**: Replaced the `::after` concave-curve approach from the old header with an overlapping white card that pulls up over the blue via negative `margin-top` (–20px). This is the canonical Option B "lifted card" effect.

- **`safe-area-top` placement**: The `.safe-area-top` utility class (from global.scss) applies `padding-top: env(safe-area-inset-top)`. It is kept on the outer `.custom-profile-header` div, exactly as it was before. The header padding-top is additive on top of the safe-area padding — the header still has its own padding-top so the content sits below the notch.

- **`[scrollY]="false"` preserved**: The current HTML uses `[scrollY]="false"` on `ion-content`. The Option B layout introduces a scrollable `.content-scroll` inner div (overflow-y: auto) so the full list can scroll within the page without enabling ion-content scroll (which conflicts with tab gestures on iOS). This matches what `[scrollY]="false"` plus an inner-scrollable-div pattern is used for elsewhere.

- **No subtitle rendering**: Per spec, `item.subtitle` is still in the data but we drop the `<p *ngIf="item.subtitle">` from the HTML for the cleaner single-line Option B rows.

- **Font stack**: `setting-title` now uses `'Manrope', sans-serif` (was SF Pro). The spec explicitly requires Manrope only. All other text already uses Manrope.

- **Group labels**: Rendered as uppercase small gray text above each card, matching the spec "small uppercase gray" description. Using existing `.group-header` class, styled with Manrope.

- **Section spacer**: Between section groups the `.settings-group` gap provides natural visual separation; no additional spacer element needed — the vertical gap between cards is inherently the "thicker gray spacer".

- **Footer**: Changed from two `<p>` tags to one single centered line "© 2026 FREDvested · v1.0.0 (Beta)" as specified.

- **FRED wordmark SCSS**: Carried over verbatim from the old `.header-branding` block — both the default (opacity:0.25, pointer-events:none) and `.mfu-active` states (opacity:0.85, pointer-events:auto, text-shadow, -webkit-text-stroke, &:active scale). Only positional adjustments are made (right/top positioning adapted to the new header layout).

- **`[class.mfu-active]` and `(click)` bindings**: Preserved exactly as the old HTML on the `.header-branding` div.

- **`profileActionRequired$` badge**: Preserved on `.avatar-badge-wrap` exactly as before.

- **ion-icons**: Kept `<ion-icon [name]="item.icon">` for all rows. No Material Symbols swap.

## Tradeoffs

- Chose `overflow-y: auto` inner scroll div over re-enabling `[scrollY]` on ion-content because the existing code explicitly disabled it — changing that attribute could affect gesture handling on iOS.

- The overlapping white card uses a fixed border-radius (16px) and box-shadow matching the spec rather than global `--app-radius-md` to exactly match the approved Option B look.

## Open questions

- None — all decisions were resolved in the action brief.

## AC verification run (2026-06-13)

- AC-3: `git diff HEAD frontend/src/app/tab3/tab3.page.ts` produces 0 lines — TS file is untouched. PASS.
- AC-4: `npx tsc --noEmit` produces two TS5101/TS5107 deprecation errors in tsconfig.json. These are identical on HEAD before this story's changes — confirmed pre-existing. No new errors introduced by this change. PASS (pre-existing condition; same result as baseline).
- The HTML and SCSS working-tree changes match every Option B requirement: gradient hero header, `.safe-area-top` on header, overlapping white card (margin-top: -20px, border-radius: 16px, box-shadow), flat single-line rows with ion-icons in FRED blue, group headers in uppercase gray, `section-group-spacer` between groups, and the footer. Stat strip intentionally omitted per resolved decision.
- Both FRED wordmark states verified in SCSS: default opacity:0.25/pointer-events:none and `.mfu-active` with opacity:0.85/pointer-events:auto/text-shadow/‑webkit-text-stroke/&:active scale. Bindings `[class.mfu-active]="hasMfuPeriod"` and `(click)="onFredLogoClick()"` preserved in HTML.
