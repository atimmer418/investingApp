import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
export class SurveyComponent implements OnInit {
  private initialRiskSurveyQuestions: SurveyQuestion[] = [
    {
      id: 'q1', questionText: "What is your primary investment goal?", responseChoices: [
        { id: 'g1', text: "Long-term Growth" }, { id: 'g2', text: "Generating Income" }, { id: 'g3', text: "Capital Preservation" }
      ], answer: null
    },
    {
      id: 'q2', questionText: "How would you describe your risk tolerance?", responseChoices: [
        { id: 'r1', text: "Low" }, { id: 'r2', text: "Medium" }, { id: 'r3', text: "High" }
      ], answer: null
    },
    {
      id: 'q3', questionText: "What's your favorite investment type?", responseChoices: [
        { id: 'i1', text: "Stocks" }, { id: 'i2', text: "Bonds" }, { id: 'i3', text: "Real Estate" }
      ], answer: null
    }
  ];

  private investmentSetupQuestions: SurveyQuestion[] = [
    {
      id: 'iq1', questionText: "How much do you want to take out of your paycheck each month?", responseChoices: [
        { id: 'p1', text: "10%" }, { id: 'p2', text: "20%" }, { id: 'p3', text: "30%" }
      ], answer: null
    },
    {
      id: 'iq2', questionText: "Do you want to let all the stocks be picked automatically or would you like to include some of your own?", responseChoices: [
        { id: 's1', text: "You pick them all for me (you can always add stocks you like later)" },
        { id: 's2', text: "You pick some and I pick some" }, { id: 's3', text: "I pick them all" }
      ], answer: null
    }
  ];

  activeSurveyQuestions: SurveyQuestion[] = []; // This will hold the questions for the currently active survey
  currentQuestionIndex: number = 0;
  currentQuestion: SurveyQuestion | undefined;
  currentSurveyType: SurveyType | null = null;

  constructor(private router: Router) { }

  ngOnInit(): void {
    const investmentSurveyCompleted = localStorage.getItem('investmentSurvey') === 'true';
    const initialSurveyCompleted = localStorage.getItem('initialSurveyCompleted') === 'true';
    const linkplaidCompleted = localStorage.getItem('linkplaidCompleted') === 'true';

    if (linkplaidCompleted && initialSurveyCompleted && !investmentSurveyCompleted) {
      this.currentSurveyType = SurveyType.InvestmentSetup;
      this.activeSurveyQuestions = [...this.investmentSetupQuestions]; // Use a copy
    } else if (!initialSurveyCompleted) {
      this.currentSurveyType = SurveyType.InitialRiskSurvey;
      this.activeSurveyQuestions = [...this.initialRiskSurveyQuestions]; // Use a copy
    } else {
      // Both surveys completed, or some other state - navigate away or show completion
      console.log("All surveys completed or invalid state.");
      this.router.navigate(['/tabs/tab1']); // Or a dashboard
      return;
    }
    this.resetAndLoadFirstQuestion();
  }

  resetAndLoadFirstQuestion(): void {
    this.currentQuestionIndex = 0;
    // Reset answers if re-taking or starting a new survey type
    this.activeSurveyQuestions.forEach(q => q.answer = null);
    this.loadActiveQuestion();
  }

  loadActiveQuestion(): void {
    if (this.activeSurveyQuestions && this.activeSurveyQuestions.length > 0) {
      this.currentQuestion = this.activeSurveyQuestions[this.currentQuestionIndex];
    } else {
      this.currentQuestion = undefined;
    }
  }

  selectAnswerAndProceed(selectedChoiceId: string): void {
    if (!this.currentQuestion) return;

    this.currentQuestion.answer = selectedChoiceId;
    console.log(`Survey [${this.currentSurveyType}] - Question ${this.currentQuestion.id} answered with: ${selectedChoiceId}`);

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
    return this.currentQuestionIndex >= this.activeSurveyQuestions.length - 1;
  }

  submitActiveSurvey(): void {
    if (!this.currentSurveyType) return;

    console.log(`Survey [${this.currentSurveyType}] Submitted!`);
    console.log('Answers:');
    this.activeSurveyQuestions.forEach(q => {
      const choice = q.responseChoices.find(c => c.id === q.answer);
      console.log(`  Question '${q.questionText}': Answered with '${choice ? choice.text : 'N/A'}' (ID: ${q.answer})`);
    });

    if (this.currentSurveyType === SurveyType.InitialRiskSurvey) {
      localStorage.setItem('initialSurveyCompleted', 'true');
      // Now, the user needs to link Plaid.
      // The app's main navigation logic (e.g., in AppComponent or a guard)
      // should then direct them to Plaid linking.
      // If this survey component is shown via a route, it should navigate away.
      this.router.navigate(['/link-bank']); // Navigate to Plaid linking page
    } else if (this.currentSurveyType === SurveyType.InvestmentSetup) {
      localStorage.setItem('investmentSetupCompleted', 'true');
      // Investment setup done, navigate to dashboard or main app area
      this.router.navigate(['/tabs/tab1']); // Or a dashboard page
    }
  }

  // For the template to display progress correctly
  get totalQuestionsInActiveSurvey(): number {
    return this.activeSurveyQuestions.length;
  }
}