# FRED-134 — Test profile picture quality and speed on phone

## Before
```
## FRED-134 — Test profile picture quality and speed on phone
test pfp quality and speed of loading pictures on phone
```

## Summary
QA the My Profile avatar on a real iPhone after FRED-122 ships the pig art replacement. The current avatar is hardcoded to `https://ionicframework.com/docs/img/demos/avatar.svg` (a remote demo URL). Once FRED-122 replaces it with a local pig art asset, verify it loads instantly and renders crisply on device.

**Depends on:** FRED-122 (pig art avatar replacement must be in place first).

## Files
- `frontend/src/app/pages/my-profile/my-profile.page.html:27` — the `<img>` inside `<ion-avatar>` (currently the ionicframework demo URL)

## Doc References
- None — manual device testing

## Acceptance Criteria
1. **Depends on FRED-122**: Only test after the pig art avatar is wired.
2. On a real iPhone, the My Profile avatar renders crisply at the displayed size (no pixelation, no SVG rendering artifacts).
3. The avatar loads instantly on page open — no visible delay, no loading flash (since it should be a local asset post-FRED-122, not a remote URL).
4. If the avatar is still loading from a remote URL for any reason, it should load within 1 second on LTE.
5. If any quality or speed issue is found, fix in My Profile page (likely either switching to a local asset or adding `loading="eager"` + appropriate sizing).

## Edge Cases / Open Questions
- If the pig art is an SVG, verify it renders correctly inside `<ion-avatar>` with `object-fit: cover` on iOS WKWebView.
- Check the avatar also looks good at the smaller size if it appears in the AI chat message bubbles.

## Time Estimate
`<1hr`

## Label
`[founder]`
