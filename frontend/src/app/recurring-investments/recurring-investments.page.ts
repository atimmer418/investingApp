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
import { InvestmentService, InvestmentSchedule, CreateInvestmentScheduleRequest } from '../services/investment.service';

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
  readonly todayISO = new Date().toISOString();

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

  getFrequencyText(): string {
    if (!this.currentInvestment) return 'period';
    
    switch (this.currentInvestment.frequency) {
      case 'WEEKLY':
        return 'week';
      case 'BIWEEKLY':
        return 'two weeks';
      case 'MONTHLY':
        return 'month';
      case 'SEMI_MONTHLY':
        return '1st and 15th of the month';
      default:
        return 'period';
    }
  }

  getEditedFrequencyText(): string {
    if (!this.editedInvestment?.frequency) return 'period';
    
    switch (this.editedInvestment.frequency) {
      case 'WEEKLY':
        return 'week';
      case 'BIWEEKLY':
        return 'two weeks';
      case 'MONTHLY':
        return 'month';
      case 'SEMI_MONTHLY':
        return '1st and 15th of the month';
      default:
        return 'period';
    }
  }

  getFrequencyDescription(): string {
    if (!this.currentInvestment) return '';
    
    const option = this.frequencyOptions.find(opt => opt.value === this.currentInvestment?.frequency);
    const baseDescription = option?.description || '';
    
    // Add specific day information based on frequency and start date
    // Use nextInvestmentDate if available, otherwise startDate
    const dateInput = this.currentInvestment.nextInvestmentDate || this.currentInvestment.startDate;
    
    if (dateInput) {
      let date: Date;
      
      // Handle array format from Java LocalDate serialization [year, month, day]
      if (Array.isArray(dateInput) && dateInput.length === 3) {
        const [year, month, day] = dateInput;
        // Construct UTC date at noon
        date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      } else if (typeof dateInput === 'string') {
        // Parse string manually to avoid UTC conversion issues
        // If it contains 'T', split by 'T' first to get the date part
        const datePart = dateInput.includes('T') ? 
          dateInput.split('T')[0] : 
          dateInput;
          
        const parts = datePart.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          // Construct UTC date at noon
          date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        } else {
          date = new Date(dateInput);
        }
      } else {
        return baseDescription;
      }
      
      if (isNaN(date.getTime())) {
        return baseDescription;
      }
      
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      const dayOfMonth = date.getUTCDate();
      
      switch (this.currentInvestment.frequency) {
        case 'WEEKLY':
          return `Every ${dayOfWeek}`;
        case 'BIWEEKLY':
          return `Every other ${dayOfWeek}`;
        case 'MONTHLY':
          const ordinal = this.getOrdinal(dayOfMonth);
          return `Every ${ordinal}`;
        case 'SEMI_MONTHLY':
          return 'Each 1st and 15th';
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
        // Construct UTC date at noon
        date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      } else if (typeof dateInput === 'string') {
        // Parse string manually to avoid UTC conversion issues
        // If it contains 'T', split by 'T' first to get the date part
        const datePart = dateInput.includes('T') ? dateInput.split('T')[0] : dateInput;
        const parts = datePart.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          // Construct UTC date at noon
          date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        } else {
          date = new Date(dateInput);
        }
      } else {
        return '';
      }
      
      if (isNaN(date.getTime())) {
        return '';
      }
      
      // Return ISO string for the picker (which expects YYYY-MM-DD or full ISO)
      // Use UTC methods to get the date parts we constructed
      const year = date.getUTCFullYear();
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = date.getUTCDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
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
    return Math.floor(this.getAnnualProjection() / 12);
  }

  getAnnualProjection(): number {
    if (!this.currentInvestment) return 0;
    const amount = this.currentInvestment.investmentAmount;
    
    switch (this.currentInvestment.frequency) {
      case 'WEEKLY':
        return amount * 52;
      case 'BIWEEKLY':
        return amount * 26;
      case 'SEMI_MONTHLY':
        return amount * 24;
      case 'MONTHLY':
        return amount * 12;
      default:
        return 0;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateInput: string | number[], includeYear: boolean = true): string {
    if (!dateInput) return 'Not set';
    
    try {
      let date: Date;
      
      // Handle array format from Java LocalDate serialization [year, month, day]
      if (Array.isArray(dateInput) && dateInput.length === 3) {
        const [year, month, day] = dateInput;
        // Construct UTC date at noon to avoid timezone issues
        date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      } else if (typeof dateInput === 'string') {
        // Handle string format - parse manually to avoid UTC issues
        // If it contains 'T', split by 'T' first to get the date part
        const datePart = dateInput.includes('T') ? dateInput.split('T')[0] : dateInput;
        const parts = datePart.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          // Construct UTC date at noon
          date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        } else {
          date = new Date(dateInput);
        }
      } else {
        console.error('Unexpected date format:', dateInput);
        return 'Invalid date format';
      }
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      };

      if (includeYear) {
        options.year = 'numeric';
      }
      
      return new Intl.DateTimeFormat('en-US', options).format(date);
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
    
    // Determine what start date to use - ALWAYS use existing start date to preserve history
    let startDateString: string;
    if (Array.isArray(this.currentInvestment.startDate)) {
      const [year, month, day] = this.currentInvestment.startDate;
      startDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } else {
      startDateString = this.currentInvestment.startDate;
    }
    
    // Determine next investment date
    let nextInvestmentDateString: string | undefined;
    
    // Use the edited next investment date (which defaults to current if not changed)
    if (this.editedInvestment.nextInvestmentDate) {
      let dateToAdjust: Date;

      if (typeof this.editedInvestment.nextInvestmentDate === 'string') {
        // Handle ISO string or YYYY-MM-DD
        const datePart = this.editedInvestment.nextInvestmentDate.includes('T') ? 
          this.editedInvestment.nextInvestmentDate.split('T')[0] : 
          this.editedInvestment.nextInvestmentDate;
        
        const parts = datePart.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        dateToAdjust = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      } else if (Array.isArray(this.editedInvestment.nextInvestmentDate)) {
        const [year, month, day] = this.editedInvestment.nextInvestmentDate;
        dateToAdjust = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      } else {
        // Fallback if type is unknown, though it should be string or array
        dateToAdjust = new Date();
      }

      const year = dateToAdjust.getUTCFullYear();
      const month = (dateToAdjust.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = dateToAdjust.getUTCDate().toString().padStart(2, '0');
      nextInvestmentDateString = `${year}-${month}-${day}`;
    }
    
    // Create update request
    const updateRequest: CreateInvestmentScheduleRequest = {
      investmentAmount: this.editedInvestment.investmentAmount!,
      frequency: this.editedInvestment.frequency || this.currentInvestment.frequency,
      startDate: startDateString,
      nextInvestmentDate: nextInvestmentDateString
    };

    this.investmentService.createSchedule(updateRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedSchedule: InvestmentSchedule) => {
          this.toastMessage = 'Investment schedule updated successfully!';
          this.showSuccessToast = true;
          this.loadCurrentInvestment();
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
