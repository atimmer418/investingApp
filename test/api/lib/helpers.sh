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
