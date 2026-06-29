---
name: encryption_upgrade_review
description: Notes from reviewing the AES-256/GCM encryption upgrade across all sensitive fields (SSN, Alpaca IDs, Plaid tokens, OTPs)
type: project
---

Encryption upgrade implemented March 2026. All sensitive fields (SSN, alpacaAccountId, alpacaAccountNumber, alpacaAchRelationshipId, plaidAccessToken, recoveryOtp) now encrypted with AES/GCM/NoPadding using ENC: prefix format.

**Why:** Sensitive data at rest protection requirement.

**How to apply:** When reviewing future changes that touch User entity sensitive fields, verify encrypt-on-write and decrypt-on-read are applied consistently. The hashSsn utility is duplicated in AlpacaController and RecoveryController -- if a third usage appears, flag for extraction to a shared utility. InvestmentExecution.alpacaAccountId stores plaintext snapshots in the DB -- this is a known gap.
