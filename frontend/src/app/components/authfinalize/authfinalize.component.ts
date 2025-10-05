// src/app/pages/authfinalize/authfinalize.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonInput, IonButton, IonSpinner, IonText, IonNote, IonProgressBar, 
  IonBackButton, IonButtons, IonIcon, NavController
} from '@ionic/angular/standalone';

// --- NEW IMPORTS ---
import { PasskeyService } from '../../services/passkey.service';
import { AuthService } from '../../services/auth.service';
import { create } from '@github/webauthn-json';

@Component({
  selector: 'app-authfinalize',
  templateUrl: './authfinalize.component.html',
  styleUrls: ['./authfinalize.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, ReactiveFormsModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
    IonInput, IonButton, IonSpinner, IonText, IonNote, IonProgressBar,
    IonBackButton, IonButtons, IonIcon
  ]
})
export class AuthFinalizeComponent implements OnInit, OnDestroy {
  registerForm: FormGroup;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  hasRequiredParams: boolean = false;

  planId: string | null = null;
  timeToFI: string | null = null;
  targetPortfolio: number | null = null;
  retirementIncome: number | null = null;
  monthlyInvestment: number | null = null;

  // for work development
  simulatePasskey: boolean = false; // Toggle this to simulate passkey creation

  private routeSub: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private passkeyService: PasskeyService, // Inject the new service
    private authService: AuthService
  ) {
    this.registerForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(100)]),
    });
  }

  ngOnInit() {
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const pParam = params.get('p');
      const rIParam = params.get('rI');
      const mIParam = params.get('mI');

      // First try to get values from query parameters (fresh navigation from fi-plan-results)
      this.planId = params.get('plan');
      this.timeToFI = params.get('t');
      this.targetPortfolio = pParam !== null ? +pParam : null;
      this.retirementIncome = rIParam !== null ? +rIParam : null;
      this.monthlyInvestment = mIParam !== null ? +mIParam : null;

      // If query parameters are missing, try to load from localStorage
      if (!this.planId || !this.timeToFI || !this.targetPortfolio || !this.retirementIncome || !this.monthlyInvestment) {
        console.log('Auth-finalize query parameters missing, trying to load from saved data');
        this.loadSavedData();
      }

      // Save current values to localStorage for future navigation
      if (this.planId && this.timeToFI && this.targetPortfolio && this.retirementIncome && this.monthlyInvestment) {
        this.saveDataToLocalStorage();
      }

      if (this.planId && this.timeToFI && this.targetPortfolio && this.retirementIncome && this.monthlyInvestment) {
        console.log('Received all required parameters:', {
          planId: this.planId,
          timeToFI: this.timeToFI,
          targetPortfolio: this.targetPortfolio,
          retirementIncome: this.retirementIncome,
          monthlyInvestment: this.monthlyInvestment
        });

        this.hasRequiredParams = true;
      } else {
        console.warn('Some required parameters are missing.');
        this.errorMessage = 'Some required parameters are missing. Please restart from the time to FI page.';
        
        this.hasRequiredParams = false;
      }
    });
  }
  
  private loadSavedData() {
    // Try to get from localStorage
    const savedPlan = localStorage.getItem('fiPlanSelectedStrategy');
    const savedTimeToFI = localStorage.getItem('fiPlanTimeToFI');
    const savedTargetPortfolio = localStorage.getItem('fiPlanTargetPortfolio');
    const savedRetirement = localStorage.getItem('surveyRetirementIncome');
    const savedMonthly = localStorage.getItem('surveyMonthlyInvestment');
    
    if (!this.planId && savedPlan) {
      this.planId = savedPlan;
    }
    if (!this.timeToFI && savedTimeToFI) {
      this.timeToFI = savedTimeToFI;
    }
    if (!this.targetPortfolio && savedTargetPortfolio) {
      this.targetPortfolio = parseFloat(savedTargetPortfolio);
    }
    if (!this.retirementIncome && savedRetirement) {
      this.retirementIncome = parseInt(savedRetirement, 10);
    }
    if (!this.monthlyInvestment && savedMonthly) {
      this.monthlyInvestment = parseInt(savedMonthly, 10);
    }
    
    console.log('Auth-finalize loaded saved data:', {
      planId: this.planId,
      timeToFI: this.timeToFI,
      targetPortfolio: this.targetPortfolio,
      retirementIncome: this.retirementIncome,
      monthlyInvestment: this.monthlyInvestment
    });
  }
  
  private saveDataToLocalStorage() {
    localStorage.setItem('authFinalizeData', JSON.stringify({
      planId: this.planId,
      timeToFI: this.timeToFI,
      targetPortfolio: this.targetPortfolio,
      retirementIncome: this.retirementIncome,
      monthlyInvestment: this.monthlyInvestment
    }));
    console.log('Auth-finalize saved data to localStorage');
  }

  get email() { return this.registerForm.get('email'); }

  async bypassAuthID() {
    this.simulatePasskey = true;
    await this.createPasskey();
  }

  bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // --- REFACTORED METHOD ---
  async createPasskey() {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Please provide a valid email address.';
      return;
    }
    if (!this.hasRequiredParams) {
      this.errorMessage = "Cannot proceed without a valid session. Please start from time to FI page again.";
      return;
    }

    this.isLoading = true;
    const userEmail = this.email?.value;

    // STEP 1: Start Registration (Get Challenge from Backend)
    this.passkeyService.startRegistration({
      email: userEmail, 
      planId: this.planId!,
      timeToFI: this.timeToFI!,
      targetPortfolio: this.targetPortfolio!,
      retirementIncome: this.retirementIncome!,
      monthlyInvestment: this.monthlyInvestment!
    }).subscribe({
        next: async (startResponse) => {
          try {
            console.log('Received registration options from server:', startResponse.options);
            if (this.simulatePasskey) {
              console.warn('SIMULATED PASSKEY MODE ENABLED');

              // Simulate a fake credential response
              const fakeCredential = {
                id: 'fake-id',
                rawId: this.bufferToBase64url(Uint8Array.from([1, 2, 3, 4]).buffer),
                type: 'public-key',
                response: {
                  attestationObject: "SIMULATED_ATTESTATION",
                  clientDataJSON: this.bufferToBase64url(Uint8Array.from([9, 10, 11, 12]).buffer)
                },
                clientExtensionResults: {}
              };

              // STEP 3: Finish Registration (simulate)
              this.passkeyService.finishRegistration({ email: userEmail, credential: fakeCredential })
                .subscribe({
                  next: (response) => {
                    if (response.success && response.jwtToken) {
                      console.log('SIMULATED registration and login successful!', response);
                      
                      // IMPORTANT: Call handleSuccessfulAuthentication to trigger localStorage sync
                      this.authService.handleSuccessfulAuthentication(response.jwtToken, response.userId || 0, userEmail);
                      
                      // Complete the authFinalize step
                      this.authService.completeStep('authFinalize').subscribe({
                        next: () => {
                          console.log('AuthFinalize step completed successfully');
                          // Now that authFinalize is complete, clear localStorage flags since database is source of truth
                          this.authService.clearLocalStorageProgressFlags();
                          this.router.navigate(['/kyc-verification'], { replaceUrl: true });
                        },
                        error: (err) => {
                          console.error('Failed to complete AuthFinalize step:', err);
                          // Still navigate even if progress update fails
                          this.router.navigate(['/kyc-verification'], { replaceUrl: true });
                        }
                      });
                    } else {
                      this.errorMessage = response.message || 'Registration failed or login did not occur.';
                      console.error('Registration finish response error:', response.message);
                    }
                  },
                  error: (err) => {
                    this.errorMessage = err.error?.message || err.message || 'An unknown error occurred during simulated finish.';
                    console.error('Error finishing simulated registration:', err);
                  }
                });

              return; // ✅ early return — skip the real WebAuthn
            }

            // The backend sends a JSON *string*. The 'create' function needs a JavaScript *object*.
            // We must parse the string from the server before using it.
            const optionsAsObject = JSON.parse(startResponse.options);

            const credentialRequestOptions = {
              publicKey: optionsAsObject
            };

            // STEP 2: Create Credential (Browser/OS Interaction)
            // Pass the new, correctly structured object.
            const credential = await create(credentialRequestOptions);

            // STEP 3: Finish Registration (Send Credential to Backend)
            this.passkeyService.finishRegistration({ email: userEmail, credential })
              .subscribe({
                next: (response) => {
                  if (response.success && response.jwtToken) {
                    console.log('Registration and login successful!', response);
                    
                    // IMPORTANT: Call handleSuccessfulAuthentication to trigger localStorage sync
                    this.authService.handleSuccessfulAuthentication(response.jwtToken, response.userId || 0, userEmail);
                    
                    // Complete the authFinalize step
                    this.authService.completeStep('authFinalize').subscribe({
                      next: () => {
                        console.log('AuthFinalize step completed successfully');
                        // Now that authFinalize is complete, clear localStorage flags since database is source of truth
                        this.authService.clearLocalStorageProgressFlags();
                        this.router.navigate(['/kyc-verification'], { replaceUrl: true });
                      },
                      error: (err) => {
                        console.error('Failed to complete AuthFinalize step:', err);
                        // Still navigate even if progress update fails
                        this.router.navigate(['/kyc-verification'], { replaceUrl: true });
                      }
                    });
                  } else {
                    // Handle cases where registration might be successful but no JWT (shouldn't happen with current backend logic)
                    // Or if success is false
                    this.errorMessage = response.message || 'Registration failed or login did not occur.';
                    console.error('Registration finish response error:', response.message);
                  }
                },
                error: (err) => {
                  this.errorMessage = err.error?.message || err.message || 'An unknown error occurred during registration finish.';
                  console.error('Error finishing passkey registration:', err);
                }
              });

          } catch (error: any) {
            this.isLoading = false;
            // Handle errors from the browser's credential creation (e.g., user cancels)
            this.errorMessage = `Passkey creation was cancelled or failed.`;
            console.error('Error during navigator.credentials.create():', error);
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = `Could not start registration: ${err.error || 'Server error.'}`;
          console.error('Error starting registration:', err);
        }
      });
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
  }
}