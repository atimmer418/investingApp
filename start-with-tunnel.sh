#!/bin/bash

echo "🚀 Starting Fredvested with Cloudflare Tunnel..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if services are running
if lsof -Pi :8100 -sTCP:LISTEN -t >/dev/null; then
    echo -e "${GREEN}✓ Frontend is running on port 8100${NC}"
else
    echo -e "${RED}✗ Frontend is not running on port 8100${NC}"
    echo -e "${YELLOW}Start with: ${NC}cd frontend && npm run servlocal"
    exit 1
fi

if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null; then
    echo -e "${GREEN}✓ Backend is running on port 8080${NC}"
else
    echo -e "${YELLOW}⚠️  Backend is not running on port 8080${NC}"
    echo -e "${YELLOW}Start with: ${NC}cd backend && ./gradlew bootRun"
fi

# Stop nginx since tunnel connects directly to services
if pgrep nginx > /dev/null; then
    echo -e "${YELLOW}Stopping nginx (not needed with tunnel)...${NC}"
    sudo nginx -s stop 2>/dev/null || sudo pkill nginx 2>/dev/null || true
fi

# Check if tunnel is running
if pgrep cloudflared > /dev/null; then
    echo -e "${GREEN}✓ Cloudflare tunnel is already running${NC}"
else
    echo -e "${BLUE}Starting Cloudflare tunnel...${NC}"
    cloudflared tunnel run fredvested-local &
    sleep 3
    
    if pgrep cloudflared > /dev/null; then
        echo -e "${GREEN}✓ Tunnel started successfully${NC}"
    else
        echo -e "${RED}✗ Failed to start tunnel${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}🌐 Your app is available at: ${NC}${BLUE}https://local.fredvested.com${NC}"
echo ""
echo -e "${YELLOW}Tunnel Configuration:${NC}"
echo "  • Frontend (/)      → localhost:8100"
echo "  • Backend (/api/*)  → localhost:8080"
echo ""
echo -e "${YELLOW}Benefits of Cloudflare Tunnel:${NC}"
echo "✅ Works regardless of IP changes"
echo "✅ No port forwarding needed"
echo "✅ Automatic SSL/HTTPS"
echo "✅ Bypasses ISP restrictions"
echo "✅ Better security"
echo ""
echo -e "${BLUE}To stop tunnel: ${NC}pkill cloudflared"
