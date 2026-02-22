import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { MonthlyFreedomUpdateService, MonthlyFreedomUpdateData, MilestoneDTO } from '../../services/monthly-freedom-update.service';
import { Router } from '@angular/router';

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

  data: MonthlyFreedomUpdateData | null = null;
  loading = true;
  error: string | null = null;

  // 5-second dismiss lock
  canDismiss = false;
  private dismissTimer: any;

  constructor(
    private modalController: ModalController,
    private mfuService: MonthlyFreedomUpdateService,
    private router: Router
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

    this.loadData();
  }

  ngOnDestroy() {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
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
    }).catch((err) => {
      console.error('Error loading Monthly Freedom Update:', err);
      this.error = 'Failed to load your monthly update.';
      this.loading = false;
      this.canDismiss = true;
    });
  }

  dismiss() {
    if (!this.canDismiss) return;

    // Mark as seen if not a reopen
    if (!this.isReopen) {
      this.mfuService.dismissUpdate().subscribe({
        error: (err) => console.error('Error dismissing MFU:', err)
      });
    }
    this.modalController.dismiss();
  }

  updateContribution() {
    // Dismiss with action so the caller can navigate
    this.modalController.dismiss({
      action: 'updateContribution',
      currentAmount: this.data?.currentInvestmentAmount || 0,
      frequency: this.data?.investmentFrequency || 'MONTHLY'
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
      return `From <b>${this.data.periodLabel}</b>, your investments moved you about <b>${days} days</b> ahead a typical 59.5 retirement age.`;
    }
    return `From <b>${this.data.periodLabel}</b>, you stayed on course. Market swings are normal - they recover with time.`;
  }

  get milestoneIcon(): string {
    if (!this.data || !this.data.milestones || this.data.milestones.length === 0) return 'military_tech';
    return this.data.milestones[0].type === 'DEFAULT' ? 'sentiment_satisfied' : 'military_tech';
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
    return `If you increased your contribution by $${amount}/${this.data.frequencyLabel}.`;
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

