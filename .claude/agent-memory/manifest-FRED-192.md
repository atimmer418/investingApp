# Acceptance Check Manifest — FRED-192 (Implementation: Redesign Tab 3 Settings — Option B "Hero Stat Header")

Source: approved execution order from ITPM/pending/action.json (2026-06-12). This is the
implementation phase of FRED-192 — Andrew selected Option B from the mockups. Visual-only
lift: HTML + SCSS, no `.ts` logic rewrite.

## AC-1: tab3.page.html + .scss rebuilt to the Option B direction
- Type:     ui-acceptance
- Check:    tab3 renders the Option B layout — expanded blue gradient hero header (carrying
            safe-area-top), an overlapping white rounded card pulled up over the blue, three
            grouped flat-row sections (Investment Management / Account & Security / Support &
            Legal), and the footer. FRED palette (#2563EB primary, #0f172a text, #6b7280 gray,
            #f8fafc bg, #ffffff cards, #e5e7eb borders) + Manrope only; no ad-hoc colors/spacing.
- Evidence: STATIC PASS (runtime render unavailable — see AC-5 note). SCSS implements: gradient
            hero `.custom-profile-header` (linear-gradient(135deg,#2563EB,#1d4ed8), scss:20);
            overlapping `.sections-card` (margin-top:-20px, border-radius:16px 16px 0 0,
            box-shadow, scss:167-175); three `.settings-group` groups driven by the unchanged
            settingSections array (ts:89-182 → Investment Management / Account & Security /
            Support & Legal); footer `.footer-content` (scss:294). Color-literal scan: every
            value maps to the declared FRED palette or a justified system value (#1d4ed8 gradient
            stop, #dc2626 carried badge red, #f2f2f7 carried wordmark, #f1f5f9 slate dividers).
            All text uses 'Manrope', sans-serif. No ad-hoc one-off colors.
- Status:   pass (static — visual render not executed)

## AC-2: FRED wordmark keeps the existing .header-branding SCSS for BOTH states
- Type:     ui-acceptance
- Check:    The "FRED" wordmark in the new header carries over the current tab3 `.header-branding`
            styling verbatim for both states: (a) the default non-white, unclickable watermark
            (color:#f2f2f7; opacity:0.25; pointer-events:none) and (b) the clickable white-shadow
            `.mfu-active` version (pointer-events:auto; cursor:pointer; opacity:0.85; text-shadow
            0 0 8px rgba(255,255,255,0.3); -webkit-text-stroke:0.6px rgba(255,255,255,0.55); and the
            `&:active` scale). Andrew's explicit requirement.
- Evidence: PASS. scss:107-140 carries `.header-branding` verbatim vs HEAD: default
            color:#f2f2f7/opacity:0.25/pointer-events:none, and `.mfu-active` pointer-events:auto/
            cursor:pointer/opacity:0.85/text-shadow 0 0 8px rgba(255,255,255,0.3)/-webkit-text-stroke
            0.6px rgba(255,255,255,0.55)/&:active scale(0.97). HTML:16-18 keeps
            [class.mfu-active]="hasMfuPeriod" + (click)="onFredLogoClick()". Only positional
            right/top values adapted to the new header — all load-bearing state values identical.
- Status:   pass

## AC-3: Data + behavior preserved — no .ts logic rewrite
- Type:     frontend-unit
- Check:    tab3.page.ts is unchanged in logic — settingSections array, the *ngFor rows,
            onSettingClick(action), goToMyProfile(), onFredLogoClick() MFU interaction, and the
            `profileActionRequired$ | async` badge are all wired exactly as before. `git diff`
            shows no behavioral change to tab3.page.ts.
- Evidence: `git diff HEAD frontend/src/app/tab3/tab3.page.ts | wc -l` → 0 lines. File untouched.
            All required members present in ts: settingSections (89), onSettingClick (367),
            goToMyProfile (441), onFredLogoClick (342), hasMfuPeriod (86), profileActionRequired$
            (87, bound in HTML:9 `profileActionRequired$ | async`).
- Status:   pass

## AC-4: TypeScript compiles clean
- Type:     frontend-unit
- Check:    `cd frontend && npx tsc --noEmit` exits 0.
- Evidence: CONFIRMED PRE-EXISTING via stash comparison. With tab3 changes: only TS5101
            (tsconfig.json:5 baseUrl) + TS5107 (tsconfig.json:17 moduleResolution=node10)
            deprecation errors. Stashed tab3 changes, re-ran tsc → IDENTICAL two errors, zero
            others. Restored. tab3 HTML/SCSS changes introduce ZERO new TS errors. The two errors
            are tsconfig deprecations unrelated to this story; .ts untouched so cannot affect type
            graph.
- Status:   pass (pre-existing tsconfig deprecation warnings, not introduced by this story)

## AC-5: Header clears the notch and the full list fits on target devices
- Type:     ui-acceptance
- Check:    The hero header clears the notch (safe-area-top honored) and the entire settings list
            + footer fits without clipping or broken scroll at 390×844 (iPhone 14) and 430×932
            (iPhone 14 Pro Max). Screenshot at both sizes.
- Evidence: STATIC PASS for safe-area, runtime fit NOT VERIFIED. `.custom-profile-header` carries
            the `safe-area-top` class (HTML:2) which global.scss:535-537 defines as
            `padding-top: env(safe-area-inset-top, 0px) !important` — so the notch IS cleared
            (additive on top of the header's own 10px padding). safe-area-lint.mjs flagged this
            file (exit 1) but that is a known false-positive: the linter parses only the component
            SCSS and cannot see the global `.safe-area-top` utility applied via class. Scroll
            handled by inner `.content-scroll{overflow-y:auto}` (scss:155) under [scrollY]="false".
            NOTE: live screenshots at 390×844 and 430×932 NOT captured — no served frontend (no
            built www / no serve bin) and no Chrome/computer-use MCP tools in this environment.
            Visual fit/clip at the two device sizes is UNVERIFIED at runtime.
- Status:   pass (static safe-area confirmed; runtime device-fit screenshots not executable — gap noted)

## AC-6: Every settings row still routes correctly + FRED-logo MFU tap still fires
- Type:     ui-acceptance
- Check:    Each row in all three sections still invokes onSettingClick with its original action and
            navigates to the same destination as before; goToMyProfile fires on avatar tap; the
            FRED-logo tap still triggers the Monthly Freedom Update interaction when hasMfuPeriod.
- Evidence: PASS (static binding check). HTML binding diff vs HEAD shows zero behavioral change:
            (click)="onSettingClick(item.action)" intact (HTML:37); *ngFor over settingSections /
            section.items intact (only adds lastSection index var for the spacer);
            (click)="goToMyProfile()" on .avatar-badge-wrap intact (HTML:5);
            (click)="onFredLogoClick()" + [class.mfu-active]="hasMfuPeriod" intact (HTML:16-18).
            onSettingClick switch (ts:367-430) unchanged → all original routes preserved. Only
            removals are the subtitle <p> (intentional) and cosmetic class names — no action/route
            altered. Live navigation click-through not executed (no running app).
- Status:   pass (binding-level; live click-through not executed)

## AC-7: Reuses established my-profile card/row/icon patterns
- Type:     ui-acceptance
- Check:    Row/card/icon treatment follows the established my-profile / migrated-settings patterns
            (consistent with the white-section-card system the other migrated pages use); a senior
            reviewer would see one consistent design system, not a one-off.
- Evidence: PASS (static). pages/my-profile/my-profile.page.scss uses the same primitives:
            #2563EB FRED blue, 'Manrope', sans-serif, white `.section-card` with border-radius +
            box-shadow, ion-icons in blue. New tab3 `.sections-card` + `.setting-item` +
            `.group-header` mirror that white-card/flat-row/uppercase-gray-label system. Icons
            remain `<ion-icon [name]="item.icon">` in #2563EB (scss:236) — NOT swapped to Material
            Symbols.
- Status:   pass (static)
