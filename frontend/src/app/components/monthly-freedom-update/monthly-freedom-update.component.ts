import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { MonthlyFreedomUpdateService, MonthlyFreedomUpdateData, MilestoneDTO } from '../../services/monthly-freedom-update.service';
import { MfuStoreService } from '../../services/mfu-store.service';
import { ReviewService } from '../../services/review.service';
import { Router } from '@angular/router';
import { EquityPigUtils } from '../../utils/equity-pig.utils';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-monthly-freedom-update',
  templateUrl: './monthly-freedom-update.component.html',
  styleUrls: ['./monthly-freedom-update.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class MonthlyFreedomUpdateComponent implements OnInit, OnDestroy {

  /** When true, skip the 5-second lock (reopened from FRED tab) */
  @Input() isReopen: boolean = false;

  /** Preloaded payload for present-when-ready. When set, the modal opens fully painted (no spinner). */
  @Input() preloaded: MonthlyFreedomUpdateData | null = null;

  data: MonthlyFreedomUpdateData | null = null;
  loading = true;
  error: string | null = null;

  // 5-second dismiss lock
  canDismiss = false;
  private dismissTimer: any;

  // "Seen" is committed exactly once at data-ready (non-reopen); this guards against a double fire.
  private committed = false;
  private reopenSub?: Subscription;

  constructor(
    private modalController: ModalController,
    private mfuService: MonthlyFreedomUpdateService,
    private mfuStore: MfuStoreService,
    private router: Router,
    private reviewService: ReviewService
  ) {}

  ngOnInit() {
    if (this.isReopen) {
      this.canDismiss = true;
    } else {
      // Start 5-second lock timer
      this.canDismiss = false;
      this.dismissTimer = setTimeout(() => {
        this.canDismiss = true;
      }, 5000);
    }

    if (this.isReopen) {
      if (this.preloaded) {
        // Instant paint from the localStorage snapshot; live fields are revalidated below.
        this.data = this.preloaded;
        this.loading = false;
      }
      this.revalidateReopen(!this.preloaded);
    } else if (this.preloaded) {
      // Present-when-ready: payload already in hand → the "Preparing your update…" state never renders.
      this.data = this.preloaded;
      this.loading = false;
      this.mfuStore.persistSnapshot(this.data);
      this.maybeCommitSeen(this.data);
    } else {
      // Shell fallback (shouldShow was true but /generate errored upstream): self-load as before.
      this.loadData();
    }
  }

  ngOnDestroy() {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
    this.reopenSub?.unsubscribe();
  }

  private static fontsLoaded = false;

  private loadData() {
    this.loading = true;

    const dataReady = new Promise<MonthlyFreedomUpdateData>((resolve, reject) => {
      this.mfuService.generateUpdate(this.isReopen).subscribe({
        next: (data) => resolve(data),
        error: (err) => reject(err)
      });
    });

    // Only wait for fonts on first open — after that they're cached
    const fontsReady = MonthlyFreedomUpdateComponent.fontsLoaded
      ? Promise.resolve()
      : document.fonts.load('24px "Material Symbols Outlined"').then(() => {
          MonthlyFreedomUpdateComponent.fontsLoaded = true;
        }).catch(() => {
          // Don't block on font failure
          MonthlyFreedomUpdateComponent.fontsLoaded = true;
        });

    Promise.all([dataReady, fontsReady]).then(([data]) => {
      this.data = data;
      this.loading = false;
      if (!this.isReopen) {
        this.mfuStore.persistSnapshot(data);
        this.maybeCommitSeen(data);
      }
    }).catch((err) => {
      console.error('Error loading Monthly Freedom Update:', err);
      this.error = 'Failed to load your monthly update.';
      this.loading = false;
      this.canDismiss = true;
    });
  }

  /**
   * Reopen: pull a fresh (warm, Alpaca-free) payload via the store's single-flight; patch ONLY the
   * live/projection fields over the snapshot so the freedom year matches the live app, or fill the
   * whole modal on a cold cache miss. Period/recap fields never swap.
   */
  private revalidateReopen(fillIfEmpty: boolean) {
    if (fillIfEmpty) {
      this.loading = true;
    }
    this.reopenSub = this.mfuStore.loadReopen$().subscribe({
      next: (fresh) => {
        if (this.data) {
          this.patchLiveFields(fresh);
        } else {
          this.data = fresh;
        }
        this.loading = false;
      },
      error: () => {
        // Keep the snapshot if we have one; only surface an error on a true cold miss.
        if (!this.data) {
          this.error = 'Failed to load your monthly update.';
          this.canDismiss = true;
        }
        this.loading = false;
      }
    });
  }

  /** Commit "seen" exactly once, anchored to data-ready (never the dismiss button). Non-reopen only. */
  private maybeCommitSeen(d: MonthlyFreedomUpdateData) {
    if (this.isReopen || this.committed) return;
    this.committed = true;
    this.mfuService.commitSeen(d.generatedForMonth).subscribe({
      error: (err) => console.error('Error committing MFU seen:', err)
    });
  }

  /** Overwrite only the live/projection fields so a reopened recap's numbers match the live app. */
  private patchLiveFields(fresh: MonthlyFreedomUpdateData) {
    if (!this.data) return;
    this.data = {
      ...this.data,
      projectedFreedomYear: fresh.projectedFreedomYear,
      currentEquityValue: fresh.currentEquityValue,
      statusPercentile: fresh.statusPercentile,
      bestNextMoveYear: fresh.bestNextMoveYear,
      bestNextMoveYearsEarlier: fresh.bestNextMoveYearsEarlier,
      bestNextMoveBoostAmount: fresh.bestNextMoveBoostAmount,
      currentInvestmentAmount: fresh.currentInvestmentAmount,
      recurringInvestmentAmount: fresh.recurringInvestmentAmount,
      showQuarterlyCompare: fresh.showQuarterlyCompare,
      equity12MonthsAgo: fresh.equity12MonthsAgo,
      netWorthChange: fresh.netWorthChange,
      freedomYearsChange: fresh.freedomYearsChange,
      yearlyContributions: fresh.yearlyContributions,
    };
  }

  dismiss() {
    if (!this.canDismiss) return;

    // "Seen" is committed at data-ready (maybeCommitSeen), NOT here, so the primary CTA and swipe
    // paths can't skip it. This handler only closes the modal and requests a review.
    this.modalController.dismiss();
    if (!this.isReopen) {
      this.reviewService.requestReviewIfFirstMFU();
    }
  }

  updateContribution() {
    // Dismiss with action so the caller can navigate
    this.modalController.dismiss({
      action: 'updateContribution',
      currentAmount: this.data?.currentInvestmentAmount || 0,
      frequency: this.data?.investmentFrequency || 'MONTHLY',
      boostAmount: this.data?.bestNextMoveBoostAmount || 50
    });
  }

  // --- Display helpers ---

  formatCurrency(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatCurrencyCompact(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) return '$0';
    const abs = Math.abs(amount);
    if (abs >= 1_000_000) return '$' + (amount / 1_000_000).toFixed(1) + 'M';
    if (abs >= 1_000) return '$' + (amount / 1_000).toFixed(1) + 'k';
    return '$' + amount.toFixed(0);
  }

  formatPercent(value: number | undefined | null): string {
    if (value === undefined || value === null) return '0%';
    return value.toFixed(1) + '%';
  }

  get freedomMessage(): string {
    if (!this.data) return '';
    if (this.data.daysBoughtBack > 0) {
      return `Bought back ${this.data.daysBoughtBack} days`;
    }
    return "Markets dip. Your system didn't.";
  }

  get freedomDescriptionHtml(): string {
    if (!this.data) return '';
    if (this.data.daysBoughtBack > 0) {
      const days = this.data.daysBoughtBack;
      const userAge = this.data.age || 35;
      return `From <b>${this.data.periodLabel}</b>, FRED helped move you about <b>${days} days</b> ahead a typical 59.5 retirement age.`;
    }
    return `From <b>${this.data.periodLabel}</b>, FRED helped you stay on course. Market swings are normal - they recover with time.`;
  }

  get milestoneIcon(): string {
    if (!this.data || !this.data.milestones || this.data.milestones.length === 0) return 'military_tech';
    return this.data.milestones[0].type === 'DEFAULT' ? 'sentiment_satisfied' : 'military_tech';
  }

  get milestoneEquityPigSrc(): string {
    return EquityPigUtils.pigSrcFromLevel(this.data?.equityLevel);
  }

  /**
   * Compute change from rounded start/end so the displayed values are consistent.
   * e.g. End $863 - Start $741 = exactly $122, not $123 from unrounded decimals.
   */
  get computedChange(): number {
    if (!this.data) return 0;
    return Math.round(this.data.endEquityValue) - Math.round(this.data.startEquityValue);
  }

  get changeDirection(): string {
    if (!this.data) return '';
    return this.computedChange >= 0 ? 'arrow_upward' : 'arrow_downward';
  }

  get changeClass(): string {
    if (!this.data) return '';
    return this.computedChange >= 0 ? 'mfu-stat__value--positive' : 'mfu-stat__value--negative';
  }

  get bestNextMoveTitle(): string {
    if (!this.data) return '';
    return `Freedom Date: ${this.data.projectedFreedomYear} -> ${this.data.bestNextMoveYear}<br>(${this.data.bestNextMoveYearsEarlier} years sooner)`;
  }

  get bestNextMoveDescription(): string {
    if (!this.data) return '';
    const amount = this.data.bestNextMoveBoostAmount || 50;
    return `If you increased contributions by $${amount}/${this.data.frequencyLabel}.`;
  }

  formatYearlyNetWorth(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) return '+$0';
    const prefix = amount >= 0 ? '+' : '-';
    return `${prefix}${this.formatCurrency(Math.abs(amount))}`;
  }

  formatYearsFreedom(years: number | undefined | null): string {
    if (years === undefined || years === null || years === 0) return '0';
    const prefix = years > 0 ? '-' : '+';
    return `${prefix}${Math.abs(years)}`;
  }
}

