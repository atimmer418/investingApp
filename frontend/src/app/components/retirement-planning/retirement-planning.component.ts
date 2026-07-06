import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  ModalController,
  createAnimation,
} from '@ionic/angular/standalone';
import { ScenarioType, ShowdownResult } from '../../services/monte-carlo.service';
import { SimulationHistoryService, SimulationHistoryEntry } from '../../services/simulation-history.service';
import { AuthService } from '../../services/auth.service';
import { addIcons } from 'ionicons';
import { diceOutline, schoolOutline } from 'ionicons/icons';
import { TabBarScrollDirective } from '../../directives/tab-bar-scroll.directive';
import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';
import { MonteCarloFlowComponent } from '../monte-carlo-flow/monte-carlo-flow.component';
import { McInfoSheetComponent } from '../mc-info-sheet/mc-info-sheet.component';


@Component({
  selector: 'app-retirement-planning',
  templateUrl: './retirement-planning.component.html',
  styleUrls: ['./retirement-planning.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    TabBarScrollDirective,
    KeyboardAvoidDirective,
  ]
})
export class RetirementPlanningComponent implements OnInit {
  selectedSection: 'simulator' | 'education' = 'simulator';

  // ── Tier gate ─────────────────────────────────────────────────────────────────

  private currentTier: string | null = null;

  get isMonteCarloLocked(): boolean {
    return this.currentTier !== 'plus' && this.currentTier !== 'pro';
  }

  get isPlus(): boolean { return this.currentTier === 'plus' || this.currentTier === 'pro'; }
  get isPro(): boolean  { return this.currentTier === 'pro'; }

  // ── Section helpers ───────────────────────────────────────────────────────────

  isEducationSection(): boolean { return this.selectedSection === 'education'; }
  isSimulatorSection(): boolean { return this.selectedSection === 'simulator'; }

  setSelectedSection(section: 'simulator' | 'education'): void {
    this.selectedSection = section;
  }

  // ── Education section state ───────────────────────────────────────────────────

  openedStrategy: string | null = null;
  openedStrategyTitle: string = '';
  openedStrategyBullets: string[] = [];

  private readonly strategyData: Record<string, { title: string; bullets: string[] }> = {
    yield: {
      title: 'Yield-Based Income',
      bullets: [
        'Build a portfolio of high-yield dividend stocks and bonds (target 4–5% yield).',
        'Spend only the natural income — dividends, interest, REITs — never selling principal.',
        'Reinvest excess income in good years to compound the base.',
        'Rebalance annually to maintain target yield mix.',
        'Keep a 6-month cash buffer to avoid selling during dividend cuts.'
      ]
    },
    guardrails: {
      title: 'Dynamic Guardrails',
      bullets: [
        'Set a base withdrawal rate of 5% at retirement.',
        'If withdrawals exceed 6% of current portfolio, cut spending by 10%.',
        'If withdrawals drop below 4% of current portfolio, increase spending by 10%.',
        'Review and adjust once per year after rebalancing.',
        'Keep 2 years of spending in cash to avoid forced sales in down markets.'
      ]
    },
    annuity: {
      title: 'Annuity',
      bullets: [
        'Use 40–60% of your portfolio to purchase a fixed immediate annuity at retirement.',
        'The annuity covers all essential expenses — housing, food, healthcare.',
        'Invest the remaining portfolio in stocks for growth and discretionary spending.',
        'Never touch the annuity principal — treat it as a pension.',
        'Review the growth portfolio annually and adjust spending for lifestyle goals.'
      ]
    },
    sbloc: {
      title: 'SBLOC + 4% Rule',
      bullets: [
        'In up-market years: sell 4% of portfolio for living expenses as usual.',
        'In down-market years (portfolio drops >10%): borrow from a Securities-Based Line of Credit instead of selling.',
        'When the market recovers, sell enough to repay the SBLOC loan first, then resume normal 4% withdrawals.',
        'Keep SBLOC balance below 20% of portfolio value to avoid margin calls.',
        'Set up the SBLOC before retirement — approval requires a qualifying portfolio.'
      ]
    }
  };

  openStrategy(id: string): void {
    const data = this.strategyData[id];
    if (!data) return;
    this.openedStrategy = id;
    this.openedStrategyTitle = data.title;
    this.openedStrategyBullets = data.bullets;
  }

  closeStrategy(): void {
    this.openedStrategy = null;
  }

  // ── Landing state ─────────────────────────────────────────────────────────────

  recentHistory: SimulationHistoryEntry[] = [];
  selectedScenario: ScenarioType = 'expected';
  includeOutsideAccts: boolean = false;

  /** Scenario options shown in the chip row. */
  readonly SCENARIOS: { key: ScenarioType; label: string }[] = [
    { key: 'conservative', label: 'Conservative' },
    { key: 'expected',     label: 'Expected'     },
    { key: 'aggressive',   label: 'Aggressive'   },
  ];

  // ── Double-present guard ──────────────────────────────────────────────────────

  private flowLock = false;

  // ── Derived userId ────────────────────────────────────────────────────────────

  get currentUserId(): string {
    return String(this.authService.getCurrentUserId() ?? '');
  }

  // ── Constructor ───────────────────────────────────────────────────────────────

  constructor(
    private authService: AuthService,
    private historyService: SimulationHistoryService,
    private modalController: ModalController,
  ) {
    addIcons({ diceOutline, schoolOutline });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.authService.userProgress$.subscribe(progress => {
      this.currentTier = progress?.selectedTier ?? null;
    });
    this.loadHistory();
  }

  // ── History ───────────────────────────────────────────────────────────────────

  loadHistory(): void {
    if (this.currentUserId) {
      this.recentHistory = this.historyService.getHistory(this.currentUserId);
    }
  }

  // ── Modal presentation ────────────────────────────────────────────────────────

  async openSimulatorFlow(historyEntry?: SimulationHistoryEntry): Promise<void> {
    if (this.isMonteCarloLocked) { this.upgradeToPlusClicked(); return; }
    if (this.flowLock) return;
    this.flowLock = true;

    // Ionic's documented custom-fade recipe. The shadow .modal-wrapper's
    // BASELINE state is opacity .01 + a mode-specific transform (iOS:
    // translateY(100%) — offscreen), so the enter animation must drive BOTH
    // opacity and transform on the wrapper; anything less leaves the modal
    // invisible (backdrop-only "grey screen" on device, ghost on desktop).
    const buildFade = (baseEl: HTMLElement, durationMs: number) => {
      const root = baseEl.shadowRoot ?? baseEl;
      const backdropEl = root.querySelector('ion-backdrop');
      const wrapperEl = root.querySelector('.modal-wrapper');
      const parts = [];
      if (backdropEl) {
        parts.push(createAnimation().addElement(backdropEl)
          .fromTo('opacity', '0.01', 'var(--backdrop-opacity)'));
      }
      if (wrapperEl) {
        parts.push(createAnimation().addElement(wrapperEl).keyframes([
          { offset: 0, opacity: '0', transform: 'translateY(0px)' },
          { offset: 1, opacity: '0.99', transform: 'translateY(0px)' },
        ]));
      }
      return createAnimation()
        .addElement(baseEl)
        .easing('ease-out')
        .duration(durationMs)
        .addAnimation(parts);
    };

    // Slower fade in (premium reveal), snappier fade out on close.
    const enterAnim = (baseEl: HTMLElement) => buildFade(baseEl, 500);
    const leaveAnim = (baseEl: HTMLElement) => buildFade(baseEl, 320).direction('reverse');

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
    setTimeout(() => { this.flowLock = false; }, 600);

    await modal.onDidDismiss();
    this.loadHistory();
  }

  upgradeToPlusClicked(): void {
    // TODO: trigger Plus subscription IAP
    console.log('[RetirementPlanning] Plus upgrade requested');
  }

  // Landing bottom sheets — presented via ModalController so they render at
  // the app root (above header + tab bar); position:fixed markup inside the
  // inner ion-content gets clipped by its scroll container on iOS.
  async openAssumptionsSheet(): Promise<void> {
    const modal = await this.modalController.create({
      component: McInfoSheetComponent,
      componentProps: { mode: 'assumptions' },
      cssClass: 'mc-bottom-sheet-modal',
    });
    await modal.present();
  }

  async openChipNudge(): Promise<void> {
    const modal = await this.modalController.create({
      component: McInfoSheetComponent,
      componentProps: { mode: 'nudge' },
      cssClass: 'mc-bottom-sheet-modal',
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === 'upgrade') this.upgradeToPlusClicked();
  }

  // ── Landing helper formatters ──────────────────────────────────────────────────

  fmtShort(v: number): string {
    if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1_000) return '$' + Math.round(v / 1_000) + 'k';
    return '$' + Math.round(v);
  }

  fmtDollar(v: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(v);
  }

  relativeDate(ts: number): string {
    const diffMs = Date.now() - ts;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return diffDays + 'd ago';
    if (diffDays < 30) return Math.floor(diffDays / 7) + 'w ago';
    return Math.floor(diffDays / 30) + 'mo ago';
  }

  holdCount(results: ShowdownResult): number {
    return Object.values(results).filter(p => p >= 75).length;
  }

  holdClass(results: ShowdownResult): string {
    const n = this.holdCount(results);
    return n >= 4 ? 'good' : n >= 2 ? 'mid' : 'bad';
  }

  scenarioIcon(scenario: ScenarioType): string {
    return scenario === 'conservative' ? 'south_east'
         : scenario === 'aggressive'   ? 'north_east'
         : 'trending_up';
  }

  scenarioLabel(scenario: ScenarioType): string {
    return this.SCENARIOS.find(s => s.key === scenario)?.label ?? scenario;
  }
}
