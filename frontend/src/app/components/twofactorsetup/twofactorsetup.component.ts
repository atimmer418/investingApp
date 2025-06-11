import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subscription, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonInput, IonButton, IonSpinner, IonText, IonNote, NavController, IonButtons, IonIcon } from '@ionic/angular/standalone';

// E.164 Phone Number Regex (simplified example, consider a library for robust validation)
export const E164PhoneNumberValidator: ValidatorFn = (control: AbstractControl): {[key: string]: any} | null => {
  const valid = /^\+[1-9]\d{1,14}$/.test(control.value);
  return valid ? null : { invalidPhoneNumber: {value: control.value} };
};

@Component({
  selector: 'app-twofactorsetup',
  templateUrl: './twofactorsetup.component.html',
  styleUrls: ['./twofactorsetup.component.scss'],
  standalone: true,
  imports: [IonIcon, IonButtons, 
    CommonModule, FormsModule, ReactiveFormsModule, IonHeader, IonToolbar, IonTitle,
    IonContent, IonList, IonItem, IonLabel, IonInput, IonButton, IonSpinner, IonText, IonNote
  ]
})
export class TwoFactorSetupComponent implements OnInit, OnDestroy {
  phoneForm: FormGroup;
  otpForm: FormGroup;
  userEmail: string | null = null; // Received from registration step
  userId: string | null = null; // Optional, if backend sends it
  currentStep: 'enterPhone' | 'enterOtp' = 'enterPhone';
  isLoading: boolean = false;
  phoneNumberForVerification: string = ''; // To pass to OTP verification

  errorMessage: string | null = null;
  successMessage: string | null = null;

  private routeSub: Subscription | undefined;
  private apiSub: Subscription | undefined;
  private backendApiUrl = 'http://localhost:8080/api/auth';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private navCtrl: NavController
  ) {
    this.phoneForm = new FormGroup({
      phoneNumber: new FormControl('', [Validators.required, E164PhoneNumberValidator])
    });
    this.otpForm = new FormGroup({
      otp: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]*$')])
    });
  }

  ngOnInit() {
    // Attempt to get email/userId from query params passed from registration
    // Or from a temporary state service if preferred
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      this.userEmail = params.get('email');
      this.userId = params.get('userId'); // Optional
      if (!this.userEmail) {
        console.error('2FA Setup: User email not found. Redirecting to login.');
        this.errorMessage = "Error: User session not found. Please log in.";
        // this.router.navigate(['/login'], { replaceUrl: true });
      } else {
        console.log('2FA Setup for email:', this.userEmail);
      }
    });
  }

  get phoneNumberCtrl() { return this.phoneForm.get('phoneNumber'); }
  get otpCtrl() { return this.otpForm.get('otp'); }

  async requestOtp() {
    this.errorMessage = null;
    this.successMessage = null;
    if (this.phoneForm.invalid || !this.userEmail) {
      this.phoneForm.markAllAsTouched();
      if (!this.userEmail) this.errorMessage = "User email is missing.";
      return;
    }
    this.isLoading = true;
    this.phoneNumberForVerification = this.phoneNumberCtrl?.value;

    const payload = {
      email: this.userEmail,
      phoneNumber: this.phoneNumberForVerification
    };

    this.apiSub = this.http.post<any>(`${this.backendApiUrl}/setup-2fa/send-otp`, payload)
      .pipe(
        tap(response => {
          this.isLoading = false;
          this.successMessage = response.message || `OTP sent to ${this.phoneNumberForVerification}.`;
          this.currentStep = 'enterOtp';
        }),
        catchError((error: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || error.message || 'Failed to send OTP.';
          return throwError(() => error);
        })
      ).subscribe();
  }

  async verifyOtp() {
    this.errorMessage = null;
    this.successMessage = null;
    if (this.otpForm.invalid || !this.userEmail) {
      this.otpForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;

    const payload = {
      email: this.userEmail,
      otp: this.otpCtrl?.value
      // phoneNumber is not strictly needed by backend if it fetches from User record,
      // but including it ensures we verify against the number OTP was sent to.
      // The backend's checkPhoneNumberVerification now fetches based on email.
    };

    this.apiSub = this.http.post<any>(`${this.backendApiUrl}/setup-2fa/verify-otp`, payload)
      .pipe(
        tap(response => {
          this.isLoading = false;
          this.successMessage = response.message || '2FA enabled successfully!';
          localStorage.setItem('jwtToken', response.token);
          alert('2FA Setup Complete! Please log in with your new credentials.');
          this.router.navigate(['/survey'], {
            // queryParams: { email: this.userEmail }, 
            replaceUrl: true 
          });
        }),
        catchError((error: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || error.message || 'Invalid or expired OTP.';
          return throwError(() => error);
        })
      ).subscribe();
  }

  goBack() {
    // This navigation is tricky. If they go back from 2FA setup,
    // they've registered but not completed 2FA.
    // They should probably be guided to log in and complete 2FA there.
    this.navCtrl.navigateRoot('/login', { queryParams: { email: this.userEmail }});
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
    if (this.apiSub) this.apiSub.unsubscribe();
  }
}