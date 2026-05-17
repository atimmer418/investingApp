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
