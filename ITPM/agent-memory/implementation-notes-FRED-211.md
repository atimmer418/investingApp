# Implementation Notes — FRED-211

## Scroll structure chosen
- Kept `ion-content [scrollY]="false"` (unchanged from original).
- Added `.sheet-shell` (height:100%; display:flex; flex-direction:column; background:#2563EB) as the non-scrolling flex parent inside ion-content.
- `.sheet-scroll` (flex:1; min-height:0; overflow-y:auto; border-radius:26px 26px 0 0) is the only scrolling element.
- The #2563EB background on sheet-shell shows through the rounded corners, creating the visual "gradient continues into content area" seam. No negative margin tricks needed — the header's 40px bottom padding creates the visible gradient strip, and the sheet's rounded top corners reveal the matching blue behind them.
- `appTabBarScroll` moved from `.content-scroll` (old) to `.sheet-scroll` (new plain div). Directive's native @HostListener('scroll') fires correctly on the div. No ionScroll path needed.
- Removed: `.content-scroll`, `.scroll-inner`, `.header-overlap`, `.sections-card`.

## Icon mapping decisions
- `time-outline` → `schedule` (matches prototype and is already in DYNAMIC_ICONS)
- `cash-outline` → `payments` (closer to "transactions" meaning than cash; already in DYNAMIC_ICONS)
- `pie-chart-outline` → `pie_chart` (direct equivalent)
- `card-outline` → `credit_card` (prototype's choice; "sell & withdraw" implies card)
- `shield-checkmark-outline` → `verified_user` (prototype's choice; combines shield + identity)
- `business-outline` → `account_balance` (prototype's choice; already in DYNAMIC_ICONS)
- `document-text-outline` → `description` (standard MS equivalent for document)
- `people-outline` → `group` (standard MS equivalent for multiple people/beneficiaries)
- `help-circle-outline` → `help` (direct equivalent)
- `mail-outline` → `mail` (direct equivalent)
- `book-outline` → `menu_book` (prototype's choice; better conveys "legal/reading" than `book`)

## IonIcon removal
- Removed IonIcon from component imports array and removed all ionicons/icons imports + addIcons() call. Template no longer uses `<ion-icon>` — all icons now via `<span class="material-symbols-outlined">`. This is in-scope cleanup (not out-of-scope refactor) because the removal is a direct consequence of the icon system change.

## Directive placement
- Verified tab-bar-scroll.directive.ts: plain elements use @HostListener('scroll') (native). Moving appTabBarScroll from the old outer `.content-scroll` to the inner `.sheet-scroll` is a straight drop-in — the directive cares only about the scrolling element's scrollTop/clientHeight/scrollHeight, which the new `.sheet-scroll` div provides correctly.

## Stat tile min-height
- Changed from 58px to 64px to accommodate the taller 19px/800 value text with the new padding spec (11px top + 12px bottom).

## section :not(:first-child) .zone-label margin-top
- Using `22px` margin-top on non-first zone-labels (matches prototype's `.variant-a .sheet-inner .zone-label { margin-top: 22px }` with `:first-child { margin-top: 0 }` pattern). Implemented via `.settings-group:not(:first-child) .zone-label { margin-top: 22px }`.

## Avatar white ring
- Changed border from `2px solid #dbdfe7` to `2.5px solid rgba(255,255,255,.85)`. The prototype specifies this and the instruction says "white ring per prototype is acceptable polish if current image treatment isn't visibly degraded." The pig image itself is unchanged; only the container border changed to be visible on the dark gradient.

## Open questions / deferred
- None. All A/C is complete and self-verifiable.
