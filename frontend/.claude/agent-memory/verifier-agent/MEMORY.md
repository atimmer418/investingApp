# Verifier Agent Memory Index

- [Lombok Boolean Jackson Mismatch](feedback_lombok_boolean.md) — primitive boolean fields with `is` prefix cause Jackson deserialization mismatches
- [User Lookup Must Use Auth Context](feedback_user_lookup_auth.md) — never use request body email to look up the user; always use SecurityContextHolder/getCurrentUser
- [SSN Format for Alpaca](feedback_ssn_format.md) — SSN must be digits-only when sent to Alpaca API; strip dashes before sending
- [localStorage Direct Access Violations](feedback_localstorage.md) — builder-agent sometimes uses localStorage.getItem('userEmail') instead of JwtTokenUtils or AuthService
