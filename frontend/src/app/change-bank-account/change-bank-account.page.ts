import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, takeUntil, catchError, tap, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';
import { PlaidService } from '../services/plaid.service';
import { PasskeyService } from '../services/passkey.service';
import { PinService } from '../services/pin.service';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonText,
  IonProgressBar
} from '@ionic/angular/standalone';
import { ToastService } from '../services/toast.service';

declare var Plaid: any;

const BACKEND_API_URL = environment.backendApiUrl;

@Component({
  selector: 'app-change-bank-account',
  templateUrl: './change-bank-account.page.html',
  styleUrls: ['./change-bank-account.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonButtons,
    IonBackButton,
    IonSpinner,
    IonText,
    IonProgressBar
  ]
})
export class ChangeBankAccountPage implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();
  
  isLoading = false;
  isPlaidReady = false;
  statusMessage = '';
  currentBankAccount: any = null;
  
  private plaidHandler: any;
  private plaidSubscription: any;

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastService: ToastService,
    private plaidService: PlaidService,
    private passkeyService: PasskeyService,
    private pinService: PinService
  ) {}

  ngOnInit() {
    this.loadCurrentBankAccount();
    this.loadPlaidScript();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.plaidSubscription) {
      this.plaidSubscription.unsubscribe();
    }
  }

  goBack() {
    // Refresh the PlaidService data to ensure Tab3 gets the latest bank account info
    this.plaidService.refreshBankAccountData();
    this.router.navigate(['/tabs/tab3']);
  }

  private async loadCurrentBankAccount() {
    try {
      const headers = this.getAuthHeaders();
      const response = await this.http.get(`${BACKEND_API_URL}/plaid/primary-bank-account`, { headers }).toPromise();
      this.currentBankAccount = response;
    } catch (error) {
      console.error('Error loading current bank account:', error);
    }
  }

  private loadPlaidScript(): void {
    if (typeof Plaid !== 'undefined') {
      this.initializePlaidLink();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.onload = () => {
      this.initializePlaidLink();
    };
    script.onerror = () => {
      this.statusMessage = 'Failed to load Plaid script. Please check your internet connection.';
    };
    document.head.appendChild(script);
  }

  private async initializePlaidLink(): Promise<void> {
    this.isLoading = true;
    this.isPlaidReady = false;
    this.statusMessage = 'Initializing secure connection...';

    try {
      // Get link token for updating bank account
      const linkTokenData = await this.getLinkTokenAuthenticated().toPromise();
      const linkToken = linkTokenData.link_token;

      if (!linkToken) {
        throw new Error('Failed to retrieve link_token from backend.');
      }

      this.plaidHandler = Plaid.create({
        token: linkToken,
        onSuccess: (public_token: string, metadata: any) => {
          console.log('Plaid Link success! Public Token:', public_token, 'Metadata:', metadata);
          this.statusMessage = 'Bank account selected! Processing...';
          this.isLoading = true;
          this.exchangePublicTokenAuthenticated(public_token);
        },
        onLoad: () => {
          console.log('Plaid Link UI loaded.');
          this.isLoading = false;
          this.isPlaidReady = true;
          this.statusMessage = 'Ready to change your bank account.';
        },
        onExit: (err: any, metadata: any) => {
          this.isLoading = false;
          this.isPlaidReady = true;
          if (err != null) {
            console.error('Plaid Link exited with error:', err, metadata);
            this.statusMessage = `Link flow exited: ${err.display_message || err.error_message || 'User closed.'}`;
          } else {
            console.log('Plaid Link exited by user.', metadata);
            this.statusMessage = 'Link flow closed by user.';
          }
        },
        onEvent: (eventName: string, metadata: any) => {
          console.log('Plaid Link event:', eventName, metadata);
        }
      });

    } catch (error: any) {
      console.error('Error initializing Plaid Link:', error);
      this.statusMessage = `Error: ${error.message || 'Could not initialize bank linking.'}`;
      this.isLoading = false;
    }
  }

  async openPlaid(): Promise<void> {
    if (this.plaidHandler) {
      // Step-up authentication check
      const hasPin = await this.pinService.hasPin();

      if (hasPin) {
        const pinVerified = await this.pinService.promptPin('verify');
        if (!pinVerified) {
          this.toastService.showToast('Authentication required to change bank account.', 'warning', 3000);
          return;
        }
      }

      this.plaidHandler.open();
    } else {
      this.statusMessage = 'Plaid is not ready. Please try again.';
    }
  }

  private getLinkTokenAuthenticated() {
    return this.http.post<any>(`${BACKEND_API_URL}/plaid/create_link_token`, {}, { 
      headers: this.getAuthHeaders() 
    });
  }

  private exchangePublicTokenAuthenticated(publicToken: string): void {
    console.log('Exchanging authenticated public_token...');
    
    this.plaidSubscription = this.http.post(
      `${BACKEND_API_URL}/plaid/exchange_public_token`, 
      { public_token: publicToken }, 
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(async (response) => {
        console.log('Authenticated public token exchanged successfully:', response);
        this.statusMessage = 'Bank account updated successfully!';
        this.isLoading = false;
        
        // Show success toast
        await this.toastService.showToast('Your bank account has been updated successfully.', 'success', 3000);

        // Reload current bank account info locally
        await this.loadCurrentBankAccount();
        
        // Refresh the PlaidService data to ensure Tab3 gets the latest bank account info
        this.plaidService.refreshBankAccountData();
      }),
      catchError(async (err) => {
        this.isLoading = false;
        this.statusMessage = `Error: ${err.error?.message || 'Failed to update bank account.'}`;
        
        // Show error toast
        await this.toastService.showToast('Failed to update bank account. Please try again.', 'danger', 5000);

        return of(null);
      })
    ).subscribe();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = JwtTokenUtils.getValidJwtToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  formatAccountDisplay(): string {
    if (!this.currentBankAccount) {
      return 'No bank account connected';
    }
    
    const name = this.currentBankAccount.institutionName || 'Bank Account';
    const subType = this.currentBankAccount.accountSubType || 'Checking';
    return `${name} (${subType})`;
  }
}
