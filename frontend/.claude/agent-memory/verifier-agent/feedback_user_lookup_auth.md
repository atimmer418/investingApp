---
name: User Lookup Must Use Auth Context
description: Controllers must identify the current user via SecurityContextHolder/getCurrentUser, not via request body email — prevents privilege escalation
type: feedback
---

The `createAccount` endpoint in `AlpacaController` used `userRepository.findByEmail(request.getEmailAddress())` to find the user for persisting account data. Since the email field is user-editable in the KYC form, a user could submit another user's email and have Alpaca account data + SSN written to the wrong user record.

**Why:** This is a privilege escalation / data integrity vulnerability. The authenticated user's identity should always come from the JWT (SecurityContextHolder), not from user-submitted input.

**How to apply:** Any time the builder creates or modifies a controller endpoint that persists data to a User entity, verify the user lookup uses `getCurrentUser()` or `SecurityContextHolder`, not any field from the request body.
