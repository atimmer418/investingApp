# Acceptance Check Manifest — FRED-189: Fix bank account subtype always showing "Checking"

## AC-1: The active template subtype binding resolves to `formatAccountSubtype()`, which reads lowercase `accountSubtype` so the real subtype is shown, never always "Checking"
- Type:     frontend-unit
- Check:    `change-bank-account.page.html:37` (active "Current Account" card) binds `{{ formatAccountSubtype() }}`; the method reads `this.currentBankAccount?.accountSubtype` (lowercase t). Given `accountSubtype = 'savings'` the rendered string is "Savings", not "Checking".
- Evidence: html:37 `<span class="account-type">{{ formatAccountSubtype() }}</span>` (verified inside active card guarded by `*ngIf="currentBankAccount"` at html:25 — NOT a comment). ts:226-231 reads lowercase `accountSubtype`. Field name confirmed against the API source: `plaid.service.ts:80-82` consumes the SAME response with lowercase `response.accountSubtype` ('checking'/'savings'). `'savings'` → title-case → "Savings".
- Status:   pass

## AC-2: Displayed subtype is title-cased (e.g. "savings" → "Savings")
- Type:     frontend-unit
- Check:    Given `accountSubtype = 'savings'`, `formatAccountSubtype()` returns "Savings" (capital first letter), not lowercase.
- Evidence: ts:228-229 `rawSubtype.charAt(0).toUpperCase() + rawSubtype.slice(1).toLowerCase()`. Input `"savings"` → `"Savings"`; `"CHECKING"` → `"Checking"`. Rendered via the live binding at html:37.
- Status:   pass

## AC-3: Null/missing subtype falls back to neutral "Account" (never "Checking", never empty/broken)
- Type:     frontend-unit
- Check:    With `currentBankAccount` truthy (active card guard) but `accountSubtype` undefined/null, the rendered subtype reads "Account" — never "Checking", never empty `()`.
- Evidence: ts:227-230 ternary `rawSubtype ? <title-case> : 'Account'`. Null/undefined/empty → `'Account'`. The pre-fix `|| 'Checking'` fallback is gone from both bindings.
- Status:   pass

## AC-4: No surviving capital-T `accountSubType` reference; plaid.service.ts untouched
- Type:     frontend-unit
- Check:    `grep -rn 'accountSubType' frontend/src` returns no matches (capital T gone). `git diff --name-only` shows `plaid.service.ts` unchanged.
- Evidence: `grep -rn 'accountSubType' frontend/src` → exit 1, no matches. `git diff --name-only | grep -i plaid` → exit 1, plaid.service.ts NOT in diff.
- Status:   pass

## AC-4b: `formatAccountSubtype()` is referenced from the template (live render path), not dead code; `formatAccountDisplay()` is gone
- Type:     frontend-unit
- Check:    `grep -rn 'formatAccountSubtype' frontend/src` shows ≥1 template caller (active card). `grep -rn 'formatAccountDisplay' frontend/src` returns no matches (no orphaned dead method).
- Evidence: `grep formatAccountSubtype` → html:37 (active), html:12 (commented hero peek), ts:226 (def). `grep formatAccountDisplay` → exit 1, fully removed. The fix is on the live render path this round.
- Status:   pass

## AC-5: No backend/schema/auth changes; `cd frontend && npx tsc --noEmit` adds NO new errors vs baseline
- Type:     frontend-unit
- Check:    `git diff --name-only` shows only the two frontend files (page.ts + page.html); no backend/SQL/auth. `tsc --noEmit` shows only the pre-existing TS5101/TS5107 tsconfig deprecation warnings.
- Evidence: diff touches only `change-bank-account.page.ts` + `change-bank-account.page.html`. `tsc --noEmit` exit 2 with ONLY tsconfig.json TS5101 (baseUrl) + TS5107 (moduleResolution=node10) — zero type errors, none on changed lines. `currentBankAccount` typed `any` (ts:46); optional-chained read is type-safe.
- Status:   pass

## AC-6: A Savings-linked account displays "… Savings", not "… Checking", on the Current Account card
- Type:     ui-acceptance
- Check:    The active "Current Account" card renders the correct title-cased subtype from the live binding.
- Evidence: RESOLVED BY CONCLUSIVE STATIC INSPECTION (no live browser harness / backend :8080 / tunnel in sandbox). The user-visible render path is now: html:37 (active card, not commented, guarded truthy) → `formatAccountSubtype()` (ts:226) → lowercase `accountSubtype` field (matches API per plaid.service.ts:80-82) → title-case → `'Account'` fallback. `accountSubtype='savings'` renders "Savings"; null renders "Account". The pre-fix always-"Checking" / non-title-cased behavior is removed from BOTH bindings. Static inspection is sufficient now that the binding is on the real render path (per story note).
- Status:   pass (static)
