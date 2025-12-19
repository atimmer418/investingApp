import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonToast,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  saveOutline,
  personOutline,
  calendarOutline,
  mailOutline,
  phonePortraitOutline,
  locationOutline
} from 'ionicons/icons';
import { BeneficiaryService, Beneficiary } from '../services/beneficiary.service';
import { PasskeyService } from '../services/passkey.service';

@Component({
  selector: 'app-add-beneficiary',
  templateUrl: './add-beneficiary.page.html',
  styleUrls: ['./add-beneficiary.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon,
    IonButtons, IonBackButton, IonToast, IonItem, IonLabel,
    IonInput, IonSelect, IonSelectOption
  ]
})
export class AddBeneficiaryPage implements OnInit {
  
  public beneficiary: Partial<Beneficiary> = {
    beneficiaryType: 'PRIMARY',
    percentageAllocation: 0,
    country: 'US'
  };
  
  public isLoading = false;
  public isToastOpen = false;
  public toastMessage = '';
  public toastColor = 'primary';
  public editMode = false;
  public beneficiaryId?: number;

  public relationshipOptions = [
    { value: 'SPOUSE', label: 'Spouse' },
    { value: 'CHILD', label: 'Child' },
    { value: 'PARENT', label: 'Parent' },
    { value: 'SIBLING', label: 'Sibling' },
    { value: 'GRANDCHILD', label: 'Grandchild' },
    { value: 'GRANDPARENT', label: 'Grandparent' },
    { value: 'AUNT_UNCLE', label: 'Aunt/Uncle' },
    { value: 'NIECE_NEPHEW', label: 'Niece/Nephew' },
    { value: 'COUSIN', label: 'Cousin' },
    { value: 'FRIEND', label: 'Friend' },
    { value: 'DOMESTIC_PARTNER', label: 'Domestic Partner' },
    { value: 'TRUST', label: 'Trust' },
    { value: 'ESTATE', label: 'Estate' },
    { value: 'CHARITY', label: 'Charity/Organization' },
    { value: 'OTHER', label: 'Other' }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private beneficiaryService: BeneficiaryService,
    private passkeyService: PasskeyService
  ) {
    addIcons({
      arrowBackOutline,
      saveOutline,
      personOutline,
      calendarOutline,
      mailOutline,
      phonePortraitOutline,
      locationOutline
    });
  }

  ngOnInit() {
    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.editMode = true;
        this.beneficiaryId = parseInt(params['id']);
        this.loadBeneficiaryForEdit();
      }
    });

    // Set default beneficiary type based on route
    const beneficiaryType = this.route.snapshot.queryParams['type'];
    if (beneficiaryType === 'contingent') {
      this.beneficiary.beneficiaryType = 'CONTINGENT';
    }
  }

  private async loadBeneficiaryForEdit() {
    if (!this.beneficiaryId) return;

    try {
      this.isLoading = true;
      // Note: You might need to add a getBeneficiary(id) method to the service
      // For now, we'll load all beneficiaries and find the one we need
      const beneficiaries = await this.beneficiaryService.getBeneficiaries().toPromise();
      const beneficiary = beneficiaries?.find(b => b.id === this.beneficiaryId);
      
      if (beneficiary) {
        this.beneficiary = { ...beneficiary };
        // Fix date parsing - convert date strings to proper format for the input
        if (this.beneficiary.dateOfBirth) {
          this.beneficiary.dateOfBirth = this.parseBackendDate(this.beneficiary.dateOfBirth);
        }
      } else {
        this.displayToast('Beneficiary not found', 'danger');
        this.router.navigate(['/beneficiaries']);
      }
    } catch (error) {
      console.error('Error loading beneficiary for edit:', error);
      this.displayToast('Failed to load beneficiary data', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async onSave() {
    if (!this.validateForm()) return;

    try {
      this.isLoading = true;

      // Step-up authentication check
      const sensitiveAuthEnabled = localStorage.getItem('sensitive_auth_enabled') !== 'false';

      if (sensitiveAuthEnabled) {
        try {
          const startResponse = await this.passkeyService.startAuthentication().toPromise();
          if (!startResponse || !startResponse.requestOptions) {
            throw new Error('Failed to start authentication');
          }

          let options = JSON.parse(startResponse.requestOptions);
          
          // Handle potential nesting (some libraries wrap it in publicKey)
          if (options.publicKey) {
            options = options.publicKey;
          }
          
          // Convert challenge from base64url to ArrayBuffer
          if (options.challenge) {
            options.challenge = this.passkeyService.base64urlToArrayBuffer(options.challenge);
          } else {
            throw new Error('Missing challenge in WebAuthn options');
          }
          
          // Convert allowCredentials ids if present
          if (options.allowCredentials) {
            options.allowCredentials = options.allowCredentials.map((c: any) => {
              c.id = this.passkeyService.base64urlToArrayBuffer(c.id);
              return c;
            });
          }

          const credential = await navigator.credentials.get({
            publicKey: options
          });

          const credentialJson = this.passkeyService.credentialToJson(credential);
          const authResult = await this.passkeyService.finishAuthentication(credentialJson, startResponse.sessionId).toPromise();
          
          if (!authResult || !authResult.success) {
            throw new Error('Authentication failed');
          }
        } catch (authError) {
          console.error('Authentication error:', authError);
          this.displayToast('Authentication required to save beneficiary.', 'warning');
          this.isLoading = false;
          return;
        }
      }

      // Clean the beneficiary data to only include fields that should be sent to the server
      const cleanBeneficiary: Beneficiary = {
        beneficiaryType: this.beneficiary.beneficiaryType!,
        firstName: this.beneficiary.firstName!,
        lastName: this.beneficiary.lastName!,
        email: this.beneficiary.email,
        phone: this.beneficiary.phone,
        dateOfBirth: this.formatDateForBackend(this.beneficiary.dateOfBirth),
        socialSecurityNumber: this.beneficiary.socialSecurityNumber,
        addressLine1: this.beneficiary.addressLine1,
        addressLine2: this.beneficiary.addressLine2,
        city: this.beneficiary.city,
        state: this.beneficiary.state,
        postalCode: this.beneficiary.postalCode,
        country: this.beneficiary.country,
        relationship: this.beneficiary.relationship!,
        percentageAllocation: this.beneficiary.percentageAllocation!,
        status: this.beneficiary.status!,
        notes: this.beneficiary.notes
      };

      // Include ID for updates
      if (this.editMode && this.beneficiaryId) {
        cleanBeneficiary.id = this.beneficiaryId;
      }

      if (this.editMode && this.beneficiaryId) {
        // Update existing beneficiary
        await this.beneficiaryService.updateBeneficiary(this.beneficiaryId, cleanBeneficiary).toPromise();
        this.displayToast('Beneficiary updated successfully', 'success');
      } else {
        // Create new beneficiary
        await this.beneficiaryService.createBeneficiary(cleanBeneficiary).toPromise();
        this.displayToast('Beneficiary added successfully', 'success');
      }

      // Navigate back to beneficiaries page immediately
      // The beneficiaries page will auto-refresh when we navigate back
      this.router.navigate(['/beneficiaries']);

    } catch (error) {
      console.error('Error saving beneficiary:', error);
      this.displayToast('Failed to save beneficiary. Please try again.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  private validateForm(): boolean {
    // Check required fields
    if (!this.beneficiary.firstName?.trim()) {
      this.displayToast('First name is required', 'danger');
      return false;
    }

    if (!this.beneficiary.lastName?.trim()) {
      this.displayToast('Last name is required', 'danger');
      return false;
    }

    if (!this.beneficiary.dateOfBirth) {
      this.displayToast('Date of birth is required', 'danger');
      return false;
    }

    if (!this.beneficiary.socialSecurityNumber?.trim()) {
      this.displayToast('Social Security Number is required', 'danger');
      return false;
    }

    if (!this.beneficiary.relationship) {
      this.displayToast('Relationship is required', 'danger');
      return false;
    }

    if (!this.beneficiary.percentageAllocation || this.beneficiary.percentageAllocation <= 0) {
      this.displayToast('Allocation percentage must be greater than 0', 'danger');
      return false;
    }

    if (this.beneficiary.percentageAllocation > 100) {
      this.displayToast('Allocation percentage cannot exceed 100%', 'danger');
      return false;
    }

    // Validate SSN format
    const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
    if (this.beneficiary.socialSecurityNumber && !ssnRegex.test(this.beneficiary.socialSecurityNumber)) {
      this.displayToast('Social Security Number must be in format XXX-XX-XXXX', 'danger');
      return false;
    }

    // Validate email if provided
    if (this.beneficiary.email && this.beneficiary.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.beneficiary.email)) {
        this.displayToast('Please enter a valid email address', 'danger');
        return false;
      }
    }

    return true;
  }

  onCancel() {
    this.router.navigate(['/beneficiaries']);
  }

  /**
   * Parse date from backend - handles both string formats and arrays
   */
  private parseBackendDate(date: any): string {
    if (!date) return '';
    
    // If it's already a string in YYYY-MM-DD format, return as is
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    
    // If it's an array (e.g., [2025, 11, 16]), convert to YYYY-MM-DD
    if (Array.isArray(date) && date.length >= 3) {
      const year = date[0];
      const month = date[1].toString().padStart(2, '0');
      const day = date[2].toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If it's a comma-separated string like "2025,11,16,22,22,13,637928000"
    if (typeof date === 'string' && date.includes(',')) {
      const parts = date.split(',');
      if (parts.length >= 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    // Try to parse as a Date object
    try {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    } catch (e) {
      console.warn('Could not parse date:', date);
    }
    
    return '';
  }

  /**
   * Format date for backend submission
   * Ensures the date is in YYYY-MM-DD format
   */
  private formatDateForBackend(dateValue: any): string | undefined {
    if (!dateValue) return undefined;
    
    // If it's already a string in YYYY-MM-DD format, return as is
    if (typeof dateValue === 'string') {
      // Check if it's already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      
      // Try to parse and reformat if it's in a different string format
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    }
    
    // If it's a Date object, format it
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    
    return undefined;
  }

  formatSSN(event: any) {
    let value = event.detail.value.replace(/\D/g, '');
    if (value.length >= 6) {
      value = value.replace(/(\d{3})(\d{2})(\d{0,4})/, '$1-$2-$3');
    } else if (value.length >= 4) {
      value = value.replace(/(\d{3})(\d{0,2})/, '$1-$2');
    }
    this.beneficiary.socialSecurityNumber = value;
  }

  formatPhone(event: any) {
    let value = event.detail.value.replace(/\D/g, '');
    if (value.length >= 7) {
      value = value.replace(/(\d{3})(\d{3})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length >= 4) {
      value = value.replace(/(\d{3})(\d{0,3})/, '($1) $2');
    }
    this.beneficiary.phone = value;
  }

  private displayToast(message: string, color: string = 'primary') {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
  }
}
