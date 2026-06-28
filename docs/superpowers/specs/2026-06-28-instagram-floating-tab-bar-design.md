# Instagram-Style Floating Tab Bar — Design Spec

**Date:** 2026-06-28
**Status:** Approved (design); pending spec review → implementation plan
**Owner:** Andy / atimmer

## 1. Goal

Remodel FRED's bottom tab bar to match Instagram's current floating tab bar:

1. A **floating capsule** (rounded pill, translucent, soft shadow) that floats over content with side and bottom margins — not the current edge-to-edge docked bar.
2. A **sliding selector** — a pill behind the active tab's icon that animates horizontally to the tapped tab.
3. **Scroll-shrink** — the capsule shrinks when the user scrolls down and returns to full size when scrolling up (it stays visible at all times; it does not hide).
4. **Light mode only** (FRED is not doing dark mode yet).

Reference screenshots (provided by Andy): IMG_9248 (compact/dark), IMG_9249 (full/dark), IMG_9250 (slide animation mid-transition), IMG_9251 (full/light — the visual target).

### Decisions locked
- **Selector pill color:** FRED **blue tint** (`rgba(37, 99, 235, 0.12)`), not Instagram's neutral gray — on-brand with FRED's design system (`#2563EB`).
- **Selected icon:** **turns FRED blue** (`#2563EB`); unselected icons are gray. (Stronger selected cue while the fill/outline swap is deferred.)

### Out of scope (deferred per Andy)
- Filled-vs-outline icon swap on selection. Icons will be structured so this is a later one-line `name` swap (`*-outline` ↔ filled).
- Dark mode (keep `settings.service` theme infra untouched; do not add `prefers-color-scheme` blocks — see `project_dark_mode_removal`).

## 2. Current state

`frontend/src/app/tabs/tabs.page.{html,ts,scss}`:
- Ionic `<ion-tabs>` → `<ion-tab-bar slot="bottom">` with 4 `<ion-tab-button>`s: `tab1` (pie-chart / portfolio), `tab2` (trending-up / retirement planning), `chat` (chatbubbles / ai-chat), `tab3` (person / profile, with notification badge).
- Icon-only, 30px outline icons, Ionic default selected color swap, fixed docked bar, blurred white background.
- `tabs.page.ts` holds: `settingsTabBadge$` (profile badge), `isSubExpired` (disables tab1/tab2/chat; tab3 always enabled).

Routing (`tabs.routes.ts`): `TabsPage` is the parent component; children `tab1`, `tab2` (with nested `strategy/:id`), `chat`, `tab3`, lazy-loaded under `<ion-router-outlet>`. **Per-tab navigation stacks matter** — e.g. tab2 → `strategy/:id` detail must survive a tab switch and return.

Scroll containers differ per tab (important for scroll-shrink wiring):
- `tab1`: `<ion-content [fullscreen]="true">` — scrolls the `ion-content`.
- `chat`: `<ion-content [fullscreen]="true" class="chat-content">` — scrolls the `ion-content`.
- `tab2`: `<ion-content [fullscreen]="true" [scrollY]="false">` → scroll happens inside `<app-retirement-planning>`.
- `tab3`: `<ion-content [scrollY]="false">` → scroll happens inside the settings content child.

## 3. Chosen approach

**Custom `<app-floating-tab-bar>` component; keep `<ion-tabs>` + `<ion-router-outlet>` for routing and per-tab stacks.**

Rejected alternatives:
- *Restyle `ion-tab-bar` in place* — fighting shadow DOM for the capsule shape and JS-measuring button widths to align the slide pill is brittle on resize.
- *Replace `ion-tabs` with plain `routerLink`s* — loses per-tab navigation stacks (tab2 strategy detail).

### 3.1 Component structure
- New standalone component `app-floating-tab-bar` (`frontend/src/app/components/floating-tab-bar/`).
- Rendered inside `tabs.page.html`, replacing `<ion-tab-bar>`. `<ion-tabs>` + `<ion-router-outlet>` remain.
- `tabs.page.ts` gets `@ViewChild(IonTabs)` and passes the ref (or a `select(tab)` callback) to the bar; the bar calls `ionTabs.select(tabName)` for navigation so Ionic preserves stacks.
- Active tab tracked via `<ion-tabs (ionTabsDidChange)="onTabChange($event)">` (`$event.tab`), plus an initial read from the current route on load.

**Risk RESOLVED (confirmed against Ionic 8.5 source, `@ionic/angular/.../navigation/tabs.mjs`):** `IonTabs.select(tab)` works with **no** `ion-tab-bar`. In router mode (`hasTab === false`, which FRED uses) `select()` only touches `this.outlet` (the always-present `ion-router-outlet` inside `ion-tabs`) and `navCtrl` — it computes `\`${outlet.tabsPrefix}/${tab}\`` and navigates, **preserving per-tab stacks** via `outlet.getLastRouteView(tab)`. `ionTabsDidChange` still fires on every switch (`onStackDidChange` emits `{tab}`; its `if (this.tabBar)` line simply no-ops when the bar is absent). `getSelected()` returns `outlet.getActiveStackId()`. → No hidden `ion-tab-bar` fallback is needed.

### 3.2 Visual spec — capsule (light mode)
- Shape: `border-radius: 999px`; side margins ~14px; bottom margin = `env(safe-area-inset-bottom) + 10px`.
- Background: `rgba(255, 255, 255, 0.8)` + `backdrop-filter: blur(20px)` (with `-webkit-` prefix).
- Border: hairline `1px solid rgba(0, 0, 0, 0.06)`.
- Shadow: `0 8px 24px rgba(0, 0, 0, 0.12)`.
- Layout: 4 equal-width flex cells, icons centered.
- **Full size** (at rest / scrolling up): height ~64px, icons 28px.
- **Compact** (scrolling down): height ~52px, icons 24px, slightly more transparent.
- Size transition: ~220ms ease (on height/padding/icon size/opacity).

### 3.3 Sliding selector
- A blue-tint pill (`background: rgba(37, 99, 235, 0.12)`, rounded) absolutely positioned inside the bar.
- Width = one cell (`25%` of the inner row); the visible pill sits inside that cell with small horizontal margin for breathing room.
- Movement: `transform: translateX(calc(var(--active-index) * 100%))` where `--active-index` ∈ {0,1,2,3}. Because the pill's own width is one cell, `translateX(100%)` = exactly one cell — **no JS width measurement, resize-proof**.
- Transition: `transform 250ms cubic-bezier(0.4, 0, 0.2, 1)`.
- Active icon color `#2563EB`; inactive icon color gray (`var(--app-gray-400)` / `#6B7280`).

### 3.4 Scroll-shrink
- `TabBarScrollService` exposing a `compact` **signal** (`signal<boolean>(false)`), consistent with FRED's signals adoption (`project_signals_adoption`). Method e.g. `report(scrollTop: number)` computes direction with a small threshold (~8px) and forces full when near the top (scrollTop < ~16px). Debounce/ignore jitter.
- A reusable directive `[appTabBarScroll]` attaches to each tab's **real** scroll element and feeds the service:
  - On `<ion-content>`: enable `scrollEvents` and listen to `ionScroll` (`$event.detail.scrollTop`).
  - On a plain scrolling element: listen to native `scroll`.
- Wiring points (4), now resolved:
  - `tab1`: the page `<ion-content>` (`ionScroll`).
  - `chat`: the `<ion-content class="chat-content">` (`ionScroll`).
  - `tab2`: the **nested** `<ion-content class="retirement-content">` inside `app-retirement-planning` (line 21 of `retirement-planning.component.html`) — the outer tab2 `ion-content` is `[scrollY]="false"`, so the directive attaches to this inner `ion-content` (`ionScroll`).
  - `tab3`: the `<div class="content-scroll">` inside the settings page (`overflow-y: auto`, native `scroll`).
- The bar reads `compact()` and toggles a `.compact` class.

### 3.5 Preserved behavior
- **Profile badge:** render `settingsTabBadge$` value as a badge on the tab3 (profile) cell (same red dot/count as today).
- **Subscription gate:** `isSubExpired` disables `tab1`/`tab2`/`chat` (dimmed, non-interactive); `tab3` always enabled. Disabled cells block `select()`.
- **Safe area:** capsule respects `env(safe-area-inset-bottom)`.

### 3.6 Layout / content clearance
- The bar floats over content (Instagram effect — content scrolls *behind* the translucent capsule on the scrollable tabs). Remove the current fixed `ion-router-outlet { bottom: calc(56px + safe-area) }` offset so content fills the full height.
- A global clearance token: `--fred-tabbar-clearance: calc(64px + env(safe-area-inset-bottom, 0px) + 20px)` (full-size bar height + bottom margin + buffer).
- Per-tab clearance so nothing important hides behind the bar:
  - `tab1` `ion-content`: `--padding-bottom: var(--fred-tabbar-clearance)`.
  - `tab2` inner `ion-content.retirement-content`: `--padding-bottom: var(--fred-tabbar-clearance)`.
  - `tab3` `div.content-scroll`: `padding-bottom: var(--fred-tabbar-clearance)`.
  - `chat` (**special — has a docked `<ion-footer>` input bar**): the bar must NOT cover the input. Add `padding-bottom: var(--fred-tabbar-clearance)` to the chat `ion-footer`/`.input-bar` so the input sits above the floating capsule; the capsule floats over the footer's background strip. (Verify no other tab has a docked footer that collides; tab1/tab2/tab3 are scroll containers without bottom-docked controls.)

### 3.7 Accessibility & motion
- Each cell is a `<button>` with `aria-label` and `aria-selected`.
- `@media (prefers-reduced-motion: reduce)` disables the slide and shrink transitions (instant state changes).

## 4. Affected files (anticipated)
- New: `frontend/src/app/components/floating-tab-bar/floating-tab-bar.component.{ts,html,scss}`.
- New: `frontend/src/app/services/tab-bar-scroll.service.ts`.
- New: `frontend/src/app/directives/tab-bar-scroll.directive.ts`.
- Edit: `frontend/src/app/tabs/tabs.page.{html,ts,scss}`.
- Edit (scroll-shrink wiring + bottom clearance): `tab1/tab1.page.html` (`ion-content`), `components/retirement-planning/retirement-planning.component.html` (inner `ion-content.retirement-content`), `pages/ai-chat/ai-chat.page.html` (`ion-content.chat-content`), `tab3/tab3.page.html` (`div.content-scroll`).

## 5. Acceptance criteria
1. Tab bar renders as a floating, fully-rounded translucent white capsule with soft shadow, side + bottom margins, over content (light mode).
2. Tapping a tab navigates correctly **and** the blue selector pill slides smoothly from the old tab to the new one.
3. The active icon is blue; inactive icons are gray.
4. Scrolling down in each of the 4 tabs shrinks the capsule; scrolling up (or being near the top) returns it to full size; it never fully hides.
5. Per-tab navigation stacks still work (tab2 → strategy detail survives switching tabs and back).
6. Profile badge still appears; `isSubExpired` still disables tab1/tab2/chat and not tab3.
7. No content is permanently hidden behind the floating bar; safe-area respected on notched devices.
8. `prefers-reduced-motion` disables the slide/shrink animations.
9. No dark-mode / `prefers-color-scheme` styles introduced.
