# Swipeable Tabs (Instagram-style) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users drag left/right to move between the four top-level tabs (tab1 Portfolio · tab2 Planning · chat · tab3 Profile) with a finger-following pager, exactly like Instagram.

**Architecture:** Replace the `IonTabs` mechanism inside `TabsPage` with a Swiper Element pager holding the four tab components as slides. A new `TabActivationService` (signal) replaces the Ionic per-tab lifecycle hooks that stop firing once all tabs are mounted together. The floating tab bar stays as-is (indicator + tap → `slideTo`). Slide↔URL stay in sync via `Location.replaceState` (no router navigation, so no feedback loop).

**Tech Stack:** Angular 19 (standalone components + signals), Ionic 8, Swiper 12 (Element / web-component API), Karma+Jasmine.

## Global Constraints

- **Swiper is already registered globally** — `register()` from `swiper/element/bundle` runs in `app.component.ts`. Do NOT call `register()` again. Use `<swiper-container>`/`<swiper-slide>` with `schemas: [CUSTOM_ELEMENTS_SCHEMA]`.
- **Do NOT use `css-mode`** on the tabs pager. Default (touch) mode is required so `swiper-no-swiping`, `allowTouchMove`, and directional `touchAngle` all work.
- **Swiper Element access pattern** (mirror `investmentconfirmation.component.ts`): read the instance via `(event.target as SwiperContainer).swiper`; move it via `swiperRef.nativeElement.swiper.slideTo(index)`.
- **Angular `effect()` must be created in an injection context** — create all effects in the constructor.
- **Branch:** work on `feature/swipeable-tabs` (created in Setup). The working tree already has unrelated modified files — never `git add -A`; stage only the exact files each step lists.
- **Build gate:** `npx ng build` (AOT). `--configuration development` is invalid in this repo; use plain `ng build`.
- **Commit trailer:** every commit message ends with these two lines:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01GNdNwDMyEZQG5GLK5EqfcA
  ```
- **Run one spec file** with: `npx ng test --watch=false --browsers=ChromeHeadless --include='<path-to-spec>'`.

---

## Setup

- [ ] **Create the feature branch**

```bash
cd /Users/andrewtimmer/PersonalTypeshit/FRED
git checkout -b feature/swipeable-tabs
```

---

## Task 1: TabActivationService

The signal that tells each tab "you are now the active slide." Foundational — Tasks 2, 3, and 4 depend on it.

**Files:**
- Create: `frontend/src/app/services/tab-activation.service.ts`
- Test: `frontend/src/app/services/tab-activation.service.spec.ts`

**Interfaces:**
- Produces: `TabActivationService` with `readonly activeTab: Signal<string>` (initial `'tab1'`) and `setActive(tab: string): void`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/services/tab-activation.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { TabActivationService } from './tab-activation.service';

describe('TabActivationService', () => {
  let service: TabActivationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TabActivationService);
  });

  it('defaults to tab1', () => {
    expect(service.activeTab()).toBe('tab1');
  });

  it('setActive updates the activeTab signal', () => {
    service.setActive('chat');
    expect(service.activeTab()).toBe('chat');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/services/tab-activation.service.spec.ts'`
Expected: FAIL — cannot find module `./tab-activation.service`.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/app/services/tab-activation.service.ts`:

```ts
import { Injectable, signal } from '@angular/core';

/**
 * Tells each top-level tab when it becomes the active slide in the swipeable
 * pager. Replaces the Ionic per-tab lifecycle hooks (ionViewWillEnter etc.),
 * which no longer fire once all four tabs are mounted together in the pager.
 */
@Injectable({ providedIn: 'root' })
export class TabActivationService {
  private readonly _activeTab = signal<string>('tab1');
  readonly activeTab = this._activeTab.asReadonly();

  setActive(tab: string): void {
    this._activeTab.set(tab);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/services/tab-activation.service.spec.ts'`
Expected: PASS (2 specs).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/services/tab-activation.service.ts frontend/src/app/services/tab-activation.service.spec.ts
git commit -m "feat(tabs): add TabActivationService for pager activation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GNdNwDMyEZQG5GLK5EqfcA"
```

---

## Task 2: Wire tab3 (Profile) to activation

Move tab3's `ionViewWillEnter` work (MFU check + freedom-stats refresh) into a public `onTabActivated()` method driven by the activation signal. Keep `ionViewWillEnter` delegating so nothing regresses while the old `ion-tabs` shell is still in place (it is removed in Task 4).

**Files:**
- Modify: `frontend/src/app/tab3/tab3.page.ts`
- Test: `frontend/src/app/tab3/tab3.page.spec.ts`

**Interfaces:**
- Consumes: `TabActivationService.activeTab()` (Task 1).
- Produces: `Tab3Page.onTabActivated(): void` (public; runs MFU check + `freedomStatsService.refresh()`).

- [ ] **Step 1: Update the existing failing test + add the wiring test**

In `frontend/src/app/tab3/tab3.page.spec.ts`:

Replace the MFU import line:
```ts
import { MonthlyFreedomUpdateService } from '../services/monthly-freedom-update.service';
```
with:
```ts
import { MfuStoreService } from '../services/mfu-store.service';
import { MfuPresenterService } from '../services/mfu-presenter.service';
import { TabActivationService } from '../services/tab-activation.service';
```

Delete the `makeMfuServiceMock()` helper and add these two helpers next to the other `make*Mock` factories:
```ts
function makeMfuStoreMock() {
  return { ensureAutoSession: () => of({ shouldShow: false, hasMfuHistory: false, data: null }) };
}
function makeMfuPresenterMock() {
  return { presentAutoIfDue: () => Promise.resolve(), presentReopen: () => Promise.resolve() };
}
```

Replace EVERY occurrence (there are 4) of:
```ts
      .overrideProvider(MonthlyFreedomUpdateService, { useValue: makeMfuServiceMock() })
```
with:
```ts
      .overrideProvider(MfuStoreService, { useValue: makeMfuStoreMock() })
      .overrideProvider(MfuPresenterService, { useValue: makeMfuPresenterMock() })
```

In the test titled `calls freedomStatsService.refresh() on ionViewWillEnter`, rename it and change the call:
```ts
  it('runs onTabActivated (freedomStats refresh) when the tab is activated', fakeAsync(() => {
```
and replace `component.ionViewWillEnter();` with `component.onTabActivated();`.

Add a new test after it (uses the real `TabActivationService`, driven directly):
```ts
  it('runs onTabActivated when TabActivationService activates tab3', fakeAsync(() => {
    const freedomStatsMock = makeFreedomStatsServiceMock(
      false,
      { freedomYear: '2045', freedomAge: '42', dollarsAway: '$1.2M' }
    );

    TestBed.configureTestingModule({
      imports: [Tab3Page, RouterTestingModule],
      providers: [
        { provide: ModalController, useValue: makeModalControllerMock() }
      ]
    })
      .overrideProvider(SettingsService, { useValue: makeSettingsServiceMock() })
      .overrideProvider(PlaidService, { useValue: makePlaidServiceMock() })
      .overrideProvider(AuthService, { useValue: makeAuthServiceMock() })
      .overrideProvider(ToastService, { useValue: makeToastServiceMock() })
      .overrideProvider(MfuStoreService, { useValue: makeMfuStoreMock() })
      .overrideProvider(MfuPresenterService, { useValue: makeMfuPresenterMock() })
      .overrideProvider(AppLockService, { useValue: makeAppLockServiceMock() })
      .overrideProvider(AccountStatusService, { useValue: makeAccountStatusServiceMock() })
      .overrideProvider(FreedomStatsService, { useValue: freedomStatsMock });

    const fixture = TestBed.createComponent(Tab3Page);
    fixture.detectChanges();
    tick(0);

    const activation = TestBed.inject(TabActivationService);
    freedomStatsMock.refresh.calls.reset();

    activation.setActive('tab3');
    fixture.detectChanges();

    expect(freedomStatsMock.refresh).toHaveBeenCalled();
  }));
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/tab3/tab3.page.spec.ts'`
Expected: FAIL — `component.onTabActivated is not a function`.

- [ ] **Step 3: Implement in `tab3.page.ts`**

Add the import:
```ts
import { TabActivationService } from '../services/tab-activation.service';
```

Add `private tabActivation: TabActivationService` to the constructor parameter list (after `public freedomStatsService: FreedomStatsService`).

Inside the constructor, after the existing `liveEquity` effect, add:
```ts
    // Fire the tab's "on enter" work when it becomes the active pager slide.
    effect(() => {
      if (this.tabActivation.activeTab() === 'tab3') {
        this.onTabActivated();
      }
    });
```

Replace the existing `ionViewWillEnter()` method:
```ts
  ionViewWillEnter() {
    // Re-check MFU availability each time the tab is visited.
    this.checkMfuAvailability();

    // Silent stale-while-revalidate refresh: show cached stats instantly,
    // then quietly background-refresh. Never flashes '—' on re-entry.
    this.freedomStatsService.refresh();
  }
```
with:
```ts
  /**
   * Runs each time Profile becomes the active pager slide (fired by the
   * activation effect). Also delegated to from ionViewWillEnter while the
   * legacy ion-tabs shell is still present — removed in the pager cutover.
   */
  onTabActivated() {
    // Re-check MFU availability each time the tab is visited.
    this.checkMfuAvailability();

    // Silent stale-while-revalidate refresh: show cached stats instantly,
    // then quietly background-refresh. Never flashes '—' on re-entry.
    this.freedomStatsService.refresh();
  }

  ionViewWillEnter() {
    this.onTabActivated();
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/tab3/tab3.page.spec.ts'`
Expected: PASS (all tab3 specs green).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/tab3/tab3.page.ts frontend/src/app/tab3/tab3.page.spec.ts
git commit -m "feat(tabs): drive tab3 enter-logic from TabActivationService

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GNdNwDMyEZQG5GLK5EqfcA"
```

---

## Task 3: Wire ai-chat to activation + gate its data load

Move chat's three data-load calls out of `ngOnInit` behind a first-activation flag (so eager mount does not fire them on app entry), and drive `isActive` from activation. Keep the Ionic hooks delegating for now (removed in Task 4).

**Files:**
- Modify: `frontend/src/app/pages/ai-chat/ai-chat.page.ts`
- Test: `frontend/src/app/pages/ai-chat/ai-chat.page.spec.ts` (new)

**Interfaces:**
- Consumes: `TabActivationService.activeTab()` (Task 1).
- Produces: `AiChatPage.onChatActiveChange(active: boolean): void` (public; toggles `isActive`, loads chat data once on first activation).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/pages/ai-chat/ai-chat.page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { MenuController } from '@ionic/angular';
import { AiChatPage } from './ai-chat.page';
import { ChatService } from '../../services/chat.service';
import { FirstTimeTourService } from '../../services/first-time-tour.service';
import { TabActivationService } from '../../services/tab-activation.service';

function makeChatServiceMock() {
  return {
    getSessions: jasmine.createSpy('getSessions').and.returnValue([]),
    getRecentSession: jasmine.createSpy('getRecentSession').and.returnValue(null),
    getHistory: jasmine.createSpy('getHistory').and.returnValue(of([])),
    getDailySuggestions: jasmine.createSpy('getDailySuggestions').and.returnValue(of([])),
    getUsedSuggestions: jasmine.createSpy('getUsedSuggestions').and.returnValue([]),
    createSession: jasmine.createSpy('createSession').and.returnValue({ id: 's1', messages: [] }),
    saveSession: jasmine.createSpy('saveSession'),
  };
}

describe('AiChatPage activation gating', () => {
  let chat: ReturnType<typeof makeChatServiceMock>;

  beforeEach(() => {
    chat = makeChatServiceMock();
    TestBed.configureTestingModule({
      imports: [AiChatPage, RouterTestingModule],
      providers: [{ provide: MenuController, useValue: {} }],
    })
      .overrideProvider(ChatService, { useValue: chat })
      .overrideProvider(FirstTimeTourService, { useValue: { isTourActive: () => false, getCurrentStep: () => 0 } });
  });

  it('does not load chat data until first activation, then gates re-loads', () => {
    const fixture = TestBed.createComponent(AiChatPage);
    const c = fixture.componentInstance;
    // NOTE: no fixture.detectChanges() — keeps ngOnInit (keyboard listeners) from running.

    expect(chat.getDailySuggestions).not.toHaveBeenCalled();
    expect(c.isActive).toBeFalse();

    c.onChatActiveChange(true);
    expect(c.isActive).toBeTrue();
    expect(chat.getSessions).toHaveBeenCalled();
    expect(chat.getDailySuggestions).toHaveBeenCalledTimes(1);

    c.onChatActiveChange(false);
    expect(c.isActive).toBeFalse();

    c.onChatActiveChange(true);
    expect(chat.getDailySuggestions).toHaveBeenCalledTimes(1); // gated — not reloaded
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/ai-chat/ai-chat.page.spec.ts'`
Expected: FAIL — `c.onChatActiveChange is not a function` (and `isActive` starts `true`).

- [ ] **Step 3: Implement in `ai-chat.page.ts`**

Add `effect` to the `@angular/core` import and add the service import:
```ts
import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ChangeDetectorRef, ElementRef, effect } from '@angular/core';
```
```ts
import { TabActivationService } from '../../services/tab-activation.service';
```

Change the `isActive` default to `false` (activation now controls it):
```ts
  isActive: boolean = false;
```

Add a gate flag near the other private fields:
```ts
  private chatLoaded = false;
```

Add `private tabActivation: TabActivationService` to the constructor parameters (after `private tourService: FirstTimeTourService`). At the end of the constructor body (after `addIcons({...})`), add:
```ts
    // Drive isActive + first-load from the pager's active-slide signal.
    effect(() => {
      this.onChatActiveChange(this.tabActivation.activeTab() === 'chat');
    });
```

Remove the three loader calls from `ngOnInit` (keep the keyboard listeners). The top of `ngOnInit` changes from:
```ts
  ngOnInit() {
    this.loadSessions();
    this.syncBackendHistory();
    this.loadDailySuggestions();

    // Native-only (plugin never fires on web — same pattern as KeyboardAvoidDirective)
    this.kbShow = Keyboard.addListener('keyboardWillShow', info => {
```
to:
```ts
  ngOnInit() {
    // Chat data now loads on first activation (see onChatActiveChange), not on
    // mount — so eager pager mounting does not fire these on app entry.

    // Native-only (plugin never fires on web — same pattern as KeyboardAvoidDirective)
    this.kbShow = Keyboard.addListener('keyboardWillShow', info => {
```

Replace the `ionViewDidEnter()` / `ionViewWillLeave()` pair:
```ts
  ionViewDidEnter() {
    this.isActive = true;
    // Scroll to bottom if there are existing messages
    if (this.messages.length > 0) {
      setTimeout(() => this.scrollToBottom(), 300);
    }
  }

  ionViewWillLeave() {
    this.isActive = false;
  }
```
with:
```ts
  /**
   * Runs when chat becomes/stops being the active pager slide (fired by the
   * activation effect). Loads chat data once on first activation, toggles
   * isActive, and scrolls to the latest message on activate. Also delegated to
   * from the Ionic hooks below while the legacy ion-tabs shell is still present
   * — those hooks are removed in the pager cutover.
   */
  onChatActiveChange(active: boolean) {
    this.isActive = active;
    if (!active) {
      return;
    }
    if (!this.chatLoaded) {
      this.chatLoaded = true;
      this.loadSessions();
      this.syncBackendHistory();
      this.loadDailySuggestions();
    }
    if (this.messages.length > 0) {
      setTimeout(() => this.scrollToBottom(), 300);
    }
  }

  ionViewDidEnter() {
    this.onChatActiveChange(true);
  }

  ionViewWillLeave() {
    this.onChatActiveChange(false);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/ai-chat/ai-chat.page.spec.ts'`
Expected: PASS (1 spec).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/ai-chat/ai-chat.page.ts frontend/src/app/pages/ai-chat/ai-chat.page.spec.ts
git commit -m "feat(tabs): gate ai-chat load on activation; drive isActive from signal

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GNdNwDMyEZQG5GLK5EqfcA"
```

---

## Task 4: TabsPage pager + routes (the cutover)

Replace `ion-tabs` with the Swiper pager, collapse the child routes to `:tab`, and remove the now-dead Ionic hooks from tab3/chat. After this task, swiping works end-to-end.

**Files:**
- Modify: `frontend/src/app/tabs/tabs.routes.ts`
- Modify: `frontend/src/app/tabs/tabs.page.ts`
- Modify: `frontend/src/app/tabs/tabs.page.html`
- Modify: `frontend/src/app/tabs/tabs.page.scss`
- Modify: `frontend/src/app/tab3/tab3.page.ts` (remove dead `ionViewWillEnter`)
- Modify: `frontend/src/app/pages/ai-chat/ai-chat.page.ts` (relocate chat-menu gating into `onChatActiveChange`, then remove dead `ionViewDidEnter`/`ionViewWillLeave`)
- Test: `frontend/src/app/tabs/tabs.page.spec.ts` (new)
- Test: `frontend/src/app/pages/ai-chat/ai-chat.page.spec.ts` (assert relocated chat-menu gating)

**Interfaces:**
- Consumes: `TabActivationService.setActive` (Task 1); `TabBarScrollService.reset()` / `setHoldFull(bool)`; `FloatingTabBarComponent` `@Input() activeTab`, `@Input() isSubExpired`, `@Input() badge`, `@Output() tabSelect`.
- Produces: `TabsPage.onSlideChange(event: Event)`, `TabsPage.selectTab(tab: string)`, `TabsPage.activeTab: Signal<string>`, `TabsPage.initialIndex: number`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/tabs/tabs.page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Location } from '@angular/common';
import { of } from 'rxjs';
import { TabsPage } from './tabs.page';
import { AccountStatusService } from '../services/account-status.service';
import { AuthService } from '../services/auth.service';
import { TabBarScrollService } from '../services/tab-bar-scroll.service';
import { TabActivationService } from '../services/tab-activation.service';

function makeAccountStatusMock() {
  return { settingsTabBadge$: of(null), refreshStatus: () => {} };
}
function makeAuthMock() {
  return { userProgress$: of(null) };
}

describe('TabsPage pager', () => {
  let scrollSvc: jasmine.SpyObj<TabBarScrollService>;

  function build() {
    scrollSvc = jasmine.createSpyObj('TabBarScrollService', ['reset', 'setHoldFull']);
    TestBed.configureTestingModule({
      imports: [TabsPage, RouterTestingModule],
    })
      .overrideProvider(AccountStatusService, { useValue: makeAccountStatusMock() })
      .overrideProvider(AuthService, { useValue: makeAuthMock() })
      .overrideProvider(TabBarScrollService, { useValue: scrollSvc });
    const fixture = TestBed.createComponent(TabsPage);
    return fixture;
  }

  it('defaults to tab1 with initialIndex 0', () => {
    const c = build().componentInstance;
    c.ngOnInit();
    expect(c.activeTab()).toBe('tab1');
    expect(c.initialIndex).toBe(0);
  });

  it('onSlideChange updates activeTab, URL, activation and hold-full for chat', () => {
    const fixture = build();
    const c = fixture.componentInstance;
    c.ngOnInit();
    const location = TestBed.inject(Location);
    const activation = TestBed.inject(TabActivationService);
    const replaceSpy = spyOn(location, 'replaceState');
    const setActiveSpy = spyOn(activation, 'setActive');

    c.onSlideChange({ target: { swiper: { activeIndex: 2 } } } as unknown as Event);

    expect(c.activeTab()).toBe('chat');
    expect(replaceSpy).toHaveBeenCalledWith('/tabs/chat');
    expect(setActiveSpy).toHaveBeenCalledWith('chat');
    expect(scrollSvc.setHoldFull).toHaveBeenCalledWith(true);
  });

  it('selectTab moves the swiper to the tab index', () => {
    const c = build().componentInstance;
    c.ngOnInit();
    const slideTo = jasmine.createSpy('slideTo');
    (c as any).swiperRef = { nativeElement: { swiper: { slideTo, allowTouchMove: true } } };

    c.selectTab('tab3');
    expect(slideTo).toHaveBeenCalledWith(3, undefined);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/tabs/tabs.page.spec.ts'`
Expected: FAIL — `onSlideChange`/`selectTab`/`initialIndex` do not exist yet (current `TabsPage` uses `IonTabs`).

- [ ] **Step 3a: Rewrite `tabs.routes.ts`**

Replace the whole file with:
```ts
import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  { path: '', redirectTo: 'tab1', pathMatch: 'full' },
  { path: ':tab', component: TabsPage },
];
```

- [ ] **Step 3b: Rewrite `tabs.page.ts`**

Replace the whole file with:
```ts
import {
  Component, OnInit, AfterViewInit, ViewChild, ElementRef, signal, CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule, AsyncPipe, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import type { SwiperContainer } from 'swiper/element';
import { AccountStatusService } from '../services/account-status.service';
import { AuthService } from '../services/auth.service';
import { TabBarScrollService } from '../services/tab-bar-scroll.service';
import { TabActivationService } from '../services/tab-activation.service';
import { FirstTimeTourComponent } from '../components/first-time-tour/first-time-tour.component';
import { FloatingTabBarComponent } from '../components/floating-tab-bar/floating-tab-bar.component';
import { Tab1Page } from '../tab1/tab1.page';
import { Tab2Page } from '../tab2/tab2.page';
import { AiChatPage } from '../pages/ai-chat/ai-chat.page';
import { Tab3Page } from '../tab3/tab3.page';

const TAB_ORDER = ['tab1', 'tab2', 'chat', 'tab3'] as const;

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [
    CommonModule, AsyncPipe,
    FirstTimeTourComponent, FloatingTabBarComponent,
    Tab1Page, Tab2Page, AiChatPage, Tab3Page,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TabsPage implements OnInit, AfterViewInit {
  @ViewChild('swiper') swiperRef?: ElementRef<SwiperContainer>;

  settingsTabBadge$: Observable<string | null>;
  isSubExpired = false;
  initialIndex = 0;
  readonly activeTab = signal<string>('tab1');

  constructor(
    private accountStatusService: AccountStatusService,
    private authService: AuthService,
    private scrollSvc: TabBarScrollService,
    private tabActivation: TabActivationService,
    private route: ActivatedRoute,
    private location: Location,
  ) {
    this.settingsTabBadge$ = this.accountStatusService.settingsTabBadge$;
  }

  ngOnInit() {
    const initialTab = this.resolveTab(this.route.snapshot.paramMap.get('tab'));
    this.activeTab.set(initialTab);
    this.initialIndex = this.indexForTab(initialTab);

    this.accountStatusService.refreshStatus();

    this.authService.userProgress$.subscribe((progress) => {
      const fullyOnboarded = progress?.investmentConfirmationCompleted === true;
      const hasActiveSub = progress?.selectedTier != null;
      const isPrivateBeta = progress?.privateBeta === true;
      // Private beta users bypass the subscription gate.
      this.isSubExpired = fullyOnboarded && !hasActiveSub && !isPrivateBeta;
      this.applySwipeLock();
    });

    // External navigations to /tabs/<tab> (e.g. AppLock re-nav) move the pager.
    this.route.paramMap.subscribe((params) => {
      const tab = this.resolveTab(params.get('tab'));
      if (tab !== this.activeTab()) {
        this.slideToTab(tab);
      }
    });
  }

  ngAfterViewInit() {
    // Sit on the initial slide, apply the expired-sub lock, and fire the initial
    // activation so a deep-link (e.g. /tabs/tab3) runs that tab's enter logic.
    this.slideToTab(this.activeTab(), false);
    this.applySwipeLock();
    this.emitActivation(this.activeTab());
  }

  /** Swiper fires this on every settle (drag or programmatic slideTo). */
  onSlideChange(event: Event) {
    const swiper = (event.target as SwiperContainer).swiper;
    const tab = TAB_ORDER[swiper?.activeIndex ?? 0] ?? 'tab1';
    if (tab === this.activeTab()) {
      return;
    }
    this.activeTab.set(tab);
    // replaceState updates the URL WITHOUT a router navigation, so it does not
    // re-trigger paramMap — no feedback loop, no guard flag needed.
    this.location.replaceState('/tabs/' + tab);
    this.emitActivation(tab);
  }

  /** Floating-bar tap. slideTo triggers onSlideChange, which does the rest. */
  selectTab(tab: string) {
    this.slideToTab(tab);
  }

  private emitActivation(tab: string) {
    this.scrollSvc.reset();
    // Chat holds the bar full so no stray/cross-tab scroll can shrink it there.
    this.scrollSvc.setHoldFull(tab === 'chat');
    this.tabActivation.setActive(tab);
  }

  private slideToTab(tab: string, animate = true) {
    const swiper = this.swiperRef?.nativeElement.swiper;
    if (!swiper) {
      return;
    }
    swiper.slideTo(this.indexForTab(tab), animate ? undefined : 0);
  }

  private applySwipeLock() {
    const swiper = this.swiperRef?.nativeElement.swiper;
    if (swiper) {
      // Expired subscription: gated tabs are unreachable by swipe; Profile is
      // still reachable by tapping it (programmatic slideTo ignores this flag).
      swiper.allowTouchMove = !this.isSubExpired;
    }
  }

  private indexForTab(tab: string): number {
    const i = TAB_ORDER.indexOf(tab as (typeof TAB_ORDER)[number]);
    return i < 0 ? 0 : i;
  }

  private resolveTab(param: string | null): string {
    return param && (TAB_ORDER as readonly string[]).includes(param) ? param : 'tab1';
  }
}
```

- [ ] **Step 3c: Rewrite `tabs.page.html`**

Replace the whole file with:
```html
<app-first-time-tour></app-first-time-tour>

<swiper-container
  #swiper
  class="tabs-swiper"
  [attr.initial-slide]="initialIndex"
  slides-per-view="1"
  (swiperslidechange)="onSlideChange($event)"
>
  <swiper-slide><app-tab1></app-tab1></swiper-slide>
  <swiper-slide><app-tab2></app-tab2></swiper-slide>
  <swiper-slide><app-ai-chat></app-ai-chat></swiper-slide>
  <swiper-slide><app-tab3></app-tab3></swiper-slide>
</swiper-container>

<app-floating-tab-bar
  [activeTab]="activeTab()"
  [isSubExpired]="isSubExpired"
  [badge]="settingsTabBadge$ | async"
  (tabSelect)="selectTab($event)"
></app-floating-tab-bar>
```

- [ ] **Step 3d: Rewrite `tabs.page.scss`**

Replace the whole file with:
```scss
:host {
  display: block;
  height: 100%;
}

swiper-container.tabs-swiper {
  display: block;
  height: 100%;
}

swiper-slide {
  height: 100%;
  overflow: hidden;
}

/* Give each embedded tab page a height context so its ion-content can scroll. */
app-tab1,
app-tab2,
app-ai-chat,
app-tab3 {
  display: block;
  height: 100%;
}
```

- [ ] **Step 3e: Remove the now-dead Ionic hook in `tab3.page.ts`**

Delete these lines (the pager drives `onTabActivated` via the effect now; Ionic no longer calls this):
```ts
  ionViewWillEnter() {
    this.onTabActivated();
  }
```

- [ ] **Step 3f: Relocate chat-menu gating into `onChatActiveChange`, then remove the dead Ionic hooks in `ai-chat.page.ts`**

Once the pager's activation effect is the only driver of `onChatActiveChange`, the `menuCtrl` chat-menu gating that currently lives in `ionViewDidEnter`/`ionViewWillLeave` must move into `onChatActiveChange` — otherwise the chat side-menu (and its edge-swipe gesture) would never be enabled/disabled per active tab.

First, replace the current `onChatActiveChange` method:
```ts
  onChatActiveChange(active: boolean) {
    this.isActive = active;
    if (!active) {
      return;
    }
    if (!this.chatLoaded) {
      this.chatLoaded = true;
      this.loadSessions();
      this.syncBackendHistory();
      this.loadDailySuggestions();
    }
    if (this.messages.length > 0) {
      setTimeout(() => this.scrollToBottom(), 300);
    }
  }
```
with:
```ts
  onChatActiveChange(active: boolean) {
    this.isActive = active;
    // The history drawer is portaled to ion-app (stacking-context fix) and the
    // chat page stays mounted across tab switches — only allow the menu (and its
    // edge-swipe gesture) while chat is the active tab.
    if (!active) {
      this.menuCtrl.close('chat-menu');
      this.menuCtrl.enable(false, 'chat-menu');
      return;
    }
    this.menuCtrl.enable(true, 'chat-menu');
    if (!this.chatLoaded) {
      this.chatLoaded = true;
      this.loadSessions();
      this.syncBackendHistory();
      this.loadDailySuggestions();
    }
    if (this.messages.length > 0) {
      setTimeout(() => this.scrollToBottom(), 300);
    }
  }
```

Then delete both now-redundant Ionic hooks (the effect drives `onChatActiveChange`, which now carries the menu gating):
```ts
  ionViewDidEnter() {
    this.onChatActiveChange(true);
    // The history drawer is portaled to ion-app (stacking-context fix) and the
    // chat page stays cached across tab switches — only allow the menu (and its
    // edge-swipe gesture) while this page is actually the active tab.
    this.menuCtrl.enable(true, 'chat-menu');
  }

  ionViewWillLeave() {
    this.onChatActiveChange(false);
    this.menuCtrl.close('chat-menu');
    this.menuCtrl.enable(false, 'chat-menu');
  }
```

- [ ] **Step 3g: Assert the relocated chat-menu gating in `ai-chat.page.spec.ts`**

The existing spec's `MenuController` mock already exposes `close`/`enable` spies (`{ provide: MenuController, useValue: { close: jasmine.createSpy('close'), enable: jasmine.createSpy('enable') } }`). In the existing test `'does not load chat data until first activation, then gates re-loads'`, capture the menu mock right after `const c = fixture.componentInstance;`:
```ts
    const menu = TestBed.inject(MenuController) as any;
```
After the first `c.onChatActiveChange(true);` block, add:
```ts
    expect(menu.enable).toHaveBeenCalledWith(true, 'chat-menu');
```
After `c.onChatActiveChange(false);`, add:
```ts
    expect(menu.close).toHaveBeenCalledWith('chat-menu');
    expect(menu.enable).toHaveBeenCalledWith(false, 'chat-menu');
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/tabs/tabs.page.spec.ts'`
Expected: PASS (3 specs).

Also re-run tab3 + chat specs to confirm the hook removal didn't break them:
Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/tab3/tab3.page.spec.ts'`
Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/ai-chat/ai-chat.page.spec.ts'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/tabs/tabs.routes.ts frontend/src/app/tabs/tabs.page.ts frontend/src/app/tabs/tabs.page.html frontend/src/app/tabs/tabs.page.scss frontend/src/app/tabs/tabs.page.spec.ts frontend/src/app/tab3/tab3.page.ts frontend/src/app/pages/ai-chat/ai-chat.page.ts frontend/src/app/pages/ai-chat/ai-chat.page.spec.ts
git commit -m "feat(tabs): swap ion-tabs for Swiper pager with URL sync + activation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GNdNwDMyEZQG5GLK5EqfcA"
```

---

## Task 5: Exempt the portfolio chart scrub from the swipe

The chart's horizontal scrub must not page tabs. Mark its interactive surface with Swiper's default `swiper-no-swiping` class. (tab2 needs nothing — its Monte-Carlo sliders live in a full-screen modal outside the pager, and retirement-planning has no inline horizontal control.)

**Files:**
- Modify: `frontend/src/app/components/portfolio-chart/portfolio-chart.component.html`

**Interfaces:** none.

- [ ] **Step 1: Add the class**

In `portfolio-chart.component.html`, change:
```html
  <div class="chart-box" #chartBox
```
to:
```html
  <div class="chart-box swiper-no-swiping" #chartBox
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd frontend && npx ng build`
Expected: build succeeds (no template/type errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/components/portfolio-chart/portfolio-chart.component.html
git commit -m "feat(tabs): exempt portfolio chart scrub from tab swipe (no-swiping)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GNdNwDMyEZQG5GLK5EqfcA"
```

---

## Task 6: Full build gate + on-device verification

**Files:** none (verification only).

- [ ] **Step 1: Full AOT build**

Run: `cd frontend && npx ng build`
Expected: SUCCESS. If it fails on the Swiper custom elements, confirm `TabsPage` has `schemas: [CUSTOM_ELEMENTS_SCHEMA]`.

- [ ] **Step 2: Run the full unit suite**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: all specs PASS.

- [ ] **Step 3: On-device manual verification (the parts unit tests can't cover)**

Launch the app on device (per the Vite serve note: `npx ng run app:serve:local --host=localhost --port=8100 --live-reload=false`) and confirm:
- [ ] Drag left/right pages between all four tabs, following the finger, with the neighbor peeking in and snapping on release.
- [ ] Tapping a tab in the floating bar animates the pager to it; the bar indicator tracks.
- [ ] URL updates to `/tabs/tab1|tab2|chat|tab3` as you move; a hard refresh / deep-link to `/tabs/chat` opens on chat.
- [ ] **tab1:** dragging horizontally ON the chart scrubs it and does NOT change tabs; dragging elsewhere on tab1 pages.
- [ ] Vertical scrolling works normally on every tab (not hijacked by the pager).
- [ ] **chat:** first swipe/tap to chat loads sessions/suggestions; keyboard still lifts the composer; scrolls to latest.
- [ ] **Profile:** entering tab3 refreshes freedom stats and shows the MFU popup when due.
- [ ] The floating bar shrink-on-scroll still works, and stays full on chat.
- [ ] Expired-subscription account: swiping is locked; Profile is still reachable by tapping it.

- [ ] **Step 4: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill to choose merge/PR. (No commit here — verification only.)

---

## Self-Review

**1. Spec coverage** — every spec section maps to a task:
- §5.1 pager / §5.8 eager load → Task 4 (template imports all four tab components directly).
- §5.2 routing & URL sync → Task 4 (`:tab` route, `resolveTab`, `replaceState`, paramMap subscription).
- §5.3 conflict handling → Task 5 (chart `swiper-no-swiping`); tab2 confirmed no-op (modal + no inline control), documented in Task 5.
- §5.4 activation + init-gating → Task 1 (service), Task 2 (tab3), Task 3 (chat gating).
- §5.5 floating bar → Task 4 (bar moved out of the removed `ion-tabs`, `selectTab` → `slideTo`).
- §5.6 expired-sub lock → Task 4 (`applySwipeLock` / `allowTouchMove`).
- §5.7 TabBarScrollService / tour → Task 4 (`emitActivation` calls `reset` + `setHoldFull`; `<app-first-time-tour>` retained).
- §7 testing → Tasks 1–4 unit tests + Task 6 device checklist + build gate.

**2. Placeholder scan** — no TBD/TODO; every code step shows complete code.

**3. Type consistency** — `onTabActivated()` (tab3), `onChatActiveChange(active)` (chat), `setActive(tab)` / `activeTab()` (service), `onSlideChange(event: Event)` / `selectTab(tab)` / `initialIndex` (TabsPage) are used consistently across the tasks that define and consume them. `TAB_ORDER` index map is the single source of tab↔index mapping.

**Deviation from spec noted:** the spec's §5.2 "guard flag to prevent a feedback loop" is intentionally omitted — `Location.replaceState` does not trigger the Angular Router, so `paramMap` never re-emits from a slide settle; there is no loop to guard. Documented inline in `onSlideChange`.
