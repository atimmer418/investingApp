# Optimal Drawdown Walkthrough (Piggy Pro) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Pro-gated 2-slide "Optimal Drawdown" educational deck reached from a button at the end of every tab2 strategy deck, personalized with the user's own account buckets; non-pro users get the existing Piggy Pro nudge sheet.

**Architecture:** A new `DrawdownDeckComponent` fullscreen modal reuses the strategy-deck visual language via a shared SCSS partial. The strategy deck gains a `userTier` input and a "Discover the Optimal Drawdown" button that either dismisses with role `'drawdown'` (pro) or presents the `McInfoSheetComponent` nudge over itself (non-pro). `RetirementPlanningComponent` orchestrates all modals via dismiss roles, exactly like the existing `'stress-test'` pattern.

**Tech Stack:** Angular standalone components + `@ionic/angular/standalone` ModalController, SCSS `@use` partials, Karma/Jasmine unit tests, localStorage + `PortfolioStoreService` (cached) for personalization data.

**Spec:** `docs/superpowers/specs/2026-07-15-optimal-drawdown-walkthrough-design.md`

## Global Constraints

- Frontend only. **No backend changes.**
- Slide copy must be **verbatim from the spec** (repeated in full in Task 3 below).
- Light mode only (FRED-193): no `prefers-color-scheme` blocks in new SCSS. (`prefers-reduced-motion` is fine — it's motion, not color.)
- Fonts/icons: Manrope + `material-symbols-outlined` (a **static subset font**). Any new icon name used in an HTML template requires `cd frontend && npm run subset-icons` (auto-detects template literals). Icons referenced only from TS data must be in `DYNAMIC_ICONS` in `frontend/scripts/subset-icons.mjs` — the three slide-2 icons (`trending_down`, `shield`, `all_inclusive`) are **already** in the subset; the only new glyph is `route` (HTML literal → auto-detected).
- Karma: ALWAYS target one spec file: `cd frontend && npx ng test --include='**/<name>.spec.ts' --watch=false --browsers=ChromeHeadless`. NEVER run the whole suite (legacy CLI-generated specs may be red).
- AOT build gate: `cd frontend && npx ng build --configuration dev` (valid configs: production/local/dev/test/ci — `development` is NOT valid and exits 127).
- No `TODO` comments, no dead code, no new npm dependencies.
- Copy style: calm, direct, freedom-focused. Never salesy.

---

### Task 1: Extract the shared deck SCSS partial

The drawdown deck needs ~90% of the strategy deck's styles. Extract them into a theme partial (established pattern: `frontend/src/theme/_settings-shell.scss`, consumed via `@use`).

**Files:**
- Create: `frontend/src/theme/_deck-shared.scss`
- Modify: `frontend/src/app/components/strategy-deck/strategy-deck.component.scss`

**Interfaces:**
- Consumes: nothing.
- Produces: `theme/_deck-shared.scss` providing these class rules for any deck component: `:host`, `.deck-host`, `.deck-top`, `.deck-spacer`, `.deck-dots`, `.deck-x`, `.deck-scroll`, `.slide`, `.sl-eyebrow`, `.sl-h1`, `.sl-body`, `.stat-chip`, `.step-row`, `.step-num`, `.step-txt`, `.warn-card`, `.sl-spacer`, `.sl-cta`, `.sl-ghost`, `.swipe-hint`, and the `prefers-reduced-motion` block. Tasks 2 and 3 rely on these exact class names.

- [ ] **Step 1: Create the partial by moving blocks verbatim**

Create `frontend/src/theme/_deck-shared.scss`. Its content is a **verbatim move** of everything currently in `frontend/src/app/components/strategy-deck/strategy-deck.component.scss` (lines 1–320) EXCEPT the `.recap-row` block (the `// ─── Slide 4: recap rows ───` section, lines 230–240), which stays behind. Replace the header comment with:

```scss
// Deck visual language — fullscreen blue-gradient sub-theme shared by the
// strategy decks (FRED-208) and the Optimal Drawdown deck.
// Consumed via @use from each deck component's SCSS; Angular scopes the
// emitted CSS per component, so both decks get identical, isolated styles.
```

Everything else — `:host` through the `@media (prefers-reduced-motion: reduce)` block — moves unchanged.

- [ ] **Step 2: Slim the strategy deck SCSS**

Replace the entire content of `frontend/src/app/components/strategy-deck/strategy-deck.component.scss` with:

```scss
// Strategy Deck — fullscreen blue-gradient sub-theme.
// The shared deck visual language lives in theme/_deck-shared.scss (also used
// by the Optimal Drawdown deck). Only strategy-deck-specific styles are here.
@use '../../../theme/deck-shared';

// ─── Slide 4: recap rows ─────────────────────────────────────────────────────

.recap-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 12px;

  .material-symbols-outlined { font-size: 18px; color: #34d399; flex-shrink: 0; margin-top: 1px; }
  p { font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8); line-height: 1.5; margin: 0; }
}
```

- [ ] **Step 3: Verify with the AOT build**

Run: `cd frontend && npx ng build --configuration dev`
Expected: build completes with no SCSS resolution errors. (If `@use` path fails: components live at `src/app/components/strategy-deck/`, so three levels up to `src/`, then `theme/deck-shared` — the partial file has the leading underscore, the `@use` does not.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/theme/_deck-shared.scss frontend/src/app/components/strategy-deck/strategy-deck.component.scss
git commit -m "refactor(strategy-deck): extract shared deck SCSS into theme partial"
```

---

### Task 2: Strategy deck — drawdown button + tier gate

**Files:**
- Modify: `frontend/src/app/components/strategy-deck/strategy-deck.component.ts`
- Modify: `frontend/src/app/components/strategy-deck/strategy-deck.component.html` (slide 4, lines 77–91)
- Modify: `frontend/src/app/components/strategy-deck/strategy-deck.component.scss`
- Modify: `frontend/src/assets/fonts/material-symbols-outlined.woff2` (regenerated by script)
- Test: `frontend/src/app/components/strategy-deck/strategy-deck.component.spec.ts` (new file)

**Interfaces:**
- Consumes: `McInfoSheetComponent` from `../mc-info-sheet/mc-info-sheet.component` (existing) with inputs `mode`, `nudgeTitle`, `nudgeBody`, `targetTier`; shared SCSS classes from Task 1.
- Produces: `StrategyDeckComponent` gains `@Input() userTier: string | null` (default `null`), getter `isPro: boolean`, and method `discoverDrawdown(): Promise<void>`. New dismiss roles emitted by the deck: `'drawdown'` (pro tap) and `'upgrade'` (non-pro accepted the nudge). Task 4 branches on these exact role strings.

- [ ] **Step 1: Write the failing spec**

Create `frontend/src/app/components/strategy-deck/strategy-deck.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { StrategyDeckComponent } from './strategy-deck.component';
import { ToastService } from '../../services/toast.service';
import { McInfoSheetComponent } from '../mc-info-sheet/mc-info-sheet.component';

describe('StrategyDeckComponent — Optimal Drawdown gate', () => {
  let fixture: ComponentFixture<StrategyDeckComponent>;
  let component: StrategyDeckComponent;
  let modalCtrl: jasmine.SpyObj<ModalController>;

  /** Mock bottom-sheet modal whose onDidDismiss resolves with the given role. */
  function makeSheet(role: string | undefined) {
    return {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role })),
    } as any;
  }

  beforeEach(() => {
    modalCtrl = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    TestBed.configureTestingModule({
      imports: [StrategyDeckComponent],
      providers: [
        { provide: ModalController, useValue: modalCtrl },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['showToast']) },
      ],
    });
    fixture = TestBed.createComponent(StrategyDeckComponent);
    component = fixture.componentInstance;
  });

  it('shows the PRO chip on the drawdown button for non-pro users', () => {
    component.userTier = null;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.sl-drawdown');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Discover the Optimal Drawdown');
    expect(btn.querySelector('.deck-lockchip')).toBeTruthy();
  });

  it('hides the PRO chip for pro users', () => {
    component.userTier = 'pro';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sl-drawdown .deck-lockchip')).toBeNull();
  });

  it('pro tap dismisses the deck with role drawdown and never presents a nudge', fakeAsync(() => {
    component.userTier = 'pro';
    fixture.detectChanges();
    component.discoverDrawdown();
    tick();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(null, 'drawdown');
    expect(modalCtrl.create).not.toHaveBeenCalled();
  }));

  it('non-pro tap presents the Piggy Pro nudge over the deck; maybe-later keeps the deck open', fakeAsync(() => {
    component.userTier = null;
    fixture.detectChanges();
    modalCtrl.create.and.returnValue(Promise.resolve(makeSheet(undefined))); // close() → no role
    component.discoverDrawdown();
    tick(700); // drain the nudgeLock timer
    expect(modalCtrl.create).toHaveBeenCalledWith(jasmine.objectContaining({
      component: McInfoSheetComponent,
      cssClass: 'mc-bottom-sheet-modal',
      componentProps: jasmine.objectContaining({
        mode: 'nudge',
        nudgeTitle: 'Unlock the Optimal Drawdown',
        targetTier: 'pro',
      }),
    }));
    expect(modalCtrl.dismiss).not.toHaveBeenCalled();
  }));

  it('nudge upgrade dismisses the deck with role upgrade', fakeAsync(() => {
    component.userTier = null;
    fixture.detectChanges();
    modalCtrl.create.and.returnValue(Promise.resolve(makeSheet('upgrade')));
    component.discoverDrawdown();
    tick(700);
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(null, 'upgrade');
  }));

  it('plus tier is gated like null tier (pro only)', () => {
    component.userTier = 'plus';
    fixture.detectChanges();
    expect(component.isPro).toBeFalse();
    expect(fixture.nativeElement.querySelector('.sl-drawdown .deck-lockchip')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `cd frontend && npx ng test --include='**/strategy-deck.component.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `.sl-drawdown` not found / `userTier` and `discoverDrawdown` do not exist on the component.

- [ ] **Step 3: Implement the component changes**

In `frontend/src/app/components/strategy-deck/strategy-deck.component.ts`:

3a. Add the import (top of file, with the other component imports):

```typescript
import { McInfoSheetComponent } from '../mc-info-sheet/mc-info-sheet.component';
```

3b. Inside the class, after `@Input() strategyKey = 'yield';` add:

```typescript
  /** Subscription tier passed by the presenter (same pattern as MonteCarloFlowComponent). */
  @Input() userTier: string | null = null;

  get isPro(): boolean { return this.userTier === 'pro'; }
```

3c. Add the guard field next to `hintShown`, and the method after `done()`:

```typescript
  /** Guard against double-presenting the upgrade nudge. */
  private nudgeLock = false;
```

```typescript
  /**
   * "Discover the Optimal Drawdown" (playbook slide).
   * Pro → dismiss with role 'drawdown'; the presenter opens the drawdown deck.
   * Non-pro → present the Piggy Pro nudge over this deck so "Maybe later"
   * keeps the user on the playbook slide; an upgrade tap dismisses the deck
   * with role 'upgrade' for the presenter to route.
   * The lock releases in finally so a rejected create/present can never
   * strand it (hardening decision, Andy 2026-07-15).
   */
  async discoverDrawdown(): Promise<void> {
    if (this.isPro) {
      await this.modalController.dismiss(null, 'drawdown');
      return;
    }
    if (this.nudgeLock) return;
    this.nudgeLock = true;

    let role: string | undefined;
    try {
      const sheet = await this.modalController.create({
        component: McInfoSheetComponent,
        cssClass: 'mc-bottom-sheet-modal',
        componentProps: {
          mode: 'nudge',
          nudgeTitle: 'Unlock the Optimal Drawdown',
          nudgeBody: 'See the tax-smart order for spending your taxable, 401(k), and Roth accounts in retirement — personalized to your portfolio, updating as it grows.',
          targetTier: 'pro',
        },
      });
      await sheet.present();
      ({ role } = await sheet.onDidDismiss());
    } finally {
      this.nudgeLock = false;
    }
    if (role === 'upgrade') {
      await this.modalController.dismiss(null, 'upgrade');
    }
  }
```

3f. Add a lock-release regression test to the spec file (inside the same `describe`):

```typescript
  it('releases the nudge lock when sheet creation fails', fakeAsync(() => {
    component.userTier = null;
    fixture.detectChanges();
    modalCtrl.create.and.returnValues(
      Promise.reject(new Error('create failed')),
      Promise.resolve(makeSheet(undefined)),
    );
    component.discoverDrawdown().catch(() => { /* rejection propagates by design */ });
    tick();
    component.discoverDrawdown();
    tick(700);
    expect(modalCtrl.create).toHaveBeenCalledTimes(2);
  }));
```

3d. In `frontend/src/app/components/strategy-deck/strategy-deck.component.html`, on the playbook slide, insert the new button between the stress-test CTA and the Done ghost (after line 89's `</button>`, before `<button class="sl-ghost"`):

```html
      <button class="sl-drawdown" (click)="discoverDrawdown()">
        <span class="material-symbols-outlined">route</span>
        Discover the Optimal Drawdown
        <span class="deck-lockchip" *ngIf="!isPro"><span class="material-symbols-outlined">lock</span>PRO</span>
      </button>
```

(The deck's tap-to-advance handler already excludes `closest('button')`, so this button is safe from the tap zones.)

3e. In `frontend/src/app/components/strategy-deck/strategy-deck.component.scss`, append:

```scss
// ─── Slide 4: Optimal Drawdown discovery button + PRO chip ──────────────────

.sl-drawdown {
  flex-shrink: 0;
  min-height: 54px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.10);
  border-radius: 14px;
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  margin-top: 10px;
  padding: 0 14px;
  backdrop-filter: blur(8px);
  -webkit-tap-highlight-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  .material-symbols-outlined { font-size: 19px; }
  &:active { background: rgba(255, 255, 255, 0.18); }
}

// White-on-blue variant of tab2's .mc-lockchip, for the dark deck background.
.deck-lockchip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.92);
  color: #4553d8;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: 20px;

  .material-symbols-outlined { font-size: 10px; }
}
```

- [ ] **Step 4: Regenerate the icon subset (new glyph `route`)**

Run: `cd frontend && npm run subset-icons`
Expected: output lists `route` among the found icons and writes `src/assets/fonts/material-symbols-outlined.woff2`. If pyftsubset errors on the `route` glyph (renamed internally), swap the button icon to `swap_vert` (already in the subset) in both HTML and this plan's screenshots step, and skip the font regen.

- [ ] **Step 5: Run the spec to verify it passes**

Run: `cd frontend && npx ng test --include='**/strategy-deck.component.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: PASS (7 specs — 6 original + the lock-release regression test from step 3f).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/components/strategy-deck/ frontend/src/assets/fonts/material-symbols-outlined.woff2
git commit -m "feat(tab2): drawdown discovery button on strategy decks with pro gate"
```

---

### Task 3: DrawdownDeckComponent — the 2-slide pro walkthrough

**Files:**
- Create: `frontend/src/app/components/drawdown-deck/drawdown-deck.component.ts`
- Create: `frontend/src/app/components/drawdown-deck/drawdown-deck.component.html`
- Create: `frontend/src/app/components/drawdown-deck/drawdown-deck.component.scss`
- Test: `frontend/src/app/components/drawdown-deck/drawdown-deck.component.spec.ts`

**Interfaces:**
- Consumes: `PortfolioStoreService.load$(): Observable<PortfolioBundle>` (cached, single-flight; bundle shape `{ dashboard: { summary: { portfolioValue: number } }, ... }`) from `../../services/portfolio-store.service`; localStorage key `` `fred.mcOutside.${userId ?? 'anon'}` `` with shape `{ k401: number, roth: number }` (written by the Monte Carlo flow); shared SCSS classes from Task 1.
- Produces: `DrawdownDeckComponent` (standalone) with `@Input() userId: string | null` (default `null`). Dismiss roles: `'stress-test'`, `'done'`, `'cancel'`. Task 4 presents it via ModalController and branches on `'stress-test'`.

- [ ] **Step 1: Write the failing spec**

Create `frontend/src/app/components/drawdown-deck/drawdown-deck.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModalController } from '@ionic/angular/standalone';
import { DrawdownDeckComponent } from './drawdown-deck.component';
import { PortfolioStoreService } from '../../services/portfolio-store.service';

function makeBundle(portfolioValue: number) {
  return { dashboard: { summary: { portfolioValue } }, performance: [], history: null } as any;
}

describe('DrawdownDeckComponent', () => {
  let fixture: ComponentFixture<DrawdownDeckComponent>;
  let component: DrawdownDeckComponent;
  let modalCtrl: jasmine.SpyObj<ModalController>;
  let store: jasmine.SpyObj<PortfolioStoreService>;
  const KEY = 'fred.mcOutside.42';

  beforeEach(() => {
    localStorage.removeItem(KEY);
    modalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);
    store = jasmine.createSpyObj('PortfolioStoreService', ['load$']);
    store.load$.and.returnValue(of(makeBundle(84200)));

    TestBed.configureTestingModule({
      imports: [DrawdownDeckComponent],
      providers: [
        { provide: ModalController, useValue: modalCtrl },
        { provide: PortfolioStoreService, useValue: store },
      ],
    });

    fixture = TestBed.createComponent(DrawdownDeckComponent);
    component = fixture.componentInstance;
    component.userId = '42';
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('renders the 2-slide deck with drawdown eyebrows', () => {
    fixture.detectChanges();
    const dots = fixture.nativeElement.querySelectorAll('.deck-dots span');
    expect(dots.length).toBe(2);
    const eyebrows = fixture.nativeElement.querySelectorAll('.sl-eyebrow');
    expect(eyebrows.length).toBe(2);
    expect(eyebrows[0].textContent).toContain('OPTIMAL DRAWDOWN · 1 OF 2');
    expect(eyebrows[1].textContent).toContain('OPTIMAL DRAWDOWN · 2 OF 2');
  });

  it('maps dashboard + localStorage balances into bucket chips and hides the hint', () => {
    localStorage.setItem(KEY, JSON.stringify({ k401: 250000, roth: 80000 }));
    fixture.detectChanges();
    expect(component.chip('fred')).toBe('$84k');
    expect(component.chip('k401')).toBe('$250k');
    expect(component.chip('roth')).toBe('$80k');
    expect(component.hasOutside).toBeTrue();
    expect(fixture.nativeElement.querySelector('.bs-hint')).toBeNull();
  });

  it('formats millions with one decimal', () => {
    store.load$.and.returnValue(of(makeBundle(1_240_000)));
    fixture.detectChanges();
    expect(component.chip('fred')).toBe('$1.2M');
  });

  it('shows em-dash chips and the hint when nothing is available', () => {
    store.load$.and.returnValue(throwError(() => new Error('backend down')));
    fixture.detectChanges();
    expect(component.chip('fred')).toBe('—');
    expect(component.chip('k401')).toBe('—');
    expect(component.chip('roth')).toBe('—');
    expect(component.hasOutside).toBeFalse();
    expect(fixture.nativeElement.querySelector('.bs-hint')).toBeTruthy();
  });

  it('treats zero and corrupt outside balances as not entered', () => {
    localStorage.setItem(KEY, JSON.stringify({ k401: 0, roth: 0 }));
    fixture.detectChanges();
    expect(component.hasOutside).toBeFalse();

    localStorage.setItem(KEY, '{not-json');
    const f2 = TestBed.createComponent(DrawdownDeckComponent);
    f2.componentInstance.userId = '42';
    f2.detectChanges();
    expect(f2.componentInstance.hasOutside).toBeFalse();
  });

  it('dismisses with the right roles', () => {
    fixture.detectChanges();
    component.stressTest();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(null, 'stress-test');
    component.done();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(null, 'done');
    component.dismiss();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('includes the tax-advisor disclaimer', () => {
    fixture.detectChanges();
    const warn = fixture.nativeElement.querySelector('.warn-card');
    expect(warn.textContent).toContain('not tax advice');
    expect(warn.textContent).toContain('qualified tax advisor');
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `cd frontend && npx ng test --include='**/drawdown-deck.component.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: FAIL — cannot resolve `./drawdown-deck.component`.

- [ ] **Step 3: Implement the component**

Create `frontend/src/app/components/drawdown-deck/drawdown-deck.component.ts`:

```typescript
import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PortfolioStoreService } from '../../services/portfolio-store.service';

// ─── Content types ────────────────────────────────────────────────────────────

type BucketKey = 'fred' | 'k401' | 'roth';

interface DrawdownBucket {
  title: string;
  body: string;
  balanceKey: BucketKey;
}

// ─── Content (verbatim from approved spec 2026-07-15) ────────────────────────

export const DRAWDOWN_BUCKETS: DrawdownBucket[] = [
  {
    title: 'Taxable first',
    body: 'Your FRED account. Withdrawals here are taxed at capital-gains rates — often 0–15%, the lowest rates you’ll ever pay — while your tax-advantaged accounts keep compounding untouched.',
    balanceKey: 'fred',
  },
  {
    title: 'Tax-deferred second',
    body: 'Traditional 401(k) and IRA. Every dollar out is ordinary income, so spreading withdrawals across your middle retirement years keeps you in lower brackets — and softens the required withdrawals that start at 73.',
    balanceKey: 'k401',
  },
  {
    title: 'Roth last',
    body: 'Tax-free growth is the most valuable dollar you own. The longer it compounds untouched, the more you keep — and it’s the cleanest account to pass on.',
    balanceKey: 'roth',
  },
];

/** 3 "why" rows: [icon, title, description] — all icons already in the font subset. */
export const DRAWDOWN_WHY: [string, string, string][] = [
  ['trending_down', 'Your early years are your cheapest', 'Before required withdrawals and Social Security kick in, your tax bracket is the lowest it may ever be. Taxable withdrawals fill those years at bargain rates.'],
  ['shield', 'It defuses the tax bomb at 73', 'Draining tax-deferred accounts second shrinks the forced withdrawals (RMDs) that can spike your bracket later.'],
  ['all_inclusive', 'Every extra Roth year is free growth', 'Growth the IRS never touches. Last-out means decades more tax-free compounding.'],
];

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Optimal Drawdown deck (Piggy Pro) — 2-slide fullscreen educational modal.
 * Personalized with the user's own buckets: FRED (taxable) value from the
 * cached portfolio store, 401(k)/Roth from the balances the Monte Carlo flow
 * persists to localStorage. Education never blocks on data — missing values
 * render as an em-dash and the slides stand alone.
 */
@Component({
  selector: 'app-drawdown-deck',
  templateUrl: './drawdown-deck.component.html',
  styleUrls: ['./drawdown-deck.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class DrawdownDeckComponent implements OnInit, OnDestroy {

  /** Same per-user localStorage scoping as MonteCarloFlowComponent. */
  @Input() userId: string | null = null;

  @ViewChild('deckScroll') scrollRef!: ElementRef<HTMLElement>;

  readonly BUCKETS = DRAWDOWN_BUCKETS;
  readonly WHY = DRAWDOWN_WHY;
  readonly SLIDE_INDICES = [0, 1];

  currentSlide = 0;
  hintShown = false;

  fredValue: number | null = null;
  k401: number | null = null;
  roth: number | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private modalController: ModalController,
    private portfolioStore: PortfolioStoreService,
  ) {}

  ngOnInit(): void {
    this.readOutsideBalances();
    this.portfolioStore.load$().pipe(takeUntil(this.destroy$)).subscribe({
      next: bundle => {
        const v = bundle.dashboard?.summary?.portfolioValue;
        this.fredValue = (typeof v === 'number' && isFinite(v)) ? Math.round(v) : null;
      },
      error: () => { /* chip stays "—" — education never blocks on data */ },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Personalization ───────────────────────────────────────────────────────

  get hasOutside(): boolean {
    return (this.k401 ?? 0) > 0 || (this.roth ?? 0) > 0;
  }

  chip(key: BucketKey): string {
    const v = key === 'fred' ? this.fredValue : key === 'k401' ? this.k401 : this.roth;
    return v == null ? '—' : this.fmtShort(v);
  }

  private readOutsideBalances(): void {
    try {
      const raw = localStorage.getItem(`fred.mcOutside.${this.userId ?? 'anon'}`);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d.k401 === 'number' && d.k401 > 0) this.k401 = d.k401;
      if (typeof d.roth === 'number' && d.roth > 0) this.roth = d.roth;
    } catch { /* corrupt entry → treated as not entered */ }
  }

  /** Mirrors RetirementPlanningComponent.fmtShort (kept private per component, as elsewhere). */
  private fmtShort(v: number): string {
    if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1_000) return '$' + Math.round(v / 1_000) + 'k';
    return '$' + Math.round(v);
  }

  // ── Slide helpers ─────────────────────────────────────────────────────────

  eyebrow(index: number): string {
    return `OPTIMAL DRAWDOWN · ${index + 1} OF 2`;
  }

  // ── Scroll/tap handlers (same interaction as the strategy decks) ─────────

  onScroll(): void {
    const el = this.scrollRef?.nativeElement;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    this.currentSlide = idx;
    if (el.scrollLeft > 30 && !this.hintShown) {
      this.hintShown = true;
    }
  }

  onDeckClick(event: MouseEvent): void {
    if ((event.target as Element).closest('button')) return;
    const el = this.scrollRef?.nativeElement;
    if (!el) return;
    const w   = el.clientWidth;
    const x   = event.clientX - el.getBoundingClientRect().left;
    const idx = this.currentSlide;
    if (x > w * 0.5 && idx < 1) {
      el.scrollTo({ left: (idx + 1) * w, behavior: 'smooth' });
    } else if (x < w * 0.22 && idx > 0) {
      el.scrollTo({ left: (idx - 1) * w, behavior: 'smooth' });
    }
  }

  // ── Dismiss paths ─────────────────────────────────────────────────────────

  async dismiss(): Promise<void> {
    await this.modalController.dismiss(null, 'cancel');
  }

  async stressTest(): Promise<void> {
    await this.modalController.dismiss(null, 'stress-test');
  }

  async done(): Promise<void> {
    await this.modalController.dismiss(null, 'done');
  }
}
```

Create `frontend/src/app/components/drawdown-deck/drawdown-deck.component.html`:

```html
<!-- Optimal Drawdown deck (Piggy Pro) — fullscreen blue-gradient modal, 2 slides -->
<div class="deck-host">

  <!-- Top bar: spacer · progress dots · X ─────────────────────────────────── -->
  <div class="deck-top">
    <div class="deck-spacer"></div>
    <div class="deck-dots">
      <span *ngFor="let i of SLIDE_INDICES" [class.on]="i === currentSlide"></span>
    </div>
    <button class="deck-x" (click)="dismiss()" aria-label="Close">
      <span class="material-symbols-outlined">close</span>
    </button>
  </div>

  <!-- Slide scroll container ───────────────────────────────────────────────── -->
  <div class="deck-scroll" #deckScroll (scroll)="onScroll()" (click)="onDeckClick($event)">

    <!-- SLIDE 0 — Spend in the right order ───────────────────────────────── -->
    <div class="slide">
      <div class="sl-eyebrow">{{ eyebrow(0) }}</div>
      <div class="sl-h1">Spend in the right order.</div>
      <p class="sl-body">In retirement, <strong>which account you tap first</strong> matters almost as much as how much you withdraw. The tax-smart sequence most planners start from: taxable first, tax-deferred second, Roth last.</p>

      <div class="step-row" *ngFor="let b of BUCKETS; let n = index">
        <div class="step-num">{{ n + 1 }}</div>
        <div class="step-txt">
          <div class="st-1">
            {{ b.title }}
            <span class="bucket-chip" *ngIf="chip(b.balanceKey) !== '—'">{{ chip(b.balanceKey) }}</span>
          </div>
          <div class="st-2">{{ b.body }}</div>
        </div>
      </div>

      <div class="bucket-strip">
        <div class="bs-label">Your buckets today</div>
        <div class="bs-tiles">
          <div class="bs-tile"><span class="bs-k">Taxable</span><span class="bs-v">{{ chip('fred') }}</span></div>
          <div class="bs-tile"><span class="bs-k">401(k)</span><span class="bs-v">{{ chip('k401') }}</span></div>
          <div class="bs-tile"><span class="bs-k">Roth</span><span class="bs-v">{{ chip('roth') }}</span></div>
        </div>
        <div class="bs-hint" *ngIf="!hasOutside">Add your 401(k) and Roth in the simulator to see your own mix.</div>
      </div>
      <div class="sl-spacer"></div>
    </div>

    <!-- SLIDE 1 — Why the order matters ──────────────────────────────────── -->
    <div class="slide">
      <div class="sl-eyebrow">{{ eyebrow(1) }}</div>
      <div class="sl-h1">Why the order matters.</div>
      <div class="stat-chip">
        <span class="big">0%</span>
        <span class="lab">the long-term capital-gains rate many retirees actually pay</span>
      </div>
      <div class="step-row" *ngFor="let row of WHY">
        <span class="material-symbols-outlined">{{ row[0] }}</span>
        <div class="step-txt">
          <div class="st-1">{{ row[1] }}</div>
          <div class="st-2">{{ row[2] }}</div>
        </div>
      </div>
      <div class="warn-card">
        <span class="material-symbols-outlined">info</span>
        <p>Educational content, not tax advice. Everyone’s tax picture is different — talk to a qualified tax advisor before acting on any withdrawal plan.</p>
      </div>
      <div class="sl-spacer"></div>
      <button class="sl-cta" (click)="stressTest()">
        <span class="material-symbols-outlined">play_arrow</span>
        Stress-test with your outside accounts
      </button>
      <button class="sl-ghost" (click)="done()">Done</button>
    </div>

  </div><!-- .deck-scroll -->

  <!-- Swipe hint — hidden permanently after first swipe ───────────────────── -->
  <div class="swipe-hint" [class.gone]="hintShown">Swipe to explore</div>

</div><!-- .deck-host -->
```

Create `frontend/src/app/components/drawdown-deck/drawdown-deck.component.scss`:

```scss
// Optimal Drawdown deck — shares the deck visual language with the strategy
// decks; only drawdown-specific styles (bucket chips + strip) live here.
@use '../../../theme/deck-shared';

// ─── Slide 0: balance chip on bucket rows ────────────────────────────────────

.bucket-chip {
  display: inline-block;
  margin-left: 7px;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  font-size: 10.5px;
  font-weight: 800;
  color: #fff;
  vertical-align: 1px;
}

// ─── Slide 0: "Your buckets today" strip ─────────────────────────────────────

.bucket-strip {
  margin-top: 16px;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 16px;
  padding: 13px 15px;
  backdrop-filter: blur(10px);

  .bs-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
  }

  .bs-tiles {
    display: flex;
    gap: 8px;
    margin-top: 9px;
  }

  .bs-tile {
    flex: 1;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;

    .bs-k { font-size: 10px; font-weight: 700; color: rgba(255, 255, 255, 0.6); }
    .bs-v { font-size: 15px; font-weight: 800; color: #fff; letter-spacing: -0.01em; }
  }

  .bs-hint {
    margin-top: 9px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.5;
  }
}

// ─── Slide 1: longer stat label than the strategy decks — allow wrap ────────

.stat-chip .lab {
  max-width: 190px;
  line-height: 1.4;
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `cd frontend && npx ng test --include='**/drawdown-deck.component.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: PASS (7 specs).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/drawdown-deck/
git commit -m "feat(tab2): Optimal Drawdown deck — 2-slide pro walkthrough with live buckets"
```

---

### Task 4: RetirementPlanning orchestration — roles, tier prop, drawdown modal

**Files:**
- Modify: `frontend/src/app/components/retirement-planning/retirement-planning.component.ts`
- Test: `frontend/src/app/components/retirement-planning/retirement-planning.drawdown.spec.ts` (new, purpose-named — the legacy CLI spec stays untouched; precedent: `auth.service.progress-inflight.spec.ts`)

**Interfaces:**
- Consumes: `StrategyDeckComponent` roles `'drawdown'` / `'upgrade'` and input `userTier` (Task 2); `DrawdownDeckComponent` with input `userId` and role `'stress-test'` (Task 3); existing `buildFade`, `upgradeToPlusClicked()`, `setSelectedSection()`, `toastService.showToast()`.
- Produces: `openDrawdownDeck(): Promise<void>` (public — role handler and spec call it) with its own `drawdownLock` guard. ALL modal locks in this component (`deckLock`, `flowLock`, `drawdownLock`) release in `finally` before role handling — hardening decision (Andy 2026-07-15) so a rejected create/present can never strand a lock; `drawdownLock` stays separate from `deckLock` for defense in depth.

- [ ] **Step 1: Write the failing spec**

Create `frontend/src/app/components/retirement-planning/retirement-planning.drawdown.spec.ts`:

```typescript
import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ModalController } from '@ionic/angular/standalone';
import { RetirementPlanningComponent } from './retirement-planning.component';
import { DrawdownDeckComponent } from '../drawdown-deck/drawdown-deck.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SimulationHistoryService } from '../../services/simulation-history.service';

describe('RetirementPlanningComponent — drawdown orchestration', () => {
  let fixture: ComponentFixture<RetirementPlanningComponent>;
  let component: RetirementPlanningComponent;
  let modalCtrl: jasmine.SpyObj<ModalController>;
  let toast: jasmine.SpyObj<ToastService>;
  let progress$: BehaviorSubject<any>;

  /** Mock fullscreen modal whose onDidDismiss resolves with the given role. */
  function makeModal(role: string | undefined) {
    return {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role })),
    } as any;
  }

  beforeEach(() => {
    progress$ = new BehaviorSubject<any>({ selectedTier: 'pro' });
    modalCtrl = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    toast = jasmine.createSpyObj('ToastService', ['showToast']);

    TestBed.configureTestingModule({
      imports: [RetirementPlanningComponent],
      providers: [
        { provide: ModalController, useValue: modalCtrl },
        { provide: ToastService, useValue: toast },
        {
          provide: AuthService,
          useValue: {
            userProgress$: progress$.asObservable(),
            getCurrentUserId: jasmine.createSpy('getCurrentUserId').and.returnValue(42),
          },
        },
        {
          provide: SimulationHistoryService,
          useValue: { getHistory: jasmine.createSpy('getHistory').and.returnValue([]) },
        },
      ],
    });

    fixture = TestBed.createComponent(RetirementPlanningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit — subscribes tier, loads history
  });

  it('passes the current tier into the strategy deck', fakeAsync(() => {
    modalCtrl.create.and.returnValue(Promise.resolve(makeModal(undefined)));
    component.openStrategyDeck('yield');
    tick(700);
    expect(modalCtrl.create).toHaveBeenCalledWith(jasmine.objectContaining({
      componentProps: jasmine.objectContaining({ strategyKey: 'yield', userTier: 'pro' }),
    }));
    flush();
  }));

  it('role drawdown opens the drawdown deck with the userId', fakeAsync(() => {
    modalCtrl.create.and.returnValues(
      Promise.resolve(makeModal('drawdown')),
      Promise.resolve(makeModal(undefined)),
    );
    component.openStrategyDeck('yield');
    tick(700);
    expect(modalCtrl.create).toHaveBeenCalledTimes(2);
    const secondCall = modalCtrl.create.calls.argsFor(1)[0] as any;
    expect(secondCall.component).toBe(DrawdownDeckComponent);
    expect(secondCall.cssClass).toBe('mc-fullscreen-modal');
    expect(secondCall.componentProps).toEqual({ userId: '42' });
    flush();
  }));

  it('role upgrade routes to upgradeToPlusClicked', fakeAsync(() => {
    spyOn(component, 'upgradeToPlusClicked');
    modalCtrl.create.and.returnValue(Promise.resolve(makeModal('upgrade')));
    component.openStrategyDeck('yield');
    tick(700);
    expect(component.upgradeToPlusClicked).toHaveBeenCalled();
    flush();
  }));

  it('drawdown deck stress-test switches on outside accounts and lands on the simulator', fakeAsync(() => {
    component.includeOutsideAccts = false;
    component.setSelectedSection('education');
    modalCtrl.create.and.returnValue(Promise.resolve(makeModal('stress-test')));
    component.openDrawdownDeck();
    tick(700);
    expect(component.includeOutsideAccts).toBeTrue();
    expect(component.selectedSection).toBe('simulator');
    expect(toast.showToast).toHaveBeenCalled();
    flush();
  }));

  it('drawdown deck done role changes nothing', fakeAsync(() => {
    component.includeOutsideAccts = false;
    component.setSelectedSection('education');
    modalCtrl.create.and.returnValue(Promise.resolve(makeModal('done')));
    component.openDrawdownDeck();
    tick(700);
    expect(component.includeOutsideAccts).toBeFalse();
    expect(component.selectedSection).toBe('education');
    flush();
  }));

  it('releases the drawdown lock when modal creation fails', fakeAsync(() => {
    modalCtrl.create.and.returnValues(
      Promise.reject(new Error('create failed')),
      Promise.resolve(makeModal(undefined)),
    );
    component.openDrawdownDeck().catch(() => { /* rejection propagates by design */ });
    tick();
    component.openDrawdownDeck();
    tick(700);
    expect(modalCtrl.create).toHaveBeenCalledTimes(2);
    flush();
  }));
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `cd frontend && npx ng test --include='**/retirement-planning.drawdown.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `userTier` not passed, `openDrawdownDeck` does not exist.

(If component creation itself fails with a DI error naming a directive dependency from `TabBarScrollDirective`/`KeyboardAvoidDirective`, add that named provider to the test module with a minimal stub — the tab pages' specs instantiate these directives fine, so this is unlikely.)

- [ ] **Step 3: Implement the orchestration**

In `frontend/src/app/components/retirement-planning/retirement-planning.component.ts`:

3a. Add the import next to the other component imports:

```typescript
import { DrawdownDeckComponent } from '../drawdown-deck/drawdown-deck.component';
```

3b. In `openStrategyDeck`, pass the tier (replace the existing `componentProps` line):

```typescript
      componentProps: { strategyKey: key, userTier: this.currentTier },
```

3c. Replace the ENTIRE `openStrategyDeck` method (hardened lock + new role branches — the `deckLock` now releases in `finally` before role handling, per the 2026-07-15 hardening decision):

```typescript
  async openStrategyDeck(key: string): Promise<void> {
    if (this.deckLock) return;
    this.deckLock = true;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const enterAnim = (baseEl: HTMLElement) => buildFade(baseEl, prefersReduced ? 0 : 500);
    const leaveAnim = (baseEl: HTMLElement) => buildFade(baseEl, prefersReduced ? 0 : 320).direction('reverse');

    let role: string | undefined;
    try {
      const modal = await this.modalController.create({
        component: StrategyDeckComponent,
        cssClass: 'mc-fullscreen-modal',
        enterAnimation: enterAnim,
        leaveAnimation: leaveAnim,
        componentProps: { strategyKey: key, userTier: this.currentTier },
      });
      await modal.present();
      ({ role } = await modal.onDidDismiss());
    } finally {
      this.deckLock = false;
    }

    if (role === 'stress-test') {
      this.setSelectedSection('simulator');
      this.toastService.showToast('Simulator ready — tap the piggy', 'medium', 2400);
    } else if (role === 'drawdown') {
      await this.openDrawdownDeck();
    } else if (role === 'upgrade') {
      this.upgradeToPlusClicked();
    }
  }
```

(This removes the old `setTimeout(() => { this.deckLock = false; }, 600)` release — the `finally` supersedes it.)

3d. Add the guard field next to `deckLock`:

```typescript
  /** Guard against double-presenting the drawdown deck. Separate from deckLock:
   *  the strategy deck's dismissal chain runs while deckLock is still held. */
  private drawdownLock = false;
```

3e. Add the method after `openStrategyDeck`:

```typescript
  /** Present the Optimal Drawdown deck (Piggy Pro). Reached via the strategy
   *  decks' 'drawdown' dismiss role; public so the spec can drive it directly. */
  async openDrawdownDeck(): Promise<void> {
    if (this.drawdownLock) return;
    this.drawdownLock = true;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const enterAnim = (baseEl: HTMLElement) => buildFade(baseEl, prefersReduced ? 0 : 500);
    const leaveAnim = (baseEl: HTMLElement) => buildFade(baseEl, prefersReduced ? 0 : 320).direction('reverse');

    let role: string | undefined;
    try {
      const modal = await this.modalController.create({
        component: DrawdownDeckComponent,
        cssClass: 'mc-fullscreen-modal',
        enterAnimation: enterAnim,
        leaveAnimation: leaveAnim,
        componentProps: { userId: this.currentUserId },
      });
      await modal.present();
      ({ role } = await modal.onDidDismiss());
    } finally {
      this.drawdownLock = false;
    }

    if (role === 'stress-test') {
      this.includeOutsideAccts = true;
      this.setSelectedSection('simulator');
      this.toastService.showToast('Simulator ready — tap the piggy', 'medium', 2400);
    }
  }
```

3f. Harden `openSimulatorFlow` the same way — the `create` call must sit INSIDE the try (a rejected `create()` is exactly the stranding case). Replace everything in the method from `const modal = await this.modalController.create({` through the closing `this.loadHistory();` with (the enterAnim/leaveAnim lines and the comments above them stay unchanged):

```typescript
    try {
      const modal = await this.modalController.create({
        component: MonteCarloFlowComponent,
        cssClass: 'mc-fullscreen-modal',
        enterAnimation: enterAnim,
        leaveAnimation: leaveAnim,
        componentProps: {
          initialScenario: this.selectedScenario,
          includeOutside: this.includeOutsideAccts,
          historyEntry: historyEntry ?? null,
          userTier: this.currentTier,
          userId: this.currentUserId,
        },
      });
      await modal.present();
      await modal.onDidDismiss();
    } finally {
      this.flowLock = false;
    }
    this.loadHistory();
```

Note: `flowLock` previously released 600ms after present; releasing after dismissal is strictly stronger for double-present protection (the fullscreen modal's backdrop blocks re-taps while open) and can never strand the lock.

- [ ] **Step 4: Run the spec to verify it passes**

Run: `cd frontend && npx ng test --include='**/retirement-planning.drawdown.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: PASS (6 specs).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/retirement-planning/
git commit -m "feat(tab2): orchestrate drawdown deck + pro nudge from strategy deck roles"
```

---

### Task 5: Verification sweep — build, all specs, on-device-style UI walkthrough

**Files:**
- No source changes expected (fixes only if verification finds issues).

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: evidence artifacts (screenshots under `ITPM/agent-memory/`), a clean AOT build, and three green targeted spec runs.

- [ ] **Step 1: AOT build gate**

Run: `cd frontend && npx ng build --configuration dev`
Expected: success, no template/type errors.

- [ ] **Step 2: All three targeted spec files**

```bash
cd frontend && npx ng test --include='**/strategy-deck.component.spec.ts' --watch=false --browsers=ChromeHeadless
cd frontend && npx ng test --include='**/drawdown-deck.component.spec.ts' --watch=false --browsers=ChromeHeadless
cd frontend && npx ng test --include='**/retirement-planning.drawdown.spec.ts' --watch=false --browsers=ChromeHeadless
```
Expected: PASS, PASS, PASS.

- [ ] **Step 3: UI acceptance walkthrough (browser)**

Preconditions: local backend running on :8080 (`lsof -i :8080`; if not, note it and start via `cd backend && SPRING_PROFILES_ACTIVE=local ./gradlew bootRun`), frontend dev server on :8100 (`servlocal`).

Walk (Chrome tools, `http://localhost:8100?devPage=/tabs/tab2` — logs in as `facebook@gmail.com` with a valid JWT):
1. Tap the education (school icon) section → 2×2 strategy grid.
2. Open any strategy deck → advance to the playbook slide (slide 5).
3. Screenshot → `ITPM/agent-memory/drawdown-playbook-button.png` — the "Discover the Optimal Drawdown" button between the stress-test CTA and Done. Confirm the `route` icon glyph renders (not a placeholder box) and the PRO chip matches the dev user's actual tier (`selectedTier`).
4. Tap the button:
   - If the dev user is NOT pro: screenshot the nudge sheet over the deck → `drawdown-nudge-over-deck.png`; tap "Maybe later" → confirm still on the playbook slide.
   - If the dev user IS pro: drawdown deck opens → screenshot slide 1 with live bucket chips + strip → `drawdown-slide1-buckets.png`; advance → screenshot slide 2 → `drawdown-slide2-why.png`; tap "Stress-test with your outside accounts" → confirm simulator section with "Include outside accounts" toggled ON.
5. Empty-state variant (pro path): in DevTools console run `localStorage.removeItem('fred.mcOutside.' + localStorage.getItem('userId'))`, reopen the drawdown deck → screenshot the hint line → `drawdown-empty-state.png`.
6. The tier branch NOT exercisable with the dev user's current tier is covered by the Task 2/4 unit specs; optionally flip the user's `selectedTier` in the local DB's user-progress row and re-walk if a screenshot of both branches is wanted.

- [ ] **Step 4: Commit any verification fixes**

Only if steps 1–3 surfaced fixes:

```bash
git add <specific files>
git commit -m "fix(tab2): drawdown walkthrough verification fixes"
```
