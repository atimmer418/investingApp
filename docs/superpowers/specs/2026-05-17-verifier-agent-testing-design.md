# Verifier Agent — Full-Stack Testing Capability

**Date:** 2026-05-17  
**Status:** Approved

---

## Overview

Extend the verifier agent from static code review into a three-phase reviewer that runs live API integration tests and browser UI verification. The verifier becomes the single agent responsible for confirming that a builder change is correct at every layer: code, API, and rendered UI.

---

## What Changes

### 1. Verifier Agent Tool List

**Before:** `Glob, Grep, Read, WebFetch, WebSearch`

**After:** `Glob, Grep, Read, WebFetch, WebSearch, Bash, Write, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__get_page_text, mcp__claude-in-chrome__read_console_messages, mcp__claude-in-chrome__find, mcp__computer-use__screenshot`

- `Bash` — runs git diff, curl API tests, ng test if needed
- `Write` — scoped to `/test/` only; writes curl tests for new endpoints and saves screenshots
- Chrome MCP subset — navigates to pages, reads DOM, checks console
- `mcp__computer-use__screenshot` — captures browser state as visual evidence

### 2. Builder Agent — Dead Code Fix

Remove `memory: project` from frontmatter. Replace "Save to memory" instruction with: report discovered conventions back to the orchestrator.

### 3. Verifier Agent — Dead Code Fix

Same as builder: remove `memory: project` from frontmatter, replace "Save to memory" with report-back instruction.

### 4. Test Script Infrastructure

New `/test/` directory at repo root:

```
test/
  api/
    lib/
      auth.sh            # sources config.local.sh, calls /api/dev/authenticate-as-user, exports $TOKEN
    auth.sh              # tests /api/auth/* endpoints
    user.sh              # tests /api/user/* endpoints
    portfolio.sh         # tests /api/portfolio/* endpoints
    survey.sh            # tests /api/survey/* endpoints
    kyc.sh               # tests /api/kyc/* endpoints
    run-all.sh           # runs all scripts, aggregates output
    config.example.sh    # committed; shows TEST_USER_EMAIL format
    config.local.sh      # gitignored; user sets TEST_USER_EMAIL here
  screenshots/           # gitignored; runtime output from verifier
```

Each domain script:
- Sources `lib/auth.sh` to get `$TOKEN`
- Fires `curl -i` calls for each endpoint in the domain
- Prints status code + full response body per call
- Clearly marks pass (2xx) vs fail

`.gitignore` additions: `test/api/config.local.sh`, `test/screenshots/`

---

## Verifier Agent — Three-Phase Review Flow

### Phase 1: Static Review (existing, unchanged)

1. Run `git diff --name-only HEAD` and `git diff HEAD` to independently determine what changed
2. Read changed files
3. Check correctness, conventions, hard rules, minimalism
4. Flag immediately if any hard rule is violated (auth/JWT touched without instruction, endpoints invented without checking API_ENDPOINTS.md, schema changed, localStorage accessed directly)

### Phase 2: API Integration Tests

1. Source `test/api/config.local.sh` — if missing, skip Phase 2 and note it
2. Run `lib/auth.sh` to get `$TOKEN` via `POST localhost:8080/api/dev/authenticate-as-user`
3. For each backend domain touched by the diff, run the corresponding domain script
4. For any new endpoint in the diff that is not yet in the domain script, add a curl call for it to that script (Write to `/test/api/<domain>.sh` only)
5. Static cross-check: read the Angular service file(s) that call the changed endpoint(s) and confirm URL, HTTP method, and request/response shape match the backend controller

Phase 2 output per endpoint:
```
[PASS/FAIL] METHOD /api/path → HTTP <status>
Response: <full body>
```

### Phase 3: UI Verification

Prerequisites: `local.fredvested.com` must be reachable and the backend must be running on `localhost:8080`. If either is unreachable, skip Phase 3 and note it.

1. Open a browser tab to `local.fredvested.com`
2. Navigate to the page(s) affected by the change (determine the route by reading `navigateByUrl` calls and `@NgModule` route declarations in the changed component files)
3. Take a screenshot with `mcp__computer-use__screenshot`, save to `test/screenshots/<timestamp>-<page-name>.png`
4. Read page text and DOM to confirm API data surfaces correctly (expected fields are present and non-empty)
5. Read browser console for JS errors — any error is a flag
6. If authentication is required to reach the page, use the JWT from Phase 2 injected via `localStorage` through `javascript_tool`

Phase 3 output:
```
Screenshot: test/screenshots/<filename>
Console errors: none / <list>
Data present: yes / no — <what was checked>
```

---

## Output Format

```
APPROVED / REVISION REQUIRED

Static Review:
  [summary of what was checked and result]

Test Results:
  Phase 2 — API:
    [per-endpoint: method, path, status, full response body]
  Phase 3 — UI:
    Screenshot: test/screenshots/<filename>
    Console errors: <none or list>
    Data present: <yes/no and what was checked>

Reasoning:
  [Explicit explanation of why this passes or what specifically failed.
   If APPROVED: why each phase passed. If REVISION REQUIRED: numbered
   list of specific issues with file and line where relevant.]
```

---

## Agent Prompt Changes

### verifier-agent.md (full replacement)

```
You are the Verifier Agent for FRED. Review code changes made by the
builder-agent across three phases: static review, API integration, and
UI verification. Do not implement fixes to source code — report issues only.
Write is permitted only within /test/ (adding curl tests, saving screenshots).

--- Phase 1: Static Review ---
Start by running `git diff --name-only HEAD` and `git diff HEAD` to
independently determine what changed. Then read those files and check:
- Correctness: does it do what was asked?
- Safety: no broken existing functionality or side effects?
- Edge cases: nulls, empty inputs, API errors handled?
- Consistency: follows existing Spring Boot / Angular + Ionic patterns?
- Minimalism: only necessary files touched?

Hard Rules — flag immediately if violated:
- Auth/JWT logic modified without explicit instruction
- New API endpoints invented without checking FREDdocs/API_ENDPOINTS.md
- Database schema changed without flagging to user
- JWT localStorage keys read/written directly instead of JwtTokenUtils

--- Phase 2: API Integration ---
1. Source test/api/config.local.sh for TEST_USER_EMAIL. If missing, skip
   this phase and note it in output.
2. Run lib/auth.sh to get $TOKEN via POST localhost:8080/api/dev/authenticate-as-user.
3. Run the domain script(s) for each backend domain touched by the diff.
4. For any new endpoint in the diff not yet in the domain script, add a
   curl call to the script before running it.
5. Cross-check: read Angular service files that call the changed endpoints
   and confirm URL, method, and shape match the backend controller.

--- Phase 3: UI Verification ---
1. Open local.fredvested.com in a browser tab.
2. Navigate to the page(s) affected by the change.
3. Take a screenshot, save to test/screenshots/<timestamp>-<page>.png.
4. Read page text and DOM — confirm API data surfaces correctly.
5. Read console — any JS error is a flag.
6. If auth is required, inject $TOKEN into localStorage via javascript_tool.
Skip this phase (and note it) if local.fredvested.com is unreachable.

--- Output ---
APPROVED / REVISION REQUIRED
Static Review: [summary]
Test Results:
  Phase 2 — API: [per endpoint: method, path, status, full response body]
  Phase 3 — UI: [screenshot path, console errors, data present]
Reasoning: [explicit why this passes or numbered issues if failing]

Report any newly discovered FRED-specific conventions, patterns, or
recurring builder-agent mistakes back to the orchestrator so they can
be recorded.
```

### builder-agent.md (two-line change)

- Remove `memory: project` from frontmatter
- Replace "Save to memory: ..." with: "Report any newly discovered FRED-specific conventions, patterns, or key file locations back to the orchestrator so they can be recorded."

---

## Constraints and Boundaries

- Verifier never writes to `/backend/` or `/frontend/` — source code is off limits
- `Write` is permitted only in `/test/api/` (adding curl calls) and `test/screenshots/` (saving screenshots)
- Bash is used for: `git diff`, `git status`, `curl`, `bash test/api/*.sh` — not for general shell operations
- If `config.local.sh` is missing, Phase 2 is skipped gracefully — the verifier notes it and continues to Phase 3
- If `local.fredvested.com` is unreachable, Phase 3 is skipped gracefully

---

## One-Time Setup (User)

```bash
cp test/api/config.example.sh test/api/config.local.sh
# Edit config.local.sh and set TEST_USER_EMAIL=your@email.com
```

This only needs to be done once per machine.
