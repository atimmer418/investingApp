# Cloud Verification Tier — Plan 1: PR-gated CI Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up FRED's first CI — a GitHub Actions pipeline that boots an offline ephemeral backend, runs the real Phase 2 API + frontend unit checks, and gates `develop` via PRs — plus the verifier `PROVISIONAL` handoff and a Tier-A linter fix.

**Architecture:** A new Spring `ci` profile makes the backend boot with no network (externals guarded by `@Profile("!ci")`). GitHub Actions runs a Linux job (MySQL service container → `bootRun` ci → `test/api/*.sh` → `tsc` → `ng test`) on every PR to develop. itpm-execute opens a PR instead of pushing story code directly; the verifier marks runtime checks `deferred-to-CI` + `PROVISIONAL`; auto-merge on green.

**Tech Stack:** Spring Boot (Java), GitHub Actions, MySQL service container, Angular CLI/karma, `gh` CLI.

**Spec:** `docs/superpowers/specs/2026-06-13-cloud-verification-tier-design.md` (§5, §7, §9; §3 gate). Plan 2 (iOS device-visual + design-fidelity) follows.

---

## Task 1: Fix the Tier-A linter false-positive (global utility class)

The linter flags elements whose safe-area padding comes from the global `.safe-area-top` class (it only parses component SCSS). Recognize that class on HTML elements.

**Files:**
- Modify: `test/ui/safe-area-lint.mjs` (the `lintHtml` advisory + the `main()` advisory-pairing at lines ~107-148)

- [ ] **Step 1: Confirm the false positive reproduces**

Run:
````bash
node test/ui/safe-area-lint.mjs --files="frontend/src/app/tab3/tab3.page.html,frontend/src/app/tab3/tab3.page.scss"
````
Expected: flags `.custom-profile-header` (or current tab3 header) even though `global.scss` gives it `.safe-area-top`.

- [ ] **Step 2: Teach the linter the global safe-area utility classes**

In `test/ui/safe-area-lint.mjs`, add near the top (after `NOTCH_MIN`):
````javascript
// Global utility classes that supply env(safe-area-inset-top) from global.scss.
// An element carrying one of these is already safe even if its component SCSS doesn't mention insets.
const GLOBAL_SAFE_TOP_CLASSES = ['safe-area-top'];
````
In `lintHtml`, when building the advisory for an `<ion-header> > <div>`, skip it if the div's class list includes any `GLOBAL_SAFE_TOP_CLASSES` entry. Replace the advisory push with a guard:
````javascript
const classList = ((m[1].match(/class\s*=\s*"([^"]*)"/) || [])[1] || '').split(/\s+/);
if (classList.some(c => GLOBAL_SAFE_TOP_CLASSES.includes(c))) return; // safe via global utility
````
And in `lintScss`, before flagging, skip a block whose selector targets a class in `GLOBAL_SAFE_TOP_CLASSES` (those are the global utilities themselves).

- [ ] **Step 3: Verify the false positive is gone, real bug still caught**

Run:
````bash
node test/ui/safe-area-lint.mjs --files="frontend/src/app/tab3/tab3.page.html,frontend/src/app/tab3/tab3.page.scss"; echo "exit=$?"
node test/ui/safe-area-lint.mjs --files="frontend/src/app/change-bank-account/change-bank-account.page.scss"; echo "exit=$?"
````
Expected: tab3 → `exit=0` (no longer flagged); change-bank-account historical pattern still `exit=1` if reverted (it's currently fixed, so confirm against a known-bad fixture or the git-history version). Add a note to `.claude/agent-memory/findings.md` that the global-class blind spot is fixed.

- [ ] **Step 4: Commit**

````bash
git add test/ui/safe-area-lint.mjs .claude/agent-memory/findings.md
git commit -m "fix(verifier): safe-area-lint recognizes global .safe-area-top utility (no false positive)"
````

---

## Task 2: Backend `ci` profile — offline-bootable config

**Files:**
- Create: `backend/src/main/resources/application-ci.properties`
- Read first: `backend/src/main/resources/application.properties` and `application-local.properties` (model the same keys)

- [ ] **Step 1: Read the existing properties to model `ci`**

Run:
````bash
ls backend/src/main/resources/application*.properties
sed -n '1,80p' backend/src/main/resources/application-local.properties
grep -nE "datasource|jpa|hibernate|scheduler|pinecone|plaid|alpaca|openai|persona|base-url|api.key|enabled" backend/src/main/resources/application*.properties
````

- [ ] **Step 2: Create `application-ci.properties`**

Create `backend/src/main/resources/application-ci.properties` with: a MySQL datasource pointing at the CI service container, DDL auto-update, the scheduler disabled, and every external base-url pointed at a dead localhost port (so any lazy call fails fast rather than hits prod). Mirror the key NAMES found in Step 1; the values below are the CI overrides:
````properties
spring.datasource.url=jdbc:mysql://127.0.0.1:3306/fred?allowPublicKeyRetrieval=true&useSSL=false
spring.datasource.username=root
spring.datasource.password=ci
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
# disable scheduled investment jobs in CI
investment.scheduler.enabled=false
# point all external integrations at a dead local port; the ci-profile guards (Task 3) stop boot-time beans
# (use the exact property keys discovered in Step 1; examples:)
pinecone.api.key=ci-disabled
plaid.base-url=http://127.0.0.1:9
alpaca.base-url=http://127.0.0.1:9
openai.base-url=http://127.0.0.1:9
persona.base-url=http://127.0.0.1:9
# a deterministic JWT secret for CI so dev-auth tokens validate
jwt.secret=ci-only-deterministic-secret-do-not-use-in-prod-0123456789abcdef
````

- [ ] **Step 3: Commit**

````bash
git add backend/src/main/resources/application-ci.properties
git commit -m "feat(backend): add ci Spring profile properties (offline, dead external base-urls)"
````

---

## Task 3: Guard boot-time external beans with `@Profile("!ci")`

`PineconeConfig`, `PlaidConfig`, and `FredKnowledge` build clients / load data at startup and will throw offline. Guard them and provide `ci` no-ops.

**Files:**
- Modify: `backend/src/main/java/com/investingapp/backend/config/PineconeConfig.java`
- Modify: `backend/src/main/java/com/investingapp/backend/config/PlaidConfig.java`
- Modify: `backend/src/main/java/com/investingapp/backend/config/FredKnowledge.java`
- (Discover any others — Step 1)

- [ ] **Step 1: Find every boot-time external bean**

Run:
````bash
grep -rn "new Pinecone\|Pinecone.Builder\|PlaidApi\|new ApiClient\|@PostConstruct\|IllegalStateException\|@Value(\"\${.*api.key" backend/src/main/java/com/investingapp/backend/config
````
List every `@Configuration`/`@Bean`/`@Component` that builds an external client or reads an API key at construction.

- [ ] **Step 2: Guard each one**

For each boot-time external bean class, add `@Profile("!ci")` to the `@Configuration`/`@Component` (import `org.springframework.context.annotation.Profile`). Where another bean *depends* on the guarded one, provide a `@Profile("ci")` no-op alternative bean of the same type (return a stub that throws only if actually called, or a Mockito-free hand-written stub). Read each class before editing; preserve all existing behavior under the non-ci profile.

Example (PineconeConfig):
````java
@Configuration
@Profile("!ci")               // <-- add; do not load Pinecone in CI
public class PineconeConfig { /* unchanged */ }
````
If a service `@Autowired`s the Pinecone client unconditionally, add a `@Profile("ci")` stub `@Configuration` exposing a no-op client bean so the context still wires.

- [ ] **Step 3: Verify the backend boots under `ci` against a local MySQL**

Run (Docker present locally):
````bash
docker run -d --rm --name fred-ci-mysql -e MYSQL_ROOT_PASSWORD=ci -e MYSQL_DATABASE=fred -p 3306:3306 mysql:8.0
# wait ~20s for mysql, then:
cd backend && SPRING_PROFILES_ACTIVE=ci timeout 120 ./gradlew bootRun 2>&1 | tee /tmp/ci-boot.log &
for i in $(seq 1 60); do curl -sf localhost:8080/actuator/health && break; sleep 2; done
grep -i "Started BackendApplication\|APPLICATION FAILED" /tmp/ci-boot.log
docker stop fred-ci-mysql
````
Expected: `Started BackendApplication` (context boots, no Pinecone/Plaid failure). If a bean still fails, add it to the guard set and repeat. **This is the de-risking gate — do not proceed until the backend boots offline under `ci`.**

- [ ] **Step 4: Commit**

````bash
git add backend/src/main/java/com/investingapp/backend/config/
git commit -m "feat(backend): @Profile(!ci) guards on boot-time external beans (Pinecone/Plaid/RAG)"
````

---

## Task 4: CI seed users for dev-auth

`/api/dev/authenticate-as-user` (`DevAuthController`) returns a token only if the user row exists. Seed the two test users under the `ci` profile.

**Files:**
- Create: `backend/src/main/java/com/investingapp/backend/config/CiSeedConfig.java`
- Read first: `model/User.java`, `model/UserProgress.java` (required fields), `controller/DevAuthController.java` (which users it expects)

- [ ] **Step 1: Read the entities + dev-auth to learn required fields**

Run:
````bash
sed -n '1,60p' backend/src/main/java/com/investingapp/backend/controller/DevAuthController.java
grep -nE "private .*;|@Column|nullable = false" backend/src/main/java/com/investingapp/backend/model/User.java | head -40
grep -nE "private .*;|@Column" backend/src/main/java/com/investingapp/backend/model/UserProgress.java | head -30
````

- [ ] **Step 2: Write the `ci` seed runner**

Create `CiSeedConfig.java`: a `@Configuration @Profile("ci")` with a `CommandLineRunner` that, if absent, inserts `facebook@gmail.com` and `hottie2@yn.con` (each with a `UserProgress` row), populating only the non-nullable fields found in Step 1. Use the existing `UserRepository`/`UserProgressRepository`. Idempotent (check `existsByEmail` first).
````java
@Configuration
@Profile("ci")
public class CiSeedConfig {
  @Bean
  CommandLineRunner seedCiUsers(UserRepository users, UserProgressRepository progress) {
    return args -> {
      for (String email : new String[]{"facebook@gmail.com", "hottie2@yn.con"}) {
        if (users.existsByEmail(email)) continue;
        User u = new User();
        u.setEmail(email);
        // set the remaining NON-NULLABLE fields discovered in Step 1
        users.save(u);
        UserProgress p = new UserProgress();
        // link p to u + set non-nullable fields
        progress.save(p);
      }
    };
  }
}
````

- [ ] **Step 3: Verify dev-auth returns a token under `ci`**

With the ci backend running (Task 3 Step 3 harness):
````bash
curl -s -X POST localhost:8080/api/dev/authenticate-as-user -H 'Content-Type: application/json' -d '{"email":"facebook@gmail.com"}' | head -c 200
````
Expected: a JSON body containing a JWT (not an error). Confirm `test/api/lib/auth.sh` then exports `$TOKEN`.

- [ ] **Step 4: Commit**

````bash
git add backend/src/main/java/com/investingapp/backend/config/CiSeedConfig.java
git commit -m "feat(backend): seed dev-auth test users under ci profile"
````

---

## Task 5: GitHub Actions Linux job (FRED's first CI)

**Files:**
- Create: `.github/workflows/verify.yml`
- Read first: `backend/build.gradle` (Java version), `frontend/package.json`/`.nvmrc` (Node version)

- [ ] **Step 1: Confirm Java + Node versions**

Run:
````bash
grep -nE "sourceCompatibility|languageVersion|JavaLanguageVersion" backend/build.gradle
cat .nvmrc 2>/dev/null; grep -n '"node"' frontend/package.json 2>/dev/null
````
Use these exact versions in the workflow (below assumes Java 21 / Node 22 — replace with what you find).

- [ ] **Step 2: Write the workflow**

Create `.github/workflows/verify.yml`:
````yaml
name: verify
on:
  pull_request:
    branches: [develop]
jobs:
  backend-frontend:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env: { MYSQL_ROOT_PASSWORD: ci, MYSQL_DATABASE: fred }
        ports: ['3306:3306']
        options: >-
          --health-cmd="mysqladmin ping -h 127.0.0.1 -uroot -pci"
          --health-interval=5s --health-timeout=3s --health-retries=20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21' }   # <- from Step 1
      - uses: actions/setup-node@v4
        with: { node-version: '22' }                          # <- from Step 1
      - name: Boot backend (ci profile)
        working-directory: backend
        run: |
          SPRING_PROFILES_ACTIVE=ci ./gradlew bootRun > /tmp/boot.log 2>&1 &
          for i in $(seq 1 90); do curl -sf localhost:8080/actuator/health && break; sleep 2; done
          curl -sf localhost:8080/actuator/health || { echo "backend failed to boot"; tail -50 /tmp/boot.log; exit 1; }
      - name: Phase 2 — API contract
        run: bash test/api/run-all.sh
      - name: Frontend — install + tsc + unit
        working-directory: frontend
        run: |
          npm ci --legacy-peer-deps
          npx tsc --noEmit
          npx ng test --watch=false --browsers=ChromeHeadless
````
(If the legacy karma suite is red, scope `ng test` to a curated set with `--include` per findings.md — confirm during Step 3.)

- [ ] **Step 3: Validate the workflow locally where possible**

Run `act` if available, or push a throwaway PR to confirm the job goes green. Confirm `test/api/config.local.sh` equivalents are provided in CI (the scripts read `BASE_URL=localhost:8080`).

- [ ] **Step 4: Commit**

````bash
git add .github/workflows/verify.yml
git commit -m "ci: add verify workflow (ephemeral backend + Phase 2 API + tsc + ng test) on PRs to develop"
````

---

## Task 6: Verifier `PROVISIONAL` verdict + deferred-to-CI

**Files:**
- Modify: `.claude/agents/verifier-agent.md`

- [ ] **Step 1: Add the PROVISIONAL verdict + deferral**

In `verifier-agent.md`, change the three "skip and note" branches (Phase 2 `:8080` probe ~line 90; Phase 3 tunnel probe ~line 117; frontend-unit `ng test` ~line 73 in the Selective xUnit block) so that, when the runtime check cannot run locally, the verifier sets that manifest check `Status: deferred-to-CI` and emits a fourth verdict value **PROVISIONAL** (never APPROVED). Add to the Output Format header line:
````
APPROVED / PROVISIONAL / REVISION REQUIRED
````
and a rule: "PROVISIONAL = static tier passed but one or more runtime checks are deferred to CI; the PR's CI run is the authoritative gate. Never APPROVED while any check is deferred-to-CI."

- [ ] **Step 2: Verify**

Run: `grep -n "PROVISIONAL\|deferred-to-CI" .claude/agents/verifier-agent.md` — expect the new verdict + deferral language present, and the report-only invariant unchanged.

- [ ] **Step 3: Commit**

````bash
git add .claude/agents/verifier-agent.md
git commit -m "feat(verifier-agent): PROVISIONAL verdict + deferred-to-CI for un-runnable runtime checks"
````

---

## Task 7: itpm-execute — open a PR instead of pushing story code

**Files:**
- Modify: `.claude/skills/itpm-execute/SKILL.md` (Step C/E; the `git push origin develop` of story code at ~line 74 and the completion push ~160-161)

- [ ] **Step 1: Change the build flow to PR-based**

In Step C, replace the direct story-code push with: create a branch `verify/<story-id>`, commit the builder's changes there, `gh pr create --base develop --head verify/<story-id>` with the story summary, capture the chosen UI mockup as `ITPM/verify/design-ref/<story-id>.png` (for Plan 2), enable auto-merge (`gh pr merge --auto --squash`). The dashboard (`today.html`) commits stay on develop directly. Add the exact `gh` commands and a note that the verifier's PROVISIONAL verdict is expected (CI confirms).

- [ ] **Step 2: Gate completion on CI in Step E**

In Step E, do NOT set `data-state="completed"` on PROVISIONAL. Set `data-state="verifying-in-ci"`; poll the PR check status (`gh pr checks <num> --watch` or a bounded poll); on success → auto-merge fires → set `completed`; on failure → `failed` with the CI evidence (link + logs) and run the bounded fix-loop on the PR branch.

- [ ] **Step 3: Verify**

Run: `grep -n "gh pr create\|verify/<story-id>\|verifying-in-ci\|auto-merge\|design-ref" .claude/skills/itpm-execute/SKILL.md` — expect the PR flow present and the old direct story-code `git push origin develop` replaced. (Dashboard/today.html pushes to develop remain.)

- [ ] **Step 4: Commit**

````bash
git add .claude/skills/itpm-execute/SKILL.md
git commit -m "feat(itpm-execute): PR-based gate — open PR, capture design-ref, gate completion on CI"
````

---

## Task 8: Branch protection on develop

**Files:** none (GitHub config; document it).

- [ ] **Step 1: Require the verify check before merge**

Run (needs a `repo`-scoped token):
````bash
gh api -X PUT repos/atimmer418/FRED/branches/develop/protection \
  -F required_status_checks.strict=true \
  -F 'required_status_checks.contexts[]=backend-frontend' \
  -F enforce_admins=false \
  -F required_pull_request_reviews= -F restrictions=
````
Confirm in the GitHub UI: Settings → Branches → develop → "Require status checks" → `backend-frontend`. Document this one-time setup in `FREDdocs/` (or the spec).

- [ ] **Step 2: Confirm the gate**

Open a throwaway PR with a deliberately failing API test; confirm it cannot auto-merge until red→green. Then revert.

---

## Self-Review (completed by plan author)

**1. Spec coverage:** §5 ci-profile → Tasks 2–4; §5 Linux job → Task 5; §9 PROVISIONAL/deferred → Task 6; §3 PR gate + itpm flow → Tasks 7–8; §7 linter fix → Task 1. Plan 2 covers §6 (macOS device-visual) + §8 (design-fidelity) + the design-ref *consumption* (Task 7 only captures it). Gap: none for Plan 1's scope.

**2. Placeholder scan:** version numbers (Java 21/Node 22), property key names, and entity fields are explicitly "read first / confirm in Step 1" steps with the discovery command — concrete, not placeholders. The `<story-id>`/`<num>` are runtime template tokens.

**3. Type consistency:** the `ci` profile name, `deferred-to-CI` status, `PROVISIONAL` verdict, `verify/<story-id>` branch, and the `backend-frontend` job/check name are used identically across Tasks 2–8.

**Ordering:** Task 1 (linter) is independent — ship first. Tasks 2→3→4 build the offline backend (Task 3 Step 3 is the de-risk gate). Task 5 needs 2–4. Tasks 6–8 wire the gate. Task 5 must go green before Task 8 enforces it.
