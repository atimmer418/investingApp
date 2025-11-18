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
  IonToast
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
  languageOutline,
  checkmarkCircle
} from 'ionicons/icons';
import { SettingsService, UserPreferences, RecurringInvestment } from '../services/settings.service';
import { PlaidService, BankAccount } from '../services/plaid.service';
import { AuthService } from '../services/auth.service';

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
    IonToast
  ],
})
export class Tab3Page implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  public userPreferences: UserPreferences | null = null;
  public recurringInvestment: RecurringInvestment | null = null;
  public currentBankAccount: BankAccount | null = null;
  public isToastOpen = false;
  public toastMessage = '';
  public toastColor = 'primary';
  
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
        }
      ]
    },
    {
      title: 'Account & Security',
      items: [
        {
          title: 'Personal Information',
          subtitle: 'Update your profile details',
          icon: 'person-outline',
          action: 'personalInfo',
          type: 'navigation'
        },
        {
          title: 'Security Settings',
          subtitle: 'Password, biometrics, and 2FA',
          icon: 'shield-checkmark-outline',
          action: 'security',
          type: 'navigation'
        },
        {
          title: 'Change Bank Account',
          subtitle: 'Link a different bank account with Plaid',
          icon: 'card-outline',
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
      title: 'Preferences',
      items: [
        {
          title: 'Notifications',
          subtitle: 'Customize your alerts and updates',
          icon: 'notifications-outline',
          action: 'notifications',
          type: 'navigation'
        },
        {
          title: 'App Theme',
          subtitle: 'Choose light or dark mode',
          icon: 'moon-outline',
          action: 'theme',
          type: 'toggle'
        },
        {
          title: 'Language',
          subtitle: 'Select your preferred language',
          icon: 'language-outline',
          action: 'language',
          type: 'navigation'
        }
      ]
    },
    {
      title: 'Support & Legal',
      items: [
        {
          title: 'Help Center',
          subtitle: 'FAQs and troubleshooting',
          icon: 'help-circle-outline',
          action: 'helpCenter',
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
          title: 'Privacy Policy',
          subtitle: 'Review our privacy practices',
          icon: 'lock-closed-outline',
          action: 'privacyPolicy',
          type: 'navigation'
        },
        {
          title: 'Terms of Service',
          subtitle: 'Read our terms and conditions',
          icon: 'document-text-outline',
          action: 'termsOfService',
          type: 'navigation'
        }
      ]
    }
  ];

  constructor(
    private router: Router, 
    private settingsService: SettingsService, 
    private plaidService: PlaidService,
    private authService: AuthService
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
      languageOutline,
      checkmarkCircle
    });
  }

  ngOnInit() {
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
          'VTI': 60,   // Total Stock Market
          'VXUS': 30,  // International
          'BND': 10    // Bonds
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
      case 'investmentGoals':
        this.showComingSoon('Investment Goals');
        break;
      case 'personalInfo':
        this.showComingSoon('Personal Information');
        break;
      case 'security':
        this.showComingSoon('Security Settings');
        break;
      case 'bankAccounts':
        this.handleBankAccountsView();
        break;
      case 'changeBankAccount':
        this.handleChangeBankAccount();
        break;
      case 'taxDocuments':
        this.showComingSoon('Tax Documents');
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
      case 'language':
        this.showComingSoon('Language Settings');
        break;
      case 'helpCenter':
        this.showComingSoon('Help Center');
        break;
      case 'contactSupport':
        this.handleContactSupport();
        break;
      case 'privacyPolicy':
        this.showComingSoon('Privacy Policy');
        break;
      case 'termsOfService':
        this.showComingSoon('Terms of Service');
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
      this.displayToast(`You have ${notifCount} notification types enabled`, 'primary');
    }
  }

  private handleContactSupport() {
    this.displayToast('Opening support chat...', 'success');
    // In a real app, open support interface
  }

  private handleBankAccountsView() {
    if (this.currentBankAccount) {
      const linkDate = this.plaidService.formatLinkDate(this.currentBankAccount.linkDate);
      const status = this.plaidService.getStatusText(this.currentBankAccount.status);
      this.displayToast(`${this.currentBankAccount.institutionName} (${status}) - Linked: ${linkDate}`, 'primary');
    } else {
      this.displayToast('No bank accounts linked. Use "Change Bank Account" to link one.', 'warning');
    }
  }

  private handleChangeBankAccount() {
    // Navigate to the dedicated change bank account page
    this.router.navigate(['/change-bank-account']);
  }

  private showComingSoon(feature: string) {
    this.displayToast(`${feature} feature coming soon!`, 'warning');
  }

  private handleBeneficiaries() {
    console.log('Navigating to beneficiaries management');
    this.router.navigate(['/beneficiaries']);
  }

  private toggleTheme() {
    if (this.userPreferences) {
      const newTheme = this.userPreferences.theme === 'dark' ? 'light' : 'dark';
      this.settingsService.applyTheme(newTheme);
      this.displayToast(`Switched to ${newTheme} theme`, 'success');
    }
  }

  private displayToast(message: string, color: string = 'primary') {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
  }

  onLogout() {
    // Implement logout functionality
    console.log('Logout clicked');
    // this.router.navigate(['/login']);
  }
}
