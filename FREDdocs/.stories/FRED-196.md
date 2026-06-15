# FRED-196 — tab3 Freedom Age blanks on flaky KYC call

**Label:** [code] **Estimate:** 1-3hr

## Before (backlog.md, verbatim)
> ## FRED-196 — 💤 tab3 Freedom Age blanks on flaky KYC call
> tab3 Freedom Age stat shows "-" when the Alpaca GET /alpaca/account/kyc call (its birthYear source, a third call separate from the two that feed Freedom Date and To Go) fails or returns no DOB on weak connections — the KYC error handler opens the render gate without setting birthYear, so Freedom Date and To Go render real values while Freedom Age silently blanks. Give Freedom Age its own fallback/retry (e.g. retry the KYC call on transient errors, and/or a clearer placeholder) so a flaky Alpaca call doesn't silently blank it.

## After

### One-line summary
Make tab3's "Freedom Age" tile resilient to a flaky/failed Alpaca KYC call so it doesn't silently blank to "—" while Freedom Date and To Go show real values.

### Root cause (from the 2026-06-14 root-cause workflow)
- `tab3.page.ts → loadStatStrip()` fires three parallel calls behind one render gate `tryRender()` (requires `progressDone && portfolioDone && kycDone`).
- Freedom Date + To Go derive from `GET /user/progress` (`AuthService.getUserProgress`) and `GET /portfolio/dashboard` (`PortfolioService.getPortfolioDashboard`).
- Freedom Age additionally needs `birthYear`, parsed from `kyc.identity.date_of_birth`, sourced ONLY from `AlpacaService.getKycData()` → `GET /alpaca/account/kyc`.
- The KYC `error` handler (tab3.page.ts ~395) does `kycDone = true; tryRender();` WITHOUT setting `birthYear`; the missing/blank/non-numeric DOB path also leaves `birthYear` null. So the gate opens, the other two tiles render real values, and Freedom Age renders "—".

### Files / systems
- `frontend/src/app/tab3/tab3.page.ts` — `loadStatStrip()` KYC subscribe + error handler, and the `freedomAge` assignment branch.
- `frontend/src/app/services/alpaca.service.ts` — `getKycData()` (line ~166): add bounded transient retry, mirroring the pattern just shipped in `AuthService.loadUserProgress`.
- `frontend/src/app/tab3/tab3.page.html` — Freedom Age stat tile: distinguish "loading" vs "unavailable".

### Doc references
- `FREDdocs/API_ENDPOINTS.md` — KYC / portfolio / progress routes.
- Alpaca Broker API (accounts/KYC), source of truth: https://docs.alpaca.markets/reference/api-references — see `.claude/REFERENCES.md`.
- Reuse the transient-retry shape shipped this session in `frontend/src/app/services/auth.service.ts` (`loadUserProgress`): retry only on TimeoutError / status 0 / status ≥ 500, never on 401/403/404.

### Acceptance criteria
1. The KYC fetch feeding Freedom Age (`getKycData()` or its tab3 call site) retries on transient failures only — TimeoutError / HTTP status 0 / status ≥ 500 — with bounded backoff; it MUST NOT retry 401/403/404. Mirror `loadUserProgress`'s retry shape for consistency.
2. When the KYC call ultimately fails after retries, Freedom Age is visually distinguishable from the plain empty placeholder (e.g. a retry affordance or an "unavailable" treatment) — a failure must not look identical to "still loading." (Honors CONTEXT.md test #3: error states are designed, not blank.)
3. "Missing data" and "failed to load" are handled distinctly: if KYC succeeds but `date_of_birth` is genuinely absent (e.g. pre-KYC user), Freedom Age shows the normal "—" with no error treatment.
4. Freedom Date and To Go are unaffected — they continue to render from `/user/progress` + `/portfolio/dashboard` regardless of KYC outcome; no new coupling to `birthYear`.
5. The render gate still opens once all three calls settle — the strip must not hang on a permanently-failing KYC call.
6. Happy path unchanged: with a valid DOB, Freedom Age = `resolvedFreedomYear − birthYear` as today.

### Edge cases / open questions
- UX decision (Andy): on persistent KYC failure, inline "retry" on the Age tile, or a quiet "—" with the real value deferred to next visit?
- Backend behavior: does `/alpaca/account/kyc` return 200-with-no-DOB for not-yet-verified accounts, or a 4xx? Determines whether "missing DOB" vs "failed" is distinguishable from the response (may need a quick backend check).
- Pre-KYC users legitimately have no DOB — "—" is correct for them; the fix must not show an error for that normal state.
