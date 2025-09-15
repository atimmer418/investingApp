import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonSpinner, IonCheckbox, IonItem, IonLabel, IonNote, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItemDivider,
  ToastController
} from '@ionic/angular/standalone';

import { PlaidDataService } from '../../services/plaid-data.service';
import { AuthService } from '../../services/auth.service';

// Interface for income source data from Plaid
interface IncomeSource {
  employer_name: string;
  pay_frequency: string;
  last_amount: number;
  last_date: string;
  account_id: string;
  income_description: string;
  confidence: string;
  selected?: boolean;
}

interface BankIncomeResponse {
  bank_income: {
    income_sources: IncomeSource[];
    days_requested: number;
    total_amount: number;
  }[];
}

@Component({
  selector: 'app-income-selection',
  templateUrl: './income-selection.component.html',
  styleUrls: ['./income-selection.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonSpinner, IonCheckbox, IonItem, IonLabel, IonNote, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItemDivider,
  ]
})
export class IncomeSelectionComponent implements OnInit {
  isLoading: boolean = true;
  loadingMessage: string = 'Analyzing your income sources...';
  errorMessage: string | null = null;
  
  incomeSources: IncomeSource[] = [];
  selectedIncomeSources: Set<string> = new Set();
  
  retryAttempts: number = 0;
  maxRetryAttempts: number = 10;
  retryInterval: number = 3000; // 3 seconds

  constructor(
    private router: Router,
    private plaidDataService: PlaidDataService,
    private authService: AuthService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadIncomeData();
  }

  private async loadIncomeData() {
    this.isLoading = true;
    this.errorMessage = null;
    
    try {
      const response = await this.plaidDataService.getBankIncome().toPromise();
      this.processIncomeData(response);
      this.isLoading = false;
    } catch (error: any) {
      console.log('Income data load attempt', this.retryAttempts + 1, 'failed:', error);
      
      // Check if it's a 500 error (income still processing)
      if (error?.status === 500 && this.retryAttempts < this.maxRetryAttempts) {
        this.retryAttempts++;
        this.updateLoadingMessage();
        
        setTimeout(() => {
          this.loadIncomeData();
        }, this.retryInterval);
      } else {
        this.isLoading = false;
        this.errorMessage = this.retryAttempts >= this.maxRetryAttempts 
          ? 'Income analysis is taking longer than expected. Please try again later or contact support.'
          : 'Failed to load income data. Please try again.';
      }
    }
  }

  private updateLoadingMessage() {
    const messages = [
      'Analyzing your income sources...',
      'Reviewing your transaction history...',
      'Identifying recurring deposits...',
      'Calculating income patterns...',
      'Almost ready...'
    ];
    
    const messageIndex = Math.min(this.retryAttempts - 1, messages.length - 1);
    this.loadingMessage = messages[messageIndex];
  }

  private processIncomeData(response: BankIncomeResponse) {
    this.incomeSources = [];
    
    if (response?.bank_income?.length > 0) {
      response.bank_income.forEach(bankIncome => {
        if (bankIncome.income_sources?.length > 0) {
          bankIncome.income_sources.forEach(source => {
            this.incomeSources.push({
              ...source,
              selected: false
            });
          });
        }
      });
    }

    // Sort by confidence and amount
    this.incomeSources.sort((a, b) => {
      if (a.confidence === 'HIGH' && b.confidence !== 'HIGH') return -1;
      if (b.confidence === 'HIGH' && a.confidence !== 'HIGH') return 1;
      return b.last_amount - a.last_amount;
    });

    console.log('Processed income sources:', this.incomeSources);
  }

  toggleIncomeSource(source: IncomeSource) {
    source.selected = !source.selected;
    
    if (source.selected) {
      this.selectedIncomeSources.add(source.account_id);
    } else {
      this.selectedIncomeSources.delete(source.account_id);
    }
  }

  getConfidenceColor(confidence: string): string {
    switch (confidence) {
      case 'HIGH': return 'success';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'medium';
      default: return 'medium';
    }
  }

  getFrequencyDisplay(frequency: string): string {
    switch (frequency?.toUpperCase()) {
      case 'WEEKLY': return 'Weekly';
      case 'BIWEEKLY': return 'Bi-weekly';
      case 'MONTHLY': return 'Monthly';
      case 'SEMI_MONTHLY': return 'Twice monthly';
      default: return frequency || 'Unknown';
    }
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  async continueToInvestmentSetup() {
    if (this.selectedIncomeSources.size === 0) {
      const toast = await this.toastController.create({
        message: 'Please select at least one income source to continue.',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Store selected income sources in a service or pass via navigation
    const selectedSources = this.incomeSources.filter(source => source.selected);
    
    // For now, navigate to the survey component with the selected income data
    // You might want to store this in a service or pass as navigation extras
    console.log('Selected income sources for investment setup:', selectedSources);
    
    // Navigate to investment configuration/survey
    this.router.navigate(['/survey'], {
      state: { selectedIncomeSources: selectedSources }
    });
  }

  skipForNow() {
    // Allow user to skip and set up manually later
    this.router.navigate(['/survey']);
  }

  retry() {
    this.retryAttempts = 0;
    this.loadIncomeData();
  }

  trackByAccountId(index: number, item: IncomeSource): string {
    return item.account_id || index.toString();
  }
}