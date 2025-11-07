import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonButtons,
  IonBackButton,
  IonDatetime,
  IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  pauseOutline,
  playOutline,
  calendarOutline,
  cashOutline,
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  settingsOutline,
  informationCircleOutline, addOutline } from 'ionicons/icons';
import { InvestmentService, InvestmentSchedule } from '../services/investment.service';

interface InvestmentFrequencyOption {
  value: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'SEMI_MONTHLY';
  label: string;
  description: string;
  paychecksPerMonth: number;
}

@Component({
  selector: 'app-recurring-investments',
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
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToast,
    IonButtons,
    IonBackButton,
    IonDatetime,
    IonModal
  ],
  templateUrl: './recurring-investments.page.html',
  styleUrls: ['./recurring-investments.page.scss']
})
export class RecurringInvestmentsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentInvestment: InvestmentSchedule | null = null;
  editedInvestment: Partial<InvestmentSchedule> = {
    investmentAmount: 0,
    frequency: 'WEEKLY',
    isPaused: false,
    nextInvestmentDate: undefined
  };
  
  showSuccessToast = false;
  showErrorToast = false;
  toastMessage = '';
  isLoading = false;
  isDatePickerOpen = false;
  
  // Helper property for date picker minimum date
  get todayISO(): string {
    return new Date().toISOString();
  }

  frequencyOptions: InvestmentFrequencyOption[] = [
    {
      value: 'WEEKLY',
      label: 'Weekly',
      description: 'Every week on the same day of the week',
      paychecksPerMonth: 4.33
    },
    {
      value: 'BIWEEKLY',
      label: 'Bi-weekly',
      description: 'Every two weeks on the same day',
      paychecksPerMonth: 2.17
    },
    {
      value: 'SEMI_MONTHLY',
      label: 'Semi-monthly',
      description: 'On the 1st and 15th of each month',
      paychecksPerMonth: 2
    },
    {
      value: 'MONTHLY',
      label: 'Monthly',
      description: 'Once per month on the same date',
      paychecksPerMonth: 1
    }
  ];

  constructor(
    private router: Router,
    private investmentService: InvestmentService
  ) {
    addIcons({cashOutline,timeOutline,calendarOutline,addOutline,checkmarkCircleOutline,pauseOutline,playOutline,alertCircleOutline,settingsOutline,informationCircleOutline});
  }

  ngOnInit() {
    this.loadCurrentInvestment();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentInvestment() {
    this.isLoading = true;
    this.investmentService.getCurrentSchedule()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (investment: InvestmentSchedule) => {
          this.currentInvestment = investment;
          if (investment) {
            this.editedInvestment = { 
              investmentAmount: investment.investmentAmount,
              frequency: investment.frequency,
              isPaused: investment.isPaused,
              nextInvestmentDate: investment.nextInvestmentDate
            };
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading investment schedule:', error);
          if (error.status === 404) {
            console.log('No investment schedule found - user probably hasn\'t set one up yet');
            this.currentInvestment = null;
          } else {
            this.toastMessage = 'Failed to load investment schedule';
            this.showErrorToast = true;
          }
          this.isLoading = false;
        }
      });
  }

  getFrequencyLabel(): string {
    const option = this.frequencyOptions.find(opt => opt.value === this.currentInvestment?.frequency);
    return option?.label || 'Not set';
  }

  getFrequencyDescription(): string {
    if (!this.currentInvestment) return '';
    
    const option = this.frequencyOptions.find(opt => opt.value === this.currentInvestment?.frequency);
    const baseDescription = option?.description || '';
    
    // Add specific day information based on frequency and start date
    if (this.currentInvestment.startDate) {
      let startDate: Date;
      
      // Handle array format from Java LocalDate serialization [year, month, day]
      if (Array.isArray(this.currentInvestment.startDate) && this.currentInvestment.startDate.length === 3) {
        const [year, month, day] = this.currentInvestment.startDate;
        startDate = new Date(year, month - 1, day); // month - 1 because JS months are 0-based
      } else if (typeof this.currentInvestment.startDate === 'string') {
        startDate = new Date(this.currentInvestment.startDate);
      } else {
        return baseDescription;
      }
      
      if (isNaN(startDate.getTime())) {
        return baseDescription;
      }
      
      const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' });
      const dayOfMonth = startDate.getDate();
      
      switch (this.currentInvestment.frequency) {
        case 'WEEKLY':
          return `Every ${dayOfWeek}`;
        case 'BIWEEKLY':
          return `Every other ${dayOfWeek}`;
        case 'MONTHLY':
          const ordinal = this.getOrdinal(dayOfMonth);
          return `${ordinal} of each month`;
        case 'SEMI_MONTHLY':
          return 'On the 1st and 15th of each month';
        default:
          return baseDescription;
      }
    }
    
    return baseDescription;
  }

  private getOrdinal(day: number): string {
    const j = day % 10;
    const k = day % 100;
    if (j === 1 && k !== 11) {
      return day + 'st';
    }
    if (j === 2 && k !== 12) {
      return day + 'nd';
    }
    if (j === 3 && k !== 13) {
      return day + 'rd';
    }
    return day + 'th';
  }

  /**
   * Convert date to ISO string for datetime picker
   */
  getDateForPicker(dateInput: string | number[] | undefined): string {
    if (!dateInput) return '';
    
    try {
      let date: Date;
      
      if (Array.isArray(dateInput) && dateInput.length === 3) {
        const [year, month, day] = dateInput;
        date = new Date(year, month - 1, day);
      } else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else {
        return '';
      }
      
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return date.toISOString();
    } catch (error) {
      console.error('Error converting date for picker:', error);
      return '';
    }
  }

  /**
   * Handle date selection from picker
   */
  onNextInvestmentDateChange(event: any) {
    const selectedDate = event.detail.value;
    if (selectedDate) {
      // Store as ISO string in editedInvestment
      this.editedInvestment.nextInvestmentDate = selectedDate;
    }
  }

  /**
   * Open date picker modal
   */
  openDatePicker() {
    this.isDatePickerOpen = true;
  }

  /**
   * Close date picker modal
   */
  closeDatePicker() {
    this.isDatePickerOpen = false;
  }

  getMonthlyProjection(): number {
    if (!this.currentInvestment) return 0;
    const option = this.frequencyOptions.find(opt => opt.value === this.currentInvestment?.frequency);
    return this.currentInvestment.investmentAmount * (option?.paychecksPerMonth || 1);
  }

  getAnnualProjection(): number {
    return this.getMonthlyProjection() * 12;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateInput: string | number[]): string {
    if (!dateInput) return 'Not set';
    
    try {
      let date: Date;
      
      // Handle array format from Java LocalDate serialization [year, month, day]
      if (Array.isArray(dateInput) && dateInput.length === 3) {
        const [year, month, day] = dateInput;
        // Note: JavaScript Date constructor expects month to be 0-based, but Java sends 1-based
        date = new Date(year, month - 1, day);
      } else if (typeof dateInput === 'string') {
        // Handle string format
        date = new Date(dateInput);
      } else {
        console.error('Unexpected date format:', dateInput);
        return 'Invalid date format';
      }
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  }

  onAmountChange() {
    // Ensure minimum amount
    if (this.editedInvestment.investmentAmount && this.editedInvestment.investmentAmount < 1) {
      this.editedInvestment.investmentAmount = 1;
    }
  }

  toggleInvestmentStatus() {
    if (!this.currentInvestment) return;

    const newStatus = !this.currentInvestment.isPaused;
    
    this.isLoading = true;
    
    const operation = newStatus ? 
      this.investmentService.pauseSchedule(this.currentInvestment.id) :
      this.investmentService.resumeSchedule(this.currentInvestment.id);
    
    operation.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedSchedule: InvestmentSchedule) => {
          this.currentInvestment = updatedSchedule;
          this.toastMessage = newStatus ? 
            'Investment schedule paused successfully!' : 
            'Investment schedule resumed successfully!';
          this.showSuccessToast = true;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error updating investment status:', error);
          this.toastMessage = 'Failed to update investment schedule. Please try again.';
          this.showErrorToast = true;
          this.isLoading = false;
        }
      });
  }

  saveChanges() {
    if (!this.editedInvestment.investmentAmount || this.editedInvestment.investmentAmount < 1) {
      this.toastMessage = 'Investment amount must be at least $1';
      this.showErrorToast = true;
      return;
    }

    if (!this.currentInvestment) return;

    this.isLoading = true;
    
    // Determine what start date to use
    let startDateString: string;
    
    // If user changed the next investment date, use that as the new start date
    if (this.editedInvestment.nextInvestmentDate && 
        this.editedInvestment.nextInvestmentDate !== this.currentInvestment.nextInvestmentDate) {
      // Convert the selected next investment date to start date format
      if (typeof this.editedInvestment.nextInvestmentDate === 'string') {
        const nextDate = new Date(this.editedInvestment.nextInvestmentDate);
        startDateString = nextDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      } else if (Array.isArray(this.editedInvestment.nextInvestmentDate)) {
        const [year, month, day] = this.editedInvestment.nextInvestmentDate;
        startDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      } else {
        // Fallback to existing start date
        if (Array.isArray(this.currentInvestment.startDate)) {
          const [year, month, day] = this.currentInvestment.startDate;
          startDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        } else {
          startDateString = this.currentInvestment.startDate;
        }
      }
    } else {
      // No date change - use the existing start date
      if (Array.isArray(this.currentInvestment.startDate)) {
        const [year, month, day] = this.currentInvestment.startDate;
        startDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      } else {
        startDateString = this.currentInvestment.startDate;
      }
    }
    
    // Create update request
    const updateRequest = {
      investmentAmount: this.editedInvestment.investmentAmount!,
      frequency: this.editedInvestment.frequency || this.currentInvestment.frequency,
      startDate: startDateString
    };

    this.investmentService.createSchedule(updateRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedSchedule: InvestmentSchedule) => {
          this.currentInvestment = updatedSchedule;
          this.toastMessage = 'Investment schedule updated successfully!';
          this.showSuccessToast = true;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error updating investment:', error);
          this.toastMessage = 'Failed to update investment schedule. Please try again.';
          this.showErrorToast = true;
          this.isLoading = false;
        }
      });
  }

  goBack() {
    this.router.navigate(['/tabs/tab3']);
  }

  deleteInvestmentSchedule() {
    // TODO: Implement delete functionality with confirmation dialog
    console.log('Delete investment schedule');
  }
}
