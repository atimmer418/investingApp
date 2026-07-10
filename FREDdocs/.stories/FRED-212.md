# FRED-212 — Dedupe boot-time API calls via single-flight stores

## Before (backlog entry, verbatim)

> ## FRED-212 — Dedupe boot-time API calls via single-flight stores
> The FRED-211 verifier observed tab3 boot firing duplicated API calls — portfolio/dashboard, investment-schedule/current, and the Alpaca account/KYC-status endpoints each ~4× per cold boot. Root cause: multiple boot-time consumers (freedom stats, profile badge, MFU checks, dashboard priming…) each call the underlying service methods independently. Fix with the codebase's established single-flight pattern (FRED-205's PortfolioStoreService: shareReplay(1)-backed in-memory cache where concurrent subscribers join one in-flight HTTP call), extended/reused — NOT a new state-management framework. Outcome: each of those endpoints fires exactly once per cold boot with unchanged data for every consumer.

## After (structured ticket)

**One-line summary:** Audit the app's boot network traffic, then route every consumer of the duplicated endpoints (portfolio dashboard, investment-schedule current, Alpaca account/KYC status) through single-flight, short-TTL cached observables in the FRED-205 store pattern so each endpoint fires exactly once per cold boot — behavior and payloads unchanged.

**Label:** `[code]` · **Time estimate:** `1-3hr`

### Files / systems involved

- `frontend/src/app/services/portfolio-store.service.ts` — the FRED-205 single-flight store (shareReplay(1), prime(), load$(), TTL). NOTE: carries uncommitted FRED-205/206 work in the tree — extend it, don't fork or regress it.
- `frontend/src/app/services/investment.service.ts`, the KYC/account-status service(s), and whichever services expose the duplicated endpoints — add single-flight wrappers there or route through a store.
- Consumers to be rewired (investigation determines the full list): tab3.page.ts, freedom-stats.service.ts, my-profile/profile-badge sources, MFU checks, portfolio-dashboard priming path.
- **Reference:** findings.md `rxjs/shareReplay` note (refCount:false is the correct single-flight primitive) and the FRED-205 story/manifest.

### Acceptance Criteria

1. **Audit first.** A boot network audit (headless harness request log) documents every duplicated endpoint on cold boot of tabs 1 and 3, with the call sites responsible — written to `ITPM/agent-memory/implementation-notes-FRED-212.md` BEFORE changes.
2. **Exactly once.** After the fix, a cold boot (devPage → tab3, and separately tab1) fires **exactly one** request each to portfolio/dashboard, investment-schedule/current, and the Alpaca account/KYC-status endpoint(s), regardless of consumer count — proven by the harness request log (before/after counts in the notes).
3. **Pattern conformance.** Dedupe uses the FRED-205 single-flight approach — `shareReplay(1)` (refCount:false) in-memory observables with a short TTL and a force-refresh bypass — extending `PortfolioStoreService` where the endpoint already belongs to it, or adding the same minimal pattern inside the owning service. No NgRx/new state library; no new global patterns.
4. **Behavior identity.** Every consumer receives the same payload shape/values as before; pull-to-refresh and any explicit refresh paths still force a fresh fetch (bypass the cache); KYC/status-driven UI (profile badge, banners) still updates on the same triggers.
5. **Auth untouched.** No changes to auth/JWT handling, interceptors, or request headers; 401 handling behaves as before (a cached observable must not replay a stale 401 — errors are not cached).
6. **FRED-205/206 coexistence.** The uncommitted store/snapshot work in the tree is preserved (no regression to prime()/cover-gate/snapshot paths — diff-prove the existing store API is intact).
7. **Quality gates.** `ng build --configuration dev` AOT-clean; lint clean on touched files; existing targeted specs for touched services still green (portfolio-store spec if present; targeted runs only); new/updated spec covering the single-flight join (two concurrent subscribers → one HTTP call — httpMock.match pattern per findings note); no TODOs.

### Edge cases

- Two subscribers where the first errors: error must propagate to both and NOT be cached (next subscriber triggers a fresh call).
- TTL expiry mid-session → next consumer refetches once.
- Force-refresh while a cached value exists → one new request, subscribers see fresh data.
- Logout/user switch → caches keyed or cleared per user (no cross-user bleed).
- Slow endpoint: late subscribers join the in-flight request rather than timing out independently.

### Open questions (non-blocking)

- Whether the ~4× multiplier is partly the devPage boot path double-initializing — the audit answers this; if some duplication is dev-only, fix the real-app duplication and document the dev-only remainder.
