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
