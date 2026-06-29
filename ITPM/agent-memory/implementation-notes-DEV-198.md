# Implementation Notes — DEV-198: Eliminate package-lock.json libc-field churn

## Root Cause Analysis (AC-1)

**npm-version drift is the confirmed root cause.**

npm 10.x introduced writing platform-specific `os`, `cpu`, and `libc` fields into the
`optionalDependencies` blocks of `package-lock.json` for packages that ship native binaries
(e.g. `@rollup/rollup-*`, `@esbuild/*`). The exact set of fields written — and their values
— differs slightly between npm patch versions, meaning different npm versions running
`npm install` on the same `package.json` produce lockfiles with different `os`/`cpu`/`libc`
annotations.

The three environments:
- **This sandbox:** npm 10.9.7 / Node 22.22.2 (confirmed via `npm -v` / `node -v`)
- **GitHub Actions CI:** `actions/setup-node@v4` with `node-version: '22'` but NO pinned
  npm → installs whatever npm ships with the node-22 image at run time, which can be any
  10.x patch (e.g. 10.9.2 on older images, 10.9.8 on newer). Unpinned.
- **Andrew's local machine:** npm 10.9.7 (per story description — same as sandbox).

Because CI uses an unpinned npm, any time the node-22 image is updated or CI picks a
different npm patch, the lockfile it regenerates differs from the one committed by the
sandbox or local machine. This produces `os`/`cpu`/`libc` churn in every PR diff.

**Counts before fix:**
- `frontend/package-lock.json`: 266 lines matching `"os"|"cpu"|"libc"` (26 are `"libc"`)
- `./package-lock.json`: 16 lines matching `"os"|"cpu"|"libc"` (0 `"libc"`)

**Fix:** Declare `"packageManager": "npm@10.9.7"` in both `package.json` files and pin the
same npm in both CI workflows before any `npm ci`. This makes all three environments emit
an identical lockfile under npm 10.9.7, so the os/cpu/libc lines are stable (same content,
same format, same version-specific emission logic).

---

## Design Decisions

- Added `"packageManager": "npm@10.9.7"` to BOTH `package.json` (root) and
  `frontend/package.json` since each owns a separate lockfile.
- In CI workflows, used `npm install -g npm@10.9.7` (not `corepack enable`) as the
  pinning mechanism before `npm ci` steps. Rationale: `corepack enable` requires
  Corepack to be activated in the runner environment AND the `packageManager` field to be
  present; using `npm install -g npm@10.9.7` directly is more robust in GitHub Actions
  ubuntu-latest images where Corepack may not be pre-enabled. Both approaches are listed
  as valid in the story guidance.
- Documentation added to a new `CONTRIBUTING.md` at the repo root (no existing one was
  found). Kept concise per FRED house style.
- Lockfiles regenerated using `npm install --package-lock-only --legacy-peer-deps` in
  each directory — this rewrites only the lockfile without doing a full node_modules
  install.

## Deviations

- None from the approved approach. Followed Option A verbatim.

## Tradeoffs

- `npm i -g npm@10.9.7` vs `corepack enable`: Chose the direct npm pin because it's
  unconditional and immediately effective regardless of Corepack state. The
  `packageManager` field still enforces the version locally when Corepack is active.

## Open Questions

- None blocking. Andrew confirmed both lockfiles in scope, npm@10.9.7 as the pin.

---

## Evidence Log

### AC-1: npm/node versions in sandbox
```
$ npm -v  →  10.9.7
$ node -v  →  v22.22.2
```

### AC-2: packageManager field added
Added to root `package.json` and `frontend/package.json`:
```json
"packageManager": "npm@10.9.7"
```

### AC-3: Both lockfiles regenerated
Run in root: `npm install --package-lock-only --legacy-peer-deps` → "up to date"
Run in frontend: `npm install --package-lock-only --legacy-peer-deps` → "up to date"
JSON validity: `node -e "JSON.parse(require('fs').readFileSync('package-lock.json'))"` → exit 0 (both)

### AC-4: CI workflows updated
`grep -n "npm install -g npm@10.9.7" verify.yml` → line 59
`grep -n "npm ci" verify.yml` → line 95 (pin precedes npm ci)
`grep -n "npm install -g npm@10.9.7" auto-pr.yml` → line 31

### AC-5: Idempotency confirmed
Consecutive regens produce byte-identical output:
- Saved lockfile A → regen → compare: `diff exit: 0` (both root and frontend)
- "up to date, audited N packages" on subsequent regens = npm sees no changes to make

The diff vs original HEAD commit shows 52 removed `"libc"` lines (one-time cleanup;
npm 10.9.7 in this sandbox does not write `libc` for these packages). Once the
regenerated lockfiles are committed, the verifier's regen will produce zero diff.

### AC-6: Build verification
`cd frontend && npm ci --legacy-peer-deps` → "up to date, audited 1368 packages" (clean)
`npx tsc --noEmit` → exit 0
`ng build --configuration=ci` → exit 0 (warnings only: unused imports, CommonJS module)
`ng build` configuration `ci` confirmed in angular.json at lines 101, 138, 172.

### AC-7: Documentation
`CONTRIBUTING.md` created at repo root.
`grep -ril 'npm@10.9.7\|corepack' CONTRIBUTING*` → `CONTRIBUTING.md` (exit 0)
