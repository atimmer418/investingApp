# FRED-147 — Export MFU as shareable image with Fred art

## Before
```
## FRED-147 — Export MFU as shareable image with Fred art
let users export their monthly freedom updates. (it could be fred holding up the mfu as pitchfork sign) change the location of the close button to be on the left and the export on the right. the close button could also become the back button

## FRED-179 — Export monthly freedom update as shareable image
Add export ability for monthly freedom update (export to insta story and what not)
```

## Summary
(Merged from FRED-179) Let users export their Monthly Freedom Update as a shareable PNG via the native iOS share sheet, sized for Instagram Stories and general social sharing. The close button moves to the left, export icon goes on the right. Optionally include "Fred holding up the MFU like a pitchfork sign" Fred art on the exported image.

## Files
**Frontend:**
- `frontend/src/app/components/monthly-freedom-update/monthly-freedom-update.component.html` — move close button to left; add export icon button (`ios_share`) to right of header
- `frontend/src/app/components/monthly-freedom-update/monthly-freedom-update.component.ts` — add `exportMfu()` method using `html2canvas` (or `dom-to-image`) to capture the MFU card + `@capacitor/share` for native iOS share sheet
- `frontend/package.json` — add `html2canvas` / `dom-to-image` and confirm `@capacitor/share` is installed
- `frontend/src/app/components/monthly-freedom-update/monthly-freedom-update.component.scss` — hide UI chrome (buttons) for export frame; optionally add Fred art export overlay

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — FRED brand colors + typography for export image

## Acceptance Criteria
1. Close button moves to left of MFU header; export icon (`ios_share`) added to right.
2. Tapping export: hide header buttons → `html2canvas` captures MFU card as PNG → iOS share sheet opens with image.
3. Exported image looks like the MFU card (correct colors, fonts, pig art) on a real iPhone.
4. Error toast if export fails.
5. Optionally: add a "Fred holding up the MFU" art element on the exported image (founder art deliverable first).

## Edge Cases / Open Questions
- `html2canvas` may struggle with Ionic shadow DOM and CSS custom properties — test on device; `dom-to-image` is a fallback.
- Consider adding a FRED-branded background (white or gradient) to fill Instagram Story 9:16 frame if the MFU card doesn't fill it natively.
- Manrope font may not render correctly in `html2canvas` — inline font or test carefully.
- Should pig level art (FRED-129) appear in the exported image? Ensure image assets are accessible during canvas capture.

## Time Estimate
`3hr+`

## Label
`[code]`
