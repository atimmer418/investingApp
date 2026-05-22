# FRED-111 — Subscription tier gate on Monte Carlo (Core vs Plus/Pro)

## Before
```
## FRED-111 — Equity milestone locks with blur and unlock animation
add $100k Total Equity lock for monte carlo, add $250k lock for retirement strategy education (frame it as a milestone and not to overwhelm the users) and also add a locked RETIRE button somewhere; we want the lock button to have the content locked (not the title such as monte carlo or retirement strategies...) and we want a big lock to display over the content with a big amount of blur on the content that is behind the lock. we want to make it so that when the user's equity is $100k/$250k, a button to unlock appears and it has a satisfying unlock animation and then the whole blurred background and the lock fades to reveal the page details
```

## Summary
Gate the Monte Carlo section behind a subscription tier check: Core users see a blur overlay with a lock icon and an "Upgrade" CTA; Plus and Pro users see the section fully unlocked. Tier is sourced from `localStorage.getItem('fred.selectedTier')` (or `UserProgress.selectedTier` once that's extended).

## Files
- `frontend/src/app/components/retirement-planning/retirement-planning.component.html` — add blur/lock overlay to Monte Carlo section
- `frontend/src/app/components/retirement-planning/retirement-planning.component.ts` — add `get isMonteCarloLocked(): boolean` based on tier
- `frontend/src/app/components/retirement-planning/retirement-planning.component.scss` — blur overlay + lock icon styles
- `frontend/src/app/services/auth.service.ts` — add `selectedTier?: string` to `UserProgress` interface; ensure backend `/user/progress` returns it

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — color/motion guidelines
- `FREDdocs/API_ENDPOINTS.md` — verify `/user/progress` or `/user/me` returns `selectedTier`

## Acceptance Criteria
1. `UserProgress` interface gains `selectedTier?: 'core' | 'plus' | 'pro'`. Backend `/user/progress` (or `/user/me`) returns `selectedTier` in its response.
2. `retirement-planning.component` reads `selectedTier` from `authService.userProgress$` (not directly from localStorage).
3. Monte Carlo section: when `selectedTier === 'core'` (or null/undefined), content is blurred with a lock icon overlaid. Section title "Monte Carlo" remains visible above the lock.
4. Lock overlay shows: lock icon + text "Available on Plus and Pro" + "Upgrade" button.
5. "Upgrade" button triggers the Plus subscription prompt (Apple IAP). Leave as `// TODO: trigger Plus subscription IAP` pseudocode for now since the subscription flow isn't wired yet.
6. When `selectedTier === 'plus' | 'pro'`: no blur, no lock, Monte Carlo renders normally.
7. `npx tsc --noEmit` exits 0; `./gradlew build -x test` exits 0.

## Edge Cases / Open Questions
- If `selectedTier` is null/undefined (legacy user without tier set), treat as Core.
- The education section lock (original $250k idea) is dropped — only Monte Carlo is gated.
- FRED-110 (education overhaul) is independent and does not need to ship first.

## Time Estimate
`1-3hr`

## Label
`[code]`
