import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  IonBadge,
  IonProgressBar,
  IonButtons,
  IonBackButton,
  IonToast,
  IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  peopleOutline,
  addOutline,
  personOutline,
  pricetagOutline, // Using pricetagOutline instead of percentageOutline
  informationCircleOutline,
  checkmarkCircleOutline,
  timeOutline,
  closeCircleOutline,
  arrowBackOutline, 
  shieldCheckmarkOutline, 
  pieChartOutline, 
  personAddOutline, 
  calendarOutline, 
  mailOutline, 
  shieldOutline,
  alertCircleOutline,
  peopleCircleOutline, checkmarkOutline } from 'ionicons/icons';
import { BeneficiaryService, Beneficiary, BeneficiaryAllocationSummary } from '../services/beneficiary.service';

@Component({
  selector: 'app-beneficiaries',
  templateUrl: './beneficiaries.page.html',
  styleUrls: ['./beneficiaries.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, 
    IonBadge, IonProgressBar, IonButtons, IonBackButton, IonToast, IonNote
  ]
})
export class BeneficiariesPage implements OnInit {
  
  public beneficiaries: Beneficiary[] = [];
  public allocationSummary: BeneficiaryAllocationSummary | null = null;
  public isLoading = true;
  public isToastOpen = false;
  public toastMessage = '';
  public toastColor = 'primary';
  
  constructor(
    private router: Router,
    private beneficiaryService: BeneficiaryService
  ) {
    addIcons({peopleOutline,informationCircleOutline,shieldCheckmarkOutline,pieChartOutline,alertCircleOutline,checkmarkOutline,personAddOutline,checkmarkCircleOutline,addOutline,calendarOutline,mailOutline,shieldOutline,personOutline,pricetagOutline,timeOutline,closeCircleOutline,arrowBackOutline,peopleCircleOutline});
  }
  
  ngOnInit() {
    this.loadBeneficiaries();
  }
  
  private async loadBeneficiaries() {
    try {
      this.isLoading = true;
      
      // Load beneficiaries and allocation summary from API
      const [beneficiariesResponse, summaryResponse] = await Promise.all([
        this.beneficiaryService.getBeneficiaries().toPromise(),
        this.beneficiaryService.getAllocationSummary().toPromise()
      ]);
      
      this.beneficiaries = beneficiariesResponse || [];
      this.allocationSummary = summaryResponse || null;
      
    } catch (error) {
      console.error('Error loading beneficiaries:', error);
      this.displayToast('Failed to load beneficiaries. Please check your connection.', 'danger');
      
      // Initialize empty data on error
      this.beneficiaries = [];
      this.allocationSummary = null;
    } finally {
      this.isLoading = false;
    }
  }
  
  onAddBeneficiary() {
    this.router.navigate(['/beneficiaries/add']);
  }
  
  onEditBeneficiary(beneficiary: Beneficiary) {
    this.router.navigate(['/beneficiaries/edit', beneficiary.id]);
  }
  
  getStatusColor(status: string): string {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'SUBMITTED': return 'primary';
      case 'REJECTED': return 'danger';
      case 'INACTIVE': return 'medium';
      default: return 'medium';
    }
  }
  
  getStatusIcon(status: string): string {
    switch (status) {
      case 'APPROVED': return 'checkmark-circle-outline';
      case 'PENDING': return 'time-outline';
      case 'SUBMITTED': return 'information-circle-outline';
      case 'REJECTED': return 'close-circle-outline';
      case 'INACTIVE': return 'close-circle-outline';
      default: return 'information-circle-outline';
    }
  }
  
  getRelationshipDisplayName(relationship: string): string {
    const relationshipMap: { [key: string]: string } = {
      'SPOUSE': 'Spouse',
      'CHILD': 'Child',
      'PARENT': 'Parent',
      'SIBLING': 'Sibling',
      'GRANDCHILD': 'Grandchild',
      'GRANDPARENT': 'Grandparent',
      'AUNT_UNCLE': 'Aunt/Uncle',
      'NIECE_NEPHEW': 'Niece/Nephew',
      'COUSIN': 'Cousin',
      'FRIEND': 'Friend',
      'DOMESTIC_PARTNER': 'Domestic Partner',
      'TRUST': 'Trust',
      'ESTATE': 'Estate',
      'CHARITY': 'Charity/Organization',
      'OTHER': 'Other'
    };
    return relationshipMap[relationship] || relationship;
  }
  
  getPrimaryBeneficiaries(): Beneficiary[] {
    return this.beneficiaries.filter(b => b.beneficiaryType === 'PRIMARY');
  }
  
  getContingentBeneficiaries(): Beneficiary[] {
    return this.beneficiaries.filter(b => b.beneficiaryType === 'CONTINGENT');
  }
  
  getPendingBeneficiaries(): Beneficiary[] {
    return this.beneficiaries.filter(b => b.status === 'PENDING');
  }
  
  getApprovedBeneficiaries(): Beneficiary[] {
    return this.beneficiaries.filter(b => b.status === 'APPROVED');
  }
  
  /**
   * Submit a specific beneficiary to Alpaca
   */
  async onSubmitBeneficiary(beneficiary: Beneficiary) {
    if (!beneficiary.id) {
      this.displayToast('Cannot submit beneficiary: Invalid ID', 'danger');
      return;
    }
    
    try {
      await this.beneficiaryService.submitBeneficiary(beneficiary.id).toPromise();
      this.displayToast(`Successfully submitted ${beneficiary.firstName} ${beneficiary.lastName} to Alpaca`, 'success');
      
      // Refresh the data to show updated status
      await this.loadBeneficiaries();
      
    } catch (error) {
      console.error('Error submitting beneficiary:', error);
      this.displayToast('Failed to submit beneficiary. Please try again.', 'danger');
    }
  }
  
  /**
   * Submit all approved beneficiaries to Alpaca
   */
  async onSubmitAllBeneficiaries() {
    try {
      await this.beneficiaryService.submitAllBeneficiaries().toPromise();
      this.displayToast('Successfully submitted all beneficiaries to Alpaca', 'success');
      
      // Refresh the data to show updated status
      await this.loadBeneficiaries();
      
    } catch (error) {
      console.error('Error submitting all beneficiaries:', error);
      this.displayToast('Failed to submit beneficiaries. Please try again.', 'danger');
    }
  }
  
  /**
   * Delete a beneficiary with confirmation
   */
  async onDeleteBeneficiary(beneficiary: Beneficiary) {
    if (!beneficiary.id) {
      this.displayToast('Cannot delete beneficiary: Invalid ID', 'danger');
      return;
    }
    
    // Simple confirmation - could be enhanced with a proper modal
    const confirmed = confirm(`Are you sure you want to delete ${beneficiary.firstName} ${beneficiary.lastName}?`);
    if (!confirmed) return;
    
    try {
      await this.beneficiaryService.deleteBeneficiary(beneficiary.id).toPromise();
      this.displayToast(`Successfully deleted ${beneficiary.firstName} ${beneficiary.lastName}`, 'success');
      
      // Refresh the data to show updated list
      await this.loadBeneficiaries();
      
    } catch (error) {
      console.error('Error deleting beneficiary:', error);
      this.displayToast('Failed to delete beneficiary. Please try again.', 'danger');
    }
  }
  
  /**
   * Refresh beneficiaries data from the server
   */
  async refreshData() {
    await this.loadBeneficiaries();
  }
  
  private displayToast(message: string, color: string = 'primary') {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
  }
}
