# ACAT API — Implementation Plan (builder-agent)

**Story context:** FRED-106 (onboarding auto-start) + FRED-126 (one-time transactions) — both UI flows
exist and are wired to the backend, but the backend call does NOT follow the documented Alpaca ACAT API.
**Authoritative doc:** https://docs.alpaca.markets/us/docs/acat-api
**Shared contract:** `ITPM/agent-memory/manifest-ACAT-API.md` — satisfy every AC there.
**Scope:** the two ACATS sections in the app and the backend path they share. Nothing else.

---

## 1. The two ACATS sections (current state, verified 2026-07-15)

### Section A — Investment schedule (onboarding), deferred submit
- UI: `frontend/src/app/components/investment-schedule/investment-schedule.component.html` §"Section 5: ACATS Transfer" (~line 100); state at `investment-schedule.component.ts:54-69` (toggle, brokerage/DTC select, account number).
- On continue (`goToStockPreferences()`, `investment-schedule.component.ts:540-551`): stores
  `localStorage['pendingAcats'] = {dtc, account}` — no API call yet.
- Fire point: `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.ts:660-676`
  — after `completeStep('investmentConfirmation')` succeeds, reads `pendingAcats`, calls
  `investmentService.initiateAcatsTransfer({dtcNumber, accountNumber})`, clears the key on success only.

### Section B — Lump-sum / one-time transactions, immediate submit
- UI: `frontend/src/app/lump-sum-investment/lump-sum-investment.page.html` §"ACATS Transfer Card" (~line 159); state at `lump-sum-investment.page.ts:95-99`.
- `submitAcatsTransfer()` (`lump-sum-investment.page.ts:314-345`): guard on both fields, calls the same
  service method, toasts `Transfer submitted — ref: ${transferResponse.transferId}`, resets form.

### Shared plumbing
- `frontend/src/app/services/investment.service.ts:109-112` — `initiateAcatsTransfer(data)` →
  `POST /api/alpaca/acats/transfer` with `{dtcNumber, accountNumber}`; returns `Observable<any>` (untyped).
- `backend/.../controller/AlpacaController.java:275-315` — `POST /api/alpaca/acats/transfer`; JWT user →
  decrypt `alpacaAccountId` → `alpacaService.initiateAcatsTransfer(alpacaAccountId, accountNumber, "BROKERAGE", dtcNumber)`;
  responds `{status, transferId, message}`. Request DTO `AcatsTransferRequest` has NO validation annotations.
- `backend/.../service/AlpacaService.java:979-1016` — **the part that must be replaced.** It POSTs to the
  *funding* transfers endpoint `{alpacaBaseUrl}/accounts/{id}/transfers` with `transfer_type: "ACAT"`.
  The funding transfers API supports only `ach`/`wire`; the ACAT API is a separate resource with its own
  endpoints. It also fabricates a transfer id (`"acat_initiated_" + UUID`) when Alpaca returns none — remove.
- Base URL: `@Value("${alpaca.broker.base-url:https://broker-api.sandbox.alpaca.markets/v1}")` (`AlpacaService.java:32-33`); auth via `createAuthHeaders()` (Basic, key/secret). Reuse both.

## 2. What is VERIFIED about the Alpaca ACAT API (from the doc, via search extraction)

These facts came from the live doc page and may be treated as ground truth:
- The ACAT API is distinct from funding transfers. It provides: an **initiate** endpoint, a **GET ACAT
  Transfer** endpoint (status + details at a point in time), and an **SSE events** stream for real-time
  lifecycle updates.
- DTC number = 4-digit DTCC identifier of the clearing broker. **Alpaca's own DTC is 3021.**
- The Alpaca account must be KYC-approved: status `ACTIVE`, `APPROVED`, or `ACCOUNT_UPDATED`.
- Name, tax ID, and account type must match between the contra (delivering) broker and Alpaca, else the
  transfer is rejected by the delivering firm.
- Supported account types: individual, Roth IRA, traditional IRA, entity, custodial; joint↔individual is allowed.
- `REJECTED` is a **final** state — the user must submit a new request. A transfer is final after assets
  settle and cost basis arrives; residual assets arrive later as separate, distinct ACATS transfers.

## 3. STEP 0 — HARD GATE: acquire the exact endpoint spec. Do not guess.

The exact initiate/GET paths, request field names, response schema, and status enum are **not** pinned
down above. `docs.alpaca.markets` (and archive.org mirrors) are **blocked by the network policy of the
cloud environment** this repo's agents run in — WebFetch/curl return 403 at the gateway.

1. Try `WebFetch` on https://docs.alpaca.markets/us/docs/acat-api and the linked reference pages anyway
   (a local/Mac session will succeed).
2. If blocked, **stop and use `AskUserQuestion`**: ask Andy to paste, from the ACAT API doc and its
   reference pages, (a) the initiate endpoint method + path + full request body schema, (b) the GET
   transfer(s) endpoint(s), (c) the response schema (id + status field names), (d) the status enum,
   (e) whether the sandbox can simulate ACATS transfers and how.
3. Record the spec verbatim in `ITPM/agent-memory/implementation-notes-ACAT-API.md` §"Doc spec" —
   the verifier diffs the implementation against this section.

Only proceed past this step with the real spec in hand (95%-confidence rule).

## 4. Backend changes

### 4.1 `AlpacaService.java`
- Rewrite `initiateAcatsTransfer(...)` to call the documented ACAT initiate endpoint with the documented
  body (per Step 0). Map our inputs: Alpaca account id (receiving), contra `dtcNumber` (delivering
  participant), contra `accountNumber`. If the doc requires fields we don't collect (e.g., delivering
  account title/type), `AskUserQuestion` before inventing values.
- Return a typed DTO instead of `String`: new `dto/AcatsTransferResponse` (Lombok `@Data`,
  `@AllArgsConstructor`, `@NoArgsConstructor`) with at minimum `transferId`, `status` — name fields per
  the real response. **Delete the `"acat_initiated_" + UUID` fallback**: a 2xx without an id is an error, throw.
- Add `getAcatsTransfer(accountId, transferId)` using the documented GET endpoint (needed for AC evidence
  and future status UI). Same patterns as neighbors: `restTemplate.exchange`, `objectMapper.readTree`,
  SLF4J logging. **Mask the contra account number in logs** (last 4 only) — it appears in full today at line 995.
- SSE events: OUT of scope. Do not build a listener.

### 4.2 `AlpacaController.java`
- `AcatsTransferRequest`: add `@NotBlank` on both fields and `@Pattern(regexp = "\\d{4}")` on `dtcNumber`;
  add `@Valid` on the handler param. Keep the field names `dtcNumber`/`accountNumber` — both frontend
  sections already send them.
- Keep the response contract `{status, transferId, message}` — Section B parses `transferId`.
- Error mapping: Alpaca 4xx (bad DTC, account not KYC-approved, unsupported account state) → return 400/422
  with a clean message, not a blanket 500. Keep 500 for genuine server/network failures. Never echo the
  full account number back.
- The hardcoded `"BROKERAGE"` account-type arg is currently unused by the service; keep the concept only
  if the documented request body actually has such a field (FRED-126: both sections are personal brokerage, no selector).

### 4.3 Backend unit tests (manifest `backend-unit`)
Plain JUnit 5, NO `@SpringBootTest` (no DB): `AlpacaServiceAcatsTest` with a mocked `RestTemplate` —
correct URL + body per the Step-0 spec; 2xx parses id/status; 2xx-without-id throws; non-2xx throws with
Alpaca's message; log masking. Run: `cd backend && ./gradlew test --tests '*AlpacaServiceAcatsTest'`.

## 5. Frontend changes (kept minimal — both flows already work end-to-end)

### 5.1 `investment.service.ts`
- Add `export interface AcatsTransferResponse { status: string; transferId: string; message: string; }`
  and type the method `Observable<AcatsTransferResponse>`. Section B currently casts an untyped response
  (`lump-sum-investment.page.ts:329`) — import this interface there instead of the local/implicit one.

### 5.2 Section A — `investmentconfirmation.component.ts` (lines 660-676)
- Wrap `JSON.parse(pendingRaw)` in a try/catch; on malformed JSON remove the key and continue navigation
  (today a parse throw inside the `next` callback would strand the user on the confirmation screen).
- Also guard that `pending.dtc && pending.account` before calling; otherwise treat as malformed.
- Keep: fire-after-`completeStep`, clear key only on success, error toast + navigate anyway. Ensure
  `isAuthorizing` prevents a double-tap double-submit (it does — leave it).

### 5.3 Section B — `lump-sum-investment.page.ts` (lines 314-345)
- Switch the spinner flag from the shared `isLoading` to the already-declared-but-unused
  `isProcessingTransfer` (line 99) and bind the ACATS card's button disabled state to it, so an in-flight
  transfer can't be double-submitted and doesn't disable the unrelated invest button. Keep toasts exactly
  as FRED-126 specifies (`Transfer submitted — ref: <transferId>` / `Transfer request failed. Please try again.`).

### 5.4 Frontend unit test (manifest `frontend-unit`)
`fred-acats.service.spec.ts` (HttpClientTestingModule): posts to `/api/alpaca/acats/transfer` with exact
body; surfaces typed `transferId`; propagates HTTP error. Run:
`cd frontend && ng test --include='**/fred-acats.service.spec.ts' --watch=false --browsers=ChromeHeadless`.

## 6. Docs + notes
- Update the `POST /api/alpaca/acats/transfer` row in `FREDdocs/API_ENDPOINTS.md` if the request/response
  contract changed (error statuses at minimum).
- Write `ITPM/agent-memory/implementation-notes-ACAT-API.md`: Step-0 doc spec verbatim, what changed and
  why, sandbox behavior observed, anything the verifier needs.
- Self-fill the manifest checks you can; leave `Status: pending` for the verifier to flip.

## 7. Out of scope — do NOT do
- Persisting transfers in MySQL, status-polling UI, SSE listener, outgoing ACATS, IRA/joint account-type
  selectors, refactoring `investment.service.ts`'s direct `localStorage['jwtToken']` read (pre-existing).
  List anything you notice as an out-of-scope discovery in the notes instead.

## 8. AskUserQuestion triggers (mandatory)
- Step 0 doc spec unreachable (see §3).
- Doc requires request fields the UI doesn't collect.
- Sandbox cannot simulate an ACATS initiate (changes the verification evidence plan — agree with Andy on
  a mocked-HTTP evidence path before building around it).
