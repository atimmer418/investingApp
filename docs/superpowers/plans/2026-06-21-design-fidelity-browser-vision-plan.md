# Design-Fidelity (Browser Render + Vision Judge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CI gate that renders the changed page in a headless mobile browser and uses a Claude-vision call to judge it against the approved mockup (calibrated on real tab3 + settings references), failing the PR on clear design drift.

**Architecture:** Extends the existing Linux `backend-frontend` job in `.github/workflows/verify.yml` (already boots the ci backend on `:8080` + builds the frontend). New steps: `ng build --configuration=ci` (app → ci backend) → `serve www` → Playwright renders routes at an iPhone viewport via the `?devPage=<route>` dev-auth bypass → a fetch-based vision judge calls `claude-opus-4-8`. The static linter still owns notch/safe-area; this owns design-fidelity. No macOS, no native build, no pixel baselines.

**Tech Stack:** Angular 19 + Ionic, Playwright (headless Chromium), Node 22 (built-in `fetch`), Claude Messages API (`/v1/messages`, `output_config.format` structured output), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-06-21-design-fidelity-browser-vision-design.md`

**Key facts discovered (don't re-derive):**
- `app.component.ts:126` — `?devPage=<route>` (only when `!environment.production`) dev-auths as **`facebook@gmail.com`** (seeded by `CiSeedConfig` in the ci profile) then client-navigates to `<route>`. **Do NOT add `&testing=true`** — `app.component.ts:111` returns early on `testing=true` and never reaches the devPage block.
- Backend CORS is `@CrossOrigin(origins = "*")` on every controller → a static `serve` at `:4200` can call `http://localhost:8080/api` cross-origin with no proxy.
- `frontend/angular.json` already has a `ci` build configuration (`{"progress": false}`) — **edit it** to add the fileReplacement; do not add a second `ci` block.
- Node module resolution: ESM `import 'playwright'` resolves from the script's directory upward. The scripts therefore live under `frontend/scripts/visual/` so they resolve `frontend/node_modules`.

---

## Phase A — Render infrastructure

### Task 1: ci build configuration

**Files:**
- Create: `frontend/src/environments/environment.ci.ts`
- Modify: `frontend/angular.json` (build `configurations.ci`, currently lines ~101-103)

- [ ] **Step 1: Create the ci environment**

`frontend/src/environments/environment.ci.ts`:
```ts
// CI build: the app talks to the ephemeral ci backend on localhost:8080.
// production:false is REQUIRED — it enables the ?devPage dev-auth bypass in
// app.component.ts (which the Playwright render relies on).
export const environment = {
  production: false,
  local: true,
  backendApiUrl: 'http://localhost:8080/api',
  rpId: 'localhost'
};
```

- [ ] **Step 2: Point the `ci` build config at it**

In `frontend/angular.json`, find the build target's `ci` configuration:
```json
            "ci": {
              "progress": false
            }
```
Replace with:
```json
            "ci": {
              "progress": false,
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.ci.ts"
                }
              ]
            }
```

- [ ] **Step 3: Verify the build and that it embeds the ci backend URL**

Run:
```bash
cd frontend && npx ng build --configuration=ci 2>&1 | tail -5
grep -rl "localhost:8080/api" www/ | head -1
```
Expected: build succeeds; grep prints a built JS file path (the ci backend URL is embedded). If grep is empty, the fileReplacement didn't take — recheck Step 2.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/environments/environment.ci.ts frontend/angular.json
git commit -m "feat(ci): environment.ci.ts + angular ci build config (app → ci backend :8080)"
```

---

### Task 2: Playwright render driver

**Files:**
- Modify: `frontend/package.json` (add `playwright` devDependency)
- Create: `frontend/scripts/visual/render.mjs`

- [ ] **Step 1: Add Playwright as a frontend devDependency**

Run:
```bash
cd frontend && npm install -D playwright@1.49.1 --legacy-peer-deps
```
(`--legacy-peer-deps` matches the repo's install convention. Pin avoids churn; any 1.4x is fine.)

- [ ] **Step 2: Create the render driver**

`frontend/scripts/visual/render.mjs`:
```js
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
```

- [ ] **Step 3: Smoke-test the driver against a locally running app**

This needs the local app reachable (your normal `servlocal` + backend, OR a ci build served — see below). Quick path with the local dev stack already running on `:8100`:
```bash
cd frontend && npx playwright install chromium
node scripts/visual/render.mjs http://localhost:8100 /tabs/tab3 /tmp/tab3.png
```
Expected: prints `screenshot: /tmp/tab3.png (route=/tabs/tab3)` and `/tmp/tab3.png` exists and shows tab3 (open it). If it shows a logged-out screen, confirm the backend is up and `facebook@gmail.com` exists locally. (Full CI validation happens in Task 4 — if the local stack isn't handy, you may defer the visual check to Task 4.)

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/scripts/visual/render.mjs
git commit -m "feat(ci): Playwright render driver (iPhone viewport, devPage auth)"
```

---

### Task 3: Calibration reference routes

**Files:**
- Create: `frontend/scripts/visual/refs.json`

- [ ] **Step 1: Find the change-bank-account route**

Run:
```bash
grep -rn "change-bank-account" frontend/src/app --include=*.ts | grep -i "path\|route\|loadComponent" | head
```
Note the exact route path (e.g. `/tabs/tab3/change-bank-account` or similar). Call it `<SETTINGS_ROUTE>` below.

- [ ] **Step 2: Record the calibration routes**

`frontend/scripts/visual/refs.json` (replace `<SETTINGS_ROUTE>` with the path from Step 1):
```json
{
  "calibration": [
    { "name": "tab3", "route": "/tabs/tab3" },
    { "name": "settings", "route": "<SETTINGS_ROUTE>" }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/scripts/visual/refs.json
git commit -m "feat(ci): calibration reference routes (tab3 + settings) for the vision judge"
```

---

### Task 4: Wire the render into verify.yml + prove it in CI

**Files:**
- Modify: `.github/workflows/verify.yml` (add a step before the `Auto-merge routine PR on green` step)

- [ ] **Step 1: Add the render step (artifact only, no judge yet)**

In `.github/workflows/verify.yml`, **immediately before** the `- name: Auto-merge routine PR on green` step, add:
```yaml
      # Phase A: render the calibration refs + tab3 in a headless mobile browser to
      # prove the ci build + serve + Playwright + devPage chain works. (Phase B adds
      # the vision judge + the story route.) Runs only on routine PRs.
      - name: Design-fidelity render (Phase A — artifact only)
        if: github.event_name == 'pull_request' && startsWith(github.head_ref, 'verify/')
        working-directory: frontend
        run: |
          npx ng build --configuration=ci
          npx serve www -l 4200 >/tmp/serve.log 2>&1 &
          for i in $(seq 1 30); do curl -sf http://localhost:4200 >/dev/null && break; sleep 1; done
          curl -sf http://localhost:4200 >/dev/null || { echo "serve failed"; cat /tmp/serve.log; exit 1; }
          npx playwright install --with-deps chromium
          mkdir -p /tmp/shots
          SETTINGS_ROUTE=$(node -e "console.log(require('./scripts/visual/refs.json').calibration[1].route)")
          node scripts/visual/render.mjs http://localhost:4200 /tabs/tab3 /tmp/shots/ref-tab3.png
          node scripts/visual/render.mjs http://localhost:4200 "$SETTINGS_ROUTE" /tmp/shots/ref-settings.png

      - name: Upload render artifacts
        if: github.event_name == 'pull_request' && startsWith(github.head_ref, 'verify/')
        uses: actions/upload-artifact@v4
        with:
          name: design-render-shots
          path: /tmp/shots/
          if-no-files-found: ignore
```

- [ ] **Step 2: Validate the YAML**

Run:
```bash
ruby -ryaml -e "YAML.load_file('.github/workflows/verify.yml')" && echo "YAML OK"
```
Expected: `YAML OK`.

- [ ] **Step 3: Commit + prove on a throwaway routine PR**

```bash
git add .github/workflows/verify.yml
git commit -m "ci: Phase A — render tab3 + settings refs in CI (artifact)"
git push origin develop   # (or the working branch)
# prove it:
git checkout -b verify/ci-render-smoke
echo "phase A render smoke" > test/ci/SMOKE.md && git add test/ci/SMOKE.md
git commit -m "test(ci): phase A render smoke"
git push -u origin verify/ci-render-smoke
```
Then watch the PR auto-pr.yml opens:
```bash
for i in $(seq 1 24); do PR=$(gh pr list --head verify/ci-render-smoke --json number -q '.[0].number'); [ -n "$PR" ] && break; sleep 5; done
gh pr checks "$PR" --watch --interval 20
```
Expected: `backend-frontend` passes and a `design-render-shots` artifact is attached to the run. Download it and confirm `ref-tab3.png` / `ref-settings.png` show the real, logged-in pages (not a login screen).

- [ ] **Step 4: Clean up the smoke branch**

```bash
git checkout develop && git pull --no-rebase origin develop
git rm test/ci/SMOKE.md 2>/dev/null || true
git commit -m "chore: remove phase A render smoke marker" && git push origin develop
git push origin --delete verify/ci-render-smoke 2>/dev/null || true
```
(If the PR already auto-merged the SMOKE.md to develop, the `git rm` cleans it; if CORS/auth failed and the shots show a login screen, fix before Phase B — confirm `environment.ci.ts` has `production:false` and the ci backend seeded `facebook@gmail.com`.)

---

## Phase B — Vision judge

### Task 5: The vision judge script

**Files:**
- Create: `frontend/scripts/visual/design-judge.mjs`
- Create: `frontend/scripts/visual/render-file.mjs` (renders an HTML mockup to PNG)

- [ ] **Step 1: Create the HTML-mockup → PNG helper**

`frontend/scripts/visual/render-file.mjs`:
```js
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
```

- [ ] **Step 2: Create the vision judge**

`frontend/scripts/visual/design-judge.mjs`:
```js
// Judge a rendered screenshot against the approved mockup + known-good references
// using the Claude vision API. Exits 0 (pass) / 1 (fail) / 2 (error). Prints the verdict.
// Usage: node scripts/visual/design-judge.mjs --render=<png> --mockup=<png> --ref=<png> [--ref=<png>...]
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const vals = (k) => args.filter((a) => a.startsWith(`--${k}=`)).map((a) => a.slice(k.length + 3));
const renderPath = vals('render')[0];
const mockupPath = vals('mockup')[0];
const refPaths = vals('ref');
if (!renderPath || !mockupPath) { console.error('need --render and --mockup'); process.exit(2); }

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(2); }

const img = (p) => ({
  type: 'image',
  source: { type: 'base64', media_type: 'image/png', data: readFileSync(p).toString('base64') },
});

const content = [
  { type: 'text', text:
    "REFERENCE SCREENSHOTS — real, current, correct FRED pages. Use them as the bar for the app's " +
    "established design language (color, typography, spacing, header style) and for how much top space " +
    'the notch/safe-area gets:' },
  ...refPaths.map(img),
  { type: 'text', text: 'APPROVED MOCKUP — the design the builder was asked to implement for this story:' },
  img(mockupPath),
  { type: 'text', text: 'ACTUAL RENDER — what the app produced on an iPhone-sized viewport:' },
  img(renderPath),
  { type: 'text', text:
    'Judge the ACTUAL RENDER. It must (a) match the APPROVED MOCKUP and (b) fit the established design ' +
    'language and notch/safe-area spacing shown in the references. Fail ONLY on clear, describable drift — ' +
    'wrong spacing, color, font, radius, alignment, missing/extra elements, content overflow/clipping, or ' +
    'header/notch spacing that is obviously off. Do not fail on subjective taste or sub-pixel differences. ' +
    'Return verdict "pass" or "fail", a one-line summary, and a list of concrete, builder-actionable drift ' +
    'items (empty when pass).' },
];

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail'] },
    summary: { type: 'string' },
    drift: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'summary', 'drift'],
};

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content }],
  }),
});

if (!res.ok) { console.error(`API ${res.status}: ${await res.text()}`); process.exit(2); }
const data = await res.json();
if (data.stop_reason === 'refusal') { console.error('vision request refused'); process.exit(2); }
const text = (data.content || []).find((b) => b.type === 'text')?.text;
if (!text) { console.error('no text block in response'); process.exit(2); }
const out = JSON.parse(text);

console.log(`verdict: ${out.verdict}`);
console.log(`summary: ${out.summary}`);
if (out.drift?.length) { console.log('drift:'); out.drift.forEach((d) => console.log(`  - ${d}`)); }
process.exit(out.verdict === 'pass' ? 0 : 1);
```

- [ ] **Step 3: Smoke-test the judge (match → pass, mismatch → fail)**

Reuse the Task 4 shots. A page vs itself should pass; tab3 vs the settings page should fail:
```bash
cd frontend
export ANTHROPIC_API_KEY=<your key>   # local test only
node scripts/visual/design-judge.mjs --render=/tmp/shots/ref-tab3.png --mockup=/tmp/shots/ref-tab3.png --ref=/tmp/shots/ref-settings.png; echo "exit=$?"
node scripts/visual/design-judge.mjs --render=/tmp/shots/ref-tab3.png --mockup=/tmp/shots/ref-settings.png --ref=/tmp/shots/ref-settings.png; echo "exit=$?"
```
Expected: first prints `verdict: pass` / `exit=0`; second prints `verdict: fail` with drift / `exit=1`. (This empirically confirms the `output_config.format` structured output + parsing + exit codes.)

- [ ] **Step 4: Commit**

```bash
git add frontend/scripts/visual/design-judge.mjs frontend/scripts/visual/render-file.mjs
git commit -m "feat(ci): Claude-vision design-fidelity judge + HTML-mockup renderer"
```

---

### Task 6: Record the changed route from itpm

**Files:**
- Modify: `.claude/skills/itpm-execute/SKILL.md` (Step D2 — capture-design-ref area)

- [ ] **Step 1: Read the current Step D2 design-ref capture line**

Run:
```bash
grep -n "design-ref" .claude/skills/itpm-execute/SKILL.md
```
Find the line: `First capture the design reference for the design-fidelity check: copy the chosen UI mockup (from the approval \`content\` / today.html) to \`ITPM/verify/design-ref/<story-id>.png\` (or \`.html\`).`

- [ ] **Step 2: Add a route-record instruction right after it**

Replace that sentence with:
```
First capture the design-fidelity inputs:
- Copy the chosen UI mockup (from the approval `content` / today.html) to `ITPM/verify/design-ref/<story-id>.png` (or `.html`).
- Write the route the story changes to `ITPM/verify/route-<story-id>.txt` — a single line, the Angular route the rendered page lives at (e.g. `/tabs/tab3/change-bank-account`). CI renders this route and compares it to the mockup. If the story has no single user-facing route, skip this file (the design-fidelity check then skips too).
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/itpm-execute/SKILL.md
git commit -m "feat(itpm): record the changed route (route-<story>.txt) for the design-fidelity check"
```

---

### Task 7: Wire the judge into verify.yml + prove the gate

**Files:**
- Modify: `.github/workflows/verify.yml` (replace the Phase A render step with the full render+judge step)

- [ ] **Step 1: Replace the Phase A step with the full design-fidelity gate**

In `.github/workflows/verify.yml`, replace the `Design-fidelity render (Phase A — artifact only)` step (keep the `Upload render artifacts` step after it) with:
```yaml
      # Design-fidelity gate: render the changed route + calibration refs in a headless
      # mobile browser, then a Claude-vision judge compares the render to the approved
      # mockup. Runs only on routine PRs that captured a design-ref. A fail turns the job
      # red → no auto-merge → the routine's fix-loop gets the drift notes.
      - name: Design-fidelity (render + vision judge)
        if: github.event_name == 'pull_request' && startsWith(github.head_ref, 'verify/')
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          STORY="${GITHUB_HEAD_REF#verify/}"
          MOCKUP=$(ls "ITPM/verify/design-ref/$STORY".* 2>/dev/null | head -1 || true)
          if [ -z "$MOCKUP" ]; then echo "no design-ref for $STORY — skipping design-fidelity"; exit 0; fi
          ROUTE=$(cat "ITPM/verify/route-$STORY.txt" 2>/dev/null || true)
          if [ -z "$ROUTE" ]; then echo "no route-$STORY.txt — skipping design-fidelity"; exit 0; fi
          if [ -z "$ANTHROPIC_API_KEY" ]; then echo "::error::ANTHROPIC_API_KEY secret not set"; exit 1; fi

          cd frontend
          npx ng build --configuration=ci
          npx serve www -l 4200 >/tmp/serve.log 2>&1 &
          for i in $(seq 1 30); do curl -sf http://localhost:4200 >/dev/null && break; sleep 1; done
          curl -sf http://localhost:4200 >/dev/null || { echo "serve failed"; cat /tmp/serve.log; exit 1; }
          npx playwright install --with-deps chromium
          mkdir -p /tmp/shots

          # mockup → png if it's HTML
          MOCKUP_PNG="../$MOCKUP"
          case "$MOCKUP" in *.html) node scripts/visual/render-file.mjs "../$MOCKUP" /tmp/shots/mockup.png; MOCKUP_PNG=/tmp/shots/mockup.png;; esac

          # calibration references + the story route
          SETTINGS_ROUTE=$(node -e "console.log(require('./scripts/visual/refs.json').calibration[1].route)")
          node scripts/visual/render.mjs http://localhost:4200 /tabs/tab3 /tmp/shots/ref-tab3.png
          node scripts/visual/render.mjs http://localhost:4200 "$SETTINGS_ROUTE" /tmp/shots/ref-settings.png
          node scripts/visual/render.mjs http://localhost:4200 "$ROUTE" /tmp/shots/render.png

          node scripts/visual/design-judge.mjs \
            --render=/tmp/shots/render.png \
            --mockup="$MOCKUP_PNG" \
            --ref=/tmp/shots/ref-tab3.png \
            --ref=/tmp/shots/ref-settings.png
```

- [ ] **Step 2: Validate YAML**

Run:
```bash
ruby -ryaml -e "YAML.load_file('.github/workflows/verify.yml')" && echo "YAML OK"
```
Expected: `YAML OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/verify.yml
git commit -m "ci: design-fidelity gate — render changed route + vision-judge vs mockup"
```

- [ ] **Step 4: Prove the gate (pass case, then fail case)**

Pre-req: the `ANTHROPIC_API_KEY` repo secret must exist (Andy adds it: FRED → Settings → Secrets and variables → Actions → `ANTHROPIC_API_KEY`).

Pass case — design-ref == the real page (should pass):
```bash
git checkout develop && git pull --no-rebase origin develop
git checkout -b verify/df-smoke
# use the real settings page as both the route and (a screenshot of) the mockup:
mkdir -p ITPM/verify/design-ref
echo "/tabs/tab3" > ITPM/verify/route-df-smoke.txt
# capture a current tab3 screenshot to use as the "approved mockup" so render==mockup
cp /tmp/shots/ref-tab3.png ITPM/verify/design-ref/df-smoke.png 2>/dev/null || \
  (cd frontend && npx ng build --configuration=ci && npx serve www -l 4200 >/tmp/s.log 2>&1 & sleep 8; npx playwright install chromium; node scripts/visual/render.mjs http://localhost:4200 /tabs/tab3 ../ITPM/verify/design-ref/df-smoke.png)
git add ITPM/verify/route-df-smoke.txt ITPM/verify/design-ref/df-smoke.png
git commit -m "test(ci): design-fidelity pass-case smoke"
git push -u origin verify/df-smoke
for i in $(seq 1 24); do PR=$(gh pr list --head verify/df-smoke --json number -q '.[0].number'); [ -n "$PR" ] && break; sleep 5; done
gh pr checks "$PR" --watch --interval 20
```
Expected: `backend-frontend` passes (verdict pass) and the PR auto-merges. Inspect the step log for `verdict: pass`.

Fail case — point the route at a different page than the mockup (should fail):
```bash
git checkout develop && git pull --no-rebase origin develop
git checkout -b verify/df-fail
mkdir -p ITPM/verify/design-ref
cp ITPM/verify/design-ref/df-smoke.png ITPM/verify/design-ref/df-fail.png   # mockup = tab3
SETTINGS=$(node -e "console.log(require('./frontend/scripts/visual/refs.json').calibration[1].route)")
echo "$SETTINGS" > ITPM/verify/route-df-fail.txt                            # route = settings (≠ mockup)
git add ITPM/verify/route-df-fail.txt ITPM/verify/design-ref/df-fail.png
git commit -m "test(ci): design-fidelity fail-case smoke"
git push -u origin verify/df-fail
for i in $(seq 1 24); do PR=$(gh pr list --head verify/df-fail --json number -q '.[0].number'); [ -n "$PR" ] && break; sleep 5; done
gh pr checks "$PR" --watch --interval 20 || true
gh pr view "$PR" --json state -q .state
```
Expected: `backend-frontend` FAILS (verdict fail, drift listed), PR stays open (state OPEN, not merged). Confirm the step log shows `verdict: fail`.

- [ ] **Step 5: Clean up both smoke branches + their files**

```bash
gh pr close verify/df-fail 2>/dev/null || true
git push origin --delete verify/df-fail 2>/dev/null || true
git checkout develop && git pull --no-rebase origin develop
git rm -f ITPM/verify/design-ref/df-smoke.png ITPM/verify/design-ref/df-fail.png \
         ITPM/verify/route-df-smoke.txt ITPM/verify/route-df-fail.txt 2>/dev/null || true
git commit -m "chore: remove design-fidelity smoke fixtures" && git push origin develop
git push origin --delete verify/df-smoke 2>/dev/null || true
```

---

## Done criteria

- A routine PR whose changed page matches its mockup passes `backend-frontend` (vision verdict pass) and auto-merges.
- A routine PR whose render drifts from the mockup fails the job (verdict fail, drift notes in the log), can't auto-merge, and the drift reaches the builder via the existing fix-loop.
- Backend-only / no-design-ref PRs skip the design-fidelity step and stay fast/green.
- The judge is calibrated on real tab3 + settings references each run.
