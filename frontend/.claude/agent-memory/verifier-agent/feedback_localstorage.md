---
name: localStorage Direct Access Violations
description: Builder-agent sometimes reads JWT localStorage keys directly (userEmail, jwtToken) instead of using JwtTokenUtils or AuthService methods
type: feedback
---

FRED hard rule: "Do not read/write JWT localStorage keys directly — use JwtTokenUtils." The 4 managed keys are `jwtToken`, `jwtExpiration`, `userId`, `userEmail`.

Builder-agent used `localStorage.getItem('userEmail')` in the KYC verification component prefill. While this technically works, it violates the convention and makes the codebase inconsistent.

**Why:** Centralizing token access through JwtTokenUtils ensures consistent expiry checking and avoids stale reads across the app.

**How to apply:** When reviewing new frontend code, grep for `localStorage.getItem('userEmail')`, `localStorage.getItem('jwtToken')`, `localStorage.getItem('userId')`, `localStorage.getItem('jwtExpiration')`. Flag any direct reads. For email, use `AuthService.getCurrentUserEmail()` or similar.
