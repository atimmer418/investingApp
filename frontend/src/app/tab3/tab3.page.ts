import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, filter, take } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonList,
  IonIcon,
  IonLabel,
  IonCard,
  IonCardContent,
  IonButton,
  IonAvatar,
  IonText,
  IonBadge,
  IonRippleEffect,
  IonFooter,
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
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonList,
    IonIcon,
    IonLabel,
    IonCard,
    IonCardContent,
    IonButton,
    IonAvatar,
    IonText,
    IonBadge,
    IonRippleEffect,
    IonFooter
  ],
})
export class Tab3Page implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  public userPreferences: UserPreferences | null = null;
  public recurringInvestment: RecurringInvestment | null = null;
  public userEmail: string = '';
  public hasMfuPeriod: boolean = false;

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
    private appLockService: AppLockService
  ) {
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

  }

  ionViewWillEnter() {
    // Re-check MFU availability each time the tab is visited
    this.checkMfuAvailability();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
