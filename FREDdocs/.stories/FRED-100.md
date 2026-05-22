# FRED-100 — RAG chunks for app knowledge and philosophy

## Before
```
## FRED-100 — RAG chunks for app knowledge and philosophy
we want RAG/canonical chunks for knowing the application itself (to answer questions with exact directions on where to find things or an overview of just about every how process in the app works that there needs to be known about such as the calculations for the MonthlyFreedomUpdate and also a chunk on the boglehead philosophy) and its context as to how this helps the user achieve a good retirement. also, are there any good RAG/canonical chunks that would be valuable for the user to have FRED know in the FREDdocs .md files?
```

## Summary
The existing `FredKnowledge.java` has 18+ canonical chunks covering mission, portfolio, compliance, transfers, and some metrics. Three topic areas are missing that Ask Fred needs to answer user questions accurately: (1) the Bogleheads philosophy specifically, (2) a complete explanation of every section in the Monthly Freedom Update modal, and (3) an in-app navigation guide so Fred can direct users to features by name and location.

## Files
- `backend/src/main/java/com/investingapp/backend/config/FredKnowledge.java` — add three new `CanonicalChunk` entries to `CANONICAL_CHUNKS`

## Doc References
- Existing chunks to avoid duplication: `backend/.../config/FredKnowledge.java`
- MFU DTO for field definitions: `backend/.../dto/MonthlyFreedomUpdateDTO.java`
- App routes for navigation chunk: `frontend/src/app/app.routes.ts`

## Acceptance Criteria
1. A new chunk `bogleheads_philosophy_v1` (topic: `"philosophy"`) is added to `CANONICAL_CHUNKS` covering: Jack Bogle / Vanguard origin, three core tenets (diversify broadly, minimize costs, stay the course), why index funds beat most active managers long-term, and how FRED implements these principles via its default portfolio and automation
2. A new chunk `monthly_freedom_update_explained_v1` (topic: `"metrics"`) is added covering every section of the MFU modal: what `periodProgressDelta` (endEquity − startEquity) means, how `returnRate` is calculated ((delta − contributions) / startEquity), what `daysBoughtBack` represents and its formula (months-to-target delta × 30), what `statusPercentile` is, what `currentStreak` tracks, what the `bestNextMove` card recommends and why, and when the quarterly compare section appears (every 3rd MFU)
3. A new chunk `app_navigation_guide_v1` (topic: `"platform"`) is added explaining where to find each major app section: Tab 1 (portfolio dashboard, equity chart, holdings), Tab 2 (education / strategy content), Tab 3 (FRED AI chat), recurring investments, one-time investments, portfolio customization, account settings (security, change email, beneficiaries, change bank, sell/withdraw, tax documents)
4. All three new chunks have `active: true` and follow the exact same `CanonicalChunk(id, title, content, version, topic, riskLevel, active)` constructor signature as existing entries
5. `cd backend && ./gradlew build -x test` exits 0

## Edge Cases / Open Questions
- Chunk 16 already covers "Total Cumulative Pre-tax Return" — the new MFU chunk should link conceptually but not duplicate that content. Keep the MFU chunk focused on the modal's sections, not the portfolio dashboard metric.
- The Bogleheads chunk should credit Jack Bogle and reference Vanguard historically, but should not recommend Vanguard specifically as it could read as a product endorsement. Keep educational.
- For app navigation: tab labels may differ between in-app display names and route names — use the display names a user would see, not the route paths.
- The second part of the backlog entry ("are there any good RAG/canonical chunks valuable for FREDdocs?") is intentionally deferred — the answer is a qualitative founder judgment call, not a code task. The three chunks above are what's buildable.

## Time Estimate
`<1hr`

## Label
`[code]`
