#!/bin/bash
# Tests /api/auth/* endpoints.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auth.sh" || exit 1
source "$SCRIPT_DIR/lib/helpers.sh"

PASS=0; FAIL=0

run_curl "GET /api/auth/testuser" GET /api/auth/testuser
run_curl "POST /api/auth/refresh" POST /api/auth/refresh

echo "---"
echo "Auth tests: $PASS passed, $FAIL failed"
exit $FAIL
