# FRED-170 — Optimize loading screen timings

## Before
```
## FRED-170 — Optimize loading screen timings
Optimize loading screen timings.
```

## Summary
Profile and tighten the `app-resume-cover` loading screen timings to minimize the time the white cover overlay stays on screen. Two cascading waits are the primary suspects: a 1500ms fallback timeout in `waitForCoverImageReady()` and a 3000ms safety timeout in `preloadAssetsForRoute()`. Also, the `ROUTE_IMAGE_PRELOADS` entry for `/survey-initial` references `whenPiggybanksFly-3.jpg` — verify this asset exists (filename mismatch would silently hit the timeout every time).

## Files
- `frontend/src/app/app.component.ts:80` — `waitForCoverImageReady()`: 1500ms timeout waiting for the fallback `<img>` to load; but the fallback is hidden when Lottie loads, so this may always wait the full 1500ms
- `frontend/src/app/app.component.ts:278` — `preloadAssetsForRoute()`: 3000ms safety timeout — evaluate whether this can be reduced
- `frontend/src/app/app.component.ts:18-20` — `ROUTE_IMAGE_PRELOADS`: `/survey-initial` references `whenPiggybanksFly-3.jpg`; verify filename matches the actual asset in `frontend/src/assets/images/`
- `frontend/src/index.html:38-59` — Lottie animation loads via dynamically injected script; no Angular callback when animation is ready

## Doc References
- None

## Acceptance Criteria
1. Verify whether `whenPiggybanksFly-3.jpg` exists in `frontend/src/assets/images/`. If not, update `ROUTE_IMAGE_PRELOADS` to the correct filename so the preload doesn't silently hit the 3000ms timeout on every app open.
2. Measure the actual loading screen duration on a real iPhone (time from app resume to cover hidden). Log timestamps at key points: `platform.ready()`, after `waitForCoverImageReady()`, after `preloadAssetsForRoute()`, and after `hideAllCovers()`.
3. Based on measurements, tune the timeouts:
   - If `waitForCoverImageReady()` always hits 1500ms (because the fallback `<img>` is hidden by Lottie before Angular can detect it), reduce the timeout to a reasonable minimum (e.g. 300ms) or remove it.
   - If `preloadAssetsForRoute()` safety timeout can be lowered without visual jank, lower it (e.g. 1500ms).
4. Verify no visual regression: cover should hide only once the target route's content is fully painted — no flash of blank/unstyled content.
5. Test on a real iPhone (not the simulator) — timing differences are significant on device.

## Edge Cases / Open Questions
- The Lottie animation in `index.html` loads `lottie-web.min.js` dynamically — no Angular visibility into when it's done. This means the cover can hide before the animation has finished its first loop. Decide: is a partial animation loop acceptable, or should the cover always show at least one full loop?
- After FRED-133 (new piggy bank Lottie animation), the animation file path in `index.html:49` will change — ensure this story is done after FRED-133 ships.

## Time Estimate
`1-3hr`

## Label
`[code]`
