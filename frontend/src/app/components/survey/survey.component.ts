import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, Event as RouterEvent } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators'; // distinctUntilChanged could also be useful
import {
  IonHeader, IonChip, IonToolbar, IonTitle, IonContent, IonText, IonList,
  IonItem, IonLabel, IonButton, IonButtons, IonIcon, IonFooter
} from '@ionic/angular/standalone';

// Interfaces
interface SurveyResponseChoice {
  id: string;
  text: string;
}

interface SurveyQuestion {
  id: string;
  questionText: string;
  responseChoices: SurveyResponseChoice[];
  answer: string | null;
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
    CommonModule, IonHeader, IonChip, IonToolbar, IonTitle, IonContent, IonText,
    IonList, IonItem, IonLabel, IonButton, IonButtons, IonIcon, IonFooter
  ]
})
export class SurveyComponent implements OnInit, OnDestroy {
  private initialRiskSurveyQuestions: SurveyQuestion[] = [
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

  private investmentSetupQuestions: SurveyQuestion[] = [
    // add something for adding the name of their paycheck (you can add multiple sources of income (and modify the percentage withdrawn or delete later))
    // this question will search their bank account to find the amount of money brought in by said paycheck
    // it will then show you how much your adjusted paycheck will be one selecting a percentage to take out
    { id: 'iq1', questionText: "How much do you want to take out of your paycheck each month?", responseChoices: [
        {id: 'p1', text: "10%"}, {id: 'p2', text: "20%"}, {id: 'p3', text: "30%"}
      ], answer: null },
    { id: 'iq2', questionText: "Do you want to let all the stocks be picked automatically or would you like to include some of your own?", responseChoices: [
        {id: 's1', text: "You pick them all for me (you can always add stocks you like later)"},
        {id: 's2', text: "You pick some and I pick some"}, {id: 's3', text: "I pick them all"}
      ], answer: null }
  ];

  activeSurveyQuestions: SurveyQuestion[] = [];
  currentQuestionIndex: number = 0;
  currentQuestion: SurveyQuestion | undefined;
  currentSurveyType: SurveyType | null = null;

  private routerSubscription: Subscription | undefined;

  constructor(private router: Router) { }

  ngOnInit(): void {

    console.log('[SurveyComponent] ngOnInit - Initializing.');
    this.initializeOrRefreshSurveyState(); // Initial setup

    this.routerSubscription = this.router.events.pipe(
      filter((event: RouterEvent): event is NavigationEnd =>
        event instanceof NavigationEnd &&
        event.urlAfterRedirects?.startsWith('/survey') // Trigger if navigated to /survey or /survey?params
      )
    ).subscribe((event: NavigationEnd) => {
      console.log('[SurveyComponent] Router event: NavigationEnd to', event.urlAfterRedirects, '- Re-evaluating survey state.');
      // This will re-run the logic to determine which survey (if any) should be active
      // and if its state needs to be reset (e.g., show first question).
      this.initializeOrRefreshSurveyState();
    });
  }

  initializeOrRefreshSurveyState(): void {
    const investmentSurveyCompleted = localStorage.getItem('investmentSurveyCompleted') === 'true';
    const initialSurveyCompleted = localStorage.getItem('initialSurveyCompleted') === 'true';
    const linkplaidCompleted = localStorage.getItem('linkplaidCompleted') === 'true';

    console.log("[SurveyComponent] initializeOrRefreshSurveyState called:");
    console.log("  initialSurveyCompleted:", initialSurveyCompleted);
    console.log("  linkplaidCompleted:", linkplaidCompleted);
    console.log("  investmentSurveyCompleted:", investmentSurveyCompleted);

    let newSurveyType: SurveyType | null = null;
    let newActiveQuestions: SurveyQuestion[] = [];

    if (linkplaidCompleted && initialSurveyCompleted && !investmentSurveyCompleted) {
      newSurveyType = SurveyType.InvestmentSetup;
      newActiveQuestions = [...this.investmentSetupQuestions.map(q => ({...q, answer: null}))]; // Ensure fresh copy with reset answers
      console.log("[SurveyComponent] Determined state: InvestmentSetup");
    } else if (!initialSurveyCompleted) {
      newSurveyType = SurveyType.InitialRiskSurvey;
      newActiveQuestions = [...this.initialRiskSurveyQuestions.map(q => ({...q, answer: null}))]; // Ensure fresh copy with reset answers
      console.log("[SurveyComponent] Determined state: InitialRiskSurvey");
    } else {
      console.log("[SurveyComponent] All relevant surveys completed or invalid state. Navigating to tabs.");
      if (this.router.url.startsWith('/survey')) { // Only navigate if currently on a survey path
        this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
      }
      this.currentSurveyType = null; // Clear current survey type
      this.activeSurveyQuestions = []; // Clear active questions
      this.currentQuestion = undefined; // Clear current question
      return; // Exit if no survey needs to be shown
    }

    // Check if the survey type or questions actually need to be reset.
    // This prevents re-initializing if the router event fires but the state is already correct
    // (e.g., user is halfway through a survey and a non-state-changing router event for /survey occurs).
    // However, for navigating *back* to the survey page after Plaid, we *do* want it to re-evaluate and load the investment survey.
    // The key is that `newSurveyType` will be different from `this.currentSurveyType` if a new phase starts.
    if (this.currentSurveyType !== newSurveyType || this.activeSurveyQuestions.length === 0) {
      console.log(`[SurveyComponent] Survey type changing from ${this.currentSurveyType} to ${newSurveyType} or initializing.`);
      this.currentSurveyType = newSurveyType;
      this.activeSurveyQuestions = newActiveQuestions;
      this.currentQuestionIndex = 0; // Always start from the first question of the new/refreshed survey
      this.loadActiveQuestion();
    } else {
      console.log(`[SurveyComponent] Survey type ${this.currentSurveyType} is already active. No full reset needed.`);
      // We might still need to ensure the correct question is displayed if currentQuestionIndex was somehow reset
      // but typically, if the survey type hasn't changed, we wouldn't forcibly reset the index unless intended.
      // For now, if the type is the same, we assume the user is where they left off or the component is just being checked.
      // If currentQuestion is undefined, it means we need to load it.
      if (!this.currentQuestion && this.activeSurveyQuestions.length > 0) {
        this.loadActiveQuestion();
      }
    }
  }

  // resetAndLoadFirstQuestion() is effectively merged into initializeOrRefreshSurveyState
  // by resetting index and questions when survey type changes.

  loadActiveQuestion(): void {
    if (this.activeSurveyQuestions && this.currentQuestionIndex < this.activeSurveyQuestions.length) {
      this.currentQuestion = this.activeSurveyQuestions[this.currentQuestionIndex];
      console.log('[SurveyComponent] Loaded question:', this.currentQuestion?.id, this.currentQuestion?.questionText);
    } else {
      this.currentQuestion = undefined;
      console.log('[SurveyComponent] No active question to load or index out of bounds.');
      if (this.activeSurveyQuestions.length > 0 && this.currentQuestionIndex >= this.activeSurveyQuestions.length) {
        console.log("[SurveyComponent] All questions in current survey answered. Consider submitting.");
        // This state should ideally be caught by isLastActiveQuestion in selectAnswerAndProceed
      }
    }
  }

  selectAnswerAndProceed(selectedChoiceId: string): void {
    if (!this.currentQuestion) {
      console.warn('[SurveyComponent] selectAnswerAndProceed called but no currentQuestion.');
      return;
    }

    this.currentQuestion.answer = selectedChoiceId;

    setTimeout(() => {
      if (this.isLastActiveQuestion()) {
        this.submitActiveSurvey();
      } else {
        this.currentQuestionIndex++;
        this.loadActiveQuestion();
      }
    }, 200);
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.loadActiveQuestion();
    }
  }

  isLastActiveQuestion(): boolean {
    if (!this.activeSurveyQuestions || this.activeSurveyQuestions.length === 0) return true;
    return this.currentQuestionIndex >= this.activeSurveyQuestions.length - 1;
  }

  submitActiveSurvey(): void {
    if (!this.currentSurveyType) {
      console.warn('[SurveyComponent] submitActiveSurvey called but no currentSurveyType.');
      return;
    }

    console.log(`[SurveyComponent] Survey [${this.currentSurveyType}] Submitted!`);
    this.activeSurveyQuestions.forEach(q => {
      const choice = q.responseChoices.find(c => c.id === q.answer);
      console.log(`  Q: '${q.questionText}': A: '${choice ? choice.text : 'N/A'}' (ID: ${q.answer})`);
    });

    if (this.currentSurveyType === SurveyType.InitialRiskSurvey) {
      localStorage.setItem('initialSurveyCompleted', 'true');
      console.log('[SurveyComponent] Navigating to /link-bank');
      this.router.navigate(['/link-bank'], { replaceUrl: true });
    } else if (this.currentSurveyType === SurveyType.InvestmentSetup) {
      
      const stockPreferenceQuestion = this.activeSurveyQuestions.find(q => q.id === 'iq2');
      if (stockPreferenceQuestion?.answer === 's2') { // 's2' was "Let me pick some specific stocks now"
        console.log('[SurveyComponent] User wants to pick stocks. Navigating to /stock-selection.');
        localStorage.setItem('investmentSurveyCompleted', 'true');
        localStorage.setItem('choseToPickStocks', 'true');
        localStorage.setItem('stockSelectionCompleted', 'false');
        this.router.navigate(['/stock-selection'], { replaceUrl: true }); // Navigate to the stock selection "page"
      } else {
        console.log('[SurveyComponent] Investment setup complete (auto-invest). Navigating to /confirm-investment.');
        localStorage.setItem('investmentSurveyCompleted', 'true');
        localStorage.setItem('choseToPickStocks', 'false');
        localStorage.setItem('stockSelectionCompleted', 'true');
        this.router.navigate(['/confirm-investment'], { replaceUrl: true });
      }
    }
  }

  get totalQuestionsInActiveSurvey(): number {
    return this.activeSurveyQuestions.length;
  }

  yearsToReachSBLOC(
    biweeklyContribution: number,
    desiredSBLOCIncomePerYear: number,
    annualReturnRate: number = 0.07,
    contributionsPerYear: number = 26,
    ltvRatio: number = 0.5
  ): number {
    const numerator = (2 * desiredSBLOCIncomePerYear * annualReturnRate);
    const denominator = biweeklyContribution * contributionsPerYear;
    const insideLog = numerator / denominator + 1;
    const years = Math.log(insideLog) / Math.log(1 + annualReturnRate);
    return years;
  }
  // Example usage:
  // yearsNeeded = this.yearsToReachSBLOC(250, 100000);
  // console.log(`Years needed: ${this.yearsNeeded.toFixed(2)}`);

  ngOnDestroy(): void {
    console.log('[SurveyComponent] ngOnDestroy - Unsubscribing from router events.');
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}