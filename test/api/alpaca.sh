#!/bin/bash
# Tests /api/alpaca/* endpoints (read-only — covers KYC status reads).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/auth.sh" || exit 1
source "$SCRIPT_DIR/lib/helpers.sh"

PASS=0; FAIL=0

run_curl "GET /api/alpaca/account"           GET /api/alpaca/account
run_curl "GET /api/alpaca/my-account-status" GET /api/alpaca/my-account-status
run_curl "GET /api/alpaca/assets?status=active&asset_class=us_equity" \
         GET "/api/alpaca/assets?status=active&asset_class=us_equity"

echo "---"
echo "Alpaca tests: $PASS passed, $FAIL failed"
exit $FAIL
