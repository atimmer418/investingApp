# FRED-179 — Export monthly freedom update as shareable image

## Before
```
## FRED-179 — Export monthly freedom update as shareable image
Add export ability for monthly freedom update (export to insta story and what not)
```

## Summary
Let users export their Monthly Freedom Update as a shareable image (PNG) via the native iOS share sheet, sized for Instagram Stories (1080×1920) or general social sharing. Add an export button to the MFU header alongside the close button.

**Note:** FRED-147 (currently 💤) covers the same feature with additional UX detail — "close button moves to the left, export on the right." Merging these two stories is recommended; consider un-skipping FRED-147 and implementing it alongside this one.

## Files
**Frontend:**
- `frontend/src/app/components/monthly-freedom-update/monthly-freedom-update.component.html` — add export icon button to header (right side; move close to left per FRED-147)
- `frontend/src/app/components/monthly-freedom-update/monthly-freedom-update.component.ts` — add `exportMfu()` method: capture MFU DOM as PNG + call share
- `frontend/package.json` — add `html2canvas` (or `dom-to-image`) for DOM→canvas capture; add `@capacitor/share` if not already installed
- `frontend/src/app/components/monthly-freedom-update/monthly-freedom-update.component.scss` — add print/export-friendly variant styles if needed (hide close button in export)

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — ensure exported image uses FRED brand colors and design tokens

## Acceptance Criteria
1. MFU header has an export icon button (e.g. `ios_share` material icon) on the right; close button moves to the left.
2. Tapping the export button calls `exportMfu()`:
   a. Hide the close/export buttons temporarily (so they don't appear in the exported image).
   b. Use `html2canvas` (or `dom-to-image`) to render the MFU card content as a PNG.
   c. Use `@capacitor/share` to open the native iOS share sheet with the PNG as the attachment.
   d. Restore the buttons after share sheet opens.
3. Export works on a real iPhone — the shared image looks like the MFU card, not a blank or broken render.
4. If export fails (html2canvas issue, share unavailable), show an error toast.

## Edge Cases / Open Questions
- `html2canvas` struggles with Ionic/Angular shadow DOM and CSS custom properties — test thoroughly on device. `dom-to-image` or `@capacitor/screen-reader`-adjacent screenshot APIs may be more reliable.
- Instagram Story aspect ratio is 9:16 (1080×1920) — the MFU card is likely narrower. Should the export add a FRED-branded background to fill the full story frame, or just share the card as-is?
- Fonts loaded via Google Fonts or `@font-face` may not render in `html2canvas` — may need to inline the font or use Manrope as a system fallback in the export.
- Should the exported image include the pig level art (from FRED-129)? If so, ensure the image asset is accessible during canvas capture.

## Time Estimate
`3hr+`

## Label
`[code]`
