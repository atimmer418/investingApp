# Acceptance Check Manifest — ACAT-API
Implement the documented Alpaca ACAT API (https://docs.alpaca.markets/us/docs/acat-api) behind the two
ACATS sections: investment-schedule (onboarding, deferred via `pendingAcats`) and lump-sum-investment
(one-time transactions, immediate).
Plan: `docs/superpowers/plans/2026-07-15-acat-api-implementation.md`
Verification plan: `docs/superpowers/plans/2026-07-15-acat-api-verification.md`

## AC-1: Backend calls the documented ACAT API, not the funding-transfers endpoint
- Type:     static
- Check:    `AlpacaService.initiateAcatsTransfer()` targets the initiate endpoint recorded verbatim in
            `implementation-notes-ACAT-API.md` §"Doc spec" (method, path, body field names all match);
            no `transfer_type: "ACAT"` POST to `/accounts/{id}/transfers` remains; the fabricated
            `"acat_initiated_" + UUID` fallback is deleted (2xx without an id ⇒ exception).
- Evidence: diff excerpt + side-by-side quote of the doc spec section
- Status:   pending

## AC-2: Backend unit tests green (no DB)
- Type:     backend-unit
- Check:    `cd backend && ./gradlew test --tests '*AlpacaServiceAcatsTest'` exits 0; suite covers:
            exact URL+body per doc spec, 2xx→parsed {transferId,status}, 2xx-without-id→throw,
            non-2xx→throw with Alpaca message, contra account number masked in log output.
- Evidence: gradle test output (test names + counts)
- Status:   pending

## AC-3: Controller contract + validation
- Type:     api-integration
- Check:    against local backend (`SPRING_PROFILES_ACTIVE=local`): (a) no/invalid JWT → 401;
            (b) missing `dtcNumber` or `accountNumber`, or non-4-digit `dtcNumber` → 400 with message;
            (c) valid request → response body contains `status`, `transferId`, `message`
            (sandbox live if it simulates ACATS, else WireMock/mocked HTTP per the agreed fallback —
            evidence must state which); (d) upstream Alpaca 4xx → 4xx to client, not 500;
            (e) full account number never echoed in any response or log line.
- Evidence: curl transcripts (redacted) + relevant backend log lines
- Status:   pending

## AC-4: Section A end-to-end — onboarding deferred transfer
- Type:     ui-acceptance
- Check:    with `pendingAcats` = `{"dtc":"0164","account":"12345678"}` in localStorage, completing the
            investment-confirmation authorize step fires exactly one
            `POST /api/alpaca/acats/transfer` with `{dtcNumber:"0164",accountNumber:"12345678"}`;
            success ⇒ key removed + "Transfer request submitted." toast + navigate to /tabs/tab1;
            forced API error ⇒ key RETAINED + failure toast + still navigates;
            malformed `pendingAcats` JSON ⇒ no crash, key cleared, navigation proceeds;
            no `pendingAcats` ⇒ zero ACATS requests.
- Evidence: screenshots + network log assertions (request payload, count) per scenario
- Status:   pending

## AC-5: Section B end-to-end — lump-sum immediate transfer
- Type:     ui-acceptance
- Check:    on `lump-sum-investment`: submit disabled/guarded until both fields set; filled form submit
            fires one POST with the entered values; success toast shows
            `Transfer submitted — ref: <transferId>` with the real id from the response, then form resets;
            forced error ⇒ "Transfer request failed. Please try again."; double-tap while in-flight sends
            exactly one request (`isProcessingTransfer` guard); invest button unaffected by transfer spinner.
- Evidence: screenshots + network log assertions per scenario
- Status:   pending

## AC-6: Typed frontend contract + targeted frontend spec
- Type:     frontend-unit
- Check:    `investment.service.ts` exports `AcatsTransferResponse` and `initiateAcatsTransfer` returns
            `Observable<AcatsTransferResponse>`; `cd frontend && ng test
            --include='**/fred-acats.service.spec.ts' --watch=false --browsers=ChromeHeadless` exits 0.
- Evidence: spec run output + type excerpt
- Status:   pending

## AC-7: Quality gates
- Type:     build + static
- Check:    `cd backend && ./gradlew build -x test` exits 0; `cd frontend && npx tsc --noEmit` exits 0;
            no new TODOs/dead code in touched files; `FREDdocs/API_ENDPOINTS.md` ACATS row matches the
            final contract; no secrets or full account numbers committed.
- Evidence: command outputs + doc diff
- Status:   pending
