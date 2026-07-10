# Instagram-style swipeable tabs — Design

- **Date:** 2026-07-10
- **Author:** andy (with Claude)
- **Status:** Proposed — pending review
- **Area:** `frontend/src/app/tabs/*` and the four top-level tab pages

## 1. Summary

Let users move between the four top-level tabs — **tab1 (Portfolio) · tab2 (Planning) · chat (Ask FRED) · tab3 (Profile)** — by dragging left/right, exactly like Instagram: the current page follows the finger 1:1, the adjacent tab peeks in from the edge, and it snaps to the nearest tab on release. Tapping a tab in the floating bar still works and animates the same pager.

## 2. Goal & non-goals

**Goals**
- Finger-following horizontal paging between the four tabs (the screenshot behavior).
- Preserve everything the tabs do today: the floating tab bar and its sliding indicator, deep links / URLs (`/tabs/tab1`…`/tabs/tab3`), the shrink-on-scroll bar, the first-time tour, the MFU popup, chat behavior, and the expired-subscription gate.
- No regression to first-paint / pre-auth load time.

**Non-goals (YAGNI)**
- No wrap-around (tab1 is leftmost, tab3 rightmost — no looping).
- No change to tab order, tab content, icons, or the bar's visual design.
- No per-tab nested navigation stacks (none exist today — sub-pages are top-level routes outside `/tabs`).
- No dark mode work.

## 3. Current state

- `TabsPage` uses Ionic `IonTabs` + a router-outlet, with the custom `FloatingTabBarComponent` in the `slot="bottom"`.
- `tabs.routes.ts` defines four lazy child routes (`tab1`, `tab2`, `chat`, `tab3`), each `loadComponent`.
- The floating bar is already `position: absolute; bottom: …` and self-positions — it does **not** depend on the `ion-tabs` slot for placement. Its sliding indicator is driven by `activeIndex` computed from the `activeTab` input.
- Swiper 12 is a dependency and is registered globally (`register()` from `swiper/element/bundle` in `app.component.ts`). Get-started and investment-confirmation already use `<swiper-container>` with `CUSTOM_ELEMENTS_SCHEMA`.
- **Per-tab Ionic lifecycle is in use:**
  - `tab3` — `ionViewWillEnter()` re-checks MFU availability (can auto-open the MFU popup) and calls `freedomStatsService.refresh()`.
  - `ai-chat` — `ionViewDidEnter()` sets `isActive = true` + scrolls to bottom; `ionViewWillLeave()` sets `isActive = false`.
  - `tab1` — tour eligibility runs in `ngOnInit`; `tab2` has no lifecycle hooks.
- **Horizontal-drag controls that will conflict with a full-width swipe:**
  - `tab1` — portfolio chart scrub (pointer events → `scrubChange`).
  - `tab2` — retirement-planning + Monte-Carlo sliders.

## 4. Approach

**Chosen: replace the `IonTabs` mechanism inside `TabsPage` with a Swiper Element pager.** `IonTabs` lays out only one tab at a time and intentionally does not support swipe-between-tabs, so the finger-following peek is impossible with it. A pager lays adjacent pages side-by-side, which is what the screenshot shows. Swiper Element is already a dependency, already registered, and already used elsewhere in the app.

**Rejected:**
- *Hand-rolled `createGesture` transform pager* — reinvents momentum, snapping, and edge-resistance that Swiper already handles well.
- *Keep `IonTabs`, add flick-to-advance* — can't show the adjacent page peeking under the finger (user chose true drag-to-page).

## 5. Detailed design

### 5.1 `TabsPage` becomes a Swiper pager

`TabsPage` drops `ion-tabs`/router-outlet and hosts a `<swiper-container>` with four `<swiper-slide>`s, one per tab component, in bar order:

```
<app-first-time-tour></app-first-time-tour>
<swiper-container #swiper> <!-- options set imperatively -->
  <swiper-slide><app-tab1></app-tab1></swiper-slide>
  <swiper-slide><app-tab2></app-tab2></swiper-slide>
  <swiper-slide><app-ai-chat></app-ai-chat></swiper-slide>
  <swiper-slide><app-tab3></app-tab3></swiper-slide>
</swiper-container>
<app-floating-tab-bar
  [activeTab]="activeTab()" [isSubExpired]="isSubExpired"
  [badge]="settingsTabBadge$ | async" (tabSelect)="selectTab($event)">
</app-floating-tab-bar>
```

- All four tab components are **imported directly** by `TabsPage` (eager — see §5.8).
- `TabsPage` adds `schemas: [CUSTOM_ELEMENTS_SCHEMA]` (mirrors get-started).
- Each slide is 100% height; each tab page keeps its own `ion-content`, which owns vertical scrolling.
- Tab index map: `['tab1','tab2','chat','tab3']`.

### 5.2 Routing & URL sync

`tabs.routes.ts` collapses the four child routes into a single param route:

```
export const routes: Routes = [
  { path: '', redirectTo: 'tab1', pathMatch: 'full' },
  { path: ':tab', component: TabsPage },
];
```

- `/tabs` → redirects to `/tabs/tab1`. `/tabs/chat` etc. → `TabsPage` with `:tab = chat`.
- On init, `TabsPage` reads `:tab` from `ActivatedRoute`, validates against the four known tabs (falls back to `tab1`), and sets Swiper's initial slide.
- **On slide settle**, `TabsPage` updates the address with `Location.replaceState('/tabs/<tab>')` — **no** router navigation, **no** component re-creation — plus updates `activeTab`, drives `TabBarScrollService`, and fires activation (§5.4).
- **External navigations** (e.g. AppLock → `/tabs/tab1`, or any `router.navigate(['/tabs/chat'])`) are observed via the `paramMap` subscription; when the param differs from the current slide, `TabsPage` calls `swiper.slideTo(index)`. A guard flag prevents a settle→replaceState→paramMap→slideTo feedback loop.

This keeps deep-linking, browser refresh, and the existing AppLock re-nav behavior intact.

### 5.3 Gesture & conflict handling (swipe-anywhere-except-controls)

- Horizontal Swiper with default directional detection (`touchAngle` ~45°) so **mostly-vertical drags pass through to `ion-content`** and only mostly-horizontal drags page.
- The two conflict zones get Swiper's default **`swiper-no-swiping`** class so they keep their own horizontal gesture and never initiate a tab change:
  - **tab1** — the chart's scrub surface (the element bound to `onPointerDown` in `portfolio-chart`).
  - **tab2** — the slider elements in `retirement-planning` and `monte-carlo-flow`.
- Everywhere else on every screen, a horizontal drag pages between tabs with the adjacent tab peeking in.

### 5.4 Tab activation & lifecycle — plus init-gating

Because all four tabs mount together, Ionic's per-tab hooks (`ionViewWillEnter`, `ionViewDidEnter`, `ionViewWillLeave`) no longer fire. A small **`TabActivationService`** replaces them:

```
@Injectable({ providedIn: 'root' })
export class TabActivationService {
  readonly activeTab = signal<string>('tab1');
  setActive(tab: string) { this.activeTab.set(tab); }
}
```

`TabsPage` calls `setActive(tab)` on every slide settle, **including the initial one** (so a deep-link to `/tabs/tab3` still runs tab3's enter logic, matching Ionic today).

Consumers react to the signal:
- **tab3** — an `effect` runs its "on enter" work (`checkMfuAvailability()` incl. the auto-MFU popup, and `freedomStatsService.refresh()`) each time `activeTab() === 'tab3'`. Its `ionViewWillEnter` body moves here. Because `setActive` only fires on settle (never merely on mount), the MFU popup still appears only when the user actually lands on Profile — same as today. `ngOnInit` keeps the light prefs subscription.
- **ai-chat** — an `effect` sets `isActive = (activeTab() === 'chat')` and scrolls to bottom on activate, replacing `ionViewDidEnter`/`ionViewWillLeave`.
- **tab1 / tab2** — no enter-logic changes; tab1's tour stays in `ngOnInit`.

**Init-gating (the eager-load cost fix).** Each tab's *code* loads eagerly, but each tab's *expensive initialization* is gated on **first activation**, not `ngOnInit`:
- **ai-chat** — `loadSessions()`, `syncBackendHistory()`, and `loadDailySuggestions()` move out of `ngOnInit` behind a `firstActivated` flag triggered by activation. This preserves today's timing (those calls fire when the user first reaches chat) instead of bunching them onto app-entry. Cheap listeners (keyboard) stay in `ngOnInit`.
- **tab1** is the landing tab (active on load), so it initializes immediately, exactly as now.

Net effect: eager loading adds a negligible one-time download (~tens of KB gzipped, off the first-paint path — the tabs shell is itself lazy-loaded) and **no extra runtime work vs. today**.

### 5.5 Floating tab bar

- Moves out of the (removed) `ion-tabs` `slot="bottom"` to a plain child of `TabsPage`; its own `position: absolute; bottom: …` keeps it where it is. It renders above the pager (`z-index: 20` already set).
- Public API is unchanged. `tabSelect` → `TabsPage.selectTab(tab)` → `swiper.slideTo(index)` (animated). The sliding indicator continues to track `activeTab` via `activeIndex`.

### 5.6 Expired-subscription lock

When `isSubExpired` is true (gated tabs already un-tappable in the bar), `TabsPage` sets Swiper **`allowTouchMove = false`** so the user cannot swipe into gated tabs. Profile stays reachable by **tapping** it (programmatic `slideTo` still works with touch disabled). The user is not force-moved. When the flag clears, touch is re-enabled.

### 5.7 Other preserved behavior

- **`TabBarScrollService`** — driven from slide settle: `reset()` + `setHoldFull(tab === 'chat')`. Each page's own scroll still shrinks the bar via the existing per-page directive.
- **first-time-tour** overlay and chat's keyboard listeners are independent of the pager and unchanged.

### 5.8 Loading strategy

Eager: the four tab components bundle into the tabs chunk and load together when the user enters the app shell after auth. The `tabs` route stays lazy-loaded via `loadChildren`, so there is **no pre-auth / first-paint bundle regression**. Instant swipes with no blank peek. Runtime cost neutralized by init-gating (§5.4).

## 6. Files to change

**Edit**
- `frontend/src/app/tabs/tabs.routes.ts` — collapse four child routes into `:tab` + default redirect.
- `frontend/src/app/tabs/tabs.page.ts` — host Swiper; read `:tab`; slide↔URL sync w/ loop guard; `selectTab`→`slideTo`; expired `allowTouchMove` lock; drive `TabActivationService` + `TabBarScrollService`; `CUSTOM_ELEMENTS_SCHEMA`; import the four tab components.
- `frontend/src/app/tabs/tabs.page.html` — replace `ion-tabs` with `<swiper-container>` + four slides + floating bar.
- `frontend/src/app/tabs/tabs.page.scss` — full-height pager/slides; ensure each `ion-content` scrolls independently.
- `frontend/src/app/tab3/tab3.page.ts` — move `ionViewWillEnter` body to an activation `effect`.
- `frontend/src/app/tab3/tab3.page.spec.ts` — update the test that calls `ionViewWillEnter()` to the new handler.
- `frontend/src/app/pages/ai-chat/ai-chat.page.ts` — wire `isActive` + scroll to activation; gate `loadSessions`/`syncBackendHistory`/`loadDailySuggestions` on first activation.
- `frontend/src/app/components/portfolio-chart/portfolio-chart.component.html` — add `swiper-no-swiping` to the scrub surface.
- `frontend/src/app/components/retirement-planning/retirement-planning.component.html` — add `swiper-no-swiping` to the slider(s).
- `frontend/src/app/components/monte-carlo-flow/monte-carlo-flow.component.html` — add `swiper-no-swiping` to the slider(s).

**Add**
- `frontend/src/app/services/tab-activation.service.ts` — `activeTab` signal + `setActive`.
- `frontend/src/app/tabs/tabs.page.spec.ts` — pager logic tests (see §7).

## 7. Testing & verification

**Unit**
- `:tab` param → initial slide index; unknown param → `tab1`.
- Slide settle → `Location.replaceState` called with the right path + `setActive` fired + bar `activeTab` updated.
- `selectTab` → `slideTo` with the right index.
- External param change → `slideTo`, with no feedback loop.
- `isSubExpired` true → `allowTouchMove = false`; false → re-enabled.
- Update `tab3.page.spec.ts` for the activation handler.

**Manual (on device — the parts unit tests can't cover)**
- Finger-following drag + snap between all four tabs.
- Chart scrub (tab1) and sliders (tab2) still work and do **not** change tabs; swipe works elsewhere on those screens.
- Vertical `ion-content` scroll passes through (not hijacked by the pager) on every tab.
- Chat keyboard, deep-link to `/tabs/chat`, MFU popup on entering Profile, expired-sub lock.

**Build gate:** `npx ng build` (AOT). *(`--configuration development` is invalid in this repo — use plain `ng build` or a valid config.)*

## 8. Risks & open questions

- **Reduced-motion snap.** The finger-follow drag is a direct transform and is unaffected, but the **release-snap glide** and tap-`slideTo` animation rely on a timed CSS transition. `global.scss` zeroes all `transition/animation` durations with `!important` under reduced motion, which could make the snap **instant** (functional but abrupt). *Mitigation:* carve a targeted exception so Swiper's inline transition duration survives on the swiper wrapper, or accept an instant snap under reduced motion. Verify on device.
- **Vertical-scroll vs. horizontal-swipe** directional detection inside `ion-content` is the main feel risk — validate on device; tune `touchAngle`/`threshold` if vertical scroll ever feels grabbed.
- **Swiper Element event/height integration** with Angular + `ion-content` — ensure slides are 100% height and each content scrolls independently.

## 9. Out of scope

Wrap-around paging, tab reordering, changes to tab content, dark mode, and any nested per-tab navigation stack.
