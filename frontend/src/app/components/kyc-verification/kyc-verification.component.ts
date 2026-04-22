import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  IonHeader, IonToolbar, IonContent, IonSelect, IonSelectOption,
  IonFooter, IonSpinner, NavController, ToastController
} from '@ionic/angular/standalone';
import { Keyboard } from '@capacitor/keyboard';
import { AuthService } from '../../services/auth.service';
import { AlpacaService, CreateAlpacaAccountRequest } from '../../services/alpaca.service';
import { JwtTokenUtils } from '../../utils/jwt-token.utils';

// US states list
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'Washington D.C.' }
];

function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = (control.value || '').replace(/\D/g, '');
  // Accept +1XXXXXXXXXX (12 chars) or 10 digits
  const e164 = /^\+1\d{10}$/;
  const tenDigit = /^\d{10}$/;
  if (!val || e164.test(val) || tenDigit.test(val)) return null;
  return { invalidPhone: true };
}

function postalCodeValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = (control.value || '');
  if (!val || /^\d{5}/.test(val)) return null;
  return { invalidPostalCode: true };
}

function dateOfBirthValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = control.value || '';
  if (!val) return null;
  const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return { invalidDate: true };
  const month = +match[1], day = +match[2], year = +match[3];
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return { invalidDate: true };
  return null;
}

@Component({
  selector: 'app-kyc-verification',
  templateUrl: './kyc-verification.component.html',
  styleUrls: ['./kyc-verification.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonContent,
    IonSelect, IonSelectOption,
    IonFooter, IonSpinner
  ]
})
export class KycVerificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentStep: 1 | 2 = 1;
  exitingStep1 = false;
  isLoading = false;
  keyboardVisible = false;

  private keyboardShowListener: any;
  private keyboardHideListener: any;

  readonly states = US_STATES;
  readonly fundingSources = [
    { value: 'employment_income', label: 'Salary' },
    { value: 'investments', label: 'Investments' },
    { value: 'savings', label: 'Savings' },
    { value: 'family', label: 'Family' },
    { value: 'inheritance', label: 'Inheritance' },
    { value: 'business_income', label: 'Business Income' }
  ];

  // Step 1 form — contact + identity
  step1Form = new FormGroup({
    givenName: new FormControl('', [Validators.required]),
    familyName: new FormControl('', [Validators.required]),
    emailAddress: new FormControl('', [Validators.required, Validators.email]),
    dateOfBirth: new FormControl('', [Validators.required, dateOfBirthValidator]),
    phoneNumber: new FormControl('', [Validators.required, phoneValidator]),
    streetAddress: new FormControl('', [Validators.required]),
    city: new FormControl('', [Validators.required]),
    state: new FormControl('', [Validators.required]),
    postalCode: new FormControl('', [Validators.required, postalCodeValidator]),
    taxId: new FormControl('', [Validators.required, Validators.pattern(/^\d{3}-\d{2}-\d{4}$/)]),
    fundingSource: new FormControl('', [Validators.required])
  });

  // Step 2 form — disclosures + agreement
  step2Form = new FormGroup({
    isControlPerson: new FormControl(false),
    isAffiliatedExchangeOrFinra: new FormControl(false),
    isPoliticallyExposed: new FormControl(false),
    immediateFamilyExposed: new FormControl(false),
    agreementsChecked: new FormControl(false, [Validators.requiredTrue])
  });

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private authService: AuthService,
    private alpacaService: AlpacaService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.prefillUserData();
    if (this.loadStep1Draft()) {
      this.currentStep = 2;
    }
    this.keyboardShowListener = Keyboard.addListener('keyboardWillShow', () => {
      this.keyboardVisible = true;
      this.cdr.detectChanges();
    });
    this.keyboardHideListener = Keyboard.addListener('keyboardWillHide', () => {
      this.keyboardVisible = false;
      this.cdr.detectChanges();
    });
  }

  private get kycDraftKey(): string {
    const userId = localStorage.getItem('userId') || 'anon';
    return `fred_kyc_step1_${userId}`;
  }

  private saveStep1Draft() {
    localStorage.setItem(this.kycDraftKey, JSON.stringify(this.step1Form.value));
  }

  private loadStep1Draft(): boolean {
    const raw = localStorage.getItem(this.kycDraftKey);
    if (!raw) return false;
    try {
      this.step1Form.patchValue(JSON.parse(raw));
      return true;
    } catch {
      return false;
    }
  }

  private clearStep1Draft() {
    localStorage.removeItem(this.kycDraftKey);
  }

  private prefillUserData() {
    // Pre-fill email from JWT payload
    const token = JwtTokenUtils.getValidJwtToken();
    const payload = token ? JwtTokenUtils.decodeJwtPayload(token) : null;
    const email = payload?.sub || '';
    if (email) {
      this.step1Form.patchValue({ emailAddress: email });
    }

    // Pre-fill name + DOB from user progress
    const progress = this.authService.getUnifiedProgress();
    if (progress) {
      if (progress.firstName) {
        this.step1Form.patchValue({ givenName: progress.firstName });
      }
      if (progress.lastName) {
        this.step1Form.patchValue({ familyName: progress.lastName });
      }
    }
  }

  get step1Valid(): boolean {
    return this.step1Form.valid;
  }

  get step2Valid(): boolean {
    return this.step2Form.get('agreementsChecked')?.value === true;
  }

  private isLikelyAutofill(event: Event): boolean {
    const e = event as InputEvent;
    if (['insertReplacementText', 'insertFromAutofill', 'insertFromPaste'].includes(e.inputType)) return true;
    // iOS Safari: autofill sets data to the full inserted string
    return !!(e.data && e.data.length > 2);
  }

  onGivenNameInput(event: Event) {
    if (this.isLikelyAutofill(event)) {
      setTimeout(() => (document.getElementById('familyNameInput') as HTMLInputElement)?.focus(), 100);
    }
  }

  onFamilyNameInput(event: Event) {
    if (this.isLikelyAutofill(event)) {
      setTimeout(() => (document.getElementById('dateOfBirthInput') as HTMLInputElement)?.focus(), 100);
    }
  }

  onPhoneNumberInput(event: Event) {
    if (this.isLikelyAutofill(event)) {
      setTimeout(() => (document.getElementById('streetAddressInput') as HTMLInputElement)?.focus(), 100);
    }
  }

  // SSN masking — auto-inserts dashes as user types
  onTaxIdInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '').slice(0, 9);
    if (val.length > 5) {
      val = val.slice(0, 3) + '-' + val.slice(3, 5) + '-' + val.slice(5);
    } else if (val.length > 3) {
      val = val.slice(0, 3) + '-' + val.slice(3);
    }
    input.value = val;
    this.step1Form.patchValue({ taxId: val });
    this.step1Form.get('taxId')?.markAsTouched();
  }

  onDateOfBirthInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
    } else if (digits.length > 2) {
      formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    }
    input.value = formatted;
    this.step1Form.patchValue({ dateOfBirth: formatted });
    this.step1Form.get('dateOfBirth')?.markAsTouched();

    if (digits.length === 8) {
      setTimeout(() => (document.getElementById('phoneNumberInput') as HTMLInputElement)?.focus(), 50);
    }
  }

  // Parses autofilled full addresses like "6110 Rosemont Cir, Rockville MD 20852"
  // into individual form fields. No-ops if the value doesn't look like a full address.
  onStreetAddressInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    const commaIdx = value.indexOf(',');
    if (commaIdx === -1) return;

    const street = value.slice(0, commaIdx).trim();
    const rest = value.slice(commaIdx + 1).trim();

    const zipMatch = rest.match(/\b(\d{5})\b/);
    const stateMatch = rest.match(/\b([A-Z]{2})\b/);

    // Only parse if it looks like a full address (has state or zip)
    if (!zipMatch && !stateMatch) return;

    const zip = zipMatch?.[1] ?? '';
    const state = stateMatch?.[1] ?? '';

    let city = rest;
    if (zip) city = city.replace(zip, '');
    if (state) city = city.replace(new RegExp(`\\b${state}\\b`), '');
    city = city.replace(/[,\s]+/g, ' ').trim();

    this.step1Form.patchValue({ streetAddress: street, city, state, postalCode: zip });
    ['streetAddress', 'city', 'state', 'postalCode'].forEach(f => this.step1Form.get(f)?.markAsTouched());

    // Jump focus to SSN — all address fields are now filled
    setTimeout(() => (document.getElementById('taxIdInput') as HTMLInputElement)?.focus(), 100);
  }

  goBack() {
    this.navCtrl.navigateBack('/auth-finalize');
  }

  async proceedToStep2() {
    if (!this.step1Valid) {
      this.step1Form.markAllAsTouched();
      return;
    }
    this.saveStep1Draft();
    await this.animateStep(2);
  }

  private async animateStep(target: 1 | 2) {
    if (target === 2) {
      // Phase 1: fade out step 1 (step 2 not yet in DOM)
      this.exitingStep1 = true;
      this.cdr.detectChanges();
      await new Promise(r => setTimeout(r, 270));
      // Phase 2: remove step 1, add step 2 (CSS animation handles fade-in)
      this.exitingStep1 = false;
      this.currentStep = 2;
      this.cdr.detectChanges();
    }
  }

  async submitKyc() {
    if (!this.step2Valid) return;

    this.isLoading = true;

    const s1 = this.step1Form.value;
    const s2 = this.step2Form.value;

    const request: CreateAlpacaAccountRequest = {
      emailAddress: s1.emailAddress!,
      phoneNumber: this.normalizePhone(s1.phoneNumber!),
      streetAddress: s1.streetAddress!,
      city: s1.city!,
      state: s1.state!,
      postalCode: s1.postalCode!.slice(0, 5),
      givenName: s1.givenName!,
      familyName: s1.familyName!,
      dateOfBirth: (() => { const [mm, dd, yyyy] = s1.dateOfBirth!.split('/'); return `${yyyy}-${mm}-${dd}`; })(),
      taxId: s1.taxId!,
      taxIdType: 'USA_SSN',
      countryOfTaxResidence: 'USA',
      fundingSource: [s1.fundingSource!],
      isControlPerson: s2.isControlPerson ?? false,
      isAffiliatedExchangeOrFinra: s2.isAffiliatedExchangeOrFinra ?? false,
      isPoliticallyExposed: s2.isPoliticallyExposed ?? false,
      immediateFamilyExposed: s2.immediateFamilyExposed ?? false
    };

    this.alpacaService.createAlpacaAccount(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.clearStep1Draft();
          this.isLoading = false;
          this.authService.completeStep('kycVerification').subscribe({
            next: () => this.navCtrl.navigateForward('/link-bank', { replaceUrl: true }),
            error: () => this.navCtrl.navigateForward('/link-bank', { replaceUrl: true })
          });
        },
        error: async (err) => {
          this.isLoading = false;
          const msg = err.error?.message || err.message || 'Account creation failed. Please try again.';
          const toast = await this.toastController.create({
            message: msg,
            duration: 4000,
            color: 'danger',
            position: 'bottom'
          });
          await toast.present();
        }
      });
  }

  private normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return raw;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.keyboardShowListener?.then((h: any) => h.remove());
    this.keyboardHideListener?.then((h: any) => h.remove());
  }
}
