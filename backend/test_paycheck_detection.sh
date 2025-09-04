#!/bin/bash

# Paycheck Detection Testing Script
# Make sure the backend is running on api-dev.fredvested.com before running this script

BASE_URL="https://api-dev.fredvested.com"

echo "=== Paycheck Detection Testing Script ==="
echo ""

# Step 1: Authenticate as a user to get JWT token
echo "Step 1: Authenticating as a test user..."
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/dev/authenticate-as-user" \
  -H "Content-Type: application/json" \
  -d '{"email": "lockedin@yahoo.com"}')

echo "Auth Response: $AUTH_RESPONSE"

# Extract JWT token (you might need to adjust this based on your response format)
JWT_TOKEN=$(echo $AUTH_RESPONSE | grep -o '"jwtToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JWT_TOKEN" ]; then
    echo "❌ Failed to get JWT token. Make sure the user exists and backend is running."
    exit 1
fi

echo "✅ JWT Token obtained: ${JWT_TOKEN:0:20}..."
echo ""

# Step 2: Check current paycheck detection status
echo "Step 2: Checking current paycheck detection status..."
STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/paycheck/status" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "Status Response: $STATUS_RESPONSE"
echo ""

# Step 3: Trigger manual paycheck detection
echo "Step 3: Triggering manual paycheck detection..."
DETECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/paycheck/detect" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "Detection Response: $DETECT_RESPONSE"
echo ""

# Step 4: Check status again after detection
echo "Step 4: Checking status after detection..."
FINAL_STATUS=$(curl -s -X GET "$BASE_URL/api/paycheck/status" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "Final Status: $FINAL_STATUS"
echo ""

echo "=== Test Complete ==="
echo ""
echo "What to look for:"
echo "- lastDetectionAttempt should be updated after step 3"
echo "- paycheckDetected might be true if Plaid data is ready and matches"
echo "- webhookConfigured should be true if paycheck was detected"
echo ""
echo "If no paychecks are detected:"
echo "- Check that user has paycheck configurations in the database"
echo "- Ensure Plaid account is linked and has transaction history"
echo "- Wait for Plaid recurring transactions to be ready (can take time)"
