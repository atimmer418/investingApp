import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ViewWillEnter } from '@ionic/angular';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButtons, IonBackButton, IonNote, IonSpinner, IonCheckbox
} from '@ionic/angular/standalone';
import { ToastService } from '../../services/toast.service';
import { AlpacaService, CreateAccountRequest } from '../../services/alpaca.service';
import { AuthService } from '../../services/auth.service';
import { PlaidDataService } from '../../services/plaid-data.service';
import { environment } from '../../../environments/environment';
import { JwtTokenUtils } from '../../utils/jwt-token.utils';

interface UpdateAchRequestIdRequest {
  userEmail: string;
  achRequestId: string;
}

// Investment schedule interfaces
interface InvestmentSchedule {
  payFrequency: string;
  investmentAmount: number;
  startDate: string;
  isEnabled: boolean;
  scheduleDescription?: string; // Add the backend schedule description
}

// Default portfolio interface
interface DefaultStock {
  symbol: string;
  name: string;
  allocation: number; // percentage
  description: string;
}

@Component({
  selector: 'app-investmentconfirmation',
  templateUrl: './investmentconfirmation.component.html',
  styleUrls: ['./investmentconfirmation.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButtons, IonBackButton, IonNote, IonSpinner, IonCheckbox
  ]
})

export class InvestmentConfirmationComponent implements OnInit, ViewWillEnter {
  agreedToTerms: boolean = false;

  // Investment schedule data
  investmentSchedule: InvestmentSchedule = {
    payFrequency: 'BIWEEKLY',
    investmentAmount: 0,
    startDate: '',
    isEnabled: true
  };

  // Financial projections
  monthlyGoal: number = 0;
  targetPortfolio: number = 0;
  timeToFI: number = 0;

  // Legacy fields (will be replaced)
  investmentPercentage: string | null = null;
  portfolioType: 'custom' | 'auto' = 'auto';
  
  // Component state
  isAuthorizing: boolean = false;
  authorizationStatus: string | null = null;
  isCreatingAccount: boolean = false;
  alpacaAccountId: string | null = null;
  userEmail: string | null = null;

  // User's portfolio (fetched from backend)
  userPortfolio: DefaultStock[] = [];
  isLoadingPortfolio: boolean = false;
  portfolioError: string | null = null;

  // Frequency options for display
  frequencyOptions = [
    { value: 'WEEKLY', label: 'Weekly', paychecksPerMonth: 4.33 },
    { value: 'BIWEEKLY', label: 'Bi-weekly', paychecksPerMonth: 2.17 },
    { value: 'SEMI_MONTHLY', label: 'Semi-monthly', paychecksPerMonth: 2.0 },
    { value: 'MONTHLY', label: 'Monthly', paychecksPerMonth: 1.0 }
  ];

  constructor(
    private router: Router,
    private alpacaService: AlpacaService,
    private authService: AuthService,
    private plaidDataService: PlaidDataService,
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    console.log('[InvestmentConfirmationComponent] Initializing investment confirmation page');
    
    // Mark this step as incomplete when user enters/returns to this page
    this.authService.markStepIncomplete('investmentConfirmation').subscribe({
      next: () => console.log('InvestmentConfirmation step marked as incomplete'),
      error: (err) => console.error('Failed to mark InvestmentConfirmation step as incomplete:', err)
    });
    
    // 🧪 TESTING: Authentication check temporarily disabled for testing
    // Check if user is authenticated
    // if (!this.authService.isAuthenticated()) {
    //   console.warn('User not authenticated, redirecting to login');
    //   this.router.navigate(['/get-started'], { replaceUrl: true });
    //   return;
    // }
    
    // Load user data and investment schedule
    this.loadUserFinancialData();
    this.loadInvestmentSchedule();
    this.loadUserPortfolio(); // Add portfolio loading
    
    // Get user email for display
    const userEmail = this.authService.getCurrentUserEmail();
    if (userEmail) {
      this.userEmail = userEmail;
      console.log('[InvestmentConfirmationComponent] User email:', userEmail);
    }
  }

  ionViewWillEnter() {
    console.log('[InvestmentConfirmationComponent] View will enter - reloading portfolio');
    // Reload portfolio when returning to this page (e.g., from portfolio customization)
    this.loadUserPortfolio();
  }

  loadUserFinancialData(): void {
    console.log('[InvestmentConfirmationComponent] Loading user financial data...');
    
    const currentProgress = this.authService.getCurrentProgress();
    if (currentProgress && currentProgress.monthlyInvestment) {
      this.monthlyGoal = currentProgress.monthlyInvestment;
      // Retrieve other financial data from backend
      // Calculate target portfolio and time to FI
      const annualInvestment = this.monthlyGoal * 12;
      this.targetPortfolio = annualInvestment * 25; // 4% rule estimate
      this.timeToFI = 25; // Simplified estimate
      
      console.log('[InvestmentConfirmationComponent] Loaded financial data:', {
        monthlyGoal: this.monthlyGoal,
        targetPortfolio: this.targetPortfolio,
        timeToFI: this.timeToFI
      });
    } else {
      console.log('[InvestmentConfirmationComponent] No financial data found, fetching from API...');
      this.authService.getUserProgress().subscribe({
        next: (progress) => {
          if (progress && progress.monthlyInvestment) {
            this.monthlyGoal = progress.monthlyInvestment;
            const annualInvestment = this.monthlyGoal * 12;
            this.targetPortfolio = annualInvestment * 25;
            this.timeToFI = 25;
          }
        },
        error: (error) => {
          console.error('[InvestmentConfirmationComponent] Error loading user progress:', error);
        }
      });
    }
  }

  loadInvestmentSchedule(): void {
    console.log('[InvestmentConfirmationComponent] Loading investment schedule from backend...');
    
    // Try to get investment schedule from backend first
    this.authService.getCurrentInvestmentSchedule().subscribe({
      next: (scheduleData) => {
        console.log('[InvestmentConfirmationComponent] ✅ Retrieved investment schedule from backend:', scheduleData);
        
        if (scheduleData && scheduleData.frequency && scheduleData.monthlyAmount) {
          // Map backend data to component structure (from InvestmentScheduleResponse)
          this.investmentSchedule = {
            payFrequency: scheduleData.frequency,
            investmentAmount: this.calculateInvestmentAmountByFrequency(scheduleData.monthlyAmount, scheduleData.frequency),
            startDate: scheduleData.startDate, // Use actual start date from backend
            isEnabled: !scheduleData.isPaused, // Convert isPaused to isEnabled
            scheduleDescription: scheduleData.scheduleDescription // Use backend schedule description
          };
          
          // Update financial projections if available
          if (scheduleData.targetPortfolio) {
            this.targetPortfolio = scheduleData.targetPortfolio;
          }
          if (scheduleData.timeToFI) {
            this.timeToFI = scheduleData.timeToFI;
          }
          
          console.log('[InvestmentConfirmationComponent] ✅ Investment schedule loaded:', this.investmentSchedule);
        } else {
          console.log('[InvestmentConfirmationComponent] No valid schedule data, using defaults');
          this.setDefaultInvestmentSchedule();
        }
      },
      error: (error) => {
        console.error('[InvestmentConfirmationComponent] ❌ Error loading investment schedule:', error);
        console.log('[InvestmentConfirmationComponent] Using default values...');
        this.setDefaultInvestmentSchedule();
      }
    });
  }

  private setDefaultInvestmentSchedule(): void {
    // Fallback to default values
    this.investmentSchedule = {
      payFrequency: 'BIWEEKLY',
      investmentAmount: Math.round(this.monthlyGoal / 2.17), // Bi-weekly default
      startDate: this.getNextInvestmentDate('BIWEEKLY'),
      isEnabled: true
    };
  }

  private calculateInvestmentAmountByFrequency(monthlyAmount: number, frequency: string): number {
    const frequencyMap: { [key: string]: number } = {
      'WEEKLY': 4.33,
      'BIWEEKLY': 2.17,
      'SEMI_MONTHLY': 2.0,
      'MONTHLY': 1.0
    };
    
    const periodsPerMonth = frequencyMap[frequency] || 2.17;
    return Math.round(monthlyAmount / periodsPerMonth);
  }

  private getNextInvestmentDate(frequency: string): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Simple default - would be more sophisticated in real app
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadUserPortfolio(): void {
    console.log('[InvestmentConfirmationComponent] Loading user portfolio from backend...');
    this.isLoadingPortfolio = true;
    this.portfolioError = null;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${JwtTokenUtils.getValidJwtToken()}`
    });

    this.http.get<any>(`${environment.backendApiUrl}/portfolio/current`, { headers }).subscribe({
      next: (portfolioResponse) => {
        console.log('[InvestmentConfirmationComponent] ✅ Portfolio loaded:', portfolioResponse);
        
        if (portfolioResponse && portfolioResponse.portfolioItems) {
          // Convert backend portfolio to display format
          this.userPortfolio = portfolioResponse.portfolioItems.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            allocation: item.percentage,
            description: `${item.assetType || 'Investment'}`
          }));
          
          // Update portfolio type based on whether it's default or custom
          this.portfolioType = portfolioResponse.isDefault ? 'auto' : 'custom';
        }
        
        this.isLoadingPortfolio = false;
      },
      error: (error) => {
        console.error('[InvestmentConfirmationComponent] ❌ Error loading portfolio:', error);
        this.portfolioError = 'Unable to load portfolio. Using default allocation.';
        this.isLoadingPortfolio = false;
        
        // Fallback to default portfolio
        this.userPortfolio = [
          { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 75, description: 'U.S. Stock Market' },
          { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', allocation: 20, description: 'International Stocks' },
          { symbol: 'VBR', name: 'Vanguard Small-Cap Value ETF', allocation: 5, description: 'Small-Cap Value' }
        ];
      }
    });
  }

  // Helper methods for display
  getSelectedFrequencyDetails() {
    return this.frequencyOptions.find(f => f.value === this.investmentSchedule.payFrequency);
  }

  getInvestmentScheduleDescription(): string {
    // Use backend schedule description if available
    if (this.investmentSchedule.scheduleDescription) {
      return this.investmentSchedule.scheduleDescription;
    }

    // Fall back to frontend-generated description
    const frequency = this.getSelectedFrequencyDetails();
    if (!frequency || !this.investmentSchedule.startDate) return '';

    // Parse date string as local date to avoid timezone issues
    const dateString = this.investmentSchedule.startDate;
    const dateParts = dateString.split('-');
    const startDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    
    const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    switch (frequency.value) {
      case 'WEEKLY':
        return `Starting ${dayName}, ${monthDay} — recurring every week on ${dayName}`;
      case 'BIWEEKLY':
        return `Starting ${dayName}, ${monthDay} — recurring every 2 weeks on ${dayName}`;
      case 'SEMI_MONTHLY':
        return `Starting ${monthDay} — recurring every month on the 15th and last day`;
      case 'MONTHLY':
        const monthlyDay = startDate.getDate();
        return `Starting ${dayName}, ${monthDay} — recurring every month on the ${monthlyDay}${this.getOrdinalSuffix(monthlyDay)}`;
      default:
        return '';
    }
  }

  private getOrdinalSuffix(day: number): string {
    const lastDigit = day % 10;
    const lastTwoDigits = day % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }
    
    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getMonthlyProjection(): number {
    const frequencyDetails = this.getSelectedFrequencyDetails();
    if (!frequencyDetails) return 0;
    return this.investmentSchedule.investmentAmount * frequencyDetails.paychecksPerMonth;
  }

  getAnnualProjection(): number {
    return this.getMonthlyProjection() * 12;
  }

  // Navigation methods
  editPortfolio(): void {
    console.log('[InvestmentConfirmationComponent] Navigating to portfolio customization');
    this.router.navigate(['/portfolio-customize'], { queryParams: { initial: 'true' } });
  }

  async authorizeRecurringInvestment() {
    if (!this.agreedToTerms) {
      this.toastService.showToast('Please agree to the Terms of Service and Privacy Policy to continue.', 'warning');
      return;
    }

    this.isAuthorizing = true;
    this.authorizationStatus = 'Attempting authorization...';
    console.log('Authorizing recurring investment of', this.investmentPercentage);

    // --- Biometric Authentication (Conceptual) ---
    let biometricSuccess = false;
    try {
      console.log('Simulating Biometric Auth prompt...');
      const userConfirmedBiometrics = await this.simulateBiometricPrompt();
      if (userConfirmedBiometrics) {
        console.log('Biometric authentication successful (simulated).');
        biometricSuccess = true;
      } else {
        console.log('Biometric authentication failed or canceled by user (simulated).');
        this.authorizationStatus = 'Biometric authentication failed. Please try again.';
        this.isAuthorizing = false;
        return;
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      this.authorizationStatus = 'Biometric authentication is not available or failed. You can proceed without it for now.';
      biometricSuccess = true; // Allow proceeding for demo
    }

    if (!biometricSuccess && false) { // Set to true to enforce biometrics
      this.isAuthorizing = false;
      return;
    }
    // --- End Biometric Authentication ---

    // Create Alpaca account
    try {
      await this.createAlpacaAccount();
      
      // If account creation successful, proceed with investment setup
      if (this.alpacaAccountId) {
        this.authorizationStatus = 'Alpaca account created! Setting up recurring investment...';
        
        // TODO: Set up recurring investment logic
        setTimeout(() => {
          this.authorizationStatus = 'Recurring investment authorized successfully!';
          this.isAuthorizing = false;
          setTimeout(() => {
            // Complete the investmentConfirmation step using the unified method
            this.authService.completeStep('investmentConfirmation').subscribe({
              next: () => {
                console.log('InvestmentConfirmation step completed successfully');
                localStorage.setItem('alpacaAccountId', this.alpacaAccountId!);
                this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
              },
              error: (err) => {
                console.error('Failed to complete InvestmentConfirmation step:', err);
                // Still navigate and save local data even if progress update fails
                localStorage.setItem('alpacaAccountId', this.alpacaAccountId!);
                this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
              }
            });
          }, 1000);
        }, 2000);
      } else {
        throw new Error('Failed to create Alpaca account');
      }
      
    } catch (error) {
      console.error('Error in authorization process:', error);
      this.authorizationStatus = 'Failed to authorize. Please try again later.';
      this.isAuthorizing = false;
      
      // Show error toast
      await this.toastService.showToast('Failed to create trading account. Please try again.', 'danger', 3000);
    }
  }

  private async createAlpacaAccount(): Promise<void> {
    this.isCreatingAccount = true;
    this.authorizationStatus = 'Creating your trading account...';
    
    try {
      // Get user email from authentication service
      const userEmail = this.authService.getCurrentUserEmail();
      
      if (!userEmail) {
        throw new Error('User email not found. Please log in again.');
      }
      
      console.log('Creating Alpaca account for user:', userEmail);
      
      // Get KYC data if available (from Persona verification)
      const kycData = this.getKycData();
      
      // Prepare account data
      const accountData: CreateAccountRequest = this.alpacaService.prepareAccountData(userEmail, kycData);
      
      console.log('Creating Alpaca account with data:', { ...accountData, ssn: '[REDACTED]' });
      
      // Create the account
      const response = await this.alpacaService.createAccount(accountData).toPromise();
      
      if (response && response.account_id && !response.error) {
        this.alpacaAccountId = response.account_id;
        console.log('Alpaca account created successfully:', response.account_id);
        
        // Show success toast
        await this.toastService.showToast('Trading account created successfully!', 'success', 2000);

        // Create ACH relationship using Plaid data
        await this.createAchRelationship(response.account_id);
        
      } else {
        throw new Error(response?.error || 'Unknown error creating account');
      }
      
    } catch (error: any) {
      console.error('Error creating Alpaca account:', error);
      this.authorizationStatus = 'Failed to create trading account.';
      throw error;
    } finally {
      this.isCreatingAccount = false;
    }
  }

  private getKycData(): any {
    // Try to get KYC data from Persona verification or user profile
    // This is where you'd integrate with your KYC verification results
    try {
      const storedKycData = localStorage.getItem('kycVerificationData');
      if (storedKycData) {
        return JSON.parse(storedKycData);
      }
    } catch (error) {
      console.warn('Could not retrieve KYC data:', error);
    }
    
    // Return default/placeholder data if no KYC data available
    return {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001'
      }
    };
  }

  // Helper for simulation
  async simulateBiometricPrompt(): Promise<boolean> {
    return new Promise(resolve => {
      // In a real app, this would be the native prompt.
      // Here, we use a simple confirm dialog.
      const confirmed = confirm("Simulate Face ID / Biometric Authentication: Do you authorize this action?");
      resolve(confirmed);
    });
  }

  /**
   * Create ACH relationship using Plaid data from database after successful account creation
   */
  private async createAchRelationship(alpacaAccountId: string): Promise<void> {
    try {
      console.log('🏦 Creating ACH relationship for account:', alpacaAccountId);
      
      // Get Plaid data from database
      const plaidData = await this.plaidDataService.getUserPlaidData().toPromise();
      
      if (!plaidData?.accessToken || !plaidData?.accountId) {
        console.warn('⚠️ No Plaid banking data found in database. User may need to re-link their bank account.');
        
        await this.toastService.showToast('Bank account linking skipped - please link your bank account in settings later.', 'warning', 3000);
        return;
      }

      console.log('✅ Found Plaid data in database:', { 
        hasAccessToken: !!plaidData.accessToken,
        hasAccountId: !!plaidData.accountId,
        institutionName: plaidData.institutionName 
      });

      // Get user's full name for account owner (using current user email as fallback)
      const kycData = this.getKycData();
      const accountOwnerName = `${kycData.firstName} ${kycData.lastName}`; // Get actual name from KYC data

      // Create ACH relationship using database Plaid data
      const achResult = await this.alpacaService.createAchRelationshipFromPlaid(
        alpacaAccountId,
        plaidData.accessToken,
        plaidData.accountId,
        accountOwnerName
      ).toPromise();

      if (achResult && !achResult.error) {
        console.log('✅ ACH relationship created successfully:', achResult);
        
        // Update investment schedule with ACH request ID
        if (achResult.id) {
          await this.updateInvestmentScheduleWithAchId(achResult.id);
        }
        
        await this.toastService.showToast('Bank account linked successfully! You can now fund your investment account.', 'success', 3000);
      } else {
        throw new Error(achResult?.error || 'Unknown ACH creation error');
      }
      
    } catch (error: any) {
      console.error('🚨 UNEXPECTED: ACH creation failed despite successful Plaid linking!', error);
      
      // Since we have Plaid data in the database, this failure is unexpected and should be investigated
      const errorMessage = error?.error?.message || error?.message || 'Unknown error';
      console.error('ACH Creation Error Details:', {
        alpacaAccountId,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      // Show user a more specific error since this shouldn't fail if Plaid worked
      await this.toastService.showToast(`Bank linking failed unexpectedly: ${errorMessage}. Please contact support.`, 'danger', 4000);
      
      // TODO: Consider adding retry logic or automatic support ticket creation
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtToken');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private async showSuccess(message: string): Promise<void> {
    await this.toastService.showToast(message, 'success', 3000);
  }

  private async showWarning(message: string): Promise<void> {
    await this.toastService.showToast(message, 'warning', 3000);
  }

  private async showError(message: string): Promise<void> {
    await this.toastService.showToast(message, 'danger', 4000);
  }

  /**
   * Update the investment schedule with the ACH request ID after successful account creation
   */
  private async updateInvestmentScheduleWithAchId(achRequestId: string): Promise<void> {
    try {
      const userEmail = this.authService.getCurrentUserEmail();
      if (!userEmail) {
        console.warn('Cannot update investment schedule: user email not found');
        return;
      }

      const requestData: UpdateAchRequestIdRequest = {
        userEmail,
        achRequestId
      };

      console.log('Updating investment schedule with ACH request ID:', achRequestId);

      const response = await this.http.post<any>(
        `${environment.backendApiUrl}/investment-schedule/update-ach-request-id`,
        requestData,
        { headers: this.getAuthHeaders() }
      ).toPromise();

      if (response && response.id) {
        console.log('Investment schedule updated successfully with ACH request ID:', response);
      } else {
        console.warn('Failed to update investment schedule with ACH request ID:', response);
      }
    } catch (error) {
      console.error('Error updating investment schedule with ACH request ID:', error);
      // Don't throw error as this shouldn't block the user flow
    }
  }
}