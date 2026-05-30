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

# FRED-123 — KYC editing
run_curl "GET /api/alpaca/account/kyc"   GET /api/alpaca/account/kyc
# Note: PATCH /api/alpaca/account/kyc is omitted here to avoid mutating Alpaca data during smoke tests.
# Verify manually when needed:
#   run_curl "PATCH /api/alpaca/account/kyc" PATCH /api/alpaca/account/kyc '{"phoneNumber":"+15551234567"}'

echo "---"
echo "Alpaca tests: $PASS passed, $FAIL failed"
exit $FAIL
