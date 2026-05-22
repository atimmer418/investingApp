# FRED-126 — One-time transactions add ACATS API functionality

## Before
```
## FRED-126 — One-time transactions needs added ACATS API functionality
one-time transactions ALMOST DONE it just needs ACATS API functionality once it has been implemented
```

## Summary
Follow-on to FRED-106. The manual ACATS transfer on the one-time transactions page (`lump-sum-investment`) is for transferring personal brokerage assets — same scope as the investment-schedule ACATS setup. Account type is `BROKERAGE` (already hardcoded in the backend). Once FRED-106 ships the real Alpaca ACAT API backend, surface the `transferId` from the success response and confirm the end-to-end flow works.

**Depends on:** FRED-106 (real Alpaca ACAT backend implementation must be in place first).

## Files
- `frontend/src/app/lump-sum-investment/lump-sum-investment.page.ts` — update `submitAcatsTransfer()` to read `transferId` from the success response and include it in the success toast

## Doc References
- **Alpaca ACAT API:** https://docs.alpaca.markets/us/docs/acat-api — response shape (transferId field)
- `FREDdocs/API_ENDPOINTS.md` — `/api/alpaca/acats/transfer` endpoint

## Acceptance Criteria
1. **Depends on FRED-106**: Do not test or merge until the real Alpaca ACAT backend is in place.
2. Transfer type is `BROKERAGE` (personal brokerage account) — same as the investment-schedule ACATS path. No account type selector needed; it's already hardcoded.
3. `submitAcatsTransfer()` reads `transferId` from the backend response and shows success toast: "Transfer submitted — ref: \<transferId\>".
4. Submit button is disabled until both DTC number and account number fields are filled (guard already exists via `if (!this.transferBrokerageDtc || !this.transferAccountNumber)` — keep it).
5. On API error: "Transfer request failed. Please try again."
6. `npx tsc --noEmit` exits 0.

## Edge Cases / Open Questions
- The backend response already returns `transferId` in the map. Just ensure the frontend reads `response.transferId` (or however the typed response surfaces it).

## Time Estimate
`<1hr`

## Label
`[code]`
