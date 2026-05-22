# FRED-102 — Preserve 430x932 layout across all iPhone models

## Before
```
## FRED-102 — Preserve 430x932 layout across all iPhone models
I am on the 14 Max Pro iPhone model display on inspect element/devTools (430x932), I want the current layout of the app as for how it displays on this iPhone 14 Max Pro model (i.e. 430x932) ENTIRELY PRESERVED, which regards the spacing, the positioning of all elements and how everything looks exactly how it looks currently (which includes how all the text is positioned and not wrapping onto a new line in this display), should display with the same spacing and that same positioning on all the other models. How should we do this? Should we convert all css to use vw/vh and rem/em? Should we add these css media queries (@media screen and (max-width: 400px))? Should we convert everything to a flexbox display/grid layout? Should we give the current html and scss code to a bootstrap or tailwind css optimizer or something that can take it and make it a response design based on the original width and height we want the layout preserved on?
```

## Summary
The app is designed at 430px width (iPhone 14 Pro Max). Smaller iPhones (SE: 375px, standard 13/14/15: 390px) may show text wrapping or layout shifts. **Recommended approach: targeted `@media` queries at the 375px breakpoint** — do NOT rewrite to vw/vh (breaks precision layout) and do NOT do a full flexbox rewrite (Ionic already uses flex; partial rewrites create inconsistencies). The fix is localized: identify which elements wrap or overflow at 375px, add `@media (max-width: 390px)` rules to tighten font sizes and spacing just enough to prevent wrapping.

## Files
- `frontend/src/global.scss` — add a `@media (max-width: 390px)` section with font-size and spacing scale-downs for headings and body text that overflow at 375px
- `frontend/src/app/components/*/` (specific components TBD by builder) — add per-component `@media (max-width: 390px)` rules in their `.scss` files for elements that wrap at 375px

## Doc References
- Style guide: `FREDdocs/FRED_UI_STYLE_GUIDE.md`

## Acceptance Criteria
1. Approach: `@media (max-width: 390px)` breakpoint added in `global.scss` and component SCSS files — no vw/vh conversion, no CSS architecture changes
2. At 375×812 viewport (iPhone SE / 13 mini size) in Chrome DevTools: no text wraps that don't wrap at 430×932, no horizontal overflow/scroll, all CTAs and interactive elements fully visible and tappable
3. At 390×844 viewport (iPhone 13/14/15 standard): same checks as AC 2
4. At 430×932 (reference): layout visually identical to pre-change baseline — nothing regresses
5. No px-to-rem/em conversion anywhere — keep pixel units in the SCSS, only add media query overrides
6. `cd frontend && npx tsc --noEmit -p tsconfig.app.json` exits 0

## Edge Cases / Open Questions
- The builder-agent should open the app in Chrome (via Chrome MCP) at 375×812 to visually identify which specific elements wrap before writing any code — don't guess, observe.
- Components most likely to have issues: any with fixed-width containers, multi-column rows, long text strings, or tight padding. Check `investmentconfirmation`, `fi-plan-results`, `tab1`, `my-profile` first.
- The `ion-content` component itself is full-width by default — overflow issues are almost always in inner flex/grid containers.
- If a font size reduction at 375px causes text to be too small to read, note it as a known trade-off; don't make text below 11px.

## Time Estimate
`1-3hr`

## Label
`[code]`
