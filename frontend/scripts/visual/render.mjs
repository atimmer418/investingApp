// Render an app route at an iPhone-16-Pro viewport and screenshot it.
// Usage: node scripts/visual/render.mjs <baseUrl> <route> <outPath>
// Navigates to <baseUrl>/?devPage=<route> — app.component.ts dev-auths as
// facebook@gmail.com (seeded in the ci profile) and client-navigates to <route>.
// IMPORTANT: do NOT append &testing=true — app.component.ts returns early on it
// and never runs the devPage flow.
import { chromium } from 'playwright';

const [baseUrl, route, outPath] = process.argv.slice(2);
if (!baseUrl || !route || !outPath) {
  console.error('usage: node render.mjs <baseUrl> <route> <outPath>');
  process.exit(2);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 393, height: 852 }, // iPhone 16 Pro logical size
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error(`[page] ${m.text()}`); });

const url = `${baseUrl}/?devPage=${encodeURIComponent(route)}`;
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
// devPage fires async dev-auth then client navigation; wait for the Ionic shell + settle.
await page.waitForSelector('ion-content', { state: 'visible', timeout: 30000 });
await page.waitForTimeout(1500); // let data + animations settle
await page.screenshot({ path: outPath, fullPage: false });

await browser.close();
console.log(`screenshot: ${outPath} (route=${route})`);
