# FRED-214 — Settings-shell: family gradient header + pinned sheet on all tab3-linked pages

## Before (backlog entry, verbatim)

> ## FRED-214 — Settings-shell: family gradient header + pinned sheet on all tab3-linked pages
> Apply the tab3 layout language to every settings page (pages navigated to from tab3, incl. my-profile via the avatar): vivid-royal family gradient on the header, the shared tab1/tab2 title treatment (Manrope 800 18px centered) in WHITE, and the white content sheet with its fixed rounded top acting as the divider that scrolling content flows beneath (pinned-header pattern from FRED-211). One shared style source, not per-page copies. Keyboard avoidance must keep genuinely working on form pages (KeyboardAvoidDirective requires IonContent — no silent no-ops).

## After (structured ticket)

**One-line summary:** Build one shared settings-shell (gradient header + white Manrope title + white back affordance + pinned white sheet scroller) and apply it to every tab3-linked page, preserving each page's content, logic, back behavior, and working keyboard avoidance — skipping and documenting any structurally incompatible surface.

**Label:** `[code]` · **Time estimate:** `3hr+`

### Files / systems involved

- **Inventory (builder confirms each route by chasing tab3.page.ts handlers):** /recurring-investments, one-time transactions (handleLumpSumInvestment target), /portfolio-customize, /sell-withdraw, /security-settings, /tax-documents, beneficiaries (handleBeneficiaries target), change-bank-account (handleChangeBankAccount target), /faq, /my-profile. 'Legal Information' + 'Help Center' are coming-soon toasts — no pages, skip.
- **New shared style source:** one place (e.g. `src/theme/_settings-shell.scss` imported per page, or documented global classes) defining the shell; per-page SCSS keeps only page-specific styles.
- Per-page `.page.html/.scss` header + content-wrapper restructure; `.ts` untouched except template-driven bindings if needed.
- **Reference implementation:** tab3.page.{html,scss} (FRED-211 pinned pattern + the tuned family gradient `linear-gradient(160deg, #1e60e3 0%, #1a58d0 60%, #0e3a96 100%)`).

### Acceptance Criteria

1. **Shared shell, single source.** The gradient header, white title, back affordance, and pinned-sheet styles live in ONE shared source consumed by every converted page — grep shows no duplicated gradient/sheet style blocks per page.
2. **Header.** Family gradient (exact tuned line — short headers naturally sit in its vivid-royal zone); title in Manrope 800 / 18px / centered / WHITE with correct optical centering against the back button; back affordance white on the gradient with each page's existing back behavior preserved exactly; safe-area top handled; any page-specific right-side header actions preserved and restyled white.
3. **Pinned sheet.** Content lives in a white sheet with a 26px rounded top + lift shadow overlapping the gradient; the sheet's top edge stays FIXED while only its content scrolls beneath it (the divider effect); `overscroll-behavior: contain`; content bottom clears safe areas/footers as before.
4. **Keyboard avoidance genuinely works.** Pages with text inputs (change-bank-account, beneficiaries, security-settings, contact forms…) retain WORKING keyboard avoidance: KeyboardAvoidDirective requires an IonContent host — the shell keeps a compatible scroller on those pages (ion-content-as-sheet or equivalent) and the builder proves the mechanics engage (no FRED-211-style silent no-op; static trace of the directive's requirements against the chosen structure).
5. **Behavior preservation.** Every page's content, forms, submit flows, guards, and navigation are untouched; only header/wrapper presentation changes. No tab1/tab2/tab3 file changes; no service changes.
6. **Inventory honesty.** implementation-notes-FRED-214.md lists every tab3-linked destination with its disposition: converted / skipped-with-reason (modal, coming-soon, structurally incompatible). Skips are legitimate; silent omissions are not.
7. **Visual consistency proof.** Headless screenshots of each converted page's top state + one scrolled state (sheet divider visible) saved as fred214-<page>.png; title/gradient/sheet visually consistent across all of them and with tab3.
8. **Quality gates.** `ng build --configuration dev` AOT-clean (zero new warnings on touched files); lint clean; `npm run subset-icons` re-run if any new Material Symbols ligature is introduced (back chevron likely already present); prefers-reduced-motion unaffected; no TODOs or dead style blocks left in converted pages.

### Edge cases

- Pages with segments/toolbars beneath the title (e.g. sell-withdraw steps) — the extra chrome joins the gradient header region or sits atop the sheet, per what reads cleanest; document per page.
- Long titles ellipsize without breaking centering.
- Pages presented modally vs pushed — back affordance (chevron vs close) follows the page's existing dismissal semantics.
- FAQ accordion / tax-documents PDF areas scroll inside the sheet without double-scrollbar behavior.
- iOS rubber-banding stays inside the sheet on every converted page.

### Open questions (non-blocking)

- my-profile has its own richer header (profile identity) — builder may adapt the shell (gradient + white type + sheet) while keeping its identity content, documenting the interpretation.
