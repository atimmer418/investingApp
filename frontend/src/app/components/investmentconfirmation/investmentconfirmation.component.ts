import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonText, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButtons, IonSpinner, NavController, ToastController
} from '@ionic/angular/standalone';
import { AlpacaService, CreateAccountRequest } from '../../services/alpaca.service';
import { AuthService } from '../../services/auth.service'; // For user authentication data

@Component({
  selector: 'app-investmentconfirmation',
  templateUrl: './investmentconfirmation.component.html',
  styleUrls: ['./investmentconfirmation.component.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonText, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButtons, IonSpinner
  ]
})
export class InvestmentConfirmationComponent implements OnInit {
  investmentPercentage: string | null = null; // e.g., "10%"
  portfolioType: 'custom' | 'auto' = 'auto'; // Determined by previous steps
  isAuthorizing: boolean = false;
  authorizationStatus: string | null = null;
  isCreatingAccount: boolean = false;
  alpacaAccountId: string | null = null;
  userEmail: string | null = null; // Store user email for display

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private alpacaService: AlpacaService,
    private toastController: ToastController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    console.log('InvestmentConfirmationComponent loaded');
    
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      console.warn('User not authenticated, redirecting to login');
      this.router.navigate(['/get-started'], { replaceUrl: true });
      return;
    }
    
    // Check if we have user email
    const userEmail = this.authService.getCurrentUserEmail();
    if (!userEmail) {
      console.warn('User email not found, redirecting to login');
      this.router.navigate(['/get-started'], { replaceUrl: true });
      return;
    }
    
    console.log('User authenticated:', userEmail);
    this.userEmail = userEmail; // Store for display
    
    // Fetch the selected percentage and portfolio type from a service or route params
    this.investmentPercentage = "15%"; // Placeholder
    const didPickStocks = localStorage.getItem('stockSelectionCompleted') === 'true' && localStorage.getItem('stockSelectionSkipped') !== 'true';
    this.portfolioType = didPickStocks ? 'custom' : 'auto';
  }

  async authorizeRecurringInvestment() {
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
            localStorage.setItem('investmentConfirmationCompleted', 'true');
            localStorage.setItem('alpacaAccountId', this.alpacaAccountId!);
            this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
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
      const toast = await this.toastController.create({
        message: 'Failed to create trading account. Please try again.',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
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
        const toast = await this.toastController.create({
          message: 'Trading account created successfully!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
        
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

  goBack() {
    // Consider the state if the user goes back. Should they re-select stocks?
    this.navCtrl.back();
  }
}