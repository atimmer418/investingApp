# Acceptance Check Manifest — FRED-196: tab3 Freedom Age blanks on flaky KYC call

> Andrew's authoritative directive (from the approval) overrides the generic
> "unavailable treatment / retry affordance" wording: the failed state must
> show **just "—"** with **no manual retry affordance**. The automatic bounded
> transient-only retry is the self-heal mechanism. AC-2 below is interpreted in
> light of that directive.

## AC-1: KYC fetch retries on transient failures only, never 401/403/404
- Type:     frontend-unit
- Check:    The KYC observable in `tab3.page.ts` `loadStatStrip()` is wrapped to retry ONLY on transient errors — `TimeoutError` (err.name) / HTTP status 0 / status ≥ 500 — with bounded backoff (count 2, `timer(400 * 2^(attempt-1))`), and re-throws (no retry) on 401/403/404, mirroring `auth.service.ts loadUserProgress()`. A spec drives a 503-then-success source and asserts the success value is used; a 401 source is NOT retried.
- Evidence: "AC-1a: retries a transient 503 twice and uses the success value on the third attempt" PASS; "AC-1b: does NOT retry a 401 — fails fast and sets freedomAge to —" PASS (tab3.page.spec.ts); grep of retry policy in tab3.page.ts lines 400-410.
- Status:   pass (verifier-confirmed: all 7 specs ran locally via ChromeHeadlessNoSandbox + CHROME_BIN=/opt/pw-browsers, TOTAL 7 SUCCESS exit 0)

## AC-2: Failed state is honest — shows "—", no manual retry (per Andrew's directive)
- Type:     frontend-unit
- Check:    On ultimate KYC failure (after retries exhausted), `freedomAge` renders "—" and NO tappable retry affordance / "unavailable" element is added to the tile. (Andrew explicitly required just "—"; the auto-retry handles transient self-heal.) Verify no new clickable/retry markup in the Freedom Age tile and that the failure path sets the tile to "—".
- Evidence: "AC-2/AC-5: permanently-failing KYC (503 exhausts retries) → freedomAge '—' and statStripLoading false" PASS (tab3.page.spec.ts); no new markup added to tab3.page.html.
- Status:   pass (verifier-confirmed: all 7 specs ran locally via ChromeHeadlessNoSandbox + CHROME_BIN=/opt/pw-browsers, TOTAL 7 SUCCESS exit 0)

## AC-3: Missing DOB (pre-KYC user) shows normal "—"
- Type:     frontend-unit
- Check:    A successful KYC response with no `identity.date_of_birth` leaves `birthYear` null and `freedomAge` renders "—" with no error treatment (identical to today's happy-but-no-DOB behavior).
- Evidence: "AC-3: 200 KYC with missing date_of_birth → freedomAge stays —" PASS (tab3.page.spec.ts)
- Status:   pass (verifier-confirmed: all 7 specs ran locally via ChromeHeadlessNoSandbox + CHROME_BIN=/opt/pw-browsers, TOTAL 7 SUCCESS exit 0)

## AC-4: Freedom Date and To Go are unaffected by KYC outcome
- Type:     frontend-unit
- Check:    With UserProgress + Portfolio resolving normally, `freedomYear` (Freedom date) and `dollarsAway` (To go) compute their real values regardless of whether the KYC call succeeds, fails, or times out. The KYC subscription change does not touch the progress/portfolio subscriptions or the happy-path arithmetic.
- Evidence: "AC-4: freedomYear and dollarsAway are populated even when KYC permanently fails" PASS (tab3.page.spec.ts)
- Status:   pass (verifier-confirmed: all 7 specs ran locally via ChromeHeadlessNoSandbox + CHROME_BIN=/opt/pw-browsers, TOTAL 7 SUCCESS exit 0)

## AC-5: Render gate opens once all three calls settle — no hang on permanent KYC failure
- Type:     frontend-unit
- Check:    After the bounded retry is exhausted, the KYC error handler still sets `kycDone = true` and calls `tryRender()`, so `statStripLoading` flips to false and the strip renders. A permanently-failing KYC call never leaves `statStripLoading` true.
- Evidence: "AC-2/AC-5: permanently-failing KYC…" PASS + "AC-5 (gate): statStripLoading starts true and becomes false once all three calls settle" PASS (tab3.page.spec.ts)
- Status:   pass (verifier-confirmed: all 7 specs ran locally via ChromeHeadlessNoSandbox + CHROME_BIN=/opt/pw-browsers, TOTAL 7 SUCCESS exit 0)

## AC-6: Happy path unchanged
- Type:     frontend-unit
- Check:    With a valid DOB and live inputs, `freedomAge` = `resolvedFreedomYear − birthYear` (positive) exactly as before. No regression to the arithmetic.
- Evidence: "AC-6: valid DOB → freedomAge equals resolvedFreedomYear minus birthYear" PASS (tab3.page.spec.ts)
- Status:   pass (verifier-confirmed: all 7 specs ran locally via ChromeHeadlessNoSandbox + CHROME_BIN=/opt/pw-browsers, TOTAL 7 SUCCESS exit 0)

## Build gate
- `cd frontend && npx tsc --noEmit` exits 0.
- Status:   pass (verifier-confirmed: `npx tsc --noEmit` EXIT 0, zero errors; zero new TypeScript errors introduced).
