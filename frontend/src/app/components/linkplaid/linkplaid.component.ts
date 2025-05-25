import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonSpinner, IonText, IonButtons, NavController // Added IonButtons, NavController
} from '@ionic/angular/standalone';
// import { PlaidService } from '../../services/plaid.service'; // Your service to interact with Plaid backend
// declare var Plaid: any; // If you are directly using Plaid Link SDK

@Component({
  selector: 'app-linkplaid-component',
  templateUrl: './linkplaid.component.html',
  styleUrls: ['./linkplaid.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonSpinner, IonText, IonButtons
  ],
})
export class LinkPlaidComponent implements OnInit {
  isLoading: boolean = false; // To show a spinner while initializing Plaid
  statusMessage: string | null = null;
  isPlaidReady: boolean = false; // To enable the button once Plaid Link is ready

  // Plaid specific variables (you'll need to manage these based on your PlaidService)
  // linkToken: string | null = null;
  // plaidHandler: any = null;

  constructor(
    private navCtrl: NavController, // For back navigation
    // private plaidService: PlaidService // Inject your Plaid service
  ) {}

  ngOnInit() {
    // This is where you would typically:
    // 1. Load the Plaid Link SDK script (if not loaded globally)
    // 2. Call your backend to get a link_token
    // 3. Initialize Plaid Link with the token
    // For this layout example, we'll simulate readiness.
    // this.initializePlaid();
    setTimeout(() => { // Simulate Plaid SDK loading and token fetching
      this.isPlaidReady = true;
    }, 1500);
  }

  // async initializePlaid() {
  //   this.isLoading = true;
  //   this.statusMessage = 'Initializing secure connection...';
  //   try {
  //     // 1. Load Plaid Script (if needed, often done in index.html or dynamically)
  //     // await this.plaidService.loadPlaidScript();

  //     // 2. Get Link Token
  //     const tokenResponse = await this.plaidService.getLinkToken().toPromise(); // Convert Observable to Promise for async/await
  //     this.linkToken = tokenResponse.link_token;

  //     if (!this.linkToken) {
  //       throw new Error('Failed to retrieve link token.');
  //     }

  //     // 3. Initialize Plaid Handler
  //     this.plaidHandler = Plaid.create({
  //       token: this.linkToken,
  //       onSuccess: async (public_token: string, metadata: any) => {
  //         this.statusMessage = 'Account linked successfully! Finalizing...';
  //         this.isLoading = true;
  //         try {
  //           await this.plaidService.exchangePublicToken(public_token).toPromise();
  //           this.statusMessage = 'Setup complete!';
  //           // Navigate to dashboard or next step
  //           // this.router.navigate(['/tabs/dashboard']);
  //           this.navCtrl.navigateRoot('/tabs/dashboard', { animated: true, animationDirection: 'forward'});

  //         } catch (exchangeError) {
  //           console.error('Plaid token exchange error:', exchangeError);
  //           this.statusMessage = 'Could not finalize account link. Please try again.';
  //         } finally {
  //           this.isLoading = false;
  //         }
  //       },
  //       onLoad: () => { this.isPlaidReady = true; this.isLoading = false; this.statusMessage = null; },
  //       onExit: (err: any, metadata: any) => {
  //         this.isLoading = false;
  //         if (err != null) {
  //           this.statusMessage = `Link flow exited: ${err.error_message || err.display_message}`;
  //         }
  //         console.log('Plaid exited', err, metadata);
  //       },
  //       onEvent: (eventName: string, metadata: any) => {
  //         console.log('Plaid event:', eventName, metadata);
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Plaid initialization error:', error);
  //     this.statusMessage = 'Could not initialize bank linking. Please try again later.';
  //     this.isLoading = false;
  //   }
  // }

  openPlaidLink() {
    if (!this.isPlaidReady) {
      this.statusMessage = 'Plaid is not ready yet. Please wait.';
      return;
    }
    // if (this.plaidHandler) {
    //   this.plaidHandler.open();
    // } else {
    //   this.statusMessage = 'Plaid handler not initialized. Please try refreshing.';
    //   // this.initializePlaid(); // Attempt to re-initialize
    // }
    alert('Simulating Plaid Link opening...');
    // Simulate success for now
    setTimeout(() => {
      this.statusMessage = 'Account linked successfully! (Simulated)';
      this.isLoading = false;
      localStorage.setItem('linkplaidCompleted', 'true')
      this.navCtrl.navigateRoot('/tabs'); // Navigate on success
    }, 2000);
  }

  goBack() {
    this.navCtrl.back(); // Uses Ionic's navigation stack
  }
}