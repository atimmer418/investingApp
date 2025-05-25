import { Component, OnInit, OnDestroy } from '@angular/core'; // Import OnDestroy
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, Event as RouterEvent } from '@angular/router'; // Import NavigationEnd and RouterEvent
import { Subscription } from 'rxjs'; // Import Subscription
import { filter } from 'rxjs/operators'; // Import filter operator
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonList,
  IonItem, IonLabel, IonButton, IonButtons, IonIcon, IonFooter
} from '@ionic/angular/standalone';

// Interfaces remain the same
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

// Enum to define survey types for clarity
enum SurveyType {
  InitialRiskSurvey = 'initialRiskSurvey',
  InvestmentSetup = 'investmentSetup'
}

@Component({
  selector: 'app-survey',
  templateUrl: './survey.component.html',
  styleUrls: ['./survey.component.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonText,
    IonList, IonItem, IonLabel, IonButton, IonButtons, IonIcon, IonFooter
  ]
})
export class SurveyComponent implements OnInit, OnDestroy { // Implement OnDestroy
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
    // Initial setup when component is first created
    this.initializeOrRefreshSurveyState();

    // Subscribe to router events to re-initialize if navigated to this component's route again
    this.routerSubscription = this.router.events.pipe(
      filter((event: RouterEvent): event is NavigationEnd =>
        event instanceof NavigationEnd && event.urlAfterRedirects?.startsWith('/survey')
      )
    ).subscribe((event: NavigationEnd) => {
      // Check if we are truly re-navigating to the survey page,
      // not just a child route or fragment change if the survey page had children.
      // For a simple '/survey' route, event.urlAfterRedirects === '/survey' or startsWith is usually enough.
      console.log('Router event: Navigated to survey page, re-evaluating state.', event.urlAfterRedirects);
      this.initializeOrRefreshSurveyState();
    });
  }

  initializeOrRefreshSurveyState(): void {
    const investmentSurveyCompleted = localStorage.getItem('investmentSurveyCompleted') === 'true';
    const initialSurveyCompleted = localStorage.getItem('initialSurveyCompleted') === 'true';
    const linkplaidCompleted = localStorage.getItem('linkplaidCompleted') === 'true';

    console.log("Initializing/Refreshing Survey State:");
    console.log("  initialSurveyCompleted: " + initialSurveyCompleted);
    console.log("  linkplaidCompleted: " + linkplaidCompleted);
    console.log("  investmentSurveyCompleted: " + investmentSurveyCompleted);

    let previousSurveyType = this.currentSurveyType;
    let previousQuestionIndex = this.currentQuestionIndex;

    if (linkplaidCompleted && initialSurveyCompleted && !investmentSurveyCompleted) {
      this.currentSurveyType = SurveyType.InvestmentSetup;
      this.activeSurveyQuestions = [...this.investmentSetupQuestions];
    } else if (!initialSurveyCompleted) {
      this.currentSurveyType = SurveyType.InitialRiskSurvey;
      this.activeSurveyQuestions = [...this.initialRiskSurveyQuestions];
    } else {
      console.log("All surveys completed or invalid state. Navigating to tabs.");
      // Only navigate if we are currently on the survey page to avoid issues
      // if this logic is hit while already navigating away.
      if (this.router.url.startsWith('/survey')) {
        this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
      }
      return; // Exit if no survey needs to be shown
    }

    // Reset and load question only if the survey type changed or it's the first load
    // or if we explicitly want to restart (e.g., if currentQuestionIndex was not 0)
    // For simplicity now, we always reset if a survey is to be shown by this logic path.
    this.resetAndLoadFirstQuestion();
  }


  resetAndLoadFirstQuestion(): void {
    this.currentQuestionIndex = 0;
    this.activeSurveyQuestions.forEach(q => q.answer = null); // Reset answers for the active survey
    this.loadActiveQuestion();
  }

  loadActiveQuestion(): void {
    if (this.activeSurveyQuestions && this.activeSurveyQuestions.length > 0 && this.currentQuestionIndex < this.activeSurveyQuestions.length) {
      this.currentQuestion = this.activeSurveyQuestions[this.currentQuestionIndex];
    } else {
      this.currentQuestion = undefined;
      // Potentially handle case where index is out of bounds or no questions
      if (this.activeSurveyQuestions.length > 0) { // All questions answered
        console.log("Attempted to load question beyond survey length. Potentially submit.");
        // this.submitActiveSurvey(); // Or handle this state differently
      }
    }
  }

  selectAnswerAndProceed(selectedChoiceId: string): void {
    if (!this.currentQuestion) return;

    this.currentQuestion.answer = selectedChoiceId;
    // console.log(`Survey [${this.currentSurveyType}] - Question ${this.currentQuestion.id} answered with: ${selectedChoiceId}`);

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
    if (!this.currentSurveyType) return;

    console.log(`Survey [${this.currentSurveyType}] Submitted!`);
    // ... (logging answers) ...

    if (this.currentSurveyType === SurveyType.InitialRiskSurvey) {
      localStorage.setItem('initialSurveyCompleted', 'true');
      this.router.navigate(['/link-bank'], { replaceUrl: true });
    } else if (this.currentSurveyType === SurveyType.InvestmentSetup) {
      localStorage.setItem('investmentSurveyCompleted', 'true');
      this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
    }
  }

  get totalQuestionsInActiveSurvey(): number {
    return this.activeSurveyQuestions.length;
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}