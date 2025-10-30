# Cloudflare Tunnel Setup for local.fredvested.com

## Overview
Cloudflare Tunnel provides:
- ✅ SSL/TLS certificate (automatic)
- ✅ IP-agnostic routing (works regardless of IP changes)
- ✅ No port forwarding needed
- ✅ Bypasses ISP port blocking
- ✅ Better security and DDoS protection

## Current Setup

### Tunnel Configuration
- **Tunnel ID**: `a682107e-1cd4-4222-b602-5af92fd5d643`
- **Name**: `fredvested-local`
- **Domain**: `local.fredvested.com`

### Routing Rules
```yaml
ingress:
  - hostname: local.fredvested.com
    path: /api/*
    service: http://localhost:8080  # Backend API
  - hostname: local.fredvested.com
    service: http://localhost:8100  # Frontend
  - service: http_status:404        # Catch-all
```

## How It Works

```
User Browser → Cloudflare Edge → Tunnel → Your Local Services
```

1. **User visits**: `https://local.fredvested.com`
2. **Cloudflare receives**: Request at edge locations worldwide
3. **Tunnel forwards**: Request to your local services via outbound connection
4. **Your services respond**: Backend (8080) for `/api/*`, Frontend (8100) for everything else
5. **Response travels back**: Through tunnel → Cloudflare → User (with SSL)

## Usage

### Start Everything
```bash
# Terminal 1: Start backend
cd backend && ./gradlew bootRun

# Terminal 2: Start frontend  
cd frontend && npm run servlocal

# Terminal 3: Start tunnel (or use script)
./start-with-tunnel.sh
```

### Check Status
```bash
./check-status.sh
```

### Stop Tunnel
```bash
pkill cloudflared
```

## Benefits

- **No nginx needed** - Tunnel handles routing directly
- **No public IP management** - Completely IP-agnostic
- **No DNS updates** - Works regardless of IP changes
- **No port forwarding** - Bypasses router/firewall restrictions
- **Automatic HTTPS** - SSL termination at Cloudflare edge
- **Global CDN** - Fast access from anywhere
