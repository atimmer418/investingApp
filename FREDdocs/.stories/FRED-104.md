# FRED-104 — Give Claude JWT testing and frontend navigation tools

## Before
```
## FRED-104 — Give Claude JWT testing and frontend navigation tools
give claude a way to verify things like...
- a jwt token to test its code outputs for the backend
- a way for claude to navigate to any frontend page and test functionality
```

## Summary
Sub-task 1 (JWT) is already implemented — `test/api/lib/auth.sh` calls `/api/dev/authenticate-as-user` and exports `$TOKEN`. Sub-task 2 (frontend navigation) needs a helper: a short shell script that accepts a route path and opens the local dev server at that route in Chrome, usable by Claude via Bash.

## Files
- `test/api/lib/auth.sh` — ✅ already done
- `test/api/config.local.sh` — ✅ already done
- `test/frontend/navigate.sh` — new helper to create

## Doc References
- `FREDdocs/CLOUDFLARE_SETUP.md` — local dev server URL (port 8100)

## Acceptance Criteria
1. ✅ ALREADY DONE — JWT: `test/api/lib/auth.sh` sources config, calls `/api/dev/authenticate-as-user`, exports `$TOKEN`. No new work needed.
2. Create `test/frontend/navigate.sh <route>` — opens `http://localhost:8100/<route>` in Chrome using `open -a "Google Chrome"`. Accepts one arg (the route, e.g. `tabs/tab1`). Prints the full URL it opened. No dependencies beyond bash + macOS.
3. Add a one-line usage note to `test/api/README.md` (or create it if absent) so future Claude sessions know both tools exist.

## Edge Cases / Open Questions
- Frontend must already be running (`servlocal` on port 8100) for the navigation script to be useful — the script should not attempt to start it.
- Claude-in-Chrome MCP is available natively and handles DOM interaction; the navigate script is just a shortcut to open the right URL.

## Time Estimate
`<1hr`

## Label
`[code]`
