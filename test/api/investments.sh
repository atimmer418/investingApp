#!/bin/bash
# Tests /api/investments/* and /api/investment-schedule/* endpoints (read-only).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auth.sh" || exit 1
source "$SCRIPT_DIR/lib/helpers.sh"

PASS=0; FAIL=0

run_curl "GET /api/investments/dashboard" GET /api/investments/dashboard
run_curl "GET /api/investments/history"   GET /api/investments/history
run_curl "GET /api/investment-schedule/current" GET /api/investment-schedule/current
run_curl "GET /api/investment-schedule/all"     GET /api/investment-schedule/all

echo "---"
echo "Investments tests: $PASS passed, $FAIL failed"
exit $FAIL
