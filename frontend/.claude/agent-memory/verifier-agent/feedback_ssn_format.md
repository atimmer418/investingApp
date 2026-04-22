---
name: SSN Format for Alpaca
description: SSN/taxId must be sent as 9 digits only (no dashes) to Alpaca API — frontend validates XXX-XX-XXXX format but neither side strips dashes before API call
type: feedback
---

The KYC form validates SSN as `XXX-XX-XXXX` (with dashes) and sends it as-is in the `taxId` field. The backend passes `request.getTaxId()` directly to Alpaca. Alpaca expects the `tax_id` field as a 9-digit string without dashes.

**Why:** Alpaca may reject the account creation or store an invalid SSN, causing KYC verification failures.

**How to apply:** Either the frontend should strip dashes before sending, or the backend should strip dashes before forwarding to Alpaca. The stored (encrypted) SSN can keep dashes since it's only for internal recovery purposes.
