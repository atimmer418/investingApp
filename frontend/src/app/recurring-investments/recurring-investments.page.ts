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
  IonBackButton
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
    IonBackButton
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
    isPaused: false
  };
  
  showSuccessToast = false;
  showErrorToast = false;
  toastMessage = '';
  isLoading = false;

  frequencyOptions: InvestmentFrequencyOption[] = [
    {
      value: 'WEEKLY',
      label: 'Weekly',
      description: 'Every week on the same day',
      paychecksPerMonth: 4.33
    },
    {
      value: 'BIWEEKLY',
      label: 'Bi-weekly',
      description: 'Every two weeks (26 times per year)',
      paychecksPerMonth: 2.17
    },
    {
      value: 'SEMI_MONTHLY',
      label: 'Semi-monthly',
      description: '15th and last day of each month',
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
              isPaused: investment.isPaused
            };
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading investment schedule:', error);
          this.toastMessage = 'Failed to load investment schedule';
          this.showErrorToast = true;
          this.isLoading = false;
        }
      });
  }

  getFrequencyLabel(): string {
    const option = this.frequencyOptions.find(opt => opt.value === this.currentInvestment?.frequency);
    return option?.label || 'Not set';
  }

  getFrequencyDescription(): string {
    const option = this.frequencyOptions.find(opt => opt.value === this.currentInvestment?.frequency);
    return option?.description || '';
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

  formatDate(date: Date): string {
    if (!date) return 'Not set';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
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
    
    // Create update request
    const updateRequest = {
      investmentAmount: this.editedInvestment.investmentAmount!,
      frequency: this.editedInvestment.frequency || this.currentInvestment.frequency,
      startDate: this.currentInvestment.startDate
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
