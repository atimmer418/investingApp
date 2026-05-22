# FRED-105 — MCP setup for Railway and MySQL databases

## Before
```
## FRED-105 — MCP setup for Railway and MySQL databases
[MCP Setup]: add mcp for railway (user-scoped) and mysql (local-scoped)
```

## Summary
Add two MCP servers to Claude Code settings: Railway (user-scoped, so it's available across projects) and MySQL (local-scoped with credentials, so it's project-only and not committed).

## Files
- `~/.claude/settings.json` — add Railway MCP server entry (user-scoped)
- `.claude/settings.local.json` — add MySQL MCP server entry (local-scoped, gitignored)
- `.gitignore` — verify `settings.local.json` is already excluded

## Doc References
- Railway dashboard for API token: https://railway.app/account/tokens
- MySQL local connection: host `localhost`, port `3306`, credentials from local `.env`

## Acceptance Criteria
1. Railway MCP added to `~/.claude/settings.json` under `mcpServers` — scoped to user so it works in any Claude Code session. Use the official `@railway/mcp` package (or equivalent). Requires Railway API token set as env var.
2. MySQL MCP added to `.claude/settings.local.json` under `mcpServers` — scoped to project only. Uses local MySQL credentials (host, port, user, password, database). File is gitignored.
3. `.gitignore` (or `.claude/.gitignore`) confirms `settings.local.json` is excluded so credentials never ship.
4. Both MCPs appear when running `/mcp` in a new Claude Code session in this project.
5. Smoke: Claude can run a simple `SHOW TABLES` query against the local MySQL database via the MCP tool.

## Edge Cases / Open Questions
- Railway MCP package name — verify it's `@railway/mcp-server` or the correct npm package before installing.
- MySQL MCP — use `mcp-server-mysql` (community) or check for an official one. Needs `mysql2` or similar driver.
- Credentials in `settings.local.json` should reference env vars, not hardcoded strings, if possible.

## Time Estimate
`1-3hr`

## Label
`[code]`
