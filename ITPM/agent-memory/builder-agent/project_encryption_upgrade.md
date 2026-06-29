---
name: encryption_upgrade
description: AES-256/GCM encryption upgrade and field encryption rollout (March 2026)
type: project
---

Upgraded EncryptionService from AES/ECB to AES/GCM/NoPadding with random 12-byte IV per operation. Encrypted format: `ENC:<base64(iv + ciphertext)>`. Legacy plaintext fallback allowed in dev/local profiles only; throws in prod/test.

**Why:** Security requirement to encrypt sensitive fields at rest. Plaid access token was already encrypted but used broken AES/ECB. SSN, Recovery OTP, and Alpaca/ACH IDs were plaintext.

**Fields now encrypted (User entity):**
- `plaidAccessToken` — encrypted on write in PlaidService, decrypted in PlaidToAlpacaService and PlaidController
- `ssn` — encrypted on write in AlpacaController.createAccount(); never exposed plaintext
- `ssnHash` — SHA-256 hex of raw SSN (NEW COLUMN), used by findBySsnHash() for lookup
- `recoveryOtp` — encrypted on write in RecoveryController, decrypted before comparison
- `alpacaAccountId` — encrypted in AlpacaController, PlaidToAlpacaService; decrypted in all services that pass to Alpaca API
- `alpacaAccountNumber` — encrypted in AlpacaController; not passed to API directly
- `alpacaAchRelationshipId` — encrypted in PlaidToAlpacaService; decrypted in TradingController for withdrawals

**Schema changes made:**
- User.ssn: VARCHAR(512)
- User.recovery_otp: VARCHAR(512)
- User.plaidAccessToken: VARCHAR(512)
- User.alpacaAccountId, alpacaAccountNumber, alpacaAchRelationshipId: VARCHAR(512)
- User.ssnHash: VARCHAR(64) — NEW COLUMN (SHA-256 hex for lookup)
- UserRepository: findBySsn → findBySsnHash

**Key pattern:** InvestmentExecution.alpacaAccountId is now encrypted at rest (ENC: prefix). Decrypt with encryptionService.decrypt() at every read point before passing to AlpacaService API calls (checkTransferStatus, placeOrderWithFractionalCheck, checkOrderStatus). Column length is VARCHAR(512). Previously was plaintext — this was fixed March 2026.

**Additional fixes (March 2026):**
- Plaid access token no longer round-trips through frontend: removed from CreateAchFromPlaidRequest DTO and PlaidToAlpacaService.createAchRelationshipFromPlaid() signature. Service now loads it directly from User entity.
- hashSsn() extracted from AlpacaController and RecoveryController into EncryptionService as public method.
- syncAccountNumber endpoint removed from AlpacaController.
- RecoveryController OTP generation uses SecureRandom instead of Random.
- EncryptionService.getKey() uses StandardCharsets.UTF_8 in secretKey.getBytes().

**How to apply:** When touching any User field that is encrypted, always decrypt on read before API calls, encrypt on write before save. Never log decrypted SSN/OTP/tokens.
