# FRED-180 — Add time-to-freedom visual on profile page

## Before
```
## FRED-180 — Add time-to-freedom visual on profile page
Add time to freedom date visual on the my profile page (the whenPiggybanksFly picture that lives in surveyinitial)
```

## Summary
Add a freedom timeline visual card to My Profile that shows the user's projected freedom year / time-to-FI. The visual concept is drawn from the `surveyinitial` timeline card (which shows "Estimated Time to Goal — X Years" with a portfolio badge) and/or uses the `whenPiggybanksFly` pig art as a hero image behind the data.

`currentFreedomEstimate` (the projected year) and `timeToFI` (string, set at registration) exist on the backend `User` model but are not currently exposed in `UserProgressResponse` — both need to be added to the API response.

## Files
**Backend:**
- `backend/src/main/java/com/investingapp/backend/controller/UserController.java:47` — add `currentFreedomEstimate: Integer` and `timeToFI: String` fields to `UserProgressResponse` static class; populate from `user.getCurrentFreedomEstimate()` and `user.getTimeToFI()`

**Frontend:**
- `frontend/src/app/services/auth.service.ts:12` — add `currentFreedomEstimate?: number` and `timeToFI?: string` to `UserProgress` interface
- `frontend/src/app/pages/my-profile/my-profile.page.html` — add a "Freedom Timeline" section card showing the projected year and years-to-go
- `frontend/src/app/pages/my-profile/my-profile.page.ts` — read `currentFreedomEstimate` and `timeToFI` from `userProgress`; compute years remaining
- `frontend/src/app/pages/my-profile/my-profile.page.scss` — style the timeline card

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — card patterns and design tokens

## Acceptance Criteria
1. Backend: `currentFreedomEstimate` and `timeToFI` added to `UserProgressResponse` and returned from `GET /api/users/progress`.
2. Frontend: `UserProgress` interface has `currentFreedomEstimate?: number` and `timeToFI?: string`.
3. My Profile page shows a "Freedom Timeline" card displaying:
   - The projected freedom year (e.g. "2039")
   - Years remaining (e.g. "13 years away")
   - Optional: portfolio target
4. The card uses the `whenPiggybanksFly-3.jpg` (or equivalent pig art asset) as a background/hero image.
5. If `currentFreedomEstimate` is null (new user, estimate not yet calculated), show a placeholder ("Complete setup to see your freedom date").

## Edge Cases / Open Questions
- `timeToFI` was set at registration from the onboarding survey — it may be stale if the user has updated their investment amount. `currentFreedomEstimate` (from MFU scheduler) is more authoritative for returning users. Use `currentFreedomEstimate` as the primary display field.
- The `whenPiggybanksFly-3.jpg` asset is currently only preloaded in `get-started.component.html` — confirm the filename is correct in `frontend/src/assets/images/` before referencing it in My Profile.
- Consider whether the freedom date updates in real-time as the user edits their investment amount on My Profile — this may require a local recalculation rather than waiting for the next API call.

## Time Estimate
`1-3hr`

## Label
`[code]`
