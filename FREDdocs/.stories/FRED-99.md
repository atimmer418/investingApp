# FRED-99 — Persist pricing tier and billing period to backend

## Before
```
## FRED-99 — Implement all features from tiered pricing
implement all features from tiered pricing
```

## Summary
When the user selects a subscription tier (Core/Plus/Pro) on `investmentconfirmation` step 2, that choice and the billing period (monthly/yearly) are never sent to the backend. `selectTier()` only writes to localStorage (`fred.selectedTier`). The backend `User` model has no `selectedTier` or `billingPeriod` field. This ticket adds end-to-end persistence: DB columns → backend model → profile endpoint → frontend call.

## Files
- `backend/src/main/java/com/investingapp/backend/model/User.java` — add `selectedTier` and `billingPeriod` String fields
- `backend/src/main/resources/db/migration/` — Flyway SQL adding both columns to the `user` table
- `backend/src/main/java/com/investingapp/backend/controller/UserController.java` — handle `selectedTier` / `billingPeriod` in `PUT /user/profile`; expose both fields in the user data response
- `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.ts` — update `selectTier()` to call `authService.updateUserProfile({ selectedTier, billingPeriod })` before completing the step

## Doc References
- Backend conventions: `.claude/CONTEXT.md`
- User profile endpoint: `FREDdocs/API_ENDPOINTS.md`

## Acceptance Criteria
1. `User.java` has `@Column(nullable = true) private String selectedTier` and `@Column(nullable = true) private String billingPeriod`; Flyway migration adds `selected_tier VARCHAR(10)` and `billing_period VARCHAR(10)` columns to the `user` table
2. `PUT /user/profile` in `UserController.java` accepts `selectedTier` and `billingPeriod` keys in the request body and persists them to `User` via the service layer
3. The user data object returned by `GET /user/me` (or equivalent profile GET endpoint) includes `selectedTier` and `billingPeriod` fields
4. In `investmentconfirmation.component.ts`, `selectTier(tierId)` calls `this.authService.updateUserProfile({ selectedTier: tierId, billingPeriod: this.billingPeriod })` and waits for it to resolve (success or caught error) before calling `authorizeRecurringInvestment()` — errors are logged but do not block step completion
5. `cd frontend && npx tsc --noEmit -p tsconfig.app.json` exits 0
6. `cd backend && ./gradlew build -x test` exits 0
7. Manual smoke: select "Pro" (yearly), tap the Pro CTA — after navigation to `/tabs/tab1`, the user profile API response includes `selectedTier: "pro"` and `billingPeriod: "yearly"`

## Edge Cases / Open Questions
- `selectedTier` should be nullable — users who completed onboarding before this feature ships won't have it set
- `billingPeriod` defaults to `monthly` in the component if not set; the backend column should be nullable, not defaulted
- `authService.updateUserProfile()` type signature currently accepts only `{ monthlyInvestment?, retirementIncome?, firstName?, lastName? }` — the TypeScript interface must be widened to include `selectedTier?: string` and `billingPeriod?: string`
- The `planId` field already on `User` is unrelated (set during passkey registration from FI survey data); do not conflate

## Time Estimate
`<1hr`

## Label
`[code]`
