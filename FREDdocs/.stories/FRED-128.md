# FRED-128 — Tax documents verify PDF display on phone

## Before
```
## FRED-128 — Tax documents verify PDF display on phone
tax documents page is ALMOST DONE; need to verify how it pdfs look and work on phone
```

## Summary
QA and fix the tax documents PDF flow on a real iOS device. The current implementation uses `ng2-pdf-viewer` (pdfjs-dist) inside a modal, with download via `document.createElement('a')` and share via `navigator.share`. The `<a>.click()` download approach will not work in Capacitor's WKWebView — it silently fails. The share path (`navigator.share`) should work on iOS. The PDF rendering in `ng2-pdf-viewer` needs to be tested on the device for layout, scroll, and zoom behavior.

## Files
- `frontend/src/app/components/pdf-viewer-modal/pdf-viewer-modal.component.ts` — replace `downloadPdf()` with Capacitor Filesystem + Share plugin write-and-open; test `loadPdf()` on iOS
- `frontend/src/app/components/pdf-viewer-modal/pdf-viewer-modal.component.html` — no expected changes, but confirm layout renders correctly on 430×932

## Doc References
- `FREDdocs/FRED_UI_STYLE_GUIDE.md` — modal layout standards

## Acceptance Criteria
1. **Manual test first**: Open a real tax form or account statement PDF on a physical iPhone. Confirm the `PdfViewerModalComponent` modal opens, the PDF renders, and scrolling/pinch-zoom works.
2. Fix `downloadPdf()`: Replace the `document.createElement('a')` approach with `@capacitor/filesystem` (`Filesystem.writeFile` to a temp path in `TEMPORARY` directory) + `@capacitor/share` (`Share.share({ files: [...] })`) so the user gets a native iOS share sheet to save the PDF. `navigator.share` with a File object is the browser-level fallback; keep it for web.
3. `sharePdf()` already uses `navigator.share` with a `File` — verify it works on iOS; if not, apply the same Filesystem + Share fix.
4. On download/share error: show toast "Could not save document. Please try again."
5. Loading spinner shows while the PDF is rendering (`isLoading = true`); disappears on `onPdfLoaded()`.
6. `npx tsc --noEmit` exits 0.

## Edge Cases / Open Questions
- The `@capacitor/filesystem` and `@capacitor/share` plugins may already be installed — check `frontend/package.json` before adding them.
- The `pdfjs-dist` worker path is `assets/pdfjs/pdf.worker.min.mjs` — verify this asset is included in the Angular build and accessible at that path in the Capacitor iOS bundle.
- Tax documents are only available to users with a funded account; if no documents exist, the empty state is shown. Test with a real document if one is available in the dev/sandbox Alpaca environment, otherwise test with a local PDF blob.

## Time Estimate
`1-3hr`

## Label
`[code]`
