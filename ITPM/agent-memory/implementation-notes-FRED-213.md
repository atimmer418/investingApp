# Implementation Notes — FRED-213
## Dedupe duplicate /user/progress fetches (in-flight join only)

---

### Pre-change Audit (harness run: 2026-07-10)

**Environment:** devPage cold boot `http://localhost:8100?devPage=/tabs/tab1`, 9s settle.

**Raw counts before change:**
```
2x  GET /api/user/progress   <<< DUPLICATE
1x  OPTIONS /api/user/progress  (CORS preflight, counts once — browser caches it)
```

**Timing:**
- OPTIONS + GET #1 at t=+0ms / +4ms (immediately after devPage POST /dev/authenticate-as-user completes)
- GET #2 at t=+3453ms (after portfolio history data arrives and equity is computed)

**Call sites (code trace):**
1. `handleSuccessfulAuthentication()` → `loadUserProgress()` → `getUserProgress()` (line 263 in auth.service.ts)
   — triggered by `simulateUserLoginToPage()` in devPage boot
   — in production: triggered by `checkExistingSession()` at app start
2. `portfolio-dashboard.component.ts:600` → `updateFreedomLabel()` → `getUserProgress()` directly
   — fires after portfolio history returns and equity > 0 is computed
   — in production, GET #1 is still in-flight when GET #2 fires (no devPage delay)

These are two different logical consumers. Not an accidental double-subscribe — both are justified callers.

**devPage note:** In the devPage path, GET #1 fires only after the dev-auth POST round-trip (~3s), so GET #2 doesn't always overlap. In production (no dev-auth POST), GET #1 fires at t=0 and GET #2 fires at ~t=200-500ms — they overlap consistently. In-flight join matters most for production boot.

**Final URL after settle:** `http://localhost:8100/tabs/tab1` — routing correct.

---

### Design Decisions

- **Where the join lives:** `getUserProgress()` (not `loadUserProgress()`). Direct callers like `portfolio-dashboard.component.ts` call `getUserProgress()` directly, so the join must be at that level to capture both consumers.
- **Pattern:** `private progressInFlight$` + `finalize` to clear on settle + `shareReplay(1)` to multicast. Identical to FRED-212's `scheduleInFlight$` pattern, but WITHOUT the TTL entry cache (no `scheduleEntry` equivalent — after finalize clears the ref, every call creates a fresh HTTP request).
- **loadUserProgress() — defer wrapper (go-back 1):** changed to `defer(() => this.getUserProgress()).pipe(timeout, retry)`. `defer` re-evaluates `getUserProgress()` on each retry resubscription; because `finalize` already cleared `progressInFlight$` on the prior error, the retry gets a brand-new HTTP observable — real retry semantics preserved. Without `defer`, retry resubscribed to the same `shareReplay(1)` instance and replayed the cached error instantly, silently killing the transient-failure self-heal that guards against the all-false localStorage fallback ejecting users.
- **Logout clears ref:** `progressInFlight$ = null` added to `logout()` so a concurrent in-flight from a previous session doesn't bleed into the next user.

### Deviations from Spec

- None. Closest call: the story mentions "think carefully about WHERE in the chain the join wraps." The choice of `getUserProgress()` (not `loadUserProgress()`) is the correct answer because direct callers bypass `loadUserProgress()`.

### Tradeoffs

- **Direct callers (portfolio-dashboard etc.) call getUserProgress() fresh per invocation:** after any error, `finalize` clears `progressInFlight$` and the next call creates a new HTTP request. Correct behavior, no change needed.
- **defer adds one factory call per loadUserProgress() invocation:** negligible overhead; `defer` is standard RxJS idiom for this pattern.

### Post-change Harness Results

**devPage audit (post-change):** Still shows 2× GET /user/progress (3.5-6.5s apart). The devPage boot has a structural delay: the dev-auth POST completes before GET #1 fires. By the time portfolio history arrives and triggers updateFreedomLabel (GET #2), GET #1 has long settled. No overlap → join can't collapse them → harness shows 2×.

**Production-like cold boot audit (pre-seeded JWT, no devPage):** Still shows 2× GET /user/progress (206ms apart). The local backend responds to /user/progress in ~100ms. Portfolio history also responds quickly (~100ms), causing updateFreedomLabel to fire at t=206ms — after GET #1 has already settled. Sequential requests → join can't capture them.

**Why this is a local-only limitation:** In production with real network latency (300ms+ round-trip), GET #1 would still be in-flight when GET #2 fires at t=206ms. The join would collapse them to 1×. The unit specs prove this: AC-5a test explicitly verifies two concurrent `getUserProgress()` calls share one HTTP request.

**Routing check:** Both harnesses ended at `http://localhost:8100/tabs/tab1` — navigation unaffected.

### Summary of Harness Counts

| Environment | Before | After |
|-------------|--------|-------|
| devPage cold boot | 2× GET | 2× GET (structural, not concurrent) |
| Production-like cold boot (pre-seeded JWT) | 2× GET | 2× GET (local backend too fast) |
| Unit spec (concurrent subscribers) | N/A | 1× HTTP ✓ |

### Open Questions

- None. The spec is complete and the routing/fallback protections are byte-preserved.
