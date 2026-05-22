# FRED-123 — Account security add KYC form editing

## Before
```
## FRED-123 — Account security add KYC form editing
account security ALMOST DONE needs ability to update kyc form
[merged from FRED-107: allow kyc to be changed in account security setting page]
```

## Summary
Add an "Update KYC" / "Edit Identity" button to the Identity & Contact section of the security-settings page. Tapping it navigates to the `kyc-verification` component in edit mode — allowing the user to re-submit their identity information. The backend calls Alpaca's customer update endpoint.

## Files
- `frontend/src/app/pages/security-settings/security-settings.page.html` — add "Update" / "Edit" button to the KYC info row
- `frontend/src/app/components/kyc-verification/kyc-verification.component.ts` — add `editMode: boolean` input; in edit mode, pre-fill existing data and show a "Update" CTA instead of "Continue"
- `backend/src/main/java/com/investingapp/backend/controller/AlpacaController.java` — add `PATCH /api/alpaca/account/kyc` or verify existing update endpoint for customer info

## Doc References
- **Alpaca Patch Account API:** https://docs.alpaca.markets/us/reference/patchaccount — use this exact endpoint for updating KYC identity information
- `FREDdocs/AUTHENTICATION_AND_JWT.md` — auth pattern for the controller

## Acceptance Criteria
1. Security settings KYC info row gains an "Edit" button (small, outline, same style as "Change" email button).
2. Tapping "Edit" navigates to the `kyc-verification` component (or opens it as a modal) in edit mode.
3. In edit mode: form is pre-filled with the user's existing KYC data pulled from the backend. CTA button reads "Update" instead of "Submit."
4. On submit: calls Alpaca's customer update API to update the identity information. On success: shows a success toast and returns to security-settings.
5. On Alpaca API error: shows a descriptive error toast; form stays open for retry.
6. `npx tsc --noEmit` exits 0; `./gradlew build -x test` exits 0.

## Edge Cases / Open Questions
- Alpaca may restrict which KYC fields can be updated post-approval (name change may require human review). Surface the API error message to the user if a field can't be updated.
- Pre-filling existing KYC data requires fetching it from the Alpaca account; ensure the security-settings page already has or can fetch this data.
- After updating KYC, Alpaca may trigger a re-verification — handle the status change gracefully.

## Time Estimate
`1-3hr`

## Label
`[code]`
