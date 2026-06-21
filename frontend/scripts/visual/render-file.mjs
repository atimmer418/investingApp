// Render a local HTML file to a PNG (for mockups stored as .html).
// Usage: node scripts/visual/render-file.mjs <htmlPath> <outPath>
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const [htmlPath, outPath] = process.argv.slice(2);
if (!htmlPath || !outPath) { console.error('usage: render-file.mjs <htmlPath> <outPath>'); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(500);
await page.screenshot({ path: outPath, fullPage: false });
await browser.close();
console.log(`mockup png: ${outPath}`);
