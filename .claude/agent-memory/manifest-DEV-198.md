# Acceptance Check Manifest — DEV-198: Eliminate package-lock.json libc-field churn

Story: pin one npm version (`npm@10.9.7`, the node-22 default) across the routine
sandbox, GitHub Actions CI, and local so `npm ci`/`npm install` emit a byte-identical
`package-lock.json` everywhere — no `os`/`cpu`/`libc` churn. Both lockfiles in scope
(`frontend/package-lock.json` + root `./package-lock.json`). Workflows updated. No
dependency-resolution change.

VERIFIER VERDICT: APPROVED — all 7 checks independently re-run and pass with attached
evidence (verified 2026-06-28, sandbox npm 10.9.7 / Node v22.22.2).

## AC-1: Root cause confirmed and written up
- Type:     backend-unit
- Check:    A written root-cause note exists (implementation-notes-DEV-198.md and/or a
            committed doc) stating that npm-version drift across the three environments
            causes the differing `os`/`cpu`/`libc` emission, with the sandbox npm/node
            versions recorded (`npm -v` → 10.9.7, `node -v` → 22.x) as evidence.
- Evidence: VERIFIER: implementation-notes-DEV-198.md "Root Cause Analysis" section present;
            records sandbox npm 10.9.7 / Node 22.22.2, CI unpinned npm 10.x, local 10.9.7;
            root cause = npm-version drift → differing os/cpu/libc emission. Sandbox versions
            re-confirmed by me: `npm -v` → 10.9.7, `node -v` → v22.22.2.
            (Doc nit, not material: notes say "52 removed libc lines"; actual diff removes 26.)
- Status:   pass

## AC-2: Single stable mechanism produces identical lockfile across environments
- Type:     backend-unit
- Check:    `package.json` declares `"packageManager": "npm@10.9.7"` (root, and/or
            frontend as appropriate) so Corepack/CI pin the same npm everywhere.
            `grep -q '"packageManager": "npm@10.9.7"' package.json` exits 0.
- Evidence: VERIFIER re-ran grep: root package.json line 2 `"packageManager": "npm@10.9.7"`
            (exit 0); frontend/package.json line 83 same (exit 0). Both present.
- Status:   pass

## AC-3: Both lockfiles covered
- Type:     backend-unit
- Check:    Both `./package-lock.json` and `frontend/package-lock.json` were regenerated
            by the pinned npm and committed; both still parse as valid JSON
            (`node -e "JSON.parse(require('fs').readFileSync('package-lock.json'))"` and
            same for `frontend/package-lock.json` exit 0).
- Evidence: VERIFIER ran JSON.parse on both lockfiles → both exit 0 ("root lock OK",
            "frontend lock OK"); both package.json files also parse. git diff shows both
            lockfiles modified in the working tree.
- Status:   pass

## AC-4: CI workflows updated to pin npm
- Type:     backend-unit
- Check:    `.github/workflows/verify.yml` and `.github/workflows/auto-pr.yml` both pin/
            enable npm@10.9.7 before any `npm ci` (e.g. `corepack enable` or
            `npm i -g npm@10.9.7`). grep confirms the pin precedes the `npm ci` step in
            each file.
- Evidence: VERIFIER read both files. verify.yml: setup-node@v4 at line 51, "Pin npm version"
            (`npm install -g npm@10.9.7`) at lines 58-59, `npm ci --legacy-peer-deps` at
            line 95 and `ng build` at line 123 — pin precedes both. auto-pr.yml: setup-node
            at line 27, "Pin npm version" at lines 30-31; no `npm ci` in this workflow
            (acceptable — future-proofing). Pin precedes every npm ci.
- Status:   pass (verified locally) — BUT NOT SHIPPED: the workflow-file changes could
            not be pushed. PAT lacks GitHub `workflow` scope and the GitHub App returns
            403 "Resource not accessible by integration" on `.github/workflows/*`. The two
            pins are handed to Andrew as a manual follow-up (diff in today.html). Grant the
            routine PAT the `workflow` scope to unblock future CI-touching stories.

## AC-5: Regenerating the lockfile in-sandbox yields no os/cpu/libc diff
- Type:     backend-unit
- Check:    After the fix, run `npm install --package-lock-only --legacy-peer-deps` (root
            and frontend) and `git diff --stat` shows no changes to either lockfile —
            specifically zero added/removed `"os"`/`"cpu"`/`"libc"` lines.
- Evidence: VERIFIER (load-bearing test): snapshotted builder's lockfiles, ran
            `npm install --package-lock-only --legacy-peer-deps` fresh in BOTH root and
            frontend, then `diff snapshot vs regenerated` → ROOT: ZERO DIFF, FRONTEND: ZERO
            DIFF (byte-identical, idempotent). `git diff` os/cpu/libc lines after regen =
            only the 26 one-time `"libc"` removals vs HEAD (unchanged by the regen — the
            legitimate one-time cleanup, NOT new churn). Determinism proven.
- Status:   pass

## AC-6: No dependency-resolution change; build still works
- Type:     frontend-unit
- Check:    `cd frontend && npm ci --legacy-peer-deps` installs cleanly with rollup/esbuild
            optional native binaries resolving; `npx tsc --noEmit` exits 0; and
            `ng build --configuration=ci` succeeds.
- Evidence: VERIFIER ran all three. `npm ci --legacy-peer-deps` → exit 0; optional native
            binaries resolved: node_modules/@esbuild/linux-x64,
            @rollup/rollup-linux-x64-gnu + -musl all present (os/cpu/libc NOT broken).
            `npx tsc --noEmit` → exit 0. `npx ng build --configuration=ci` → exit 0
            (only pre-existing warnings: unused IonToolbar imports, CommonJS html2canvas;
            none introduced by this change). Output written to frontend/www.
- Status:   pass

## AC-7: Mechanism documented for future contributors
- Type:     backend-unit
- Check:    A README/CONTRIBUTING note or a comment in package.json-adjacent docs records
            the pinned npm version and how to enable it (Corepack), so contributors keep
            the same setup.
- Evidence: VERIFIER read CONTRIBUTING.md (new, repo root): documents pinned npm@10.9.7,
            `corepack enable`, `npm install -g npm@10.9.7` fallback, rationale (os/cpu/libc
            churn), and CI note. `grep -ril 'npm@10.9.7|corepack' CONTRIBUTING.md` →
            CONTRIBUTING.md (match found).
- Status:   pass
