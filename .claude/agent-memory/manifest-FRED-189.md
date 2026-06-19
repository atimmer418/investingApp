# Acceptance Check Manifest — FRED-189: Fix bank account subtype always showing "Checking"

## AC-1: `formatAccountDisplay()` reads `accountSubtype` (lowercase t) at change-bank-account.page.ts:232 so the real subtype is shown, never always "Checking"
- Type:     frontend-unit
- Check:    Grep `change-bank-account.page.ts` — `formatAccountDisplay()` reads `accountSubtype` (lowercase t) from `this.currentBankAccount`; no read of `accountSubType` (capital T) remains. A unit/logic check: given `currentBankAccount.accountSubtype = 'savings'`, the returned string contains "Savings" (not "Checking").
- Evidence:
- Status:   pending

## AC-2: Displayed subtype is title-cased (e.g. "savings" → "Savings")
- Type:     frontend-unit
- Check:    Given `accountSubtype = 'savings'`, `formatAccountDisplay()` returns a string containing "Savings" (capitalized first letter), not lowercase "savings".
- Evidence:
- Status:   pending

## AC-3: Null/missing subtype falls back to neutral "Account" (never "Checking", never empty/broken)
- Type:     frontend-unit
- Check:    Given `accountSubtype` is undefined/null, `formatAccountDisplay()` returns a string containing "Account" — never "Checking" and never an empty/broken `()`.
- Evidence:
- Status:   pending

## AC-4: No surviving capital-T `accountSubType` reference; plaid.service.ts untouched
- Type:     frontend-unit
- Check:    `grep -rn 'accountSubType' frontend/src` returns no matches (capital T gone). `git diff` shows `plaid.service.ts` is unchanged.
- Evidence:
- Status:   pending

## AC-5: No backend/schema/auth changes; `cd frontend && npx tsc --noEmit` exits 0
- Type:     frontend-unit
- Check:    `git diff --name-only` shows only frontend files (change-bank-account.page.ts); no backend/SQL/auth files. `cd frontend && npx tsc --noEmit` exits 0.
- Evidence:
- Status:   pending

## AC-6: A Savings-linked account displays "… (Savings)", not "… (Checking)", at 390×844
- Type:     ui-acceptance
- Check:    Render the change-bank-account page with a Savings-subtype account; the account display line reads "<Institution> (Savings)" at 390×844. (Deferred to device render via "Looks Good" if a runnable harness is unavailable in sandbox; logic covered by AC-1/AC-2.)
- Evidence:
- Status:   pending
