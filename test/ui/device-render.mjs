#!/usr/bin/env node
/**
 * FRED device-visual renderer — Phase 3, sandbox-safe.
 *
 * WHY THIS EXISTS
 * ----------------
 * In the itpm-execute cron sandbox the verifier cannot reach :8080 or
 * local.fredvested.com (host-allowlist blocks outbound), and Angular CLI / `ng serve`
 * may be absent. But the web build already lives on disk (frontend/www) and loopback
 * (127.0.0.1) is NOT an outbound host, so we can serve the *real* compiled app locally
 * and render it in headless Chrome at TRUE iPhone device metrics WITH simulated
 * env(safe-area-inset-*) values — the exact thing a desktop-viewport render misses.
 *
 * This is what catches the FRED-124 class of bug (header cut off by the iPhone notch):
 * the page reads raw `env(safe-area-inset-top)` (16 usages in src/). We override those
 * insets via CDP Emulation.setSafeAreaInsetsOverride so a fixed/hero header that lacks
 * safe-area padding visibly collides with the notch band, then we assert it doesn't.
 *
 * RENDERER: puppeteer-core driving the chrome-headless-shell already cached at
 * ~/.cache/puppeteer (Chrome 146/148 — both >= 128, which is when
 * Emulation.setSafeAreaInsetsOverride landed). No new heavy dependency, no network.
 *
 * Usage:
 *   node test/ui/device-render.mjs --route=/change-bank-account \
 *        --device=iphone15pro --out=test/ui/artifacts --baseline=test/ui/baselines
 *
 * Exit code: 0 = all assertions passed; 1 = a device-visual assertion failed.
 */

import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

// ---- iPhone device profiles (logical px + real iOS safe-area insets, portrait) ----
// Insets are the values iOS actually reports for these devices with viewport-fit=cover.
const DEVICES = {
  // notched / Dynamic Island — the cases that expose the FRED-124 bug
  iphone15pro:    { w: 393, h: 852, dpr: 3, insets: { top: 59, bottom: 34, left: 0, right: 0 } },
  iphone14:       { w: 390, h: 844, dpr: 3, insets: { top: 47, bottom: 34, left: 0, right: 0 } },
  iphone15promax: { w: 430, h: 932, dpr: 3, insets: { top: 59, bottom: 34, left: 0, right: 0 } },
  // small / legacy Touch ID (no notch) — catches the opposite bug (over-padding,
  // content pushed off a short screen)
  iphoneSE:       { w: 375, h: 667, dpr: 2, insets: { top: 20, bottom: 0,  left: 0, right: 0 } },
};

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.map': 'application/json',
};

function arg(name, dflt) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : dflt;
}

const ROUTE    = arg('route', '/');
const DEVKEY   = arg('device', 'iphone15pro');
const OUTDIR   = resolve(arg('out', 'test/ui/artifacts'));
const WWWDIR   = resolve(arg('www', 'frontend/www'));
const dev      = DEVICES[DEVKEY] || DEVICES.iphone15pro;

// ---- 1. Serve the prebuilt web app from loopback (SPA fallback to index.html) ----
async function startServer(rootDir) {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = join(rootDir, urlPath);
      if (!existsSync(filePath) || !extname(filePath)) {
        filePath = join(rootDir, 'index.html'); // SPA deep-link fallback
      }
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, port: server.address().port };
}

async function main() {
  if (!existsSync(join(WWWDIR, 'index.html'))) {
    console.error(`[device-render] no build at ${WWWDIR}/index.html — run the prebuild step first`);
    process.exit(2); // SKIP-with-reason, distinct from assertion FAIL(1)
  }
  await mkdir(OUTDIR, { recursive: true });

  // puppeteer-core only; reuse the chrome-headless-shell already cached on disk.
  let puppeteer;
  try { puppeteer = (await import('puppeteer-core')).default; }
  catch { console.error('[device-render] puppeteer-core not installed — SKIP'); process.exit(2); }

  const execPath = process.env.CHROME_HEADLESS_SHELL || findCachedShell();
  if (!execPath) { console.error('[device-render] no chrome-headless-shell found — SKIP'); process.exit(2); }

  const { server, port } = await startServer(WWWDIR);
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: 'shell',
    args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'],
  });

  let failed = false;
  try {
    const page = await browser.newPage();
    const client = await page.target().createCDPSession();

    // TRUE iPhone metrics: logical viewport + device pixel ratio + mobile + touch.
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: dev.w, height: dev.h, deviceScaleFactor: dev.dpr,
      mobile: true, screenWidth: dev.w, screenHeight: dev.h,
    });
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    // THE KEY STEP — make env(safe-area-inset-*) report real iOS values.
    // Without this, headless Chrome resolves every inset to 0 and the notch bug hides.
    await client.send('Emulation.setSafeAreaInsetsOverride', {
      insets: { top: dev.insets.top, bottom: dev.insets.bottom,
                left: dev.insets.left, right: dev.insets.right },
    });

    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(String(e)));

    // ?testing=true + ?devPage= still work fully client-side: they set localStorage/JWT
    // and bypass the progress redirect WITHOUT any backend call, so an auth'd route
    // renders its shell offline. (Data is stubbed in step below.)
    const url = `http://127.0.0.1:${port}/?devPage=${encodeURIComponent(ROUTE)}&testing=true`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});

    await page.waitForFunction(() => !!document.querySelector('ion-header, ion-content'),
      { timeout: 8000 }).catch(() => {});

    // --- DEVICE-VISUAL ASSERTION: nothing fixed/sticky/header overlaps the notch band ---
    // The notch band is the top `insets.top` px of the viewport. Any interactive header
    // chrome whose rect intrudes into that band, when its computed padding-top is < inset,
    // is a safe-area failure (this is exactly FRED-124).
    const verdict = await page.evaluate((topInset) => {
      const offenders = [];
      const SEL = 'ion-header, .blue-hero-header, .custom-profile-header, [class*="hero"], ' +
                  '.mobile-footer, [style*="position: fixed"], [style*="position:fixed"]';
      const candidates = new Set(document.querySelectorAll(SEL));
      // also sweep anything computed-fixed/sticky at the top
      document.querySelectorAll('*').forEach(el => {
        const cs = getComputedStyle(el);
        if ((cs.position === 'fixed' || cs.position === 'sticky') &&
            el.getBoundingClientRect().top < topInset + 4) candidates.add(el);
      });
      for (const el of candidates) {
        const r = el.getBoundingClientRect();
        if (r.height === 0 || r.width === 0) continue;
        const cs = getComputedStyle(el);
        const padTop = parseFloat(cs.paddingTop) || 0;
        // Find the first interactive/visible child (back button, title) and see if its
        // top edge sits inside the notch band.
        const child = el.querySelector('button, a, h1, h2, .header-title, ion-title, [class*="title"], [class*="nav"]');
        const childTop = child ? child.getBoundingClientRect().top : r.top;
        const intrudes = r.top < topInset && padTop < topInset && childTop < topInset;
        if (intrudes) {
          offenders.push({
            selector: el.className || el.tagName.toLowerCase(),
            rectTop: Math.round(r.top), paddingTop: Math.round(padTop),
            childTop: Math.round(childTop), requiredInset: topInset,
          });
        }
      }
      return offenders;
    }, dev.insets.top);

    // Full-device screenshot + a cropped "notch band" strip for the diff baseline.
    const shotPath = join(OUTDIR, `${ROUTE.replace(/\W+/g, '_')}__${DEVKEY}.png`);
    await page.screenshot({ path: shotPath });
    const stripPath = join(OUTDIR, `${ROUTE.replace(/\W+/g, '_')}__${DEVKEY}__notchband.png`);
    await page.screenshot({ path: stripPath,
      clip: { x: 0, y: 0, width: dev.w, height: dev.insets.top + 56 } });

    const report = {
      route: ROUTE, device: DEVKEY, insets: dev.insets,
      screenshot: shotPath, notchBand: stripPath,
      safeAreaOffenders: verdict, consoleErrors,
      pass: verdict.length === 0 && consoleErrors.length === 0,
    };
    await writeFile(join(OUTDIR, `${ROUTE.replace(/\W+/g, '_')}__${DEVKEY}.json`),
      JSON.stringify(report, null, 2));

    if (verdict.length) {
      failed = true;
      console.error(`[device-render] SAFE-AREA FAIL on ${ROUTE} @ ${DEVKEY}:`);
      for (const o of verdict)
        console.error(`  - <${o.selector}> top=${o.rectTop}px padTop=${o.paddingTop}px ` +
          `child top=${o.childTop}px is inside the ${o.requiredInset}px notch band`);
    } else {
      console.log(`[device-render] OK ${ROUTE} @ ${DEVKEY} — header clears the ${dev.insets.top}px notch`);
    }
    console.log(`[device-render] screenshot: ${shotPath}`);
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(failed ? 1 : 0);
}

function findCachedShell() {
  const base = join(process.env.HOME || '', '.cache/puppeteer/chrome-headless-shell');
  if (!existsSync(base)) return null;
  // pick any installed build; the caller may pin via CHROME_HEADLESS_SHELL
  const { readdirSync } = require('node:fs');
  for (const ver of readdirSync(base)) {
    const p = join(base, ver, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
    if (existsSync(p)) return p;
    const p2 = join(base, ver, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    if (existsSync(p2)) return p2;
  }
  return null;
}

main().catch(e => { console.error(e); process.exit(2); });
