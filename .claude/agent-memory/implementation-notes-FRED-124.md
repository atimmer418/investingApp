# FRED-124 Implementation Notes

## Design Decisions

- **No masked number shown**: `currentBankAccount` from `GET /plaid/primary-bank-account` has `institutionName` and `accountSubType` only; plaid.service confirms backend stores `'****'` not a real mask, so we only show name + type per spec instruction.
- **Illustration card inlined**: The `.illustration-card` HTML/CSS is copied directly into the change-bank-account page rather than importing the linkplaid component, because the component has its own unrelated page-level logic (Plaid link init). CSS variables `--plaid-primary` are substituted with `#2563EB` directly.
- **Blue header**: Used the tab3 `.custom-profile-header` pattern — blue gradient with `&::after` concave white cutout. The `ion-toolbar` is hidden; the blue header is a plain `div` inside `ion-header` (same as tab3 pattern).
- **Header approach**: tab3 uses a raw `div.custom-profile-header` inside `ion-header` without a toolbar, but this page needs a back button. Using `ion-toolbar` with `--background: transparent` overlay on top of the blue header div approach is complex. Instead, the blue header is a div sitting OUTSIDE ion-header's toolbar but inside the ion-header wrapper — matching tab3 exactly.
- **No TS getter needed**: The empty state is handled directly in the template with `*ngIf="!currentBankAccount"` on the "no bank linked yet" card and `*ngIf="currentBankAccount"` on the filled card.
- **statusMessage error detection**: Re-uses the existing error-detection logic from the current template (`includes('error') || includes('Could not') || includes('Failed')`), displayed as a designed inline card with warning icon.

## REWORK — Notch / Safe-Area Fix (2026-06-07)

- **Root cause confirmed**: `.blue-hero-header` had `padding: 10px 20px 40px 20px` — flat 10px top padding, no `env(safe-area-inset-top)`, so the header overlapped the iPhone status bar / notch.
- **Fix applied**: Changed the top padding to `calc(env(safe-area-inset-top, 0px) + 10px)` — keeps the 10px breathing gap on all devices, adds the notch height on notched iPhones, falls back to 0px on non-notched devices.
- **Approach chosen**: Inline `calc()` in the existing padding shorthand rather than adding the global `safe-area-top` class (which uses `!important` and would eliminate the 10px gap on notched phones).
- **Files touched**: Only `change-bank-account.page.scss` line 29. `.page.ts`, `.page.html`, and all backend files are untouched.
- **tsc result**: Two pre-existing tsconfig deprecation warnings (`baseUrl`, `moduleResolution=node10`) — both pre-date this change; no new errors.
- **ion-content background**: Set to `#f8fafc` matching the white content area; the blue header is above the content via `ion-header`.
- **`&::after` cutout color**: Uses `#f8fafc` (matches the content background), not `#f2f2f7` (tab3 uses its own bg color). This ensures seamless join.
- **accountSubType capitalization**: `formatAccountDisplay()` returns e.g. "Chase (Checking)". For the rich account display, we use `currentBankAccount.institutionName` and `currentBankAccount.accountSubType` directly, with a capitalize pipe substitution via CSS `text-transform: capitalize`.

## Deviations

- None from spec.

## tsc Result

- `npx tsc --noEmit` (raw, no ignoreDeprecations): 2 pre-existing deprecation warnings on tsconfig.json `baseUrl` and `moduleResolution=node10` options (these affect every file in the project). Zero type errors introduced by this work.
- With `--ignoreDeprecations 6.0`: all errors are `Cannot find module '@angular/core'` etc. — environment-level errors (node_modules not resolvable via raw tsc outside of angular-cli build toolchain). All present before this change; none relate to change-bank-account.
- The `.page.ts` file was NOT touched; confirmed via `git status`.

## Open Questions

- None outstanding.
