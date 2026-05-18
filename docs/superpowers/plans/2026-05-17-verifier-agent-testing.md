# Verifier Agent — Full-Stack Testing Capability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the verifier agent to independently discover what changed via `git diff`, run live API integration tests via curl, and take browser screenshots for UI verification — plus fix dead-code memory instructions in both agent files.

**Architecture:** Three parallel changes: (1) Rewrite both agent files — update verifier tool list, rewrite its 3-phase prompt, remove `memory: project` and dead "Save to memory" lines from both. (2) Create `/test/api/` shell script suite — shared auth library, shared curl helper, and one domain script per backend API group. (3) Update `.gitignore` for runtime artifacts. The verifier picks domain scripts based on `git diff` output and appends curl calls for any new endpoints it discovers.

**Tech Stack:** Bash, curl, python3 (for JSON parsing, already on macOS), Claude Code agent frontmatter.

---

**File Map:**

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `.claude/agents/verifier-agent.md` | New tool list + full 3-phase prompt |
| Modify | `.claude/agents/builder-agent.md` | Remove `memory: project`, fix last line |
| Create | `test/api/lib/auth.sh` | JWT acquisition — exports `$TOKEN`, `$BASE_URL` |
| Create | `test/api/lib/helpers.sh` | `run_curl` helper — shared by all domain scripts |
| Create | `test/api/config.example.sh` | Committed config template |
| Create | `test/api/auth.sh` | Tests `/api/auth/*` |
| Create | `test/api/user.sh` | Tests `/api/user/*`, `/api/user/pin/*` |
| Create | `test/api/portfolio.sh` | Tests `/api/portfolio/*` |
| Create | `test/api/investments.sh` | Tests `/api/investments/*`, `/api/investment-schedule/*` |
| Create | `test/api/alpaca.sh` | Tests `/api/alpaca/*` (includes KYC reads) |
| Create | `test/api/trading.sh` | Tests `/api/trading/*` |
| Create | `test/api/beneficiaries.sh` | Tests `/api/beneficiaries/*` |
| Create | `test/api/run-all.sh` | Runs every domain script, aggregates results |
| Modify | `.gitignore` | Exclude `test/api/config.local.sh`, `test/screenshots/` |

---

### Task 1: Fix both agent files

**Files:**
- Modify: `.claude/agents/verifier-agent.md`
- Modify: `.claude/agents/builder-agent.md`

- [ ] **Step 1: Rewrite verifier-agent.md**

Replace the entire file with:

```markdown
---
name: verifier-agent
description: "Use after the builder-agent completes any non-trivial implementation. Reviews code changes for correctness, safety, and consistency with FRED conventions. Always invoke after auth-related or database changes."
tools: Glob, Grep, Read, WebFetch, WebSearch, Bash, Write, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__get_page_text, mcp__claude-in-chrome__read_console_messages, mcp__claude-in-chrome__find, mcp__computer-use__screenshot
model: opus
color: red
---

You are the Verifier Agent for FRED. Review code changes made by the
builder-agent across three phases: static review, API integration, and
UI verification. Do not implement fixes to source code — report issues only.
Write is permitted only within /test/ (adding curl calls to domain scripts,
saving screenshots). Never write to /backend/ or /frontend/.

--- Phase 1: Static Review ---
Start by running:
  git diff --name-only HEAD
  git diff HEAD
to independently determine what changed. Then read those files and check:
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
1. Check that test/api/config.local.sh exists. If missing, skip this phase
   and note it in output.
2. Run: bash test/api/lib/auth.sh (sources config.local.sh, exports $TOKEN)
3. For each backend domain touched by the diff, run the corresponding script:
     bash test/api/user.sh         ← /api/user/*, /api/user/pin/*
     bash test/api/portfolio.sh    ← /api/portfolio/*
     bash test/api/investments.sh  ← /api/investments/*, /api/investment-schedule/*
     bash test/api/alpaca.sh       ← /api/alpaca/*
     bash test/api/trading.sh      ← /api/trading/*
     bash test/api/beneficiaries.sh ← /api/beneficiaries/*
     bash test/api/auth.sh         ← /api/auth/*
4. For any new endpoint present in the diff that is NOT already in the
   domain script, append a run_curl call to that script before running it.
5. Cross-check: read the Angular service file(s) that call the changed
   endpoint(s) and confirm URL, HTTP method, and request/response shape
   match the backend controller.

--- Phase 3: UI Verification ---
Prerequisites: local.fredvested.com reachable, backend on localhost:8080.
Skip this phase (note it) if local.fredvested.com is unreachable.

1. Open a browser tab to local.fredvested.com
2. Determine the affected route by reading navigateByUrl calls and @NgModule
   route declarations in the changed component files from the diff.
3. Navigate to that route.
4. If authentication is required to reach the page, inject $TOKEN into
   localStorage using javascript_tool:
     localStorage.setItem('jwt_token', '<TOKEN>');
     localStorage.setItem('jwt_token_refresh', '<TOKEN>');
   Then reload the page.
5. Take a screenshot using mcp__computer-use__screenshot.
   Save the file path in your output as: test/screenshots/<timestamp>-<page>.png
6. Read page text and DOM — confirm API data surfaces correctly
   (expected fields present, not empty/loading-spinner-stuck).
7. Read console messages — any JS error is a flag.

--- Output Format ---
APPROVED / REVISION REQUIRED

Static Review:
  [summary of changed files reviewed and result]

Test Results:
  Phase 2 — API:
    [per endpoint: METHOD /path → HTTP <status>]
    [full response body]
  Phase 3 — UI:
    Screenshot: [file path or "skipped — reason"]
    Console errors: [none / list]
    Data present: [yes/no — what was checked]

Reasoning:
  [Explicit explanation of why this passes or what failed.
   APPROVED: state why each phase passed.
   REVISION REQUIRED: numbered list of specific issues with file:line.]

Report any newly discovered FRED-specific conventions, patterns, or
recurring builder-agent mistakes back to the orchestrator so they can
be recorded.
```

- [ ] **Step 2: Update builder-agent.md**

Two changes only — do not touch anything else:

1. Remove the line `memory: project` from the frontmatter block.

2. Replace the last line of the file:
   - OLD: `Save to memory: key file locations, patterns, utilities, and conventions discovered during implementation that aren't already in CLAUDE.md.`
   - NEW: `Report any newly discovered FRED-specific conventions, patterns, or key file locations back to the orchestrator so they can be recorded.`

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/verifier-agent.md .claude/agents/builder-agent.md
git commit -m "fix: upgrade verifier agent to 3-phase review; remove dead memory instructions from both agents"
```

---

### Task 2: Test directory scaffolding

**Files:**
- Create: `test/api/lib/auth.sh`
- Create: `test/api/lib/helpers.sh`
- Create: `test/api/config.example.sh`
- Modify: `.gitignore`

- [ ] **Step 1: Add entries to .gitignore**

Append to the end of the root `.gitignore`:

```
# Test infrastructure — runtime files, never commit
test/api/config.local.sh
test/screenshots/
```

- [ ] **Step 2: Create config.example.sh**

Create `test/api/config.example.sh`:

```bash
#!/bin/bash
# Copy this file to config.local.sh and fill in your values.
# config.local.sh is gitignored — never commit it.

export TEST_USER_EMAIL="your-test-email@fredvested.com"
export BASE_URL="http://localhost:8080"
```

- [ ] **Step 3: Create lib/auth.sh**

Create `test/api/lib/auth.sh`:

```bash
#!/bin/bash
# Sources config.local.sh, authenticates via /api/dev/authenticate-as-user,
# and exports $TOKEN and $BASE_URL for use by domain test scripts.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../config.local.sh"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "ERROR: $CONFIG_FILE not found."
  echo "Run: cp test/api/config.example.sh test/api/config.local.sh"
  echo "Then set TEST_USER_EMAIL in config.local.sh"
  exit 1
fi

source "$CONFIG_FILE"

if [ -z "$TEST_USER_EMAIL" ]; then
  echo "ERROR: TEST_USER_EMAIL is not set in config.local.sh"
  exit 1
fi

BASE_URL="${BASE_URL:-http://localhost:8080}"

RESPONSE=$(curl -s -X POST "$BASE_URL/api/dev/authenticate-as-user" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_USER_EMAIL\"}")

TOKEN=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('jwtToken',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to acquire JWT token."
  echo "Response: $RESPONSE"
  echo "Is the backend running at $BASE_URL?"
  exit 1
fi

export TOKEN
export BASE_URL
```

- [ ] **Step 4: Create lib/helpers.sh**

Create `test/api/lib/helpers.sh`:

```bash
#!/bin/bash
# Shared curl helper for domain test scripts.
# Requires $TOKEN and $BASE_URL (exported by lib/auth.sh).
# Requires $PASS and $FAIL to be declared as integers in the calling script.
#
# Usage:
#   run_curl "label" METHOD /api/path [optional-json-body]
#
# Prints [PASS] or [FAIL] with HTTP status and full response body.
# Increments $PASS or $FAIL in the calling scope.

run_curl() {
  local label="$1" method="$2" path="$3" body="${4:-}"
  local tmpfile
  tmpfile=$(mktemp)

  local curl_args=(-s -o "$tmpfile" -w "%{http_code}"
    -X "$method"
    "$BASE_URL$path"
    -H "Authorization: Bearer $TOKEN"
    -H "Content-Type: application/json")

  [ -n "$body" ] && curl_args+=(-d "$body")

  local status
  status=$(curl "${curl_args[@]}")
  local resp
  resp=$(cat "$tmpfile")
  rm -f "$tmpfile"

  if [[ "$status" == 2* ]]; then
    echo "[PASS] $label → HTTP $status"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $label → HTTP $status"
    FAIL=$((FAIL + 1))
  fi
  echo "Response: $resp"
  echo ""
}
```

- [ ] **Step 5: Make scripts executable**

```bash
chmod +x test/api/lib/auth.sh test/api/lib/helpers.sh test/api/config.example.sh
```

- [ ] **Step 6: Create config.local.sh and verify auth works**

```bash
cp test/api/config.example.sh test/api/config.local.sh
```

Open `test/api/config.local.sh` and set `TEST_USER_EMAIL=andrew@fredvested.com`.

Then verify:
```bash
source test/api/lib/auth.sh && echo "OK — token starts with: ${TOKEN:0:20}"
```

Expected output: `OK — token starts with: eyJ...` (first 20 chars of a JWT).

If you see `ERROR: Failed to acquire JWT token` — the backend is not running. Start it with `./gradlew bootRun` with `SPRING_PROFILES_ACTIVE=local` before continuing.

- [ ] **Step 7: Commit**

```bash
git add test/api/lib/auth.sh test/api/lib/helpers.sh test/api/config.example.sh .gitignore
git commit -m "feat: add test/api directory with shared auth library, curl helper, and config template"
```

---

### Task 3: Auth and User domain scripts

**Files:**
- Create: `test/api/auth.sh`
- Create: `test/api/user.sh`

- [ ] **Step 1: Create auth.sh**

Create `test/api/auth.sh`:

```bash
#!/bin/bash
# Tests /api/auth/* endpoints.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auth.sh" || exit 1
source "$SCRIPT_DIR/lib/helpers.sh"

PASS=0; FAIL=0

# Verify the authenticated user endpoint returns a valid response
run_curl "GET /api/auth/testuser" GET /api/auth/testuser

# Refresh the token — expects a new jwtToken in response
run_curl "POST /api/auth/refresh" POST /api/auth/refresh

echo "---"
echo "Auth tests: $PASS passed, $FAIL failed"
exit $FAIL
```

- [ ] **Step 2: Create user.sh**

Create `test/api/user.sh`:

```bash
#!/bin/bash
# Tests /api/user/* and /api/user/pin/* endpoints (read-only).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auth.sh" || exit 1
source "$SCRIPT_DIR/lib/helpers.sh"

PASS=0; FAIL=0

# Onboarding progress
run_curl "GET /api/user/progress" GET /api/user/progress

# Active sessions
run_curl "GET /api/user/sessions" GET /api/user/sessions

# PIN status (boolean — is PIN set?)
run_curl "GET /api/user/pin/status" GET /api/user/pin/status

# PIN lockout status
run_curl "GET /api/user/pin/lockout-status" GET /api/user/pin/lockout-status

echo "---"
echo "User tests: $PASS passed, $FAIL failed"
exit $FAIL
```

- [ ] **Step 3: Run both scripts**

```bash
chmod +x test/api/auth.sh test/api/user.sh
bash test/api/auth.sh
bash test/api/user.sh
```

Expected: All `[PASS]` with 2xx status codes and JSON response bodies.

- [ ] **Step 4: Commit**

```bash
git add test/api/auth.sh test/api/user.sh
git commit -m "feat: add auth and user API test scripts"
```

---

### Task 4: Portfolio and Investments domain scripts

**Files:**
- Create: `test/api/portfolio.sh`
- Create: `test/api/investments.sh`

- [ ] **Step 1: Create portfolio.sh**

Create `test/api/portfolio.sh`:

```bash
#!/bin/bash
# Tests /api/portfolio/* endpoints (read-only).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auth.sh" || exit 1
source "$SCRIPT_DIR/lib/helpers.sh"

PASS=0; FAIL=0

run_curl "GET /api/portfolio/current"           GET /api/portfolio/current
run_curl "GET /api/portfolio/dashboard"         GET /api/portfolio/dashboard
run_curl "GET /api/portfolio/history?period=1M" GET "/api/portfolio/history?period=1M"
run_curl "GET /api/portfolio/positions"         GET /api/portfolio/positions
run_curl "GET /api/portfolio/performance"       GET /api/portfolio/performance

echo "---"
echo "Portfolio tests: $PASS passed, $FAIL failed"
exit $FAIL
```

- [ ] **Step 2: Create investments.sh**

Create `test/api/investments.sh`:

```bash
#!/bin/bash
# Tests /api/investments/* and /api/investment-schedule/* endpoints (read-only).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auth.sh" || exit 1
source "$SCRIPT_DIR/lib/helpers.sh"

PASS=0; FAIL=0

# Investments
run_curl "GET /api/investments/dashboard" GET /api/investments/dashboard
run_curl "GET /api/investments/history"   GET /api/investments/history

# Investment schedule
run_curl "GET /api/investment-schedule/current" GET /api/investment-schedule/current
run_curl "GET /api/investment-schedule/all"     GET /api/investment-schedule/all

echo "---"
echo "Investments tests: $PASS passed, $FAIL failed"
exit $FAIL
```

- [ ] **Step 3: Run both scripts**

```bash
chmod +x test/api/portfolio.sh test/api/investments.sh
bash test/api/portfolio.sh
bash test/api/investments.sh
```

Expected: All `[PASS]` with 2xx status codes.

- [ ] **Step 4: Commit**

```bash
git add test/api/portfolio.sh test/api/investments.sh
git commit -m "feat: add portfolio and investments API test scripts"
```

---

### Task 5: Alpaca, Trading, and Beneficiaries domain scripts

**Files:**
- Create: `test/api/alpaca.sh`
- Create: `test/api/trading.sh`
- Create: `test/api/beneficiaries.sh`

- [ ] **Step 1: Create alpaca.sh**

Create `test/api/alpaca.sh`:

```bash
#!/bin/bash
# Tests /api/alpaca/* endpoints (read-only — covers KYC status reads).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auth.sh" || exit 1
source "$SCRIPT_DIR/lib/helpers.sh"

PASS=0; FAIL=0

run_curl "GET /api/alpaca/account"            GET /api/alpaca/account
run_curl "GET /api/alpaca/my-account-status"  GET /api/alpaca/my-account-status
run_curl "GET /api/alpaca/assets?status=active&asset_class=us_equity" \
         GET "/api/alpaca/assets?status=active&asset_class=us_equity"

echo "---"
echo "Alpaca tests: $PASS passed, $FAIL failed"
exit $FAIL
```

- [ ] **Step 2: Create trading.sh**

Create `test/api/trading.sh`:

```bash
#!/bin/bash
# Tests /api/trading/* endpoints (read-only).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auth.sh" || exit 1
source "$SCRIPT_DIR/lib/helpers.sh"

PASS=0; FAIL=0

run_curl "GET /api/trading/positions"       GET /api/trading/positions
run_curl "GET /api/trading/account/balance" GET /api/trading/account/balance

echo "---"
echo "Trading tests: $PASS passed, $FAIL failed"
exit $FAIL
```

- [ ] **Step 3: Create beneficiaries.sh**

Create `test/api/beneficiaries.sh`:

```bash
#!/bin/bash
# Tests /api/beneficiaries/* endpoints (read-only).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auth.sh" || exit 1
source "$SCRIPT_DIR/lib/helpers.sh"

PASS=0; FAIL=0

run_curl "GET /api/beneficiaries"           GET /api/beneficiaries
run_curl "GET /api/beneficiaries/active"    GET /api/beneficiaries/active
run_curl "GET /api/beneficiaries/summary"   GET /api/beneficiaries/summary
run_curl "GET /api/beneficiaries/primary"   GET /api/beneficiaries/primary
run_curl "GET /api/beneficiaries/contingent" GET /api/beneficiaries/contingent

echo "---"
echo "Beneficiaries tests: $PASS passed, $FAIL failed"
exit $FAIL
```

- [ ] **Step 4: Run all three**

```bash
chmod +x test/api/alpaca.sh test/api/trading.sh test/api/beneficiaries.sh
bash test/api/alpaca.sh
bash test/api/trading.sh
bash test/api/beneficiaries.sh
```

Expected: All `[PASS]` with 2xx status codes.

- [ ] **Step 5: Commit**

```bash
git add test/api/alpaca.sh test/api/trading.sh test/api/beneficiaries.sh
git commit -m "feat: add alpaca, trading, and beneficiaries API test scripts"
```

---

### Task 6: Master runner and final verification

**Files:**
- Create: `test/api/run-all.sh`

- [ ] **Step 1: Create run-all.sh**

Create `test/api/run-all.sh`:

```bash
#!/bin/bash
# Runs every domain test script and reports aggregate pass/fail.
# Usage: bash test/api/run-all.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FAILED_SUITES=()

run_suite() {
  local name="$1" script="$2"
  echo "=============================="
  echo "Suite: $name"
  echo "=============================="
  bash "$SCRIPT_DIR/$script"
  local code=$?
  [ $code -ne 0 ] && FAILED_SUITES+=("$name")
  echo ""
}

run_suite "Auth"           auth.sh
run_suite "User"           user.sh
run_suite "Portfolio"      portfolio.sh
run_suite "Investments"    investments.sh
run_suite "Alpaca"         alpaca.sh
run_suite "Trading"        trading.sh
run_suite "Beneficiaries"  beneficiaries.sh

echo "=============================="
if [ ${#FAILED_SUITES[@]} -eq 0 ]; then
  echo "ALL SUITES PASSED"
else
  echo "FAILED: ${FAILED_SUITES[*]}"
fi
echo "=============================="

[ ${#FAILED_SUITES[@]} -eq 0 ]
```

- [ ] **Step 2: Make executable and run full suite**

```bash
chmod +x test/api/run-all.sh
bash test/api/run-all.sh
```

Expected final output:
```
==============================
ALL SUITES PASSED
==============================
```

If any suite fails, check the backend is running with `SPRING_PROFILES_ACTIVE=local` and the test user email in `config.local.sh` exists in the database.

- [ ] **Step 3: Commit**

```bash
git add test/api/run-all.sh
git commit -m "feat: add run-all master test runner; complete verifier agent testing infrastructure"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|------------|
| Add `Bash`, `Write`, chrome MCP, computer-use screenshot to verifier tools | Task 1 |
| Verifier starts with `git diff` to independently see what changed | Task 1 (prompt) |
| Remove `memory: project` from both agent frontmatters | Task 1 |
| Replace "Save to memory" with report-back instruction in both | Task 1 |
| `test/api/lib/auth.sh` using `/api/dev/authenticate-as-user` | Task 2 |
| `test/api/config.example.sh` committed, `config.local.sh` gitignored | Task 2 |
| `test/screenshots/` gitignored | Task 2 |
| Domain scripts for every API group (auth, user, portfolio, investments, alpaca, trading, beneficiaries) | Tasks 3–5 |
| Verifier appends curl calls for new endpoints before running | Task 1 (prompt) |
| Verifier navigates to `local.fredvested.com`, injects JWT, takes screenshot | Task 1 (prompt) |
| Output includes full response bodies, screenshot path, console errors, explicit reasoning | Task 1 (prompt) |
| `run-all.sh` master runner | Task 6 |

**Placeholder scan:** No TBD, no TODO, no vague instructions. Every shell script contains complete, runnable code.

**Type consistency:** `run_curl` signature (`label method path [body]`) is defined once in `lib/helpers.sh` and called identically across all domain scripts. `$TOKEN` and `$BASE_URL` are sourced from `lib/auth.sh` in every script. `$PASS` and `$FAIL` are initialized to `0` at the top of each domain script and incremented inside `run_curl` via the calling scope.
