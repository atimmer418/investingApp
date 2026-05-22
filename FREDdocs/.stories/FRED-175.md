# FRED-175 — Initiate ACATS API transfer during onboarding (ONBOARDING)

## Before
```
## FRED-175 — Initiate ACATS API transfer during onboarding (ONBOARDING)
ACATS API transfer needs to be initiated as part of the onboarding flow.
```

## Summary
Trigger the ACATS brokerage transfer automatically as part of the onboarding completion flow.

**⚠️ This story is likely OBE — covered by FRED-106:**
FRED-106 already specifies: after the user confirms subscription (final onboarding step), check `localStorage.getItem('pendingAcats')` and call the Alpaca ACATS API to initiate the transfer. That is exactly what this story describes. The data stored in `pendingAcats` (`dtc`, `accountNumber`) is set in `investment-schedule.component.ts:596-601` when the user sets up the transfer during onboarding.

**Recommend:** Block this ticket as OBE; completing FRED-106 fully covers the requirement.

## Files
- (Covered by FRED-106 — see that story)

## Doc References
- `FREDdocs/.stories/FRED-106.md` — the authoritative implementation spec

## Acceptance Criteria
1. ACATS API call is triggered in the onboarding completion flow (after subscription confirms) if `localStorage('pendingAcats')` is set.
2. (Fully covered by FRED-106 A/C — no additional work needed.)

## Edge Cases / Open Questions
- Is there any onboarding-specific ACATS behavior beyond what FRED-106 describes? If not, this is duplicate.

## Time Estimate
`<1hr` (if FRED-106 covers it — zero implementation needed)

## Label
`[code]`
