import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonContent, IonFooter, IonSpinner, NavController
} from '@ionic/angular/standalone';
import { Observable, throwError, Subscription } from 'rxjs';
import { JwtTokenUtils } from '../../utils/jwt-token.utils';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

// Make sure Plaid global object is available (from script in index.html)
declare var Plaid: any;

interface LinkTokenAuthenticatedResponse {
  link_token: string;
  expiration: string;
}

const BACKEND_API_URL = environment.backendApiUrl;

@Component({
  selector: 'app-linkplaid-component',
  templateUrl: './linkplaid.component.html',
  styleUrls: ['./linkplaid.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonContent, IonFooter, IonSpinner
  ],
})
export class LinkPlaidComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  statusMessage: string | null = null;
  isPlaidReady: boolean = false;
  plaidHandler: any = null;

  private isUserAuthenticated: boolean = false; // Determine this based on JWT presence
  private plaidSubscription: Subscription | undefined;

  constructor(
    private http: HttpClient,
    private router: Router,
    private navCtrl: NavController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Mark this step as incomplete when user enters/returns to this page
    this.authService.markStepIncomplete('linkPlaid').subscribe({
      next: () => console.log('LinkPlaid step marked as incomplete'),
      error: (err) => console.error('Failed to mark LinkPlaid step as incomplete:', err)
    });

    // This is where you would typically:
    // 1. Load the Plaid Link SDK script (if not loaded globally)
    // 2. Call your backend to get a link_token
    // 3. Initialize Plaid Link with the token
    // For this layout example, we'll simulate readiness.
    // this.initializePlaid();
    setTimeout(() => { // Simulate Plaid SDK loading and token fetching
      this.isPlaidReady = true;
    }, 1500);

    const jwtToken = JwtTokenUtils.getValidJwtToken();
    this.isUserAuthenticated = !!jwtToken; // Convert to boolean

    console.log(`LinkPlaidComponent ngOnInit - User Authenticated: ${this.isUserAuthenticated}`);
    this.initializePlaidLink();
  }

  async initializePlaidLink() {
    this.isLoading = true;
    this.isPlaidReady = false;
    this.statusMessage = 'Initializing secure connection...';

    try {
      let linkTokenData: LinkTokenAuthenticatedResponse;
      let linkToken: string;

      if (this.isUserAuthenticated) {
        linkTokenData = await this.getLinkTokenAuthenticated().toPromise() as LinkTokenAuthenticatedResponse;
        linkToken = linkTokenData.link_token;
        console.log('Received authenticated link_token.');
      } else {
        console.error('User is not authenticated. Cannot proceed with Plaid Link.');
        this.statusMessage = 'Authentication required. Redirecting to login...';
        // Redirect back to the authentication step
        setTimeout(() => {
          window.location.href = '/auth-finalize';
        }, 2000);
        return;
      }

      if (linkToken === "") {
        throw new Error('Failed to retrieve link_token from backend.');
      }

      this.plaidHandler = Plaid.create({
        token: linkToken,
        onSuccess: (public_token: string, metadata: any) => {
          console.log('Plaid Link success! Public Token:', public_token, "Metadata:", metadata);
          this.statusMessage = 'Bank account selected! Processing...';
          this.isLoading = true;
          if (this.isUserAuthenticated) {
            this.exchangePublicTokenAuthenticated(public_token);
          } else {
            console.error("Critical error: user is not authenticated when trying to link bank.");
            this.statusMessage = "Error: User is not authenticated. Please restart the process.";
            this.isLoading = false;
            return;
          }
        },
        onLoad: () => {
          console.log('Plaid Link UI loaded.');
          this.isLoading = false;
          this.isPlaidReady = true;
          this.statusMessage = 'Ready to link your bank.';
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

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${JwtTokenUtils.getValidJwtToken()}`,
      'Content-Type': 'application/json'
    });
  }

  private getLinkTokenAuthenticated(): Observable<LinkTokenAuthenticatedResponse> {
    console.log('Requesting authenticated link_token...');
    return this.http.post<LinkTokenAuthenticatedResponse>(`${BACKEND_API_URL}/plaid/create_link_token`, {}, { headers: this.getAuthHeaders() })
      .pipe(
        tap(response => console.log('Received authenticated link_token response:', response)),
        catchError(this.handleError.bind(this))
      );
  }

  private exchangePublicTokenAuthenticated(publicToken: string): void {
    console.log('Exchanging authenticated public_token...');
    this.plaidSubscription = this.http.post<any>(`${BACKEND_API_URL}/plaid/exchange_public_token`, { public_token: publicToken }, { headers: this.getAuthHeaders() })
      .pipe(
        tap(response => {
          console.log('Authenticated public token exchanged successfully:', response);
          this.statusMessage = 'Bank account linked successfully!';
          this.isLoading = false;
          
          // Complete the linkPlaid step using the unified method
          this.authService.completeStep('linkPlaid').subscribe({
            next: () => {
              console.log('LinkPlaid step completed successfully');
              // Navigate to the investment schedule setup
              this.router.navigate(['/investment-schedule'], { replaceUrl: true });
            },
            error: (err) => {
              console.error('Failed to complete LinkPlaid step:', err);
              // Still navigate even if progress update fails
              this.router.navigate(['/investment-schedule'], { replaceUrl: true });
            }
          });
        }),
        catchError(err => {
          this.isLoading = false;
          this.statusMessage = `Error: ${err.error?.message || 'Failed to link bank account.'}`;
          return this.handleError(err);
        })
      ).subscribe();
  }

  openPlaid() {
    if (this.plaidHandler && this.isPlaidReady) {
      this.statusMessage = 'Opening Plaid...';
      this.plaidHandler.open();
    } else if (!this.isPlaidReady && !this.isLoading) {
        this.statusMessage = 'Initializing, please wait...';
        this.initializePlaidLink();
    } else if (this.isLoading) {
        this.statusMessage = 'Still loading, please wait...';
    } else {
      this.statusMessage = 'Plaid Link is not ready. Please try refreshing.';
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    let userMessage = 'An unexpected error occurred. Please try again.';
    if (error.error && typeof error.error.message === 'string') {
      userMessage = error.error.message;
    } else if (typeof error.message === 'string') {
      userMessage = error.message;
    }
    // Potentially update this.statusMessage here as well, or ensure calling code does
    return throwError(() => new Error(userMessage));
  }

  ngOnDestroy() {
    if (this.plaidSubscription) {
      this.plaidSubscription.unsubscribe();
    }
    // Plaid Link SDK does not have a standard 'destroy' method for the handler instance.
    // It manages its own iframe lifecycle.
  }
}