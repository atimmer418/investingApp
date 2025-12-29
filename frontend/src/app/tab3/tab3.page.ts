import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
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
  IonRippleEffect
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
  checkmarkCircle
} from 'ionicons/icons';
import { SettingsService, UserPreferences, RecurringInvestment } from '../services/settings.service';
import { PlaidService, BankAccount } from '../services/plaid.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

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
    IonRippleEffect
  ],
})
export class Tab3Page implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  public userPreferences: UserPreferences | null = null;
  public recurringInvestment: RecurringInvestment | null = null;
  public currentBankAccount: BankAccount | null = null;
  public userEmail: string = 'alex.doe@example.com';

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
          title: 'One-Time Investment',
          subtitle: 'Make a lump sum investment',
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
          title: 'Tax Documents',
          subtitle: 'View and download tax forms',
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
          title: 'Contact Support',
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
    private toastService: ToastService
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
      checkmarkCircle
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

    // Subscribe to current bank account
    this.plaidService.getCurrentAccount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(account => {
        this.currentBankAccount = account;
      });
  }

  ionViewWillEnter() {
    // Refresh bank account data when entering this page
    // This ensures we get the latest data from the backend if user is authenticated
    this.plaidService.refreshBankAccountData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSettingSections() {
    // This method will be called to set up the settings sections
    // The settingSections property is already defined as a static array above
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

  private handleNotifications() {
    if (this.userPreferences) {
      const notifCount = Object.values(this.userPreferences.notifications).filter(Boolean).length;
      this.toastService.showToast(`You have ${notifCount} notification types enabled`, 'primary');
    }
  }

  private handleContactSupport() {
    this.toastService.showToast('Opening support chat...', 'success');
    // In a real app, open support interface
  }

  private handleBankAccountsView() {
    if (this.currentBankAccount) {
      const linkDate = this.plaidService.formatLinkDate(this.currentBankAccount.linkDate);
      const status = this.plaidService.getStatusText(this.currentBankAccount.status);
      this.toastService.showToast(`${this.currentBankAccount.institutionName} (${status}) - Linked: ${linkDate}`, 'primary');
    } else {
      this.toastService.showToast('No bank accounts linked. Use "Change Bank Account" to link one.', 'warning');
    }
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

  onLogout() {
    // Implement logout functionality
    console.log('Logout clicked');
    // this.router.navigate(['/login']);
  }
}
