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
#   `servlocal` is a shell alias for the command below — run either one.
cd frontend && ng serve --configuration=local

# Terminal 3: Start the Cloudflare tunnel (reads ~/.cloudflared/config.yml)
cloudflared tunnel run fredvested-local
```

### Check Status
```bash
cloudflared tunnel info fredvested-local
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

---

## Dev cache / blank-screen (NG0200) troubleshooting

### Symptom
The iOS app (or a browser) loads `https://local.fredvested.com` to an **all-blank white screen**, and
the console shows:

```
NG0200: Circular dependency in DI detected for _StandaloneService
```

The router renders no route (the `ion-router-outlet` stays empty). Classic tell: it happens on the
**iPhone only while the laptop works fine**, and it can persist for hours.

### Root cause
This is **not** an app code bug — it is a **stale client cache**. In dev, the Angular entry files are
**non-content-hashed** (`main.js`, `polyfills.js`). Cloudflare was applying its default **Browser
Cache TTL of 4 hours** (`Cache-Control: max-age=14400`) to those files, while `index.html` stays
`no-cache`. When a mid-session Vite re-optimization changes `main.js`'s *contents* (the URL is
unchanged), the iOS WKWebView keeps serving its **4-hour-cached old `main.js`** next to the fresh
`index.html` — loading two mismatched copies of Angular, which trips `_StandaloneService` and blanks
the screen. (The error names Angular's *internal* service, not a FRED service — the signature of a
duplicated runtime, i.e. a cache problem, not a DI bug.)

### Recovery (get unstuck right now)
Attach Safari **Web Inspector** to the device webview (Safari → Develop → [device] →
`local.fredvested.com`), open the **Network** tab, tick **Disable Cache**, then reload. The webview
re-fetches a fresh, consistent bundle and routes normally.

### Prevention — Cloudflare cache hardening (one-time)
Scope **every** rule below to **hostname `local.fredvested.com` only** so production
(`today.fredvested.com`, future app domains on this zone) keeps normal caching.

1. **Purge** the currently-cached assets: Caching → Configuration → Purge Cache → **Custom Purge** →
   Hostname `local.fredvested.com` (or **Purge Everything**).
2. **Cache Rule** (Caching → Cache Rules → **Create rule**): if `Hostname equals
   local.fredvested.com` → **Bypass cache**. Stops the edge from caching dev assets.
3. **Response Header Transform Rule** (Rules → Transform Rules → Modify Response Header →
   **Create rule**): if `Hostname equals local.fredvested.com` → **Set static**
   `Cache-Control: no-store`. Overrides the 4-hour browser TTL so the device never stores dev assets.

Verify:
```bash
curl -sSI https://local.fredvested.com/main.js   # expect: cache-control: no-store, cf-cache-status: DYNAMIC/BYPASS
curl -sSI https://today.fredvested.com/          # prod unaffected (normal caching headers)
```

> Note: these persist (unlike Caching → Configuration → **Development Mode**, which bypasses cache for
> only 3 hours). The first request after a `git pull` that adds a new dependency still triggers a Vite
> re-optimization — restarting `ng serve` before reconnecting the phone avoids serving a half-rebuilt
> bundle.

---

## Cloudflare Pages — today.fredvested.com

### Overview

Serves the FRED ITPM daily executive dashboard. Auto-deploys from `ITPM/routine/today.html` in the `develop` branch on every push.

The ITPM skill generates and commits a new `today.html` each morning at 9am EST. Cloudflare Pages detects the push via webhook and deploys the update within ~60 seconds.

### One-time Setup (do this once)

**Prerequisites:** FRED repo must be on GitHub. Must be logged into the Cloudflare account that manages `fredvested.com`.

**Step 1 — Create the Pages project:**

1. Go to dash.cloudflare.com → select your account → **Workers & Pages** in the left sidebar
2. Click **Create application** → **Pages** tab → **Connect to Git**
3. Select GitHub → authorize Cloudflare to access the FRED repo (may already be authorized)
4. Select the **FRED** repository, branch **develop**
5. In **Build settings**:
   - Framework preset: **None**
   - Build command: *(leave empty — no build step needed)*
   - Build output directory: **ITPM/routine**
   - Root directory: **/** *(the repo root)*
6. Click **Save and Deploy**
7. Wait for the initial deploy to go green (~60 seconds)

**Step 2 — Add the custom domain:**

1. In the Pages project → **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter: `today.fredvested.com`
4. Cloudflare detects that `fredvested.com` is in this account and auto-creates the DNS CNAME record
5. Click **Activate domain** — SSL is provisioned automatically
6. Wait ~2 minutes for DNS propagation
7. Visit `https://today.fredvested.com` — the ITPM dashboard lock screen should appear

### Configuration Reference

| Setting | Value |
|---|---|
| Cloudflare Pages project | fred-itpm-today (or whatever Cloudflare names it) |
| Repository | FRED / branch: develop |
| Build command | (none) |
| Build output directory | ITPM/routine |
| Custom domain | today.fredvested.com |

### How the Deploy Flow Works

1. ITPM skill runs → generates `ITPM/routine/today.html` → commits → pushes to develop
2. Cloudflare Pages detects push via GitHub webhook
3. Pages copies `ITPM/routine/` contents to its CDN (~60s)
4. `https://today.fredvested.com` serves the updated `today.html`

### Forcing a Redeploy Manually

Go to: Workers & Pages → fred-itpm-today → Deployments → Retry latest deployment

Or push any change to `ITPM/routine/today.html` on the develop branch.

### Troubleshooting

**Dashboard shows old content:** Cloudflare Pages may have cached the old deploy. Go to the Pages project → Deployments and confirm a new deploy is running. Clear the browser cache.

**Deploy not triggering:** Check the Pages project → Settings → Git integration is still connected to the repo. GitHub webhooks must be authorized.

**today.fredvested.com not resolving:** DNS propagation can take up to 5 minutes. Check Cloudflare DNS tab to confirm the CNAME record for `today` exists pointing to the Pages project URL.
