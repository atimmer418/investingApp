# FRED-106 — Auto-start ACATS transfer if localStorage flag set

## Before
```
## FRED-106 — Auto-start ACATS transfer if localStorage flag set
make it so that when a user signs up, check the localStorage to see if they had set up for an ACATS transfer and if they had, start that process
```

## Summary
After a new user completes the full onboarding flow (selects a pricing tier AND subscribes), check `localStorage.getItem('pendingAcats')`. If present, automatically call the backend ACATS API (Alpaca) to initiate the transfer using the saved DTC and account number — no user confirmation step needed. Also replaces the current email-pseudocode stub in `AlpacaService.initiateAcatsTransfer()` with the real Alpaca ACAT API call.

**Must follow:** https://docs.alpaca.markets/us/docs/acat-api

## Files

### Backend
- `backend/src/main/java/com/investingapp/backend/service/AlpacaService.java` — replace `initiateAcatsTransfer()` pseudocode with real Alpaca ACAT API HTTP call per docs
- `backend/src/main/java/com/investingapp/backend/controller/AlpacaController.java` — verify `/api/alpaca/acats/transfer` endpoint is wired and accepts `{ dtc, accountNumber, accountType }` from frontend

### Frontend
- Subscription completion step (the component that fires after the user selects a tier and confirms subscription) — after subscription confirms, call `investmentService.initiateAcatsTransfer(...)` with `pendingAcats` data, then clear `localStorage.removeItem('pendingAcats')`

## Doc References
- **Alpaca ACAT API:** https://docs.alpaca.markets/us/docs/acat-api — must be followed for backend implementation
- `FREDdocs/PROGRESS_TRACKING_SYSTEM.md` — understand which progress step corresponds to subscription completion
- `FREDdocs/API_ENDPOINTS.md` — verify current `/api/alpaca/acats/transfer` endpoint signature

## Acceptance Criteria
1. `AlpacaService.initiateAcatsTransfer()` replaced with real Alpaca ACAT API HTTP call per https://docs.alpaca.markets/us/docs/acat-api. Remove the email pseudocode stub.
2. After the user confirms their subscription (final onboarding step), frontend checks `localStorage.getItem('pendingAcats')`.
3. If `pendingAcats` is present, frontend calls the ACATS backend endpoint with `{ dtc, accountNumber }` parsed from the saved JSON.
4. On API success, clear `localStorage.removeItem('pendingAcats')` and show a brief toast: "Transfer request submitted."
5. On API error, show a toast with a retry option; do NOT clear `pendingAcats` so a retry is possible.
6. If `pendingAcats` is absent at subscription completion, do nothing.
7. `./gradlew build -x test` exits 0; `npx tsc --noEmit` exits 0.

## Edge Cases / Open Questions
- Confirm which subscription completion component fires the trigger (the tier-selection/subscription confirmation component in onboarding).
- Alpaca ACAT API may require the user's Alpaca account ID — ensure it's available at this point in the flow (should be, since KYC must be approved before subscription).
- Account type (individual, joint, IRA) — the current `pendingAcats` localStorage object only stores `{ dtc, account }`. May need to store `accountType` as well. Update `investment-schedule.component.ts` line 600 to include it.

## Time Estimate
`3hr+`

## Label
`[code]`
