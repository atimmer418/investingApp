# Instagram-Style Floating Tab Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace FRED's docked `ion-tab-bar` with a floating Instagram-style capsule tab bar that has a sliding blue selector pill and shrinks on scroll, while keeping `ion-tabs`/`ion-router-outlet` for per-tab navigation stacks.

**Architecture:** A standalone `app-floating-tab-bar` component renders the capsule, icons, and the animated selector; it lives inside `tabs.page.html` in place of `ion-tab-bar`. Navigation goes through `IonTabs.select(tabName)` (confirmed to work without a slotted tab bar and to preserve stacks); the active tab is tracked via `(ionTabsDidChange)`. Scroll-shrink is driven by a `TabBarScrollService` (a `compact` signal) fed by a reusable `[appTabBarScroll]` directive attached to each tab's real scroll element.

**Tech Stack:** Angular 19.2 (standalone, signals), Ionic 8.5, SCSS. No unit tests (per project convention) — verification is `npm run build` + targeted browser/manual checks.

## Global Constraints

- Light mode only. **Do NOT add any `prefers-color-scheme` blocks or dark-mode styles.** (See memory `project_dark_mode_removal`.)
- Brand blue is `#2563EB` (selector pill `rgba(37, 99, 235, 0.12)`, active icon `#2563EB`). Inactive icon gray `#6B7280`.
- Filled-vs-outline icon swap is **out of scope** (deferred). Use the existing `*-outline` icon names for all states.
- Standalone components/directives/services only (no NgModules). Match existing FRED code style (`*ngFor`/`*ngIf` with `CommonModule`, as in the file being replaced).
- Preserve existing behavior: profile (tab3) notification badge, `isSubExpired` disabling tab1/tab2/chat (tab3 always enabled), safe-area-bottom.
- Build command (run from repo root): `cd frontend && npm run build`. Expected: completes with no errors.

---

## File Structure

- **Create** `frontend/src/app/services/tab-bar-scroll.service.ts` — `compact` signal + scroll-direction logic.
- **Create** `frontend/src/app/directives/tab-bar-scroll.directive.ts` — `[appTabBarScroll]`, feeds the service from `ion-content` (`ionScroll`) or native (`scroll`).
- **Create** `frontend/src/app/components/floating-tab-bar/floating-tab-bar.component.ts` — capsule component (logic).
- **Create** `frontend/src/app/components/floating-tab-bar/floating-tab-bar.component.html` — capsule template.
- **Create** `frontend/src/app/components/floating-tab-bar/floating-tab-bar.component.scss` — capsule styles.
- **Modify** `frontend/src/app/tabs/tabs.page.ts` — `@ViewChild(IonTabs)`, `ionTabsDidChange`, `selectTab`, derive initial tab.
- **Modify** `frontend/src/app/tabs/tabs.page.html` — replace `ion-tab-bar` with `app-floating-tab-bar`.
- **Modify** `frontend/src/app/tabs/tabs.page.scss` — drop old tab-button styles + outlet bottom offset.
- **Modify** `frontend/src/global.scss` — add `--fred-tabbar-clearance` token.
- **Modify** scroll-shrink + clearance: `tab1/tab1.page.html`, `components/retirement-planning/retirement-planning.component.html`, `pages/ai-chat/ai-chat.page.html`, `pages/ai-chat/ai-chat.page.scss`, `tab3/tab3.page.html`, `tab3/tab3.page.scss`.

---

### Task 1: TabBarScrollService

**Files:**
- Create: `frontend/src/app/services/tab-bar-scroll.service.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `compact: Signal<boolean>` (read-only signal; `true` => bar shrunk)
  - `report(scrollTop: number): void`
  - `reset(): void`

- [ ] **Step 1: Create the service**

```typescript
import { Injectable, signal } from '@angular/core';

/**
 * Drives the floating tab bar's shrink-on-scroll behavior.
 * Pages feed scrollTop via the appTabBarScroll directive; the bar reads `compact`.
 */
@Injectable({ providedIn: 'root' })
export class TabBarScrollService {
  /** true => the tab bar should render compact (shrunk). */
  readonly compact = signal(false);

  private lastY = 0;
  private readonly DELTA = 8;     // ignore scroll jitter smaller than this
  private readonly TOP_ZONE = 16; // always full-size within this many px of the top

  /** Report the current scroll position of the active scroll container. */
  report(scrollTop: number): void {
    const y = Math.max(0, scrollTop);

    // Near the top: always full size.
    if (y <= this.TOP_ZONE) {
      if (this.compact()) {
        this.compact.set(false);
      }
      this.lastY = y;
      return;
    }

    const dy = y - this.lastY;
    if (Math.abs(dy) < this.DELTA) {
      return; // not enough movement to react
    }

    if (dy > 0 && !this.compact()) {
      this.compact.set(true); // scrolling down -> shrink
    } else if (dy < 0 && this.compact()) {
      this.compact.set(false); // scrolling up -> grow
    }
    this.lastY = y;
  }

  /** Reset to full size (e.g. on tab change). */
  reset(): void {
    this.lastY = 0;
    if (this.compact()) {
      this.compact.set(false);
    }
  }
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `cd frontend && npm run build`
Expected: build completes, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/services/tab-bar-scroll.service.ts
git commit -m "feat(tabs): TabBarScrollService for shrink-on-scroll state"
```

---

### Task 2: TabBarScrollDirective

**Files:**
- Create: `frontend/src/app/directives/tab-bar-scroll.directive.ts`

**Interfaces:**
- Consumes: `TabBarScrollService.report(scrollTop)` (Task 1).
- Produces: directive selector `[appTabBarScroll]`. On an `<ion-content>` it enables `scrollEvents` and listens to `ionScroll`; on any other element it listens to native `scroll`.

- [ ] **Step 1: Create the directive**

```typescript
import { Directive, ElementRef, HostListener, OnInit, inject } from '@angular/core';
import { TabBarScrollService } from '../services/tab-bar-scroll.service';

/**
 * Attach to a tab's real scroll container so the floating tab bar shrinks on
 * scroll-down and grows on scroll-up. Works on <ion-content> (shadow-DOM scroll,
 * via ionScroll) and on plain overflow-scrolling elements (native scroll).
 */
@Directive({
  selector: '[appTabBarScroll]',
  standalone: true,
})
export class TabBarScrollDirective implements OnInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly scrollSvc = inject(TabBarScrollService);

  ngOnInit(): void {
    const node = this.el.nativeElement;
    if (node.tagName === 'ION-CONTENT') {
      // ion-content scrolls inside its shadow DOM; opt into scroll events.
      (node as unknown as { scrollEvents: boolean }).scrollEvents = true;
    }
  }

  /** Native scroll (plain elements such as div.content-scroll). */
  @HostListener('scroll', ['$event'])
  onNativeScroll(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target) {
      this.scrollSvc.report(target.scrollTop);
    }
  }

  /** Ionic scroll (ion-content). */
  @HostListener('ionScroll', ['$event'])
  onIonScroll(event: CustomEvent<{ scrollTop: number }>): void {
    this.scrollSvc.report(event.detail?.scrollTop ?? 0);
  }
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `cd frontend && npm run build`
Expected: build completes, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/directives/tab-bar-scroll.directive.ts
git commit -m "feat(tabs): appTabBarScroll directive feeding TabBarScrollService"
```

---

### Task 3: FloatingTabBarComponent

**Files:**
- Create: `frontend/src/app/components/floating-tab-bar/floating-tab-bar.component.ts`
- Create: `frontend/src/app/components/floating-tab-bar/floating-tab-bar.component.html`
- Create: `frontend/src/app/components/floating-tab-bar/floating-tab-bar.component.scss`

**Interfaces:**
- Consumes: `TabBarScrollService.compact` (Task 1).
- Produces: component `app-floating-tab-bar` with:
  - `@Input() activeTab: string | null | undefined` (route tab name; defaults to `'tab1'`)
  - `@Input() isSubExpired: boolean`
  - `@Input() badge: string | null`
  - `@Output() tabSelect: EventEmitter<string>` (emits the tapped tab name)

- [ ] **Step 1: Create the component class**

```typescript
import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  pieChartOutline,
  trendingUpOutline,
  chatbubblesOutline,
  personOutline,
} from 'ionicons/icons';
import { TabBarScrollService } from '../../services/tab-bar-scroll.service';

interface FloatingTab {
  tab: string;    // route tab name, e.g. 'tab1'
  icon: string;   // ionicon name (outline for now; fill is deferred)
  label: string;  // aria-label
  gated: boolean; // disabled when isSubExpired
}

@Component({
  selector: 'app-floating-tab-bar',
  templateUrl: './floating-tab-bar.component.html',
  styleUrls: ['./floating-tab-bar.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
})
export class FloatingTabBarComponent {
  private readonly scrollSvc = inject(TabBarScrollService);

  readonly tabs: FloatingTab[] = [
    { tab: 'tab1', icon: 'pie-chart-outline', label: 'Portfolio', gated: true },
    { tab: 'tab2', icon: 'trending-up-outline', label: 'Planning', gated: true },
    { tab: 'chat', icon: 'chatbubbles-outline', label: 'Chat', gated: true },
    { tab: 'tab3', icon: 'person-outline', label: 'Profile', gated: false },
  ];

  @Input() set activeTab(value: string | null | undefined) {
    this._activeTab.set(value ?? 'tab1');
  }
  private readonly _activeTab = signal<string>('tab1');

  @Input() isSubExpired = false;
  @Input() badge: string | null = null;

  @Output() tabSelect = new EventEmitter<string>();

  /** Shrink state from the scroll service. */
  readonly compact = this.scrollSvc.compact;

  /** Index of the active tab (drives the sliding indicator). */
  readonly activeIndex = computed(() => {
    const i = this.tabs.findIndex((t) => t.tab === this._activeTab());
    return i < 0 ? 0 : i;
  });

  constructor() {
    addIcons({
      pieChartOutline,
      trendingUpOutline,
      chatbubblesOutline,
      personOutline,
    });
  }

  isActive(tab: FloatingTab): boolean {
    return tab.tab === this._activeTab();
  }

  isDisabled(tab: FloatingTab): boolean {
    return this.isSubExpired && tab.gated;
  }

  onTap(tab: FloatingTab): void {
    if (this.isDisabled(tab)) {
      return;
    }
    this.tabSelect.emit(tab.tab);
  }
}
```

- [ ] **Step 2: Create the template**

```html
<nav
  class="ftb"
  [class.ftb--compact]="compact()"
  [style.--active-index]="activeIndex()"
  role="tablist"
  aria-label="Main navigation"
>
  <div class="ftb__inner">
    <div class="ftb__indicator" aria-hidden="true"></div>

    <button
      *ngFor="let t of tabs"
      type="button"
      class="ftb__cell"
      role="tab"
      [attr.aria-label]="t.label"
      [attr.aria-selected]="isActive(t)"
      [class.ftb__cell--active]="isActive(t)"
      [class.ftb__cell--disabled]="isDisabled(t)"
      [disabled]="isDisabled(t)"
      (click)="onTap(t)"
    >
      <span class="ftb__icon-wrap">
        <ion-icon [name]="t.icon" class="ftb__icon" aria-hidden="true"></ion-icon>
        <span class="ftb__badge" *ngIf="t.tab === 'tab3' && badge">{{ badge }}</span>
      </span>
    </button>
  </div>
</nav>
```

- [ ] **Step 3: Create the styles**

```scss
:host {
  --ftb-blue: #2563eb;
  --ftb-icon-inactive: #6b7280;
  --ftb-height-full: 64px;
  --ftb-height-compact: 52px;
  --ftb-icon-full: 28px;
  --ftb-icon-compact: 24px;
  --ftb-side-margin: 14px;
  --ftb-inner-pad: 6px;

  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
  z-index: 20;
  display: block;
  pointer-events: none; // side margins ignore taps; .ftb re-enables
}

.ftb {
  pointer-events: auto;
  margin: 0 var(--ftb-side-margin);
  height: var(--ftb-height-full);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transition: height 220ms ease, background-color 220ms ease;

  &--compact {
    height: var(--ftb-height-compact);
    background: rgba(255, 255, 255, 0.72);
  }
}

.ftb__inner {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 var(--ftb-inner-pad);
}

.ftb__indicator {
  position: absolute;
  top: 50%;
  left: var(--ftb-inner-pad);
  width: calc((100% - (2 * var(--ftb-inner-pad))) / 4); // one cell
  height: 44px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  // translateX is relative to the element's own width (= one cell),
  // so index * 100% lands exactly over cell `index`. No JS measurement.
  transform: translate(calc(var(--active-index, 0) * 100%), -50%);
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1), height 220ms ease;
}

.ftb--compact .ftb__indicator {
  height: 38px;
}

.ftb__cell {
  position: relative;
  z-index: 1;
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 120ms ease;

  &--disabled {
    opacity: 0.35;
    pointer-events: none;
  }

  &:active:not(.ftb__cell--disabled) {
    transform: scale(0.95);
  }
}

.ftb__icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ftb__icon {
  font-size: var(--ftb-icon-full);
  color: var(--ftb-icon-inactive);
  transition: color 200ms ease, font-size 220ms ease;
}

.ftb--compact .ftb__icon {
  font-size: var(--ftb-icon-compact);
}

.ftb__cell--active .ftb__icon {
  color: var(--ftb-blue);
}

.ftb__badge {
  position: absolute;
  top: -6px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 8px;
  background: #dc2626;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  box-sizing: border-box;
}

@media (prefers-reduced-motion: reduce) {
  .ftb,
  .ftb__indicator,
  .ftb__icon,
  .ftb__cell {
    transition: none !important;
  }
}
```

- [ ] **Step 4: Build to verify it compiles**

Run: `cd frontend && npm run build`
Expected: build completes, no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/floating-tab-bar/
git commit -m "feat(tabs): FloatingTabBarComponent capsule with sliding selector"
```

---

### Task 4: Wire the floating bar into TabsPage

**Files:**
- Modify: `frontend/src/app/tabs/tabs.page.ts`
- Modify: `frontend/src/app/tabs/tabs.page.html`
- Modify: `frontend/src/app/tabs/tabs.page.scss`

**Interfaces:**
- Consumes: `app-floating-tab-bar` inputs/output (Task 3); `IonTabs.select()` / `getSelected()` / `(ionTabsDidChange)` (Ionic).
- Produces: a working bottom navigation rendered by the custom bar.

- [ ] **Step 1: Replace `tabs.page.ts`**

```typescript
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonTabs } from '@ionic/angular/standalone';
import { AccountStatusService } from '../services/account-status.service';
import { AuthService } from '../services/auth.service';
import { TabBarScrollService } from '../services/tab-bar-scroll.service';
import { Observable } from 'rxjs';
import { FirstTimeTourComponent } from '../components/first-time-tour/first-time-tour.component';
import { FloatingTabBarComponent } from '../components/floating-tab-bar/floating-tab-bar.component';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    IonTabs,
    FirstTimeTourComponent,
    FloatingTabBarComponent,
  ],
})
export class TabsPage implements OnInit {
  @ViewChild(IonTabs) tabs!: IonTabs;

  settingsTabBadge$: Observable<string | null>;
  isSubExpired = false;
  activeTab = 'tab1';

  constructor(
    private accountStatusService: AccountStatusService,
    private authService: AuthService,
    private scrollSvc: TabBarScrollService,
    private router: Router
  ) {
    this.settingsTabBadge$ = this.accountStatusService.settingsTabBadge$;
  }

  ngOnInit() {
    this.activeTab = this.deriveActiveTab(this.router.url);
    this.accountStatusService.refreshStatus();
    this.authService.userProgress$.subscribe((progress) => {
      const fullyOnboarded = progress?.investmentConfirmationCompleted === true;
      const hasActiveSub = progress?.selectedTier != null;
      const isPrivateBeta = progress?.privateBeta === true;
      // Private beta users bypass the subscription gate
      this.isSubExpired = fullyOnboarded && !hasActiveSub && !isPrivateBeta;
    });
  }

  /** Keep the active tab + indicator in sync with Ionic's stack changes. */
  onTabsDidChange(ev: { tab: string }) {
    this.activeTab = ev.tab;
    this.scrollSvc.reset();
  }

  /** Navigate via Ionic so per-tab nav stacks are preserved. */
  selectTab(tab: string) {
    this.tabs.select(tab);
  }

  private deriveActiveTab(url: string): string {
    const m = url.match(/\/tabs\/([^/?#]+)/);
    return m ? m[1] : 'tab1';
  }
}
```

- [ ] **Step 2: Replace `tabs.page.html`**

```html
<app-first-time-tour></app-first-time-tour>
<ion-tabs class="mobile-tabs" (ionTabsDidChange)="onTabsDidChange($event)">
  <app-floating-tab-bar
    slot="bottom"
    [activeTab]="activeTab"
    [isSubExpired]="isSubExpired"
    [badge]="settingsTabBadge$ | async"
    (tabSelect)="selectTab($event)"
  ></app-floating-tab-bar>
</ion-tabs>
```

- [ ] **Step 3: Replace `tabs.page.scss`**

Remove the old `ion-tab-bar`/`ion-tab-button` styling and the fixed router-outlet bottom offset (the floating bar positions itself and content now fills the full height). Replace the whole file with:

```scss
.mobile-tabs {
  height: 100%;
}
```

- [ ] **Step 4: Build to verify it compiles**

Run: `cd frontend && npm run build`
Expected: build completes, no errors. (If the build flags unused imports such as the removed `IonTabBar`/`IonTabButton`/`IonIcon`/`IonBadge`, ensure they are gone from `tabs.page.ts` — they were removed in Step 1.)

- [ ] **Step 5: Browser verification**

Run the app (`/run` skill, or `cd frontend && npm start` + the dev tunnel) and confirm in the browser:
- The floating capsule renders at the bottom with margins, rounded ends, translucent white, soft shadow.
- Tapping each tab navigates to that tab AND the blue pill slides to it; active icon is blue, others gray.
- In tab2, open a strategy detail (`tab2 → strategy/:id`), switch to another tab, switch back — the detail is still there (stack preserved).
- `isSubExpired` (if reproducible) dims tab1/tab2/chat and blocks taps; tab3 stays enabled. Profile badge still shows.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/tabs/
git commit -m "feat(tabs): render floating tab bar, drive nav via IonTabs.select"
```

---

### Task 5: Scroll-shrink wiring + content clearance

**Files:**
- Modify: `frontend/src/global.scss`
- Modify: `frontend/src/app/tab1/tab1.page.html`
- Modify: `frontend/src/app/components/retirement-planning/retirement-planning.component.html`
- Modify: `frontend/src/app/pages/ai-chat/ai-chat.page.html`
- Modify: `frontend/src/app/pages/ai-chat/ai-chat.page.scss`
- Modify: `frontend/src/app/tab3/tab3.page.html`
- Modify: `frontend/src/app/tab3/tab3.page.scss`

**Interfaces:**
- Consumes: `[appTabBarScroll]` (Task 2); `--fred-tabbar-clearance` token (added here).

- [ ] **Step 1: Add the clearance token to `global.scss`**

In `frontend/src/global.scss`, inside the existing `:root { ... }` block (starts at line ~122), add:

```scss
  /* Floating tab bar: space content must leave at the bottom so it clears the bar. */
  --fred-tabbar-clearance: calc(64px + env(safe-area-inset-bottom, 0px) + 20px);
```

- [ ] **Step 2: Wire tab1 (`ion-content`)**

In `frontend/src/app/tab1/tab1.page.html`, change line 1 from:

```html
<ion-content [fullscreen]="true" class="tab1-outer-content">
```

to:

```html
<ion-content [fullscreen]="true" class="tab1-outer-content" appTabBarScroll
  [style.--padding-bottom]="'var(--fred-tabbar-clearance)'">
```

Then add the directive import to `tab1.page.ts`: add `import { TabBarScrollDirective } from '../directives/tab-bar-scroll.directive';` and include `TabBarScrollDirective` in the component's `imports` array.

- [ ] **Step 3: Wire tab2 (inner `ion-content.retirement-content`)**

In `frontend/src/app/components/retirement-planning/retirement-planning.component.html`, change line 21 from:

```html
<ion-content class="retirement-content">
```

to:

```html
<ion-content class="retirement-content" appTabBarScroll
  [style.--padding-bottom]="'var(--fred-tabbar-clearance)'">
```

Then add to `retirement-planning.component.ts`: `import { TabBarScrollDirective } from '../../directives/tab-bar-scroll.directive';` and include `TabBarScrollDirective` in its `imports` array.

- [ ] **Step 4: Wire chat (`ion-content.chat-content`) + push the input footer above the bar**

In `frontend/src/app/pages/ai-chat/ai-chat.page.html`, change line 41 from:

```html
<ion-content [fullscreen]="true" class="chat-content">
```

to:

```html
<ion-content [fullscreen]="true" class="chat-content" appTabBarScroll>
```

In `frontend/src/app/pages/ai-chat/ai-chat.page.scss`, update the existing `ion-footer` block (line ~216) so the input clears the floating bar:

```scss
ion-footer {
  background: var(--app-background, #f2f2f7) !important;
  --background: var(--app-background, #f2f2f7) !important;
  border-top: none;
  padding-bottom: var(--fred-tabbar-clearance);
}
```

Then add to `ai-chat.page.ts`: `import { TabBarScrollDirective } from '../../directives/tab-bar-scroll.directive';` and include `TabBarScrollDirective` in its `imports` array.

- [ ] **Step 5: Wire tab3 (`div.content-scroll`, native scroll)**

In `frontend/src/app/tab3/tab3.page.html`, change line 40 from:

```html
  <div class="content-scroll">
```

to:

```html
  <div class="content-scroll" appTabBarScroll>
```

In `frontend/src/app/tab3/tab3.page.scss`, add `padding-bottom` to the existing `.content-scroll` block (line ~207):

```scss
.content-scroll {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--fred-tabbar-clearance);
```

(Keep the rest of the existing `.content-scroll` declarations below this line unchanged.)

Then add to `tab3.page.ts`: `import { TabBarScrollDirective } from '../directives/tab-bar-scroll.directive';` and include `TabBarScrollDirective` in its `imports` array.

- [ ] **Step 6: Build to verify it compiles**

Run: `cd frontend && npm run build`
Expected: build completes, no errors.

- [ ] **Step 7: Browser verification (per tab)**

- tab1: scroll the portfolio list down → capsule shrinks; scroll up / reach top → returns to full size; bottom content is reachable (not hidden behind the bar).
- tab2: scroll retirement planning → shrinks/grows; content clears the bar.
- chat: the message input bar sits ABOVE the floating capsule (not covered); scrolling the conversation shrinks/grows the bar.
- tab3: scroll settings → shrinks/grows; last setting row clears the bar.
- Switching tabs resets the bar to full size.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/global.scss frontend/src/app/tab1/ frontend/src/app/components/retirement-planning/ frontend/src/app/pages/ai-chat/ frontend/src/app/tab3/
git commit -m "feat(tabs): wire scroll-shrink + content clearance across all tabs"
```

---

### Task 6: Final verification & cleanup

**Files:**
- Possibly modify: any file with leftover references to the old tab bar.

- [ ] **Step 1: Search for stale references**

Run: `cd frontend && grep -rn "ion-tab-bar\|ion-tab-button\|mobile-tab-button\|mobile-tab-bar" src/`
Expected: no results in `tabs.page.*`. (Other components' unrelated matches, if any, are fine — confirm they are not the bottom nav.)

- [ ] **Step 2: Full build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: build succeeds; lint passes (or only pre-existing warnings unrelated to these files).

- [ ] **Step 3: Acceptance pass against the spec**

Verify each acceptance criterion from the spec (§5) in the browser:
1. Floating translucent capsule, rounded, soft shadow, margins (light mode). ✅
2. Tap navigates + blue pill slides smoothly. ✅
3. Active icon blue, inactive gray. ✅
4. Scroll down shrinks; scroll up / top restores; never fully hidden — on all 4 tabs. ✅
5. Per-tab stacks preserved (tab2 strategy detail). ✅
6. Profile badge present; `isSubExpired` gating correct. ✅
7. No content hidden behind the bar; safe-area respected. ✅
8. `prefers-reduced-motion` disables slide/shrink. ✅
9. No dark-mode/`prefers-color-scheme` styles added. ✅

- [ ] **Step 4: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore(tabs): cleanup stale tab-bar references"
```

---

## Self-Review

**Spec coverage:** §1 goals → Tasks 3 (capsule + slide), 5 (shrink), 4 (nav). §3.1 structure/select() → Task 4. §3.2 capsule visuals → Task 3 SCSS. §3.3 sliding selector → Task 3 SCSS indicator. §3.4 scroll-shrink → Tasks 1, 2, 5. §3.5 preserved behavior (badge/gating/safe-area) → Tasks 3 (badge/disabled markup) + 4 (`isSubExpired`/`badge` inputs). §3.6 clearance (incl. chat footer) → Task 5. §3.7 a11y/reduced-motion → Task 3 (roles/aria + media query). §4 files → File Structure. §5 acceptance → Task 6. All covered.

**Placeholder scan:** No TBD/TODO; every code step has complete code; exact file paths and line anchors given.

**Type consistency:** `compact` (signal) consistent across service/component. `report`/`reset` signatures match between Task 1 (def), Task 2 (call). `app-floating-tab-bar` inputs (`activeTab`/`isSubExpired`/`badge`) and output (`tabSelect`) consistent between Task 3 (def) and Task 4 (usage). `selectTab`/`onTabsDidChange` consistent within Task 4. `appTabBarScroll` selector consistent between Task 2 (def) and Task 5 (usage).
