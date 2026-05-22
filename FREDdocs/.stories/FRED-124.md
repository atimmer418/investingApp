# FRED-124 — Change bank account page full UI overhaul

## Before
```
## FRED-124 — Change bank account page full UI overhaul
change bank account ALMOST DONE needs entire UI lift
[merged from FRED-108: make change bank account setting page look clean]
```

## Summary
Full UI overhaul of the change-bank-account page to match the rest of the FRED settings screens. Current issues: gradient toolbar (inconsistent with white headers elsewhere), a "benefits" bullet list (web-app feel, not iOS-native), ad-hoc `#007aff` blue instead of `#2563EB` FRED primary, inline status message div (should be toast-only), and the page heading duplicates the toolbar title. The logic (Plaid handler, step-up auth, token exchange) is correct and should not change.

## Files
- `frontend/src/app/change-bank-account/change-bank-account.page.html` — full template rewrite
- `frontend/src/app/change-bank-account/change-bank-account.page.scss` — full SCSS rewrite to FRED design tokens

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — FRED color palette (`#2563EB`), Manrope typography, spacing scale, card/section patterns
- `frontend/src/app/pages/security-settings/security-settings.page.html` — reference for white `ion-no-border` header, `section-card mobile-card` pattern, `ion-list lines="none"` row layout

## Acceptance Criteria
1. Header uses `class="ion-no-border"` + clean white toolbar (no gradient). Back button and title match security-settings style.
2. Remove the "Benefits Section" (`benefit-features` bullet list) entirely — it's filler.
3. Current account displays in a single `section-card` row: bank icon on the left, institution name + account subtype on the right. Uses `material-symbols-outlined` for the icon (e.g. `account_balance`).
4. "Select New Bank Account" CTA uses `--background: #2563EB; --border-radius: 14px` and full-width expand. Disabled state is visually clear. Matches FRED primary CTA style.
5. Status feedback is toast-only — remove the inline `.status-message` div from the template entirely. The existing `ToastService` calls in the `.ts` are sufficient.
6. SCSS uses FRED system values: `--background: #f2f2f7` content bg; `#111827` for primary text; `#6B7280` for secondary text; no hardcoded `#007aff`, no `#f9f9f9`, no hover transforms.
7. The page renders cleanly on 430×932 — no awkward spacing, no visual regressions.
8. `npx tsc --noEmit` exits 0. No changes to `.ts` logic.

## Edge Cases / Open Questions
- When `currentBankAccount` is null (no linked account yet), the "Current Account" card should be hidden via `*ngIf` — keep the existing `*ngIf="currentBankAccount"` guard.
- Loading state: the spinner inside the button is fine; just ensure the disabled+spinner combo still looks clean with the new styles.
- "Preparing secure connection..." text while Plaid loads — keep this UX signal; it can move to a subtitle below the button.

## Time Estimate
`1-3hr`

## Label
`[code]`
