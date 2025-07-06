// src/app/pages/survey/survey.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, Event as RouterEvent } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonLabel,
  IonIcon, IonCheckbox, IonSpinner, IonRange
} from '@ionic/angular/standalone';

import { PlaidDataService } from '../../services/plaid-data.service';
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

// Enum
enum SurveyType {
  InitialRiskSurvey = 'Initial Risk Survey',
  InvestmentSetup = 'Investment Setup'
}

@Component({
  selector: 'app-survey',
  templateUrl: './survey.component.html',
  styleUrls: ['./survey.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonLabel,
    IonIcon, IonCheckbox, IonSpinner, IonRange
  ]
})
export class SurveyComponent implements OnInit, OnDestroy {
  private initialRiskSurveyQuestions: SurveyQuestion[] = [
    // ... (same as before) ...
    { id: 'q1', questionText: "What is your primary investment goal?", responseChoices: [
        {id: 'g1', text: "Long-term Growth"}, {id: 'g2', text: "Generating Income"}, {id: 'g3', text: "Capital Preservation"}
      ], answer: null },
    { id: 'q2', questionText: "How would you describe your risk tolerance?", responseChoices: [
        {id: 'r1', text: "Low"}, {id: 'r2', text: "Medium"}, {id: 'r3', text: "High"}
      ], answer: null },
    { id: 'q3', questionText: "What's your favorite investment type?", responseChoices: [
        {id: 'i1', text: "Stocks"}, {id: 'i2', text: "Bonds"}, {id: 'i3', text: "Real Estate"}
      ], answer: null }
  ];

  private baseInvestmentSetupQuestions: SurveyQuestion[] = [ // Base questions
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

  private routerSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private plaidDataService: PlaidDataService
  ) {}

  ngOnInit(): void {
    console.log('[SurveyComponent] ngOnInit - Initializing.');
    
    // DEMO: Show a sample question for iOS design showcase
    this.currentSurveyType = SurveyType.InitialRiskSurvey;
    this.activeSurveyQuestions = [
      { 
        id: 'demo1', 
        questionText: "What is your primary investment goal?", 
        responseChoices: [
          {id: 'g1', text: "Long-term Growth"}, 
          {id: 'g2', text: "Generating Income"}, 
          {id: 'g3', text: "Capital Preservation"}
        ], 
        answer: null 
      },
      { 
        id: 'demo2', 
        questionText: "How would you describe your risk tolerance?", 
        responseChoices: [
          {id: 'r1', text: "Conservative - I prefer stable, predictable returns"}, 
          {id: 'r2', text: "Moderate - I'm comfortable with some market fluctuation"}, 
          {id: 'r3', text: "Aggressive - I'm willing to take higher risks for potentially higher returns"}
        ], 
        answer: null 
      }
    ];
    this.currentQuestionIndex = 0;
    this.currentQuestion = this.activeSurveyQuestions[0];
    
    // Original initialization commented out for demo
    // this.initializeOrRefreshSurveyState();
    
    this.routerSubscription = this.router.events.pipe(
      filter((event: RouterEvent): event is NavigationEnd =>
        event instanceof NavigationEnd &&
        event.urlAfterRedirects?.startsWith('/survey')
      )
    ).subscribe((event: NavigationEnd) => {
      console.log('[SurveyComponent] Router event: NavigationEnd to', event.urlAfterRedirects, '- Re-evaluating survey state.');
      // this.initializeOrRefreshSurveyState();
    });
  }

  initializeOrRefreshSurveyState(): void {
    const investmentSurveyCompleted = localStorage.getItem('investmentSurveyCompleted') === 'true';
    const initialSurveyCompleted = localStorage.getItem('initialSurveyCompleted') === 'true';
    const linkplaidCompleted = localStorage.getItem('linkplaidCompleted') === 'true';

    console.log("[SurveyComponent] initializeOrRefreshSurveyState called:", {
      initialSurveyCompleted, linkplaidCompleted, investmentSurveyCompleted
    });

    let newSurveyType: SurveyType | null = null;
    let tempActiveQuestions: SurveyQuestion[] = []; // Temporary holder

    if (!initialSurveyCompleted) {
      newSurveyType = SurveyType.InitialRiskSurvey;
      tempActiveQuestions = [...this.initialRiskSurveyQuestions.map(q => ({...q, answer: null, percentageAnswer: undefined, relatedPaycheck: undefined }))];
      console.log("[SurveyComponent] Determined state: InitialRiskSurvey");
    } else if (linkplaidCompleted && !investmentSurveyCompleted) {
      newSurveyType = SurveyType.InvestmentSetup;
      // Start with just the base questions; percentage questions are added dynamically
      tempActiveQuestions = [...this.baseInvestmentSetupQuestions.map(q => ({...q, answer: null, percentageAnswer: undefined, relatedPaycheck: undefined }))];
      console.log("[SurveyComponent] Determined state: InvestmentSetup");
    } else {
      // ... (navigation to tabs if all done, same as before) ...
      console.log("[SurveyComponent] All relevant surveys completed or invalid state. Navigating to tabs.");
      if (this.router.url.startsWith('/survey')) { // Only navigate if currently on a survey path
        this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
      }
      this.currentSurveyType = null; 
      this.activeSurveyQuestions = []; 
      this.currentQuestion = undefined; 
      return;
    }

    if (this.currentSurveyType !== newSurveyType || this.activeSurveyQuestions.length === 0 ||
        (newSurveyType === SurveyType.InvestmentSetup && !this.activeSurveyQuestions.some(q => q.isPaycheckSelectionStep))) {
      console.log(`[SurveyComponent] Survey type changing or needs reinitialization.`);
      this.currentSurveyType = newSurveyType;
      this.activeSurveyQuestions = tempActiveQuestions; // Use the temporary holder
      this.currentQuestionIndex = 0;
      this.paycheckConfigsToSave = []; // Reset for a new survey run
      // this.tempSelectedSourceIds.clear(); // Clear previous selections
      this.allPaycheckSources.forEach(source => { // Reset temporary selection state if needed
        const checkbox = document.getElementById(`paycheck-${source.accountId}`) as HTMLIonCheckboxElement;
        if (checkbox) checkbox.checked = false;
      });
      this.loadActiveQuestion();
    } else if (!this.currentQuestion && this.activeSurveyQuestions.length > 0) {
      this.loadActiveQuestion();
    }
  }

  loadActiveQuestion(): void {
    if (this.currentQuestionIndex < this.activeSurveyQuestions.length) {
      this.currentQuestion = this.activeSurveyQuestions[this.currentQuestionIndex];
      console.log('[SurveyComponent] Loaded question:', this.currentQuestion?.id, this.currentQuestion?.questionText);

      if (this.currentQuestion?.isPaycheckSelectionStep && this.allPaycheckSources.length === 0 && !this.isLoadingPaychecks) {
        this.fetchPaycheckSources();
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
    console.log('[SurveyComponent] Fetching paycheck sources...');
    this.isLoadingPaychecks = true;
    this.paycheckErrorMessage = null;
    // this.tempSelectedSourceIds.clear();
    this.allPaycheckSources.forEach(source => { // Reset temporary selection state if needed
        const checkbox = document.getElementById(`paycheck-${source.accountId}`) as HTMLIonCheckboxElement;
        if (checkbox) checkbox.checked = false;
      });

    this.plaidDataService.getPaycheckSources().subscribe({
      next: (sources) => {
        console.log('[SurveyComponent] Received paycheck sources:', sources);
        this.allPaycheckSources = sources;
        this.isLoadingPaychecks = false;
        if (sources.length === 0) {
          this.paycheckErrorMessage = "No potential paycheck sources found. You can skip this step or link another bank account later.";
        }
      },
      error: (err) => {
        console.error('[SurveyComponent] Error fetching paycheck sources:', err);
        this.paycheckErrorMessage = err.message || "Failed to fetch paycheck information. Please try again.";
        this.isLoadingPaychecks = false;
      }
    });
  }

  // --- Methods for Paycheck Selection Step (iq1_paycheck_selection) ---
  togglePaycheckSourceSelection(source: PaycheckSource, event: any): void {
    const isSelected = event.detail.checked;
    const existingConfigIndex = this.paycheckConfigsToSave.findIndex(p => p.accountId === source.accountId);

    if (isSelected) {
      if (existingConfigIndex === -1) { // Not yet in the list to be configured
        // Add it with a default percentage, it will be configured in the next step
         this.paycheckConfigsToSave.push({
            accountId: source.accountId,
            name: source.name,
            withdrawalPercentage: 0.10 // Default, will be set by user
        });
      }
    } else {
      if (existingConfigIndex > -1) { // If it was previously marked for configuration
        this.paycheckConfigsToSave.splice(existingConfigIndex, 1);
      }
    }
    console.log('Paycheck sources marked for configuration:', this.paycheckConfigsToSave.map(p=>p.accountId));
  }

  proceedFromPaycheckSelection(): void {
    if (!this.currentQuestion || !this.currentQuestion.isPaycheckSelectionStep) return;

    console.log('[SurveyComponent] Proceeding from paycheck selection.');
    // Filter out sources that were not actually selected by the user for configuration
    // This step is slightly redundant if togglePaycheckSourceSelection correctly maintains paycheckConfigsToSave
    // but good as a final check.
    // For this new flow, paycheckConfigsToSave should only contain initially selected ones.
    // We will now generate questions for these.

    const selectedSourcesForConfig = this.allPaycheckSources.filter(source =>
        (document.getElementById(`paycheck-${source.accountId}`) as HTMLIonCheckboxElement)?.checked
    );


    // Remove the current 'iq1_paycheck_selection' question
    // And insert new questions for percentages AFTER it.
    const originalSelectionQuestionIndex = this.activeSurveyQuestions.findIndex(q => q.id === 'iq1_paycheck_selection');
    
    let percentageQuestions: SurveyQuestion[] = [];
    if (selectedSourcesForConfig.length > 0) {
        percentageQuestions = selectedSourcesForConfig.map(source => ({
            id: `percentage_for_${source.accountId}`,
            questionText: `Set investment percentage for: ${source.name}`,
            responseChoices: [], // Will use ion-range
            answer: null,
            isPercentageQuestion: true,
            relatedPaycheck: source,
            percentageAnswer: 0.10 // Default to 10%
        }));
    }


    // Rebuild activeSurveyQuestions: questions before + new percentage questions + questions after
    const questionsBefore = this.activeSurveyQuestions.slice(0, originalSelectionQuestionIndex + 1); // Keep the selection question for now, or remove it
    const questionsAfter = this.activeSurveyQuestions.slice(originalSelectionQuestionIndex + 1).filter(q => !q.isPercentageQuestion); // Remove any old percentage questions

    // We will replace the original selection question with the percentage questions,
    // or insert after if we want to keep a summary of selection step.
    // For this flow, let's replace the "select paychecks" step with the series of "set percentage" steps.
    
    this.activeSurveyQuestions.splice(
      originalSelectionQuestionIndex, // Start index to remove/replace
      1, // Remove the original selection question
      ...percentageQuestions // Add all new percentage questions
    );


    if (percentageQuestions.length === 0 && selectedSourcesForConfig.length === 0) {
      // No paychecks selected, and no percentage questions to ask.
      // We need to find the next *actual* question (iq2_stock_preference)
      // The currentQuestionIndex should effectively skip over where percentage questions *would have been*.
      // The splice above already adjusted the array.
      // We just need to ensure currentQuestionIndex points to the next logical step.
      this.currentQuestionIndex = originalSelectionQuestionIndex; // Index of where new questions would start
                                                                 // if there are none, this index now points to iq2
    } else {
       // Start with the first percentage question (or iq2 if none were selected)
      this.currentQuestionIndex = originalSelectionQuestionIndex;
    }

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

    if (this.currentSurveyType === SurveyType.InitialRiskSurvey) {
      // ... (logging and navigation same as before) ...
      localStorage.setItem('initialSurveyCompleted', 'true');
      this.isSubmittingSurvey = false;
      this.router.navigate(['/link-bank'], { replaceUrl: true });
    } else if (this.currentSurveyType === SurveyType.InvestmentSetup) {
      // Save paycheck configs first if any are pending
      if (this.paycheckConfigsToSave.length > 0) {
        console.log('[SurveyComponent] Saving final paycheck configurations:', this.paycheckConfigsToSave);
        this.plaidDataService.savePaycheckConfiguration(this.paycheckConfigsToSave).subscribe({
          next: () => {
            console.log('[SurveyComponent] Final paycheck configs saved.');
            // localStorage.setItem('paycheckConfigCompleted', 'true');
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
    // This determines if the checkbox should be initially checked in the list
    // For the new flow, we don't pre-select here, user action does.
    // Or, if you want to pre-select all fetched paychecks:
    // return this.allPaycheckSources.some(p => p.accountId === accountId);
    return this.paycheckConfigsToSave.some(p => p.accountId === accountId);
  }

  ngOnDestroy(): void {
    // ... (same as before) ...
    console.log('[SurveyComponent] ngOnDestroy - Unsubscribing from router events.');
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}