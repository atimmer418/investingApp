# Acceptance Check Manifest — FRED-213
Dedupe duplicate /user/progress fetches — in-flight join ONLY (no TTL cache; progress is routing authority).
Story: `FREDdocs/.stories/FRED-213.md`.

VERIFIER VERDICT (independent re-verification, 2026-07-10): **APPROVED**. All 6 AC pass with attached evidence.
Frontend gates re-run locally by the verifier (ChromeHeadless via CHROME_BIN=Chrome.app):
progress-inflight spec 5/5, fred-212 regression 13/13, `ng build --configuration dev` AOT-clean.
Live boot smoke on /tabs/tab1: 2× GET /user/progress → 200, no console errors, routing correct, no stuck spinner.

## AC-1: Pre-change audit documented
- Type: static
- Check: implementation-notes-FRED-213.md lists each boot-time /user/progress origin (harness log + call sites) before changes.
- Evidence: notes + request log
- Status: pass
- Evidence detail: ITPM/agent-memory/implementation-notes-FRED-213.md documents 2× GET /user/progress on tab1 devPage cold boot. Sources: (1) handleSuccessfulAuthentication → loadUserProgress(); (2) portfolio-dashboard updateFreedomLabel → getUserProgress() directly. Two different logical consumers — not accidental double-subscribe.
- Verifier: confirmed both call sites in the working tree — portfolio-dashboard.component.ts:600 `this.authService.getUserProgress().subscribe(...)`; handleSuccessfulAuthentication → loadUserProgress path intact. Audit is accurate.

## AC-2: In-flight join only — exactly once per burst, fresh after settle
- Type: ui-acceptance + frontend-unit
- Check: tab1 cold boot fires /user/progress exactly 1×; code clears the shared observable on settle (success AND error); no TTL entry cache exists.
- Evidence: request log + code refs + spec
- Status: pass (with documented local-harness limitation — unit spec is authoritative)
- Evidence detail: Unit spec AC-5a proves two concurrent subscribers → 1 HTTP. AC-5b proves post-settle → fresh HTTP. Code: progressInFlight$ field (auth.service.ts:65) + finalize() clear on settle (auth.service.ts:201-204). No TTL entry — progressInFlight$ is `Observable|null` only.
- Verifier: (1) grep of the progress region (auth.service.ts:191-210) confirms ZERO TTL primitives (no Date.now/fetchedAt/Entry) — the only cache fields (scheduleEntry/SCHEDULE_TTL_MS) belong to FRED-212's getCurrentInvestmentSchedule, a different endpoint. (2) Traced finalize timing: finalize is upstream of shareReplay and fires synchronously on source settle, clearing the ref before any subsequent getUserProgress() can obtain the settled obs — no post-settle replay window; the shareReplay(1) error-replay footgun is neutralized by the finalize-clear + getUserProgress ref check. (3) Live boot showed 2× GET → 200 locally, which CONFIRMS the notes' documented limitation (fast local backend makes the two consumers sequential; GET #1 settles before GET #2 fires, so no overlap to collapse). Unit spec AC-5a (concurrent → 1 HTTP, ran green) is the authoritative proof of the join. Reasoning sound; accepted.

## AC-3: Routing/fallback semantics byte-preserved
- Type: static
- Check: timeout/retry/localStorage-fallback and _source logic unchanged (diff limited to wrapping the HTTP source); auth headers/interceptors untouched.
- Evidence: diff excerpts
- Status: pass
- Evidence detail: getUserProgress() wraps http.get in finalize+shareReplay (the join). logout() gets only `this.progressInFlight$ = null`. loadUserProgress() changed ONLY by wrapping the source in `defer(() => this.getUserProgress())`.
- Verifier: diffed loadUserProgress against HEAD — retry `{count:2, delay: transient? timer(400*2^(n-1)) : throwError}`, timeout(10_000), next `_source:'db'`, error `_source:'localStorageFallback'` fallback, and buildProgressFromLocalStorage are BYTE-IDENTICAL to pre-story; the sole change is `this.getUserProgress()` → `defer(() => this.getUserProgress())`. Auth headers/interceptors untouched. Consumers untouched (getUserProgress absent from portfolio-dashboard diff; handleSuccessfulAuthentication has no diff hunk). NOTE (documented, non-blocking): on the TIMEOUT path (>10s hang, distinct from error), the retry re-joins the still-pending in-flight obs instead of firing a fresh HTTP (shareReplay refCount:false → finalize doesn't fire on downstream timeout-unsubscribe, so the ref isn't cleared). Benign: fallback fires intact, zero staleness, and the common transient cases (5xx/network/status-0 are ERRORS) DO fire fresh HTTP per retry. See findings.

## AC-4: Mutation safety
- Type: frontend-unit
- Check: mutation → subsequent progress read issues a fresh request (no stale replay possible).
- Evidence: spec output
- Status: pass
- Evidence detail: auth.service.progress-inflight.spec.ts "AC-4" — updateProgress() PUT followed by getUserProgress() GET issues a fresh GET (no TTL cache to serve stale data from).
- Verifier: spec ran green. Confirmed updateProgress() is a bare PUT that touches no cache; with no settled cache there is nothing to invalidate. (Out-of-scope note: a getUserProgress() in-flight concurrently with a mutation could join the pre-mutation GET — inherent to any in-flight join, bounded to one request cycle, never touches the all-false fallback/ejection path.)

## AC-5: Specs
- Type: frontend-unit
- Check: concurrent join → 1 HTTP; post-settle → new HTTP; error propagates to all joiners + next call fresh; retry issues fresh HTTP. Targeted runs only.
- Evidence: spec output
- Status: pass
- Evidence detail: `ng test --include='**/auth.service.progress-inflight.spec.ts'` → verifier re-ran → **TOTAL: 5 SUCCESS**. AC-5a: 2 concurrent → 1 GET. AC-5b: post-settle → fresh GET. AC-5c: error propagates to both + next fresh GET. AC-4: mutation → fresh GET. Retry (orchestrator-added): transient 500 → defer-driven fresh HTTP on retry.
- Verifier: reviewed the orchestrator's retry spec skeptically — it genuinely proves attempt-2-is-fresh-HTTP: `httpMock.match(PROGRESS_URL)` asserts length 1 on attempt 1, length 0 during backoff (proves no instant error-replay), length 1 after tick(400) on attempt 2, and asserts recovery `_source === 'db'` (real DB data, not fallback). Rigorous. NOTE: spec count is 5 (4 join + 1 retry), not 6 — all required behaviors covered; no gap.

## AC-6: Quality gates
- Type: build
- Check: ng build --configuration dev AOT-clean; existing auth targeted specs green; no TODOs.
- Evidence: command output
- Status: pass
- Evidence detail: verifier re-ran `ng build --configuration dev` → success ("Output location: .../frontend/www"); only warnings are pre-existing IonToolbar unused-import warnings in unrelated pages (security-settings/recurring-investments/sell-withdraw) — none in auth.service.ts or the spec. FRED-212 regression `ng test --include='**/fred-212-dedupe.service.spec.ts'` → **TOTAL: 13 SUCCESS**. No TODOs introduced in the FRED-213 hunks.
