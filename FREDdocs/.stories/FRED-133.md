# FRED-133 — Design piggy bank Fred loading screen

## Before
```
## FRED-133 — Design piggy bank Fred loading screen
loading screen (piggy bank fred)
```

## Summary
Design and wire in a piggy bank Fred animation (or static image) for the app-resume-cover loading screen. The loading screen in `index.html` already loads a Lottie animation (`coin-drop.json`) over a white background, with a `fred-logo.svg` fallback. This story replaces that animation with a Fred-the-pig / piggy bank themed one. Design is the primary deliverable; the code swap is a one-liner.

## Files
- `frontend/src/assets/lottie/coin-drop.json` — replace or supplement with the new piggy bank Fred animation
- `frontend/src/index.html:49` — update the `path:` to point at the new animation file (one-line change)
- `frontend/src/assets/images/fred-logo.svg` — optionally update the static fallback image to a piggy bank Fred SVG

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — motion guidelines (purposeful, subtle, iOS-native feel)

## Acceptance Criteria
1. Create a Lottie animation JSON file featuring a Fred the pig / piggy bank motif for the loading screen. Animation should loop, feel premium, and work on a white background. Aim for under 3 seconds per loop.
2. Drop the animation file into `frontend/src/assets/lottie/` (e.g. `fred-piggybank.json`).
3. Update `index.html` line 49: change `path: 'assets/lottie/coin-drop.json'` to the new file path.
4. Optionally update the `fred-logo.svg` fallback image to also feature the piggy bank Fred art — or leave the existing logo as the fallback (it will only show if lottie fails to load).
5. Test on a real iPhone: animation plays smoothly on app open/resume, loading screen hides once app is ready.

## Edge Cases / Open Questions
- Lottie animation files can be large — keep under ~200KB. If the design requires complex art, prefer a simpler looping animation (e.g., Fred's ears wiggling, piggy bank filling with coins) over a cinematic sequence.
- The `preserveAspectRatio: 'xMidYMid slice'` setting in index.html means the animation will fill the full screen — design accordingly (centered pig on white background works well).
- FRED-170 covers loading screen timing optimizations — that's a separate story; focus here on the visual asset only.

## Time Estimate
`3hr+`

## Label
`[founder]`
