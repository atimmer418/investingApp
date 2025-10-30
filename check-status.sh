#!/bin/bash

# Quick IP checker script
echo "🌐 Current Network Information:"
echo "================================"

# Get current public IP
CURRENT_IP=$(curl -4 -s ifconfig.me)
echo "📍 Public IP: $CURRENT_IP"

# Check if IP has changed
STORED_IP_FILE="/tmp/fredvested_current_ip"
if [ -f "$STORED_IP_FILE" ]; then
    STORED_IP=$(cat "$STORED_IP_FILE")
    if [ "$CURRENT_IP" != "$STORED_IP" ]; then
        echo "⚠️  IP CHANGED from $STORED_IP to $CURRENT_IP"
        echo "🔄 DNS update required!"
        echo ""
        echo "Update your DNS A record:"
        echo "  Type: A"
        echo "  Name: local"
        echo "  Target: $CURRENT_IP"
        echo "  TTL: 300"
    else
        echo "✅ IP unchanged since last check"
    fi
else
    echo "📝 First time checking IP"
fi

# Store current IP
echo "$CURRENT_IP" > "$STORED_IP_FILE"

echo ""
echo "🔧 Tunnel Status:"
if pgrep cloudflared > /dev/null; then
    echo "✅ Cloudflare tunnel is running"
    echo "📊 Tunnel connections:"
    cloudflared tunnel info fredvested-local 2>/dev/null | grep -E "(Connections|Status)" || echo "   Use 'cloudflared tunnel list' for details"
else
    echo "❌ Cloudflare tunnel is not running"
fi

echo ""
echo "🖥️  Service Status:"
if lsof -Pi :8100 -sTCP:LISTEN -t >/dev/null; then
    echo "✅ Frontend (port 8100): Running"
else
    echo "❌ Frontend (port 8100): Not running"
fi

if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null; then
    echo "✅ Backend (port 8080): Running"
else
    echo "❌ Backend (port 8080): Not running"
fi

echo ""
echo "🌍 Test URLs:"
echo "  Frontend: http://localhost:8100"
echo "  Backend:  http://localhost:8080"
echo "  Domain:   https://local.fredvested.com"
