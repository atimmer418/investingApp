import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, filter, take } from 'rxjs';
import {
  IonHeader,
  IonContent,
  IonIcon,
  IonAvatar,
  IonBadge,
  ModalController,
  createAnimation
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  settingsOutline,
  walletOutline,
  cardOutline,
  pauseOutline,
  playOutline,
  notificationsOutline,
  shieldCheckmarkOutline,
  lockClosedOutline,
  helpCircleOutline,
  mailOutline,
  documentTextOutline,
  peopleOutline,
  starOutline,
  logOutOutline,
  chevronForward,
  personOutline,
  businessOutline,
  pieChartOutline,
  timeOutline,
  cashOutline,
  phonePortraitOutline,
  moonOutline,
  checkmarkCircle,
  giftOutline,
  sparklesOutline
} from 'ionicons/icons';
import { SettingsService, UserPreferences, RecurringInvestment } from '../services/settings.service';
import { PlaidService } from '../services/plaid.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { MonthlyFreedomUpdateComponent } from '../components/monthly-freedom-update/monthly-freedom-update.component';
import { MonthlyFreedomUpdateService } from '../services/monthly-freedom-update.service';
import { AppLockService } from '../services/app-lock.service';
import { AccountStatusService } from '../services/account-status.service';
import { PortfolioService } from '../services/portfolio.service';
import { AlpacaService } from '../services/alpaca.service';
import { Observable } from 'rxjs';
import { EquityPigUtils } from '../utils/equity-pig.utils';

interface SettingSection {
  title: string;
  items: SettingItem[];
}

interface SettingItem {
  title: string;
  subtitle?: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  action: string;
  type?: 'navigation' | 'toggle' | 'action';
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonContent,
    IonIcon,
    IonAvatar,
    IonBadge
  ],
})
export class Tab3Page implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  public userPreferences: UserPreferences | null = null;
  public recurringInvestment: RecurringInvestment | null = null;
  public userEmail: string = '';
  public hasMfuPeriod: boolean = false;
  public profileActionRequired$: Observable<boolean>;

  // --- Stat strip (freedom date, freedom age, dollars away) ---
  public statStripLoading: boolean = true;
  public freedomYear: string = '—';
  public freedomAge: string = '—';
  public dollarsAway: string = '—';

  // --- Profile avatar (live equity-based pig) ---
  public liveEquity: number = 0;

  get pigAvatarSrc(): string {
    return EquityPigUtils.pigSrcFromEquity(this.liveEquity);
  }

  // Assumed annual return for the live freedom-year projection.
  // Mirrors MonthlyFreedomUpdateService.ASSUMED_ANNUAL_RETURN on the backend so
  // the header matches what the Monthly Freedom Update would compute.
  private readonly ASSUMED_ANNUAL_RETURN = 0.10;

  public settingSections: SettingSection[] = [
    {
      title: 'Investment Management',
      items: [
        {
          title: 'Recurring Investments',
          subtitle: 'Adjust or pause your automatic investments',
          icon: 'time-outline',
          action: 'recurringInvestments',
          type: 'navigation'
        },
        {
          title: 'One-Time Transactions',
          subtitle: 'Invest once or transfer assets into Alpaca',
          icon: 'cash-outline',
          action: 'lumpSumInvestment',
          type: 'navigation'
        },
        {
          title: 'Portfolio Allocation',
          subtitle: 'Customize your investment strategy',
          icon: 'pie-chart-outline',
          action: 'portfolioAllocation',
          type: 'navigation'
        },
        {
          title: 'Sell & Withdraw',
          subtitle: 'Sell stocks and withdraw money',
          icon: 'card-outline',
          action: 'sellWithdraw',
          type: 'navigation'
        }
      ]
    },
    {
      title: 'Account & Security',
      items: [
        {
          title: 'Account Security',
          subtitle: 'App locking, identity and email',
          icon: 'shield-checkmark-outline',
          action: 'security',
          type: 'navigation'
        },
        {
          title: 'Change Bank Account',
          subtitle: 'Link a different bank account with Plaid',
          icon: 'business-outline',
          action: 'changeBankAccount',
          type: 'navigation'
        },
        {
          title: 'Documents',
          subtitle: 'Tax forms & account statements',
          icon: 'document-text-outline',
          action: 'taxDocuments',
          type: 'navigation'
        },
        {
          title: 'Beneficiaries',
          subtitle: 'Manage account beneficiaries and TOD',
          icon: 'people-outline',
          action: 'beneficiaries',
          type: 'navigation'
        }
      ]
    },
    {
      title: 'Support & Legal',
      items: [
        {
          title: 'FAQs',
          subtitle: 'Common questions answered',
          icon: 'help-circle-outline',
          action: 'faq',
          type: 'navigation'
        },
        {
          title: 'Contact Us',
          subtitle: 'Get help from our team',
          icon: 'mail-outline',
          action: 'contactSupport',
          type: 'navigation'
        },
        {
          title: 'Legal Information',
          subtitle: 'Terms of Service & Privacy Policy',
          icon: 'book-outline',
          action: 'legalInformation',
          type: 'navigation'
        }
      ]
    }
  ];

  constructor(
    private router: Router,
    private settingsService: SettingsService,
    private plaidService: PlaidService,
    private authService: AuthService,
    private toastService: ToastService,
    private modalController: ModalController,
    private mfuService: MonthlyFreedomUpdateService,
    private appLockService: AppLockService,
    private accountStatusService: AccountStatusService,
    private portfolioService: PortfolioService,
    private alpacaService: AlpacaService
  ) {
    this.profileActionRequired$ = this.accountStatusService.actionRequired$;
    addIcons({
      settingsOutline,
      walletOutline,
      cardOutline,
      pauseOutline,
      playOutline,
      notificationsOutline,
      shieldCheckmarkOutline,
      lockClosedOutline,
      helpCircleOutline,
      mailOutline,
      documentTextOutline,
      peopleOutline,
      starOutline,
      logOutOutline,
      chevronForward,
      personOutline,
      businessOutline,
      pieChartOutline,
      timeOutline,
      cashOutline,
      phonePortraitOutline,
      moonOutline,
      checkmarkCircle,
      giftOutline,
      sparklesOutline
    });
  }

  ngOnInit() {
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      this.userEmail = storedEmail;
    }

    this.initializeSettingSections();
    this.setupDemoData();

    // Subscribe to user preferences
    this.settingsService.getPreferences()
      .pipe(takeUntil(this.destroy$))
      .subscribe(preferences => {
        this.userPreferences = preferences;
      });

    // Subscribe to recurring investment
    this.settingsService.getRecurringInvestment()
      .pipe(takeUntil(this.destroy$))
      .subscribe(investment => {
        this.recurringInvestment = investment;
      });

    // Load freedom stat strip data (additive — does not alter existing logic above)
    this.loadStatStrip();
  }

  ionViewWillEnter() {
    // Re-check MFU availability each time the tab is visited
    this.checkMfuAvailability();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStatStrip() {
    const SAFE_WITHDRAWAL_RATE = 0.04;
    let retirementIncomeAnnual: number | null = null;
    let monthlyContribution: number | null = null;
    let currentEquity: number | null = null;
    let birthYear: number | null = null;

    // Track how many of the two async calls have completed so we know when to render.
    let progressDone = false;
    let portfolioDone = false;
    let kycDone = false;

    const tryRender = () => {
      if (!progressDone || !portfolioDone || !kycDone) return;

      // FI target (the user's "freedom number") = retirementIncome / SWR — the income-
      // based 4% rule, defaulting to $1.5M when no retirement income is on file.
      // NOTE: intentionally kept SEPARATE from the Monthly Freedom Update, which uses a
      // contribution-based target (monthlyInvestment × 300) specific to that flow. tab3
      // and the MFU are meant to diverge here; do not "converge" them.
      const targetPortfolio: number =
        (retirementIncomeAnnual != null && retirementIncomeAnnual > 0)
          ? retirementIncomeAnnual / SAFE_WITHDRAWAL_RATE
          : 1_500_000;

      // tab3's freedom year is ALWAYS the income-based projection, computed live. It
      // deliberately IGNORES the persisted currentFreedomEstimate (the MFU's
      // contribution-based number) so the two stay split — otherwise the header would
      // snap back to the MFU value after the first monthly update. Needs at least
      // equity or a contribution to be meaningful; otherwise the tiles stay '—'.
      let resolvedFreedomYear: number | null = null;
      const hasLiveInputs =
        (currentEquity != null && currentEquity > 0) ||
        (monthlyContribution != null && monthlyContribution > 0);
      if (hasLiveInputs) {
        resolvedFreedomYear = this.calculateFreedomYearClientSide(
          currentEquity ?? 0,
          monthlyContribution ?? 0,
          targetPortfolio
        );
      }

      // Freedom date
      this.freedomYear = resolvedFreedomYear != null ? String(resolvedFreedomYear) : '—';

      // Freedom age
      if (resolvedFreedomYear != null && birthYear != null) {
        const age = resolvedFreedomYear - birthYear;
        this.freedomAge = age > 0 ? String(age) : '—';
      } else {
        this.freedomAge = '—';
      }

      // Dollars away — gap to the same FI target used for the projection above.
      if (hasLiveInputs && currentEquity != null) {
        const gap = Math.max(0, targetPortfolio - currentEquity);
        this.dollarsAway = this.formatCompactCurrency(gap);
      } else {
        this.dollarsAway = '—';
      }

      this.statStripLoading = false;
    };

    // 1. UserProgress: freedom estimate + retirement income
    this.authService.getUserProgress()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (progress) => {
          if (progress) {
            retirementIncomeAnnual = progress.retirementIncome ?? null;
            monthlyContribution = progress.monthlyInvestment ?? null;
          }
          progressDone = true;
          tryRender();
        },
        error: () => {
          progressDone = true;
          tryRender();
        }
      });

    // 2. Portfolio dashboard: current equity
    this.portfolioService.getPortfolioDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data && data.summary) {
            currentEquity = data.summary.equity ?? 0;
          } else {
            currentEquity = 0;
          }
          // Expose live equity for the profile avatar pig
          this.liveEquity = currentEquity ?? 0;
          portfolioDone = true;
          tryRender();
        },
        error: () => {
          currentEquity = 0;
          this.liveEquity = 0;
          portfolioDone = true;
          tryRender();
        }
      });

    // 3. KYC data: date of birth for freedom age.
    // GET /account/kyc returns the raw nested Alpaca payload ({ contact, identity,
    // disclosures }) with snake_case keys, so the DOB is at identity.date_of_birth
    // (YYYY-MM-DD) — matching how the kyc-verification component reads it.
    this.alpacaService.getKycData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (kyc) => {
          const dob: string | undefined = kyc?.identity?.date_of_birth;
          if (dob) {
            const parsed = parseInt(dob.substring(0, 4), 10);
            birthYear = isNaN(parsed) ? null : parsed;
          }
          kycDone = true;
          tryRender();
        },
        error: () => {
          kycDone = true;
          tryRender();
        }
      });
  }

  /** Format a dollar amount compactly for the narrow strip tile. */
  private formatCompactCurrency(value: number): string {
    if (!isFinite(value) || isNaN(value)) return '—';
    if (value === 0) return '$0';
    if (value >= 1_000_000) {
      const m = value / 1_000_000;
      // Hundredth-place precision so e.g. $2,250,000 reads "$2.25M", not "$2.3M".
      return '$' + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(2)) + 'M';
    }
    if (value >= 1_000) {
      const k = value / 1_000;
      return '$' + (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + 'K';
    }
    return '$' + Math.round(value).toLocaleString();
  }

  /**
   * Project the calendar year the user reaches financial freedom.
   * Mirrors MonthlyFreedomUpdateService.calculateFreedomYear so the header can show
   * a value before the first Monthly Freedom Update has populated currentFreedomEstimate.
   */
  private calculateFreedomYearClientSide(currentEquity: number, monthlyContribution: number, targetPortfolio: number): number {
    const months = this.calculateMonthsToTarget(currentEquity, monthlyContribution, targetPortfolio);
    const years = Math.ceil(months / 12);
    const currentYear = new Date().getFullYear();
    return Math.min(currentYear + years, currentYear + 100);
  }

  /**
   * Months to reach the target portfolio with compound growth and monthly contributions.
   * Formula: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r, solved for n.
   * Mirrors MonthlyFreedomUpdateService.calculateMonthsToTarget (600 = "never" sentinel).
   */
  private calculateMonthsToTarget(currentEquity: number, monthlyContribution: number, targetPortfolio: number): number {
    if (currentEquity >= targetPortfolio) return 0;
    if (currentEquity <= 0 && monthlyContribution <= 0) return 600;

    const r = this.ASSUMED_ANNUAL_RETURN / 12;
    const PV = currentEquity;
    const FV = targetPortfolio;
    const PMT = monthlyContribution;

    if (PMT <= 0) {
      // Growth only, no contributions
      if (PV <= 0) return 600;
      const months = Math.log(FV / PV) / Math.log(1 + r);
      if (isNaN(months) || !isFinite(months) || months < 0) return 600;
      return months;
    }

    const numerator = Math.log((FV + PMT / r) / (PV + PMT / r));
    const denominator = Math.log(1 + r);
    if (denominator === 0 || isNaN(numerator) || !isFinite(numerator)) return 600;
    const months = numerator / denominator;
    if (isNaN(months) || !isFinite(months) || months < 0) return 600;
    return months;
  }

  private initializeSettingSections() {
    // This method will be called to set up the settings sections
    // The settingSections property is already defined as a static array above
  }

  private checkMfuAvailability() {
    this.mfuService.checkShouldShow()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // hasMfuHistory indicates the user has had at least one MFU generated
          this.hasMfuPeriod = !!(data && (data.hasMfuHistory || data.shouldShow));

          // Auto-show the MFU popup if shouldShow is true
          if (data && data.shouldShow) {
            this.showMfuAfterUnlock();
          }
        },
        error: () => {
          this.hasMfuPeriod = false;
        }
      });
  }

  /**
   * If the app is currently locked, wait for a successful reauth before
   * showing the MFU popup. Otherwise show immediately.
   */
  private showMfuAfterUnlock() {
    if (this.appLockService.isCurrentlyLocked()) {
      // Wait for the lock to be released (successful reauth)
      this.appLockService.isLocked$
        .pipe(
          filter(locked => !locked),
          take(1),
          takeUntil(this.destroy$)
        )
        .subscribe(() => this.showAutoMfuPopup());
    } else {
      this.showAutoMfuPopup();
    }
  }

  /**
   * Show the MFU modal as an auto-popup (isReopen = false, non-dismissable for 5s).
   */
  private async showAutoMfuPopup() {
    const modal = await this.modalController.create({
      component: MonthlyFreedomUpdateComponent,
      componentProps: { isReopen: false },
      cssClass: 'monthly-freedom-update-modal',
      backdropDismiss: false,
      leaveAnimation: (baseEl: HTMLElement) => {
        const backdropEl = baseEl.querySelector('ion-backdrop') || baseEl.shadowRoot?.querySelector('ion-backdrop');
        const wrapperEl = baseEl.querySelector('.modal-wrapper') || baseEl.shadowRoot?.querySelector('.modal-wrapper') || baseEl;
        const backdropAnim = createAnimation()
          .addElement(backdropEl || baseEl)
          .fromTo('opacity', '1', '0')
          .easing('ease-in');
        const contentAnim = createAnimation()
          .addElement(wrapperEl)
          .fromTo('opacity', '1', '0')
          .fromTo('transform', 'translateY(0)', 'translateY(24px)')
          .easing('cubic-bezier(0.4, 0, 0.2, 1)');
        return createAnimation()
          .addElement(baseEl)
          .duration(400)
          .addAnimation([backdropAnim, contentAnim]);
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.action === 'updateContribution') {
      const suggestedAmount = (data.currentAmount || 0) + (data.boostAmount || 50);
      this.router.navigate(['/recurring-investments'], {
        queryParams: { suggestedAmount: suggestedAmount }
      });
    }
  }

  onFredLogoClick() {
    if (this.hasMfuPeriod) {
      this.openMonthlyFreedomUpdate();
    }
  }

  private setupDemoData() {
    // Set up some demo recurring investment data if none exists
    if (!localStorage.getItem('recurringInvestment')) {
      const demoInvestment: RecurringInvestment = {
        id: 'demo-1',
        amount: 250,
        frequency: 'monthly',
        nextDate: this.settingsService.getNextInvestmentDate('monthly'),
        isActive: true,
        portfolioAllocation: {
          'VTI': 75,   // Total Stock Market
          'VXUS': 20,  // International
          'VBR': 5     // Small-Cap Value
        }
      };
      this.settingsService.updateRecurringInvestment(demoInvestment);
    }
  }

  onSettingClick(action: string) {
    console.log('Clicked setting:', action);

    switch (action) {
      case 'recurringInvestments':
        this.handleRecurringInvestments();
        break;
      case 'lumpSumInvestment':
        this.handleLumpSumInvestment();
        break;
      case 'portfolioAllocation':
        this.router.navigate(['/portfolio-customize']);
        break;
      case 'sellWithdraw':
        this.router.navigate(['/sell-withdraw']);
        break;
      case 'investmentGoals':
        this.showComingSoon('Investment Goals');
        break;
      case 'personalInfo':
      case 'changeEmail':
        // These are now handled in security settings
        this.router.navigate(['/security-settings']);
        break;
      case 'security':
        this.router.navigate(['/security-settings']);
        break;
      case 'bankAccounts':
        this.handleBankAccountsView();
        break;
      case 'changeBankAccount':
        this.handleChangeBankAccount();
        break;
      case 'taxDocuments':
        this.router.navigate(['/tax-documents']);
        break;
      case 'beneficiaries':
        this.handleBeneficiaries();
        break;
      case 'notifications':
        this.handleNotifications();
        break;
      case 'theme':
        this.toggleTheme();
        break;
      case 'faq':
        this.router.navigate(['/faq']);
        break;
      case 'helpCenter':
        this.showComingSoon('Help Center');
        break;
      case 'contactSupport':
        this.handleContactSupport();
        break;
      case 'legalInformation':
        this.showComingSoon('Legal Information');
        break;
      case 'monthlyFreedomUpdate':
        this.openMonthlyFreedomUpdate();
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  private handleRecurringInvestments() {
    // Navigate to the recurring investments management page
    this.router.navigate(['/recurring-investments']);
  }

  private handleLumpSumInvestment() {
    this.router.navigate(['/lump-sum-investment']);
  }

  goToMyProfile() {
    this.router.navigate(['/my-profile']);
  }

  private handleNotifications() {
    if (this.userPreferences) {
      const notifCount = Object.values(this.userPreferences.notifications).filter(Boolean).length;
      this.toastService.showToast(`You have ${notifCount} notification types enabled`, 'primary');
    }
  }

  private handleContactSupport() {
    window.location.href = 'mailto:help@fredvested.com';
  }

  private handleBankAccountsView() {
    // Fetch bank account on-demand instead of eagerly on tab load
    this.plaidService.refreshBankAccountData();
    this.plaidService.getCurrentAccount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(account => {
        if (account) {
          const linkDate = this.plaidService.formatLinkDate(account.linkDate);
          const status = this.plaidService.getStatusText(account.status);
          this.toastService.showToast(`${account.institutionName} (${status}) - Linked: ${linkDate}`, 'primary');
        } else {
          this.toastService.showToast('No bank accounts linked. Use "Change Bank Account" to link one.', 'warning');
        }
      });
  }

  private handleChangeBankAccount() {
    // Navigate to the dedicated change bank account page
    this.router.navigate(['/change-bank-account']);
  }

  private showComingSoon(feature: string) {
    this.toastService.showToast(`${feature} feature coming soon!`, 'warning');
  }

  private handleBeneficiaries() {
    console.log('Navigating to beneficiaries management');
    this.router.navigate(['/beneficiaries']);
  }

  private toggleTheme() {
    if (this.userPreferences) {
      const newTheme = this.userPreferences.theme === 'dark' ? 'light' : 'dark';
      this.settingsService.applyTheme(newTheme);
      this.toastService.showToast(`Switched to ${newTheme} theme`, 'success');
    }
  }

  async openMonthlyFreedomUpdate() {
    const modal = await this.modalController.create({
      component: MonthlyFreedomUpdateComponent,
      componentProps: { isReopen: true },
      cssClass: 'monthly-freedom-update-modal',
      backdropDismiss: true,
      leaveAnimation: (baseEl: HTMLElement) => {
        const backdropEl = baseEl.querySelector('ion-backdrop') || baseEl.shadowRoot?.querySelector('ion-backdrop');
        const wrapperEl = baseEl.querySelector('.modal-wrapper') || baseEl.shadowRoot?.querySelector('.modal-wrapper') || baseEl;
        const backdropAnim = createAnimation()
          .addElement(backdropEl || baseEl)
          .fromTo('opacity', '1', '0')
          .easing('ease-in');
        const contentAnim = createAnimation()
          .addElement(wrapperEl)
          .fromTo('opacity', '1', '0')
          .fromTo('transform', 'translateY(0)', 'translateY(24px)')
          .easing('cubic-bezier(0.4, 0, 0.2, 1)');
        return createAnimation()
          .addElement(baseEl)
          .duration(400)
          .addAnimation([backdropAnim, contentAnim]);
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.action === 'updateContribution') {
      const suggestedAmount = (data.currentAmount || 0) + (data.boostAmount || 50);
      this.router.navigate(['/recurring-investments'], {
        queryParams: { suggestedAmount: suggestedAmount }
      });
    }
  }

  onLogout() {
    // Implement logout functionality
    console.log('Logout clicked');
    // this.router.navigate(['/login']);
  }
}
