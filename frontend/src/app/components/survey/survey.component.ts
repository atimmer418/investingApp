// src/app/pages/survey/survey.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonProgressBar, IonIcon, IonCheckbox, IonSpinner, IonRange, IonButton, IonNote, IonLabel,
  IonInput, IonSelect, IonSelectOption, IonItem
} from '@ionic/angular/standalone';

import { PlaidDataService } from '../../services/plaid-data.service';
import { AuthService } from '../../services/auth.service';
import { PaycheckSource } from '../../models/plaid/paycheck-source.model';
import { SelectedPaycheck } from '../../models/plaid/selected-paycheck.model'; // We'll use this to store final config

// Interfaces
interface SurveyResponseChoice {
  id: string;
  text: string;
}

interface SurveyQuestion {
  id: string; // e.g., "q1", "iq1_paycheck_selection", "percentage_for_acc_id_1"
  questionText: string;
  responseChoices: SurveyResponseChoice[];
  answer: string | null; // For standard questions
  isPaycheckSelectionStep?: boolean; // Flag for the initial paycheck selection
  isPercentageQuestion?: boolean;    // Flag for a percentage question
  relatedPaycheck?: PaycheckSource;  // Link to the paycheck for percentage questions
  percentageAnswer?: number;         // Store percentage (0.0 to 1.0)
}

// Enum - simplified to only investment setup
enum SurveyType {
  InvestmentSetup = 'Investment Setup'
}

@Component({
  selector: 'app-survey',
  templateUrl: './survey.component.html',
  styleUrls: ['./survey.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
    IonProgressBar, IonIcon, IonCheckbox, IonSpinner, IonRange, IonButton, IonNote, IonLabel,
    IonInput, IonSelect, IonSelectOption, IonItem
  ]
})
export class SurveyComponent implements OnInit {
  // Only keep investment setup questions
  private investmentSetupQuestions: SurveyQuestion[] = [ // Base questions
    {
      id: 'iq1_paycheck_selection',
      questionText: "Which of your income sources would you like to invest from?",
      responseChoices: [],
      answer: null,
      isPaycheckSelectionStep: true
    },
    // Percentage questions will be dynamically inserted here
    {
      id: 'iq2_stock_preference',
      questionText: "How would you like to choose your investments?",
      responseChoices: [
        {id: 's1', text: "Guide me: Pick investments based on my profile (Recommended)"},
        {id: 's2', text: "Hybrid: Start with recommendations, then I'll customize"},
        {id: 's3', text: "Self-directed: I'll pick all my investments"}
      ],
      answer: null
    }
  ];

  public SurveyType = SurveyType;
  
  activeSurveyQuestions: SurveyQuestion[] = [];
  currentQuestionIndex: number = 0;
  currentQuestion: SurveyQuestion | undefined;
  currentSurveyType: SurveyType | null = null;

  // Paycheck Logic State
  allPaycheckSources: PaycheckSource[] = []; // All sources fetched from Plaid
  // tempSelectedSourceIds: Set<string> = new Set(); // Store accountIds selected in the first step
  paycheckConfigsToSave: SelectedPaycheck[] = []; // Final configurations to save

  isLoadingPaychecks: boolean = false;
  paycheckErrorMessage: string | null = null;
  isSubmittingSurvey: boolean = false;

  // Manual Income Configuration State
  showPrimaryIncomeForm: boolean = false;
  showSecondaryIncomeForm: boolean = false;
  hasPrimaryIncome: boolean = false;
  hasSecondaryIncome: boolean = false;

  primaryIncomeConfig = {
    name: '',
    employerName: '',
    frequency: 'BIWEEKLY',
    approximateAmount: 0,
    investmentPercentage: 10,
    accountId: ''
  };

  secondaryIncomeConfig = {
    name: '',
    employerName: '',
    frequency: 'MONTHLY',
    approximateAmount: 0,
    investmentPercentage: 5,
    accountId: ''
  };

  availableAccounts: any[] = []; // Will be populated with user's bank accounts

  // User's monthly investment amount from initial survey
  userMonthlyInvestmentAmount: number = 0;

  constructor(
    private router: Router,
    private plaidDataService: PlaidDataService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('[SurveyComponent] ngOnInit - Initializing Investment Setup Survey.');
    this.loadUserMonthlyInvestment();
    this.initializeInvestmentSurvey();
  }

  loadUserMonthlyInvestment(): void {
    // Get user's monthly investment amount from their progress data
    const userProgress = this.authService.getCurrentProgress();
    if (userProgress && userProgress.monthlyInvestment) {
      this.userMonthlyInvestmentAmount = userProgress.monthlyInvestment;
      console.log('[SurveyComponent] Loaded user monthly investment amount:', this.userMonthlyInvestmentAmount);
    } else {
      console.log('[SurveyComponent] No monthly investment amount found in user progress');
    }
  }

  initializeInvestmentSurvey(): void {
    console.log("[SurveyComponent] Initializing Investment Setup Survey");
    
    this.currentSurveyType = SurveyType.InvestmentSetup;
    this.activeSurveyQuestions = [...this.investmentSetupQuestions.map(q => ({...q, answer: null, percentageAnswer: undefined, relatedPaycheck: undefined }))];
    this.currentQuestionIndex = 0;
    this.paycheckConfigsToSave = [];
    
    // Reset checkbox states
    this.allPaycheckSources.forEach(source => {
      const checkbox = document.getElementById(`paycheck-${source.accountId}`) as HTMLIonCheckboxElement;
      if (checkbox) checkbox.checked = false;
    });
    
    this.loadActiveQuestion();
  }

  loadActiveQuestion(): void {
    if (this.currentQuestionIndex < this.activeSurveyQuestions.length) {
      this.currentQuestion = this.activeSurveyQuestions[this.currentQuestionIndex];
      console.log('[SurveyComponent] Loaded question:', this.currentQuestion?.id, this.currentQuestion?.questionText);

      if (this.currentQuestion?.isPaycheckSelectionStep) {
        // Always update the sources display when loading the paycheck selection step
        this.updatePaycheckSourcesFromConfigs();
        
        // Only fetch if we don't have any configured sources and aren't loading
        if (this.allPaycheckSources.length === 0 && !this.isLoadingPaychecks) {
          this.fetchPaycheckSources();
        }
      }
    } else {
      this.currentQuestion = undefined;
      console.log('[SurveyComponent] Attempted to load question out of bounds. Survey likely complete.');
      // This typically means all questions (including dynamic ones) are done.
      // The submitActiveSurvey method will handle final submission.
      if (this.activeSurveyQuestions.length > 0) { // If there were questions
          this.submitActiveSurvey();
      }
    }
  }

  fetchPaycheckSources(): void {
    console.log('[SurveyComponent] Loading configured income sources');
    this.isLoadingPaychecks = false;
    this.paycheckErrorMessage = null;
    
    // Populate allPaycheckSources with configured income sources
    this.updatePaycheckSourcesFromConfigs();
    
    // The UI will show configured sources or empty state for manual entry
  }

  private updatePaycheckSourcesFromConfigs(): void {
    this.allPaycheckSources = [];
    
    // Add primary income if configured
    if (this.hasPrimaryIncome && this.primaryIncomeConfig.name) {
      const primarySource: PaycheckSource = {
        accountId: this.primaryIncomeConfig.accountId || 'primary_' + Date.now(),
        name: this.primaryIncomeConfig.name,
        lastAmount: this.primaryIncomeConfig.approximateAmount,
        lastDate: new Date().toISOString().split('T')[0],
        frequency: this.primaryIncomeConfig.frequency,
        description: `Primary income from ${this.primaryIncomeConfig.employerName}`
      };
      this.allPaycheckSources.push(primarySource);
    }
    
    // Add secondary income if configured
    if (this.hasSecondaryIncome && this.secondaryIncomeConfig.name) {
      const secondarySource: PaycheckSource = {
        accountId: this.secondaryIncomeConfig.accountId || 'secondary_' + Date.now(),
        name: this.secondaryIncomeConfig.name,
        lastAmount: this.secondaryIncomeConfig.approximateAmount,
        lastDate: new Date().toISOString().split('T')[0],
        frequency: this.secondaryIncomeConfig.frequency,
        description: `Secondary income from ${this.secondaryIncomeConfig.employerName}`
      };
      this.allPaycheckSources.push(secondarySource);
    }
  }

  // --- Methods for Manual Income Configuration ---
  showPrimaryIncomeEntry(): void {
    this.showPrimaryIncomeForm = true;
    this.loadUserAccounts();
  }

  showSecondaryIncomeEntry(): void {
    this.showSecondaryIncomeForm = true;
    if (this.availableAccounts.length === 0) {
      this.loadUserAccounts();
    }
  }

  private loadUserAccounts(): void {
    // TODO: Implement account loading from Plaid
    // For now, we'll use a placeholder
    this.availableAccounts = [
      { accountId: 'checking_001', name: 'Main Checking', type: 'depository' },
      { accountId: 'savings_001', name: 'Savings Account', type: 'depository' }
    ];
  }

  savePrimaryIncomeConfig(): void {
    if (!this.validateIncomeConfig(this.primaryIncomeConfig)) {
      return;
    }

    this.hasPrimaryIncome = true;
    this.addIncomeToConfigs(this.primaryIncomeConfig, true);
    this.showPrimaryIncomeForm = false;
    
    // Update the displayed paycheck sources to show the new configuration
    this.updatePaycheckSourcesFromConfigs();
    
    console.log('[SurveyComponent] Added primary income configuration');
  }

  saveSecondaryIncomeConfig(): void {
    if (!this.validateIncomeConfig(this.secondaryIncomeConfig)) {
      return;
    }

    this.hasSecondaryIncome = true;
    this.addIncomeToConfigs(this.secondaryIncomeConfig, false);
    this.showSecondaryIncomeForm = false;
    
    // Update the displayed paycheck sources to show the new configuration
    this.updatePaycheckSourcesFromConfigs();
    
    console.log('[SurveyComponent] Added secondary income configuration');
  }

  private addIncomeToConfigs(config: any, isPrimary: boolean): void {
    // Generate a consistent accountId if none provided
    const accountId = config.accountId || (isPrimary ? 'primary_income' : 'secondary_income');
    config.accountId = accountId; // Update the config object with the ID
    
    // Add to configs to save with proper structure
    const paycheckConfig: SelectedPaycheck = {
      accountId: accountId,
      name: config.name,
      withdrawalPercentage: config.investmentPercentage / 100,
      employerName: config.employerName,
      expectedAmount: config.approximateAmount,
      frequency: config.frequency
    };

    const existingConfigIndex = this.paycheckConfigsToSave.findIndex(c => c.accountId === accountId);
    if (existingConfigIndex > -1) {
      this.paycheckConfigsToSave[existingConfigIndex] = paycheckConfig;
    } else {
      this.paycheckConfigsToSave.push(paycheckConfig);
    }
  }

  private validateIncomeConfig(config: any): boolean {
    if (!config.name.trim()) {
      alert('Please enter a name for this income source');
      return false;
    }
    if (!config.employerName.trim()) {
      alert('Please enter your employer name');
      return false;
    }
    if (config.approximateAmount <= 0) {
      alert('Please enter a valid amount');
      return false;
    }
    if (!config.accountId) {
      alert('Please select which account receives this income');
      return false;
    }
    return true;
  }

  cancelPrimaryIncomeEntry(): void {
    this.resetPrimaryIncomeForm();
    this.showPrimaryIncomeForm = false;
  }

  cancelSecondaryIncomeEntry(): void {
    this.resetSecondaryIncomeForm();
    this.showSecondaryIncomeForm = false;
  }

  private resetPrimaryIncomeForm(): void {
    this.primaryIncomeConfig = {
      name: '',
      employerName: '',
      frequency: 'BIWEEKLY',
      approximateAmount: 0,
      investmentPercentage: 10,
      accountId: ''
    };
  }

  private resetSecondaryIncomeForm(): void {
    this.secondaryIncomeConfig = {
      name: '',
      employerName: '',
      frequency: 'MONTHLY',
      approximateAmount: 0,
      investmentPercentage: 5,
      accountId: ''
    };
  }

  editPrimaryIncome(): void {
    this.showPrimaryIncomeForm = true;
  }

  editSecondaryIncome(): void {
    this.showSecondaryIncomeForm = true;
  }

  removePrimaryIncome(): void {
    this.hasPrimaryIncome = false;
    this.paycheckConfigsToSave = this.paycheckConfigsToSave.filter(c => c.accountId !== this.primaryIncomeConfig.accountId);
    this.resetPrimaryIncomeForm();
    
    // Update the displayed paycheck sources to remove the primary income
    this.updatePaycheckSourcesFromConfigs();
  }

  removeSecondaryIncome(): void {
    this.hasSecondaryIncome = false;
    this.paycheckConfigsToSave = this.paycheckConfigsToSave.filter(c => c.accountId !== this.secondaryIncomeConfig.accountId);
    this.resetSecondaryIncomeForm();
    
    // Update the displayed paycheck sources to remove the secondary income
    this.updatePaycheckSourcesFromConfigs();
  }

  getInvestmentPercentageForSource(accountId: string): number {
    const config = this.paycheckConfigsToSave.find(c => c.accountId === accountId);
    return config ? Math.round(config.withdrawalPercentage * 100) : 0;
  }
  togglePaycheckSourceSelection(source: PaycheckSource, event: any): void {
    const isSelected = event.detail.checked;
    const existingConfigIndex = this.paycheckConfigsToSave.findIndex(p => p.accountId === source.accountId);

    if (isSelected) {
      if (existingConfigIndex === -1) { // Not yet in the list to be configured
        // For configured income sources, use the existing configuration
        let withdrawalPercentage = 0.10; // Default
        
        // Check if this is a primary or secondary income source and get the configured percentage
        if (this.hasPrimaryIncome && source.accountId === this.primaryIncomeConfig.accountId) {
          withdrawalPercentage = this.primaryIncomeConfig.investmentPercentage / 100;
        } else if (this.hasSecondaryIncome && source.accountId === this.secondaryIncomeConfig.accountId) {
          withdrawalPercentage = this.secondaryIncomeConfig.investmentPercentage / 100;
        }
        
        this.paycheckConfigsToSave.push({
            accountId: source.accountId,
            name: source.name,
            withdrawalPercentage: withdrawalPercentage,
            employerName: this.getEmployerNameForSource(source),
            expectedAmount: source.lastAmount,
            frequency: source.frequency
        });
      }
    } else {
      if (existingConfigIndex > -1) { // If it was previously marked for configuration
        this.paycheckConfigsToSave.splice(existingConfigIndex, 1);
      }
    }
    console.log('Paycheck sources marked for configuration:', this.paycheckConfigsToSave.map(p=>p.accountId));
  }

  private getEmployerNameForSource(source: PaycheckSource): string {
    // Extract employer name from configured sources
    if (this.hasPrimaryIncome && source.accountId === this.primaryIncomeConfig.accountId) {
      return this.primaryIncomeConfig.employerName;
    }
    if (this.hasSecondaryIncome && source.accountId === this.secondaryIncomeConfig.accountId) {
      return this.secondaryIncomeConfig.employerName;
    }
    // Fallback: try to extract from description or use source name
    if (source.description && source.description.includes('from ')) {
      return source.description.split('from ')[1];
    }
    return source.name;
  }

  proceedFromPaycheckSelection(): void {
    if (!this.currentQuestion || !this.currentQuestion.isPaycheckSelectionStep) return;

    console.log('[SurveyComponent] Proceeding from paycheck selection with manual configurations:', this.paycheckConfigsToSave);
    
    // For manual configuration, we already have the paycheckConfigsToSave populated
    // No need to generate percentage questions since we collected everything upfront
    
    // Skip to the next non-paycheck question
    const originalSelectionQuestionIndex = this.activeSurveyQuestions.findIndex(q => q.id === 'iq1_paycheck_selection');
    
    // Remove the selection question and don't add percentage questions
    this.activeSurveyQuestions.splice(originalSelectionQuestionIndex, 1);
    
    // currentQuestionIndex should now point to the next question (iq2_stock_preference)
    this.currentQuestionIndex = originalSelectionQuestionIndex;
    
    this.loadActiveQuestion();
  }


  // --- Methods for Percentage Questions ---
  handlePercentageChange(event: any): void {
    if (!this.currentQuestion || !this.currentQuestion.isPercentageQuestion || !this.currentQuestion.relatedPaycheck) return;
    const value = event.detail.value; // From IonRange (0-100)
    this.currentQuestion.percentageAnswer = value / 100; // Store as 0.0 to 1.0
    console.log('Updated percentage for', this.currentQuestion.relatedPaycheck.accountId, 'to', this.currentQuestion.percentageAnswer);
  }

  getDisplayPercentage(): number {
    if (this.currentQuestion?.isPercentageQuestion) {
      return (this.currentQuestion.percentageAnswer || 0) * 100;
    }
    return 10; // Default
  }

  submitPercentageAndProceed(): void {
    if (!this.currentQuestion || !this.currentQuestion.isPercentageQuestion || !this.currentQuestion.relatedPaycheck) return;

    // Store the configured paycheck
    const config: SelectedPaycheck = {
        accountId: this.currentQuestion.relatedPaycheck.accountId,
        name: this.currentQuestion.relatedPaycheck.name,
        withdrawalPercentage: this.currentQuestion.percentageAnswer || 0 // Default to 0 if somehow not set
    };
    // Add or update in our list to save
    const existingIndex = this.paycheckConfigsToSave.findIndex(p => p.accountId === config.accountId);
    if (existingIndex > -1) {
        this.paycheckConfigsToSave[existingIndex] = config;
    } else {
        this.paycheckConfigsToSave.push(config);
    }
    
    this.advanceToNextStep();
  }


  // --- General Survey Navigation & Submission ---
  selectAnswerAndProceed(selectedChoiceId: string): void { // For standard questions
    if (!this.currentQuestion || this.currentQuestion.isPaycheckSelectionStep || this.currentQuestion.isPercentageQuestion) return;
    this.currentQuestion.answer = selectedChoiceId;
    this.advanceToNextStep();
  }

  advanceToNextStep(): void {
    setTimeout(() => {
      if (this.currentQuestionIndex < this.activeSurveyQuestions.length - 1) {
        this.currentQuestionIndex++;
        this.loadActiveQuestion();
      } else {
        // Reached the end of all active questions (including dynamic ones)
        this.submitActiveSurvey();
      }
    }, 200);
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      // If moving back into dynamic percentage questions, they should just reload.
      // If moving from a percentage question back to the selection step, we need to handle that.
      // For simplicity now, just load the previous question.
      this.loadActiveQuestion();
    }
  }

  isLastActiveQuestion(): boolean { // This now means last of *all* questions, including dynamic ones
    if (!this.activeSurveyQuestions || this.activeSurveyQuestions.length === 0) return true;
    return this.currentQuestionIndex >= this.activeSurveyQuestions.length - 1;
  }

  submitActiveSurvey(): void { // This is the FINAL submission of the entire survey type
    if (!this.currentSurveyType) return;
    this.isSubmittingSurvey = true;

    console.log(`[SurveyComponent] Survey [${this.currentSurveyType}] Final Submission!`);

    if (this.currentSurveyType === SurveyType.InvestmentSetup) {
      // Save paycheck configs first if any are pending
      if (this.paycheckConfigsToSave.length > 0) {
        console.log('[SurveyComponent] Saving final paycheck configurations:', this.paycheckConfigsToSave);
        this.plaidDataService.savePaycheckConfiguration(this.paycheckConfigsToSave).subscribe({
          next: () => {
            console.log('[SurveyComponent] Final paycheck configs saved.');
            this.proceedToStockPreferenceDecision();
          },
          error: (err) => {
            this.paycheckErrorMessage = "Failed to save paycheck settings. Please try again.";
            this.isSubmittingSurvey = false;
            console.error("Error saving final paycheck configs:", err);
          }
        });
      } else {
        // No paycheck configs to save (user might have skipped)
        this.proceedToStockPreferenceDecision();
      }
    }
  }

  proceedToStockPreferenceDecision(): void {
    const stockPreferenceQuestion = this.activeSurveyQuestions.find(q => q.id === 'iq2_stock_preference');
    // Log standard question answers
    this.activeSurveyQuestions.filter(q => !q.isPaycheckSelectionStep && !q.isPercentageQuestion).forEach(q => {
        const choice = q.responseChoices.find(c => c.id === q.answer);
        console.log(`  Q: '${q.questionText}': A: '${choice ? choice.text : 'N/A'}' (ID: ${q.answer})`);
    });

    if (stockPreferenceQuestion?.answer === 's2' || stockPreferenceQuestion?.answer === 's3') {
      console.log('[SurveyComponent] User wants to pick stocks or hybrid. Navigating to /stock-selection.');
      localStorage.setItem('investmentSurveyCompleted', 'true');
      localStorage.setItem('choseToPickStocks', 'true');
      localStorage.setItem('stockSelectionCompleted', 'false');
      this.isSubmittingSurvey = false;
      this.router.navigate(['/stock-selection'], { replaceUrl: true });
    } else {
      console.log('[SurveyComponent] Investment setup complete (guided investing). Navigating to /confirm-investment.');
      localStorage.setItem('investmentSurveyCompleted', 'true');
      localStorage.setItem('choseToPickStocks', 'false');
      localStorage.setItem('stockSelectionCompleted', 'true');
      this.isSubmittingSurvey = false;
      this.router.navigate(['/confirm-investment'], { replaceUrl: true });
    }
  }

  get totalQuestionsInActiveSurvey(): number {
    return this.activeSurveyQuestions.length;
  }

  // --- Paycheck UI Helper Methods (for iq1_paycheck_selection step) ---
  isPaycheckInitiallySelected(accountId: string): boolean {
    // Configured income sources should be automatically selected
    if (this.hasPrimaryIncome && accountId === this.primaryIncomeConfig.accountId) {
      return true;
    }
    if (this.hasSecondaryIncome && accountId === this.secondaryIncomeConfig.accountId) {
      return true;
    }
    // Otherwise check if it's in the paycheckConfigsToSave
    return this.paycheckConfigsToSave.some(p => p.accountId === accountId);
  }
}
