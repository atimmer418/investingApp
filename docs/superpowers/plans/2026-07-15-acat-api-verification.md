# ACAT API — Verification Plan (verifier-agent)

**Mission:** execute `ITPM/agent-memory/manifest-ACAT-API.md` against the builder's diff and return an
evidence-gated verdict. You verify the two ACATS sections (investment-schedule/onboarding and
lump-sum-investment) plus the backend path they share — nothing else blocks the verdict.

**Inputs:** the builder's diff; `ITPM/agent-memory/implementation-notes-ACAT-API.md` (especially §"Doc
spec" — the verbatim Alpaca ACAT endpoint spec); the manifest.

**Evidence gate:** flip each AC to `pass` only with an attached artifact. No artifact ⇒ not approvable.
Return TWO lists: in-scope failures (block) and out-of-scope discoveries (never block; drafted as backlog
candidates).

---

## 0. Preconditions & environment
- If `implementation-notes-ACAT-API.md` has no §"Doc spec" section, STOP: verdict REVISION REQUIRED,
  in-scope failure "Step-0 doc gate skipped — implementation cannot be checked against the documented API."
  Do not attempt to re-derive the spec yourself; `docs.alpaca.markets` is blocked by this environment's
  network policy (gateway 403), which is exactly why the notes must carry it.
- Backend: `cd backend && SPRING_PROFILES_ACTIVE=local ./gradlew bootRun` (port 8080).
  Frontend: `servlocal` (port 8100). Bypass onboarding with `?devPage=/route` as needed
  (see CONTEXT.md §Bypassing Onboarding) — it logs in as `facebook@gmail.com` with a valid JWT.
- Note which Alpaca base URL is active (`alpaca.broker.base-url`, default sandbox). NEVER run live checks
  against a production base URL — an ACATS initiate is a real interaction with DTCC-facing systems. If the
  environment is pointed at production, do live-path evidence via mocked HTTP only and say so.

## 1. Static review (AC-1, parts of AC-7)
1. Read the diff of `AlpacaService.java`, `AlpacaController.java`, `investment.service.ts`,
   `investmentconfirmation.component.ts`, `lump-sum-investment.page.ts`.
2. AC-1 line-by-line: method+path+request fields in `initiateAcatsTransfer()` vs the notes' doc spec —
   quote both in the evidence. Confirm deletions: the funding-endpoint POST (`transfer_type: "ACAT"` to
   `/accounts/{id}/transfers`) and the `"acat_initiated_" + UUID` fallback. Cross-check the doc-spec facts
   that are independently verified (Alpaca DTC 3021; REJECTED is final; GET status endpoint exists) — if
   the notes' spec contradicts these, treat the spec itself as suspect and fail AC-1 with that reasoning.
3. Convention sweep: DTO naming/Lombok/Jakarta validation per CONTEXT.md; no business logic added to the
   controller; SLF4J logging present; contra account number masked (last 4) in every log statement;
   no TODOs, dead code, or hardcoded secrets (AC-7 static half).

## 2. Backend unit tests (AC-2)
```
cd backend && ./gradlew test --tests '*AlpacaServiceAcatsTest'
```
- Must exit 0. Open the test source: confirm it is plain JUnit 5 (no `@SpringBootTest`), mocks
  `RestTemplate`, and actually asserts the five behaviors named in the manifest (URL+body, success parse,
  missing-id throw, non-2xx throw, log masking). A green suite that doesn't assert the doc-spec URL/body
  is a fail — the test must pin the contract, not just execute the code.
- Evidence: command output + the assertion lines you relied on.

## 3. API integration (AC-3)
Run against `http://localhost:8080` with curl. Get a JWT the same way existing verifier runs do (devPage
login, then read the token from localStorage), or mint via the dev login flow.
1. **401:** no Authorization header → expect 401.
2. **Validation 400s:** `{}`, `{"dtcNumber":"0164"}`, `{"dtcNumber":"164","accountNumber":"123"}`
   (3-digit DTC) → expect 400 with a useful message each time.
3. **Happy path:** `{"dtcNumber":"0164","accountNumber":"<sandbox-safe test value>"}`.
   - If the notes say the sandbox simulates ACATS: run live against sandbox; assert response JSON has
     `status`, non-empty `transferId`, `message`; then, if the builder added `getAcatsTransfer`, fetch the
     transfer by id and record its status (bonus evidence, not a separate AC).
   - If the sandbox cannot simulate ACATS (notes must say which fallback Andy approved): point
     `alpaca.broker.base-url` at a local WireMock serving the doc-spec response shape and assert the same.
     Evidence MUST state "mocked HTTP — sandbox cannot simulate"; never present a mock as a live pass.
4. **Upstream 4xx mapping:** WireMock (or sandbox-invalid DTC) returning an Alpaca 4xx → client gets 4xx
   with a clean message, not 500.
5. **Leak check:** grep the captured responses and backend log for the full test account number — it must
   appear nowhere except masked.
- Evidence: redacted curl transcripts + matching backend log lines.

## 4. Section A UI acceptance — onboarding deferred transfer (AC-4)
Use the Chrome MCP tools (navigate, read_page, read_network_requests, read_console_messages, screenshot).
Setup per scenario: fresh context → `http://localhost:8100?devPage=/investment-confirmation`, then seed
localStorage via JS before acting.
1. **Success:** set `pendingAcats='{"dtc":"0164","account":"12345678"}'`; check the terms box; tap
   authorize. Assert: exactly ONE `POST /api/alpaca/acats/transfer` with body
   `{dtcNumber:"0164",accountNumber:"12345678"}`; `pendingAcats` removed; "Transfer request submitted."
   toast; landed on /tabs/tab1. Screenshot + network log.
2. **API error:** block/500 the endpoint (devtools request interception or temporarily stop WireMock
   route); repeat. Assert: `pendingAcats` STILL PRESENT; failure toast; navigation still completes.
3. **Malformed JSON:** set `pendingAcats='not-json'`; authorize. Assert: no uncaught console error, no
   ACATS request, key cleared, navigation proceeds.
4. **Absent key:** no `pendingAcats`. Assert: zero requests to the ACATS endpoint; normal navigation.
Also confirm upstream capture still works: on `/investment-schedule` (via devPage), enable the transfer
toggle, pick a brokerage, enter an account number, continue — assert `pendingAcats` is written with those
values (this is the data source for scenario 1).

## 5. Section B UI acceptance — lump-sum immediate transfer (AC-5)
`http://localhost:8100?devPage=/lump-sum-investment`, ACATS Transfer Card:
1. **Guard:** submit with empty fields → warning toast, no network request.
2. **Success:** select brokerage (Schwab/0164), enter account number, submit. Assert: one POST with those
   values; success toast text contains `ref: <transferId>` where `<transferId>` equals the id in the
   response body; fields reset afterwards. Screenshot + network log.
3. **Error:** force endpoint failure → "Transfer request failed. Please try again." toast; fields retained.
4. **Double-tap:** tap submit twice rapidly → exactly one request (in-flight guard); the unrelated invest
   button is not disabled by the transfer spinner (`isProcessingTransfer`, not shared `isLoading`).

## 6. Frontend typing + builds (AC-6, AC-7)
```
cd frontend && ng test --include='**/fred-acats.service.spec.ts' --watch=false --browsers=ChromeHeadless
cd frontend && npx tsc --noEmit
cd backend && ./gradlew build -x test
```
All exit 0. Confirm `initiateAcatsTransfer` returns `Observable<AcatsTransferResponse>` and the lump-sum
page imports that interface (no local duplicate/`any` cast). Diff-check `FREDdocs/API_ENDPOINTS.md`
against the final contract.

## 7. Verdict
- **APPROVED** only when AC-1…AC-7 are all `pass` with evidence attached in the manifest.
- Otherwise **REVISION REQUIRED** with the two lists (in-scope failures / out-of-scope discoveries).
  Likely out-of-scope finds to route to backlog, not the builder: no persistence of transferId (nothing to
  show in profile/history later), no status polling or SSE, `investment.service.ts` reading
  `localStorage['jwtToken']` directly (violates JwtTokenUtils convention, pre-existing), duplicate
  brokerage DTC entries (Public/Webull both 0158 — correct, both clear via Apex, but worth a comment).
- Remember the bounded loop: you may run at most 3 passes; only in-scope failures go back to the builder.
