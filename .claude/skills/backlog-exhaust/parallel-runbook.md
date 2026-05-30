# Parallel Backlog Exhaust — Runbook

4 sessions in parallel: Buckets A, B, C consume the 25 approved backlog stories; B6 runs the Tab 3 UI overhaul. Each session operates in its own git worktree on its own branch.

Pre-triage pass is COMPLETE (2026-05-23). Results: 25 approved, 37 skipped (💤), 3 blocked (🚫), 4 done (✓).

---

## Prerequisites

- Repo: `/Users/andrewtimmer/PersonalTypeshit/FRED`
- Pre-triage pass: **done** — all `.stories/FRED-XXX.md` files written, markers applied in `backlog.md`.
- Primary dev env running during verification: `SPRING_PROFILES_ACTIVE=local ./gradlew bootRun` + Angular at `local.fredvested.com:8100`.

---

## Phase 2 — Worktree Setup (Andy, ~5 min)

From the `FRED/` repo root:

```bash
git worktree add ../FRED-swarm-a -b swarm/bucket-a develop
git worktree add ../FRED-swarm-b -b swarm/bucket-b develop
git worktree add ../FRED-swarm-c -b swarm/bucket-c develop
git worktree add ../FRED-swarm-b6 -b swarm/bucket-b6 develop
```

**B6 dev env** (needed for visual verification in Bucket B6):
```bash
# Add host alias (one-time, needs sudo):
echo "127.0.0.1 local-b6.fredvested.com" | sudo tee -a /etc/hosts

# Start B6 frontend (in a separate terminal, from B6 worktree):
cd ../FRED-swarm-b6/frontend
npm install
npm run start -- --host=0.0.0.0 --port=8101 --disable-host-check
```
No backend needed in B6 — API calls hit the primary backend at `local.fredvested.com`.

---

## Phase 3 — Launch 4 Sessions (Andy, stagger by 30s)

Open each worktree in a new Claude Code session. Copy-paste the launch prompt, wait for it to start, then open the next.

---

### Bucket A — Core App UX

**Worktree:** `../FRED-swarm-a`
**IDs:** FRED-106, 110, 111, 112, 113, 114, 115, 116, 117 (9 stories)

**Launch prompt:**
```
/backlog-exhaust --bucket=FRED-106,FRED-110,FRED-111,FRED-112,FRED-113,FRED-114,FRED-115,FRED-116,FRED-117
```

**Then paste this /goal condition:**
```
Every story heading in FREDdocs/backlog.md whose ID is in {FRED-106, FRED-110, FRED-111, FRED-112, FRED-113, FRED-114, FRED-115, FRED-116, FRED-117} has a marker (✓, 🚫, or 💤). Prove this each turn by running: grep -E '^## (FRED-106|FRED-110|FRED-111|FRED-112|FRED-113|FRED-114|FRED-115|FRED-116|FRED-117) ' FREDdocs/backlog.md | grep -vE '— (✓|🚫|💤) ' and surfacing the output. Condition is met when the output is empty. Stop after 30 turns.
```

**Bucket-scoped summary grep (use in step 6 of each turn):**
```bash
grep -E '^## (FRED-106|FRED-110|FRED-111|FRED-112|FRED-113|FRED-114|FRED-115|FRED-116|FRED-117) ' FREDdocs/backlog.md | grep -vE '— (✓|🚫|💤) '
```

---

### Bucket B — Profile & Account Polish

**Worktree:** `../FRED-swarm-b`
**IDs:** FRED-120, 122, 123, 125, 126, 129, 130 (7 stories)

**Launch prompt:**
```
/backlog-exhaust --bucket=FRED-120,FRED-122,FRED-123,FRED-125,FRED-126,FRED-129,FRED-130
```

**Then paste this /goal condition:**
```
Every story heading in FREDdocs/backlog.md whose ID is in {FRED-120, FRED-122, FRED-123, FRED-125, FRED-126, FRED-129, FRED-130} has a marker (✓, 🚫, or 💤). Prove this each turn by running: grep -E '^## (FRED-120|FRED-122|FRED-123|FRED-125|FRED-126|FRED-129|FRED-130) ' FREDdocs/backlog.md | grep -vE '— (✓|🚫|💤) ' and surfacing the output. Condition is met when the output is empty. Stop after 30 turns.
```

**Bucket-scoped summary grep (step 6):**
```bash
grep -E '^## (FRED-120|FRED-122|FRED-123|FRED-125|FRED-126|FRED-129|FRED-130) ' FREDdocs/backlog.md | grep -vE '— (✓|🚫|💤) '
```

---

### Bucket C — Launch + Onboarding + New

**Worktree:** `../FRED-swarm-c`
**IDs:** FRED-168, 170, 171, 174, 176, 178, 180, 181, 183 (9 stories)

**Launch prompt:**
```
/backlog-exhaust --bucket=FRED-168,FRED-170,FRED-171,FRED-174,FRED-176,FRED-178,FRED-180,FRED-181,FRED-183
```

**Then paste this /goal condition:**
```
Every story heading in FREDdocs/backlog.md whose ID is in {FRED-168, FRED-170, FRED-171, FRED-174, FRED-176, FRED-178, FRED-180, FRED-181, FRED-183} has a marker (✓, 🚫, or 💤). Prove this each turn by running: grep -E '^## (FRED-168|FRED-170|FRED-171|FRED-174|FRED-176|FRED-178|FRED-180|FRED-181|FRED-183) ' FREDdocs/backlog.md | grep -vE '— (✓|🚫|💤) ' and surfacing the output. Condition is met when the output is empty. Stop after 30 turns.
```

**Bucket-scoped summary grep (step 6):**
```bash
grep -E '^## (FRED-168|FRED-170|FRED-171|FRED-174|FRED-176|FRED-178|FRED-180|FRED-181|FRED-183) ' FREDdocs/backlog.md | grep -vE '— (✓|🚫|💤) '
```

---

### Bucket B6 — Tab 3 Settings UI Overhaul

**Worktree:** `../FRED-swarm-b6`
**Pages:** 10 settings pages (full spec at `FREDdocs/.stories/B6-TAB3-UI-OVERHAUL.md`)
**Dev URL:** `local-b6.fredvested.com:8101`

**Launch prompt (paste into B6 session):**
```
Read FREDdocs/.stories/B6-TAB3-UI-OVERHAUL.md and follow the per-page workflow exactly. Process all 10 pages in order. For each page: (1) read the page's .ts, .html, .scss; (2) read 1–2 reference onboarding components from the spec to internalize the theme; (3) update only .html and .scss — preserve ALL .ts bindings, service calls, lifecycle hooks; (4) run npx tsc --noEmit — must exit 0; (5) commit: git commit -am "ui: B6 — overhaul <route>"; (6) check the Done box in B6-TAB3-UI-OVERHAUL.md; (7) next page. No runtime visual verification needed — Andy will inspect with ionic serve after all pages are done. Stop after 20 turns or when all 10 Done boxes are checked.
```

---

## Phase 4 — Merge Train (Andy, ~15 min)

After all sessions finish (or most have), from `FRED/` on `develop`:

```bash
git checkout develop

# Lightest churn first, UI last
git merge --no-ff swarm/bucket-b    # profile & account polish
git merge --no-ff swarm/bucket-a    # core app UX
git merge --no-ff swarm/bucket-c    # launch + onboarding + new
git merge --no-ff swarm/bucket-b6   # Tab 3 UI overhaul last
```

After each merge the primary dev env at `local.fredvested.com` auto-rebuilds (HMR + devtools). Quick smoke before the next merge.

**Expected conflicts:**
- `FREDdocs/backlog.md` — each bucket only touches its own IDs. Resolve by accepting all markers from both sides.
- Shared services — if two buckets edited the same file, resolve manually keeping both changes.
- B6 vs others — B6 only touches `.html`/`.scss`. Keep B6 structure + other bucket's added bindings.

**Final build check:**
```bash
./gradlew build -x test
npx tsc --noEmit
```

---

## Cleanup

```bash
git worktree remove ../FRED-swarm-a
git worktree remove ../FRED-swarm-b
git worktree remove ../FRED-swarm-c
git worktree remove ../FRED-swarm-b6

git branch -d swarm/bucket-a swarm/bucket-b swarm/bucket-c swarm/bucket-b6

# Remove B6 host alias from /etc/hosts if desired
```

---

## Verification

1. `grep -E '^## (FRED|DEV|QA|DESIGN)-' FREDdocs/backlog.md | grep -vE '— (✓|🚫|💤) '` → empty
2. `./gradlew build -x test && npx tsc --noEmit` → both exit 0
3. Smoke 1 story each from A, B, C at `local.fredvested.com`
4. Tab 3 sweep: all 10 settings pages show onboarding theme, all interactive elements work
