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
- Evidence:
- Status:   pending

## AC-2: FRED wordmark keeps the existing .header-branding SCSS for BOTH states
- Type:     ui-acceptance
- Check:    The "FRED" wordmark in the new header carries over the current tab3 `.header-branding`
            styling verbatim for both states: (a) the default non-white, unclickable watermark
            (color:#f2f2f7; opacity:0.25; pointer-events:none) and (b) the clickable white-shadow
            `.mfu-active` version (pointer-events:auto; cursor:pointer; opacity:0.85; text-shadow
            0 0 8px rgba(255,255,255,0.3); -webkit-text-stroke:0.6px rgba(255,255,255,0.55); and the
            `&:active` scale). Andrew's explicit requirement.
- Evidence:
- Status:   pending

## AC-3: Data + behavior preserved — no .ts logic rewrite
- Type:     frontend-unit
- Check:    tab3.page.ts is unchanged in logic — settingSections array, the *ngFor rows,
            onSettingClick(action), goToMyProfile(), onFredLogoClick() MFU interaction, and the
            `profileActionRequired$ | async` badge are all wired exactly as before. `git diff`
            shows no behavioral change to tab3.page.ts.
- Evidence:
- Status:   pending

## AC-4: TypeScript compiles clean
- Type:     frontend-unit
- Check:    `cd frontend && npx tsc --noEmit` exits 0.
- Evidence:
- Status:   pending

## AC-5: Header clears the notch and the full list fits on target devices
- Type:     ui-acceptance
- Check:    The hero header clears the notch (safe-area-top honored) and the entire settings list
            + footer fits without clipping or broken scroll at 390×844 (iPhone 14) and 430×932
            (iPhone 14 Pro Max). Screenshot at both sizes.
- Evidence:
- Status:   pending

## AC-6: Every settings row still routes correctly + FRED-logo MFU tap still fires
- Type:     ui-acceptance
- Check:    Each row in all three sections still invokes onSettingClick with its original action and
            navigates to the same destination as before; goToMyProfile fires on avatar tap; the
            FRED-logo tap still triggers the Monthly Freedom Update interaction when hasMfuPeriod.
- Evidence:
- Status:   pending

## AC-7: Reuses established my-profile card/row/icon patterns
- Type:     ui-acceptance
- Check:    Row/card/icon treatment follows the established my-profile / migrated-settings patterns
            (consistent with the white-section-card system the other migrated pages use); a senior
            reviewer would see one consistent design system, not a one-off.
- Evidence:
- Status:   pending
