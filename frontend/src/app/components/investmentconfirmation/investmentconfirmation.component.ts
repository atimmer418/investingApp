import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonText, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButtons, IonSpinner, NavController // Added IonCard elements
} from '@ionic/angular/standalone';
// import { BiometricAuth } from 'capacitor-native-biometric'; // Example import for a biometric plugin
// import { AlpacaService } from '../../services/alpaca.service'; // Your service for Alpaca interactions
// import { UserSettingsService } from '../../services/user-settings.service'; // To get selected percentage

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

  constructor(
    private router: Router,
    private navCtrl: NavController,
    // private alpacaService: AlpacaService,
    // private userSettingsService: UserSettingsService
  ) {}

  ngOnInit() {
    console.log('InvestmentConfirmationComponent loaded');
    // Fetch the selected percentage and portfolio type from a service or route params
    // this.investmentPercentage = this.userSettingsService.getInvestmentPercentage();
    // this.portfolioType = this.userSettingsService.getPortfolioType();
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
      // const result = await BiometricAuth.verify(); // Or similar plugin method
      // biometricSuccess = result.verified;
      // For simulation, assume success if you want to test the flow
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
      // Decide if you want to allow proceeding without biometrics or require it.
      // For this example, let's allow proceeding if it fails but log it.
      // You might have a fallback to device PIN/password or skip biometrics.
      biometricSuccess = true; // Simulate proceeding even if biometrics "failed" in this demo
    }

    if (!biometricSuccess && false) { // Set to true to enforce biometrics
      this.isAuthorizing = false;
      return;
    }
    // --- End Biometric Authentication ---


    // TODO: Call your backend service, which then interacts with Alpaca
    // This backend call would:
    // 1. Securely store the user's consent and the recurring investment percentage.
    // 2. Potentially set up recurring ACH transfers with Plaid (if that's the funding source).
    // 3. Interface with Alpaca to:
    //    - Ensure the account is ready for trading.
    //    - If 'auto' portfolio, potentially create/assign to a model portfolio.
    //    - If 'custom' portfolio, ensure the selected stocks are noted (e.g., in a watchlist, or prepare for fractional orders).
    //    - Set up logic for recurring investments (Alpaca doesn't directly do "X% of paycheck" but you can set up recurring buys based on amounts).

    // try {
    //   await this.alpacaService.setupRecurringInvestment(this.investmentPercentage, this.portfolioType).toPromise();
    //   this.authorizationStatus = 'Recurring investment authorized successfully!';
    //   setTimeout(() => {
    //     this.router.navigate(['/tabs/tab1'], { replaceUrl: true }); // Navigate to dashboard
    //   }, 1500);
    // } catch (error) {
    //   console.error('Error authorizing recurring investment with backend/Alpaca:', error);
    //   this.authorizationStatus = 'Failed to authorize. Please try again later.';
    // } finally {
    //   this.isAuthorizing = false;
    // }

    // ---- SIMULATED BACKEND CALL ----
    setTimeout(() => {
      console.log('Recurring investment setup with Alpaca (simulated).');
      this.authorizationStatus = 'Recurring investment authorized successfully!';
      this.isAuthorizing = false;
      setTimeout(() => {
        localStorage.setItem('investmentConfirmationCompleted', 'true');
        this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
      }, 1000);
    }, 2000);
    // ---- END SIMULATED BACKEND CALL ----
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