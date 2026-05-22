# FRED-131 — Design five Fred faces for equity level ranges

## Before
```
## FRED-131 — Design five Fred faces for equity level ranges
make 5 fred faces for accounts over $0 to $1000, $1000 to $10k, $10k to $100k, $100k to $1m, $1m+, add them to their respective mfu milestones
```

## Summary
Design 6 FRED pig face illustrations — one per equity level — to be used as the pig icon in the MFU milestone card (wired in FRED-129). The backlog originally said 5 faces, but FRED-129 was approved with 6 equity levels ($5M+ is Level 6). The "add to MFU milestones" integration is already handled by FRED-129 — this story is purely the design deliverable.

**Equity levels:**
- Level 1: $0 – $1k (tiny/baby pig — just starting out)
- Level 2: $1k – $10k (small pig — gaining momentum)
- Level 3: $10k – $100k (medium pig — building real wealth)
- Level 4: $100k – $1M (big pig — serious investor)
- Level 5: $1M – $5M (fat happy pig — financially free)
- Level 6: $5M+ (king pig / flying pig — legendary)

## Files
- `frontend/src/assets/images/pig-level-1.svg` (or .png) through `pig-level-6.svg` — the 6 pig face assets to be created and dropped here

## Doc References
- None — this is a design deliverable

## Acceptance Criteria
1. Create 6 FRED pig face illustrations, one per equity level. Art direction is fluid but should follow a progression: small/plain pig at Level 1, progressively happier/fatter/more content toward Level 6.
2. Save as `pig-level-1` through `pig-level-6` in `frontend/src/assets/images/` — SVG preferred for crispness at all sizes; PNG acceptable if SVG isn't feasible.
3. Each asset should work at 56×56px display size (as specified in FRED-129) — keep detail simple enough to read at that scale.
4. Once assets are dropped in, FRED-129's code (the `milestoneEquityPigSrc` getter) will automatically pick them up — no additional code change needed.
5. **Note:** The backlog says "5 faces" but FRED-129 A/C was approved with **6 levels** (added $5M+ = Level 6). Design 6 faces to match.

## Edge Cases / Open Questions
- FRED-129 uses `pig-level-{N}.svg` (or `.png`) path format — the asset filenames must exactly match what's referenced in the component.
- These same assets will also be used in My Profile (FRED-122) as the user's avatar image, replacing the `ionicframework.com` placeholder. Design them to also work as a circular avatar at ~64px.

## Time Estimate
`3hr+`

## Label
`[founder]`
