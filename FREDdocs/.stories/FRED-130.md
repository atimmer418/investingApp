# FRED-130 — Update Fred's story to lazy pig perspective

## Before
```
## FRED-130 — Update Fred's story to lazy pig perspective
update fred's story about so that it matches the perspective of a lazy pig and update the paycheck prison idea to work with fred the pig
```

## Summary
Rewrite FRED's origin story and "Why Fred Wears The Suit" narrative to reflect Fred's identity as a lazy pig. The story currently describes a human 27-year-old corporate worker. The pig reframe should make Fred naturally lazy/free-spirited by nature — and the corporate world forced him to wear a suit and work against his nature. The "paycheck prison" metaphor adapts to a pig's perspective (e.g., pig in a pen/sty vs. roaming free). Andy writes the new copy; a builder agent swaps the Java string constants.

## Files
- `backend/src/main/java/com/investingapp/backend/config/FredConstitution.java` — update `FRED_STORY_ORIGIN` (the 27-year-old worker narrative) and optionally `FRED_STORY_STRATEGY` (the retirement phase strategy) to fit the pig persona
- `backend/src/main/java/com/investingapp/backend/config/FredKnowledge.java` — update Chunk 17 "Why Fred Wears The Suit (The Uniform)" (`fred_clothing_v2`) — the gray suit / paycheck prison paragraph

## Doc References
- None — this is purely creative copy that lives in these two Java config files

## Acceptance Criteria
1. Andy writes the new `FRED_STORY_ORIGIN` narrative from the pig's perspective (replaces the current human 27-year-old corporate worker story). Key beats to preserve: the freedom journey, 18-year investing timeline, $2,000 biweekly contributions growing to $2.37M, quitting at 45. Reframe them through a pig's voice.
2. Andy writes the new Chunk 17 "Why Fred Wears The Suit" copy that adapts the "paycheck prison" metaphor for a pig character (e.g., the corporate pen/sty instead of the prison metaphor, or a new spin that fits a lazy pig who hates wearing the suit).
3. The new copy replaces the existing Java string literals in `FredConstitution.java` (`FRED_STORY_ORIGIN`) and `FredKnowledge.java` (Chunk 17 content string).
4. `FRED_STORY_STRATEGY` (the Yield Shield / Guardrails / Annuity phases) may stay mostly unchanged — it's financial strategy content, not persona narrative. Update only if the pig voice requires it.
5. `./gradlew build -x test` exits 0 after the copy change.

## Edge Cases / Open Questions
- **Compliance note:** This story copy is the kind of material that FRED-139 (securities attorney review) may want to review. Update it in code now, but be aware the final version may need revision once legal clears.
- The financial disclaimers in `FRED_STORY_ORIGIN` ("This example is based on historical assumptions and represents one possible outcome — not a guarantee of future results.") should be preserved verbatim in the new version regardless of pig framing.

## Time Estimate
`1-3hr`

## Label
`[founder]`
