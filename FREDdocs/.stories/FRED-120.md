# FRED-120 — Audit npm vulnerabilities and all warnings

## Before
```
## FRED-120 — Audit npm vulnerabilities and all warnings
go thru npm audit vulnerabilities, frontend warnings, backend warnings
```

## Summary
Full audit of security vulnerabilities and build warnings across frontend (npm audit) and backend (Gradle build warnings). Fix or suppress anything that can be addressed without breaking changes; document anything that can't.

## Files
- `frontend/package.json` and `frontend/package-lock.json` — dependency updates/overrides for vulnerabilities
- `backend/build.gradle` — dependency updates for backend warnings
- Potentially scattered component `.ts` files where TypeScript warnings originate

## Acceptance Criteria
1. Run `npm audit` in `/frontend`. Fix all `critical` and `high` severity vulnerabilities. For `moderate` and `low`, fix where straightforward; document the rest as known-and-acceptable in a brief comment.
2. Run `npm run build` (or `npx ng build`) in `/frontend`. Zero `WARNING` lines in the output that aren't pre-existing third-party noise. Fix all application-level warnings (unused imports, deprecated APIs, type mismatches).
3. Run `./gradlew build` in `/backend`. Zero warnings from application code (third-party library deprecation warnings are acceptable if suppressed via Gradle config).
4. `npx tsc --noEmit` exits 0 (no new TypeScript errors introduced by the fixes).
5. `./gradlew build -x test` exits 0.
6. Summary comment added at the end of `FREDdocs/backlog.md` FRED-120 entry noting which vulnerabilities were fixed vs. accepted-with-reason.

## Edge Cases / Open Questions
- Some vulnerabilities may be in transitive dependencies without a fix available — use `npm audit fix` cautiously; `--force` may introduce breaking changes.
- `npm audit fix` changes should be tested: run the frontend after fixing to confirm no regressions.

## Time Estimate
`1-3hr`

## Label
`[code]`
