#!/bin/bash
# Tests /api/user/* and /api/user/pin/* endpoints (read-only).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auth.sh" || exit 1
source "$SCRIPT_DIR/lib/helpers.sh"

PASS=0; FAIL=0

run_curl "GET /api/user/progress" GET /api/user/progress
run_curl "GET /api/user/sessions" GET /api/user/sessions
run_curl "GET /api/user/pin/status" GET /api/user/pin/status
run_curl "GET /api/user/pin/lockout-status" GET /api/user/pin/lockout-status

echo "---"
echo "User tests: $PASS passed, $FAIL failed"
exit $FAIL
