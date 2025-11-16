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
    private beneficiaryService: BeneficiaryService
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

      if (this.editMode && this.beneficiaryId) {
        // Update existing beneficiary
        await this.beneficiaryService.updateBeneficiary(this.beneficiaryId, this.beneficiary as Beneficiary).toPromise();
        this.displayToast('Beneficiary updated successfully', 'success');
      } else {
        // Create new beneficiary
        await this.beneficiaryService.createBeneficiary(this.beneficiary as Beneficiary).toPromise();
        this.displayToast('Beneficiary added successfully', 'success');
      }

      // Navigate back to beneficiaries page
      setTimeout(() => {
        this.router.navigate(['/beneficiaries']);
      }, 1500);

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
