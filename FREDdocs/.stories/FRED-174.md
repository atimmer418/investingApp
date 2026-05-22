# FRED-174 — Wire up Apple subscription to pricing tiers (ONBOARDING)

## Before
```
## FRED-174 — Wire up Apple subscription to pricing tiers (ONBOARDING)
Apple subscription needs to be set up with the pricing tiers section on investmentconfirmation.
```

## Summary
Backend half of the Apple IAP integration (frontend half is in FRED-112). FRED-112 wires the native StoreKit purchase into `selectTier()` using RevenueCat's `@revenuecat/purchases-capacitor`; this story adds the backend receipt validation, `subscriptionStartDate` tracking, and App Store Connect product setup.

**FRED-112 already handles:**
- Capacitor IAP plugin integration (`@revenuecat/purchases-capacitor` recommended in FRED-112)
- `selectTier()` triggering native purchase sheet
- Expired subscription gate (Tab 1/2/Chat disabled, My Profile reactivation CTA)

**This story adds:**
- App Store Connect product IDs (6 products: 3 tiers × monthly/yearly)
- Backend receipt validation endpoint
- `subscriptionStartDate` field on User (needed by FRED-173 referral lock)
- RevenueCat webhook → backend sync (optional for v1, can use polling instead)

**Consider merging into FRED-112** — the IAP setup and backend validation are tightly coupled. If merged, FRED-174 becomes OBE.

## Files
**Backend:**
- `backend/src/main/java/com/investingapp/backend/controller/UserController.java` — add `POST /api/users/subscription/confirm` to receive RevenueCat webhook or frontend receipt, update `selectedTier`, `billingPeriod`, `subscriptionStartDate`
- `backend/src/main/java/com/investingapp/backend/model/User.java` — add `subscriptionStartDate: LocalDate` field
- `backend/src/main/java/com/investingapp/backend/service/SubscriptionService.java` (new) — handle RevenueCat webhook events (purchase, renewal, cancellation, expiration); update `selectedTier` accordingly
- New Flyway migration: `subscription_start_date DATE NULL` on users table

**App Store Connect (founder task):**
- Create subscription group with 6 products: `fred_core_monthly`, `fred_core_yearly`, `fred_plus_monthly`, `fred_plus_yearly`, `fred_pro_monthly`, `fred_pro_yearly`
- Prices: core ($8/$80), plus ($15/$150), pro ($40/$400) monthly/yearly (adjust for Apple's price tiers)
- Configure 14-day free trial (per FRED-169) on each product

## Doc References
- `FREDdocs/PROGRESS_TRACKING_SYSTEM.md` — understand userProgress fields set after subscription
- `FREDdocs/API_ENDPOINTS.md` — FRED-99 added selectedTier + billingPeriod to user profile endpoint

## Acceptance Criteria
1. App Store Connect: subscription group with 6 products created, prices set, 14-day trial configured.
2. Backend: `subscription_start_date` Flyway migration applied.
3. Backend: `POST /api/users/subscription/confirm` endpoint sets `selectedTier`, `billingPeriod`, and `subscriptionStartDate` on the user when called with a valid RevenueCat webhook payload or purchase confirmation.
4. When subscription expires/cancels (RevenueCat webhook): backend sets `selectedTier = null`, clearing access (FRED-112 expired gate activates on next app open).
5. All FRED-99 data fields (selectedTier, billingPeriod) continue to work correctly after this change.
6. Consider merging this ticket into FRED-112 before starting — together they represent one atomic integration.

## Edge Cases / Open Questions
- RevenueCat simplifies receipt validation and cross-platform IAP significantly — recommended over raw StoreKit + manual validation.
- Yearly pricing: Apple's price tiers may not land exactly on $80/$150/$400 — confirm acceptable equivalent prices.
- `subscriptionStartDate` should only be set once (first successful subscription), not updated on renewals.

## Time Estimate
`3hr+`

## Label
`[code]`
