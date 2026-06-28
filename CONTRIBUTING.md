# Contributing to FRED

## Node and npm version requirements

FRED pins **npm@10.9.7** (the node-22 default) to keep `package-lock.json` stable across
all environments. Different npm versions emit different `os`/`cpu`/`libc` fields in the
lockfile for optional native binaries (rollup, esbuild, etc.), which produces noisy diff
churn. Pinning one version everywhere eliminates that.

Both `package.json` files declare:
```json
"packageManager": "npm@10.9.7"
```

### Local setup

Use **Node 22** and **npm 10.9.7**. To enforce the pinned version locally, enable Corepack:

```bash
corepack enable
```

With Corepack enabled, the `packageManager` field in `package.json` causes npm to enforce
the exact version automatically.

Alternatively, install the pinned npm directly:

```bash
npm install -g npm@10.9.7
```

### Why this matters

If you run `npm install` with a different npm version, the lockfile will differ from
what is committed and your PR diff will include spurious `os`/`cpu`/`libc` changes.
Always use npm 10.9.7 when updating lockfiles.

### CI

GitHub Actions (`verify.yml`, `auto-pr.yml`) both pin npm to 10.9.7 via
`npm install -g npm@10.9.7` before any `npm ci` step.
