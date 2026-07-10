# FRED-211 — Remodel tab3 into the family design language (Variant A)

## Before (backlog entry, verbatim)

> ## FRED-211 — Remodel tab3 into the family design language (Variant A)
> Tab3 keeps its identity (pig avatar, FRED wordmark, freedom strip, sheet-over-blue) but joins the tab1/tab2 design family: the header becomes the family gradient with the freedom strip as glass tiles, list rows get icon tiles + Manrope typography with zone-label section headers, and scrolling is confined to the white sheet — the header and strip stay pinned. KEEP VERBATIM: the current profile pic (pigAvatarSrc image + badge) and the FRED wordmark styling (Montserrat Black Italic treatment incl. mfu-active behavior).
> Approved interactive prototype (Variant A with pinned header): ITPM/agent-memory/FRED-211-prototype.html — the B variant in its toggle is reference-only, not in scope.

## After (structured ticket)

**One-line summary:** Restyle tab3's header to the family gradient with glass freedom tiles, its settings rows to icon-tile + Manrope + zone-label grammar, and confine scrolling to the white sheet (header/strip pinned) — preserving the pig avatar, FRED wordmark styling, badges, and every action/handler exactly.

**Label:** `[code]` · **Time estimate:** `1-3hr`

### Files / systems involved

- `frontend/src/app/tab3/tab3.page.{html,ts,scss}` — the whole story lives here. Current structure: `ion-header` holds the custom header (avatar row + `.stat-strip`), `ion-content [scrollY]=false` holds `.content-scroll[appTabBarScroll]` → `.header-overlap` (blue continuation strip) → `.sections-card` (white card with `settingSections` ngFor) → footer.
- `frontend/scripts/subset-icons.mjs` — DYNAMIC_ICONS additions for the new row icon names (they live in TS data — the scanner cannot see them; this exact miss caused the FRED-208 "security"-as-text bug).
- **Visual spec:** `ITPM/agent-memory/FRED-211-prototype.html` (Variant A, pinned).

### Acceptance Criteria

1. **Gradient header.** The `ion-header` block adopts the family gradient (deep `#081c4e` → `#16309b` → `#2563EB` with the radial light catches, per prototype) replacing the flat blue. PRESERVED VERBATIM: the pig avatar image (`pigAvatarSrc`) with its white ring and `profileActionRequired$` badge + `goToMyProfile()` tap; the FRED wordmark's existing `.header-branding` styling (Montserrat Black Italic, size, position, color) including its `mfu-active` state and `onFredLogoClick()` behavior; "My Account" / "Hi, Firstname" bindings (typography may tighten to Manrope weights per prototype).
2. **Glass freedom strip.** The three stat tiles restyle to the glass treatment (translucent white fill, hairline border, backdrop blur, white values) with unchanged `freedomStatsService` bindings and loading dashes.
3. **Pinned-header scroll.** The header and freedom strip never move; scrolling happens ONLY inside the white sheet: the sheet presents a 26px rounded top overlapping the gradient (lift shadow per prototype) that itself stays fixed while its CONTENT scrolls beneath it. The `appTabBarScroll` directive moves to (or continues to observe) the actual scrolling element so tab-bar hide-on-scroll keeps working.
4. **Row anatomy.** Each settings row gets the family icon tile (36px, radius 10, `#eef4ff` background, blue icon ~19px), Manrope 15px/700 label, light `#c3cbd9` chevron; row heights/dividers per prototype. Existing `settingSections` structure, item badges (`setting-badge` + colors), and every `onSettingClick(action)` handler preserved.
5. **Icons.** Row icons move to Material Symbols equivalents per the prototype (schedule, payments, pie_chart, credit_card, verified_user, account_balance, description, group, help, mail, menu_book — final mapping builder's choice where a closer glyph exists). Because the names live in TS data, they are ADDED TO `DYNAMIC_ICONS` in subset-icons.mjs and `npm run subset-icons` is run — the build must not ship ligature-text icons.
6. **Zone labels.** Section titles restyle to the family zone-label treatment (11px, 800, uppercase, 0.08em, gray) with the prototype's group spacing; footer version line kept inside the scrolling sheet.
7. **Behavior preservation.** All navigation actions, the MFU logo interaction, profile badge, and safe-area handling work exactly as before; no data/service changes; no other tab touched.
8. **Quality gates.** `ng build` AOT passes (plain or `--configuration dev`, NEVER "development"); lint clean on touched files; `npm run subset-icons` output shows the new glyphs; Manrope + FRED palette + force light mode; scroll behavior verified (headless: scroll the sheet to bottom → header rect unchanged); no TODOs or dead code (old flat-blue/overlap styles pruned where replaced).

### Edge cases

- Long first names / small screens — header row wraps gracefully as today.
- Freedom stats loading ('—') and error states render in the glass tiles.
- Badge on a settings row (e.g. action-required) still renders in the new row anatomy.
- Sheet content shorter than viewport — sheet still fills to the tab bar (no gap band).
- Momentum scroll at sheet top must not pull the whole page (iOS rubber-banding stays inside the sheet).

### Open questions (non-blocking)

- Whether the sheet's rounded top hides content behind a hairline mask or a small fade on scroll — builder matches the prototype's plain clip unless it looks rough on device.
