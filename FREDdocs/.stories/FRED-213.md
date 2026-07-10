# FRED-213 — Dedupe duplicate /user/progress fetches (in-flight join only)

## Before (backlog entry, verbatim)

> ## FRED-213 — Dedupe duplicate /user/progress fetches (in-flight join only)
> The FRED-212 verifier's boot audits show GET /api/user/progress firing 2× on tab1 cold boot (builder saw 3× in one run). userProgress is auth-adjacent and the app's ROUTING AUTHORITY (navigateBasedOnProgress, tier gating, onboarding steps) and it MUTATES constantly during onboarding — so unlike FRED-212's endpoints it must NOT get a TTL cache: any staleness risks the progress-fallback-ejects-user class of bug. Fix = in-flight single-flight ONLY: concurrent callers join one HTTP request; once settled, the next call always fetches fresh. Zero staleness by construction, burst deduped.

## After (structured ticket)

**One-line summary:** Audit where the duplicate boot-time /user/progress calls originate, then add an in-flight-join (shareReplay while pending, cleared on settle — success AND error) to the progress fetch path in AuthService so concurrent bursts produce one request, with zero post-settle caching and no change to routing/fallback semantics.

**Label:** `[code]` · **Time estimate:** `<1hr`

### Files / systems involved

- `frontend/src/app/services/auth.service.ts` — the progress fetch path (`loadUserProgress` / `getUserProgress`) incl. its existing timeout+retry+fallback machinery (memory: transient failure → all-false localStorage fallback ejects users — DO NOT alter that logic's semantics; the join wraps the HTTP source only).
- Callers (audit determines the true burst source): `app.component.ts` boot/routing path, tab pages, investment-schedule, my-profile, first-time tour, MFU checks.
- **Reference:** FRED-212's single-flight implementations (same file) — but WITHOUT the TTL entry cache.

### Acceptance Criteria

1. **Audit first.** implementation-notes-FRED-213.md documents where each boot-time /user/progress request originates (harness request log + call-site trace) BEFORE changes, including whether any duplication is devPage-boot-only.
2. **In-flight join only.** Concurrent /user/progress requests collapse to exactly ONE HTTP call (harness proof on tab1 cold boot: 1×); the shared in-flight observable is cleared on settle — success AND error — so the NEXT call after settlement always issues a fresh request. NO TTL entry cache, no post-settle reuse, nothing persisted.
3. **Routing/fallback semantics byte-preserved.** The timeout+retry+fallback behavior, `_source` semantics, navigateBasedOnProgress inputs, and the localStorage fallback path behave exactly as before (diff limited to wrapping the HTTP source in the join; the progress-fallback-ejects-user protections untouched). Auth headers/interceptors untouched.
4. **Mutation safety.** Progress mutations (updateUserProfile, onboarding step updates, authfinalize) are unaffected — with no settled cache there is nothing to invalidate; a mutation followed by a progress read fetches fresh (spec-proven).
5. **Specs.** Targeted spec: (a) two concurrent subscribers → one HTTP request, both receive the response; (b) after settle, a third subscriber → a NEW request; (c) an errored request propagates to all joined subscribers and the next call fetches fresh. Run via targeted ng test --include only.
6. **Quality gates.** `ng build --configuration dev` AOT-clean; lint clean; existing auth-related targeted specs still green; no TODOs.

### Edge cases

- The join must not convert the existing timeout/retry behavior into a shared failure for joiners who arrived after a retry began (joiners share whatever the wrapped source emits — acceptable as long as semantics match a single caller's experience).
- Logout during an in-flight progress fetch — cleared reference, no cross-user replay.
- devPage boot path duplication that is dev-only: fix real duplication; document any dev-only remainder.

### Open questions (non-blocking)

- If the audit shows the 2× comes from two DIFFERENT logical consumers (e.g. boot routing + a tab component both needing progress at the same instant), the join fixes it without changing either consumer; only if it's an accidental double-subscribe should the redundant caller also be cleaned up (builder judges, documents).
