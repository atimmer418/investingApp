# FRED-169 — Reduce free trial to 14 days

## Before
```
## FRED-169 — Reduce free trial to 14 days
make the fred free trial 14 days to allow for one automated paycheck investing and force them to make a decision
```

## Summary
Configure the free trial period to 14 days in App Store Connect (Apple IAP). The trial is managed by Apple, not by a backend constant, so this is an App Store Connect configuration task. The intent is to give users exactly enough time for one automated paycheck investment before the trial expires.

**Depends on:** FRED-174 (Apple subscription/IAP wiring) — the subscription products must exist in App Store Connect before the trial can be configured.

## Files
- No code changes — App Store Connect configuration only
- Once Apple trial is set, verify `frontend/src/app/components/investmentconfirmation/investmentconfirmation.component.ts` and any subscription gate logic correctly reads trial status from Apple StoreKit response

## Doc References
- None — App Store Connect admin task

## Acceptance Criteria
1. In App Store Connect, update the subscription product free trial duration to 14 days.
2. Test on a sandbox account: new user gets 14-day trial before being billed.
3. Confirm the frontend subscription gate (wherever trial status is read from StoreKit) correctly reflects the 14-day window.

## Edge Cases / Open Questions
- Changing trial duration in App Store Connect only affects new subscribers — existing sandbox/real users are unaffected.
- Confirm this is done after FRED-174 (Apple IAP wiring) is complete, since the subscription products need to exist first.

## Time Estimate
`<1hr`

## Label
`[founder]`
