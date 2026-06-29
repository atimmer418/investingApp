# Implementation Notes — keyboard-avoid-directive

## Design decisions

- No story ID assigned; used `keyboard-avoid` as the note filename suffix.
- The `development` build configuration doesn't exist in this project's `angular.json` (`--configuration development` errors); plain `npx ng build` runs the default (production) AOT build which still catches template-binding type errors — used that as the gate for all 4 tasks.
- All 4 ng build runs passed with only pre-existing warnings (IonToolbar unused in recurring/sell-withdraw; html2canvas CommonJS in retirement-planning) — none introduced by this branch.

## Deviations

- No deviations from the plan. All exact anchor strings matched perfectly in current file state.
- `portfolio-customize.component.html` and `lump-sum-investment.page.html` had concurrent working-tree edits (`mode="md"` addition inside an IonSearchbar). These were included in the Task 2 commit as intended — applied appKeyboardAvoid on top of, not instead of, those edits.

## Tradeoffs

- None — plan was fully deterministic, no ambiguous decision points.

## Open questions

- None.
