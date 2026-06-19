# Implementation Notes — FRED-189

## Design decisions
- Used inline title-case expression (`charAt(0).toUpperCase() + slice(1).toLowerCase()`) rather than a named helper method — the spec said "small helper or inline"; inline keeps the diff to one method with no new surface area.
- `slice(1).toLowerCase()` added defensively: ensures mixed-case values from Plaid (e.g. "SAVINGS") are normalized correctly, not just single-word lowercase.

## Deviations
- None. Change is exactly as specified.

## Tradeoffs
- Could have extracted a `titleCase(s: string)` private method for reusability, but the spec said "one method" and there are no other callers in scope. Inline is simpler.

## Open questions
- The `tsc --noEmit` pre-existing exit code is 2 (TS5101/TS5107 tsconfig deprecation warnings). These are repo-wide and unrelated to this story. AC-5 notes them as pre-existing baseline — Andy may want to address them separately by adding `"ignoreDeprecations": "6.0"` to tsconfig.json.
