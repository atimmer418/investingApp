// src/app/pages/authfinalize/authfinalize.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonInput, IonButton, IonSpinner, IonText, IonNote, NavController
} from '@ionic/angular/standalone';

// --- NEW IMPORTS ---
import { PasskeyService } from '../../services/passkey.service';
import { create } from '@github/webauthn-json';

@Component({
  selector: 'app-authfinalize',
  templateUrl: './authfinalize.component.html',
  styleUrls: ['./authfinalize.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
    IonInput, IonButton, IonSpinner, IonText, IonNote
  ]
})
export class AuthFinalizeComponent implements OnInit, OnDestroy {
  registerForm: FormGroup;
  temporaryUserId: string | null = null;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private routeSub: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private passkeyService: PasskeyService // Inject the new service
  ) {
    this.registerForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(100)]),
    });
  }

  ngOnInit() {
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      this.temporaryUserId = params.get('tempId');
      if (this.temporaryUserId) {
        console.log('Received temporaryUserId:', this.temporaryUserId);
      } else {
        console.warn('temporaryUserId not found in query params.');
        this.errorMessage = 'Session identifier missing. Please restart the bank linking process.';
      }
    });
  }

  get email() { return this.registerForm.get('email'); }

  // --- REFACTORED METHOD ---
  async createPasskey() {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Please provide a valid email address.';
      return;
    }
    if (!this.temporaryUserId) {
      this.errorMessage = "Cannot proceed without a valid session. Please link your bank again.";
      return;
    }

    this.isLoading = true;
    const userEmail = this.email?.value;

    // STEP 1: Start Registration (Get Challenge from Backend)
    this.passkeyService.startRegistration({ email: userEmail, temporaryUserId: this.temporaryUserId })
      .subscribe({
        next: async (startResponse) => {
          try {
            console.log('Received registration options from server:', startResponse.options);

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
                next: (finishResponse) => {
                  this.isLoading = false;
                  this.successMessage = finishResponse; // e.g., "Registration successful."
                  console.log('Successfully registered passkey!');
                  // On success, you might navigate them to a "next steps" page or a login prompt.
                  // this.router.navigate(['/login']);
                  this.router.navigate(['/survey'], {
                    // queryParams: { email: this.userEmail }, 
                    replaceUrl: true 
                  });
                },
                error: (err) => {
                  this.isLoading = false;
                  this.errorMessage = `Registration failed: ${err.error || 'Please try again.'}`;
                  console.error('Error finishing registration:', err);
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