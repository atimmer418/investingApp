import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // Removed HttpHeaders as not used here
import { Subscription, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonInput, IonButton, IonSpinner, IonText, IonNote, NavController // Added NavController
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-authfinalize', // Selector for this page/component
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
  temporaryUserId: string | null = null; // Renamed from temporaryUserIdentifier for consistency
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private routeSub: Subscription | undefined;
  private registerSub: Subscription | undefined;

  private backendApiUrl = 'http://localhost:8080/api/auth';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private navCtrl: NavController // For potential back navigation
  ) {
    this.registerForm = new FormGroup({
      firstName: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]),
      lastName: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]),
      email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(100)]),
      password: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]),
      confirmPassword: new FormControl('', [Validators.required])
    }, { 
      validators: this.passwordsMatchValidator
     });
  }

  ngOnInit() {
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      this.temporaryUserId = params.get('tempId');
      if (this.temporaryUserId) {
        console.log('AuthFinalizeComponent: Received temporaryUserId:', this.temporaryUserId);
      } else {
        console.warn('AuthFinalizeComponent: temporaryUserId not found in query params. User might need to restart linking.');
        this.errorMessage = 'Session identifier missing. Please restart the bank linking process.';
        // Optionally redirect if tempId is crucial and missing and they shouldn't be here
        // this.router.navigate(['/link-bank'], { replaceUrl: true });
      }
    });
  }

  passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const form = control as FormGroup;
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordsMismatch: true };
  };

  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }

  async onSubmit() {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Please correct the errors in the form.';
      return;
    }

    if (!this.temporaryUserId) {
      this.errorMessage = "Cannot proceed without a valid session. Please try linking your bank again.";
      return;
    }

    this.isLoading = true;

    const registrationData = {
      firstName: this.firstName?.value,
      lastName: this.lastName?.value,
      email: this.email?.value,
      password: this.password?.value,
      temporaryUserId: this.temporaryUserId // Include the temp ID
    };

    console.log('Submitting registration data from AuthFinalizeComponent:', registrationData);

    this.registerSub = this.http.post<any>(`${this.backendApiUrl}/register`, registrationData)
      .pipe(
        tap(response => {
          console.log('Registration successful (from AuthFinalizeComponent):', response);
          this.isLoading = false;
          this.successMessage = response.message || 'Account created successfully! Please log in.';
          // After successful registration and Plaid linking, redirect to login
          // The login page will then issue a JWT.
          alert('Account created successfully! You will be redirected to log in.'); // Placeholder
          localStorage.setItem('accountCreationCompleted', 'true');
          this.router.navigate(['/setup-2fa'], { 
            queryParams: { email: registrationData.email, userId: response.userId /* if backend returns it */ },
            replaceUrl: true 
          });
        }),
        catchError((error: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || error.message || 'Registration failed. Please try again.';
          console.error('Registration error (from AuthFinalizeComponent):', error);
          return throwError(() => error);
        })
      ).subscribe();
  }

  goBack() { // Example back navigation
    // Decide where back should go from here - probably to link-bank or survey start
    this.navCtrl.navigateBack('/link-bank'); // Or to the start of the survey if appropriate
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
    if (this.registerSub) this.registerSub.unsubscribe();
  }
}