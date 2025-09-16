// src/app/pages/survey/survey.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonProgressBar, IonIcon, IonSpinner, IonButton
} from '@ionic/angular/standalone';

import { AuthService } from '../../services/auth.service';

// Simplified interfaces for the new flow
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

// Simplified enum
enum SurveyType {
  StockPreferences = 'Stock Preferences'
}

@Component({
  selector: 'app-survey',
  templateUrl: './survey.component.html',
  styleUrls: ['./survey.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonProgressBar, IonIcon, IonSpinner, IonButton
  ]
})
export class SurveyComponent implements OnInit {
  // Simplified stock preference questions
  private stockPreferenceQuestions: SurveyQuestion[] = [
    {
      id: 'sq1_stock_preference',
      questionText: "How would you like to choose your investments?",
      responseChoices: [
        {id: 's1', text: "I'll go with the default investments"},
        {id: 's2', text: "I'll go with the default investments but also pick some stocks myself"},
        {id: 's3', text: "I'll pick all my investments"}
      ],
      answer: null
    }
  ];

  public SurveyType = SurveyType;
  
  activeSurveyQuestions: SurveyQuestion[] = [];
  currentQuestionIndex: number = 0;
  currentQuestion: SurveyQuestion | undefined;
  currentSurveyType: SurveyType | null = null;

  isSubmittingSurvey: boolean = false;

  // User's financial data from initial survey
  userMonthlyInvestmentAmount: number = 0;
  userTargetPortfolio: number = 0;
  userTimeToFI: number = 0;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('[SurveyComponent] ngOnInit - Initializing Stock Preference Survey.');
    this.loadUserFinancialData();
    this.initializeStockPreferenceSurvey();
  }

  loadUserFinancialData(): void {
    // Get user's financial data from their progress
    const userProgress = this.authService.getCurrentProgress();
    if (userProgress && userProgress.monthlyInvestment) {
      this.userMonthlyInvestmentAmount = userProgress.monthlyInvestment;
      console.log('[SurveyComponent] Loaded user monthly investment amount:', this.userMonthlyInvestmentAmount);
    } else {
      console.log('[SurveyComponent] No monthly investment amount found in user progress');
    }

    // For now, we'll calculate these from the monthly investment
    // In a real app, these might be stored separately or calculated server-side
    if (this.userMonthlyInvestmentAmount > 0) {
      // Estimate target portfolio using 4% rule and monthly investment
      // This is a simplified calculation - actual FI calculations are more complex
      const annualInvestment = this.userMonthlyInvestmentAmount * 12;
      this.userTargetPortfolio = annualInvestment * 25; // Rough 4% rule estimate
      this.userTimeToFI = 25; // Simplified estimate
    }
  }

  initializeStockPreferenceSurvey(): void {
    this.currentSurveyType = SurveyType.StockPreferences;
    this.activeSurveyQuestions = [...this.stockPreferenceQuestions];
    this.currentQuestionIndex = 0;
    this.currentQuestion = this.activeSurveyQuestions[0];
    console.log('[SurveyComponent] Initialized Stock Preference Survey with', this.activeSurveyQuestions.length, 'questions');
  }

  selectChoice(choiceId: string): void {
    if (this.currentQuestion) {
      this.currentQuestion.answer = choiceId;
      console.log(`[SurveyComponent] Selected choice: ${choiceId} for question: ${this.currentQuestion.id}`);
    }
  }

  isChoiceSelected(choiceId: string): boolean {
    return this.currentQuestion?.answer === choiceId;
  }

  goToNextQuestion(): void {
    if (this.currentQuestionIndex < this.activeSurveyQuestions.length - 1) {
      this.currentQuestionIndex++;
      this.currentQuestion = this.activeSurveyQuestions[this.currentQuestionIndex];
      console.log(`[SurveyComponent] Advanced to question ${this.currentQuestionIndex + 1}: ${this.currentQuestion.id}`);
    } else {
      this.submitActiveSurvey();
    }
  }

  goToPreviousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.currentQuestion = this.activeSurveyQuestions[this.currentQuestionIndex];
      console.log(`[SurveyComponent] Went back to question ${this.currentQuestionIndex + 1}: ${this.currentQuestion.id}`);
    }
  }

  canProceed(): boolean {
    if (!this.currentQuestion) return false;
    return this.currentQuestion.answer !== null;
  }

  submitActiveSurvey(): void {
    console.log('[SurveyComponent] Submitting Investment Setup Survey');
    this.isSubmittingSurvey = true;

    // Collect all answers
    const surveyAnswers = {
      stockPreference: this.activeSurveyQuestions.find(q => q.id === 'sq1_stock_preference')?.answer
    };

    console.log('[SurveyComponent] Survey answers:', surveyAnswers);

    // TODO: Send survey answers to backend API
    // For now, simulate API call
    setTimeout(() => {
      this.isSubmittingSurvey = false;
      this.proceedToStockPreferenceDecision();
    }, 1000);
  }

  proceedToStockPreferenceDecision(): void {
    const stockPreference = this.activeSurveyQuestions.find(q => q.id === 'sq1_stock_preference')?.answer;
    
    console.log('[SurveyComponent] Processing stock preference decision:', stockPreference);

    // Navigate based on user's stock preference choice
    if (stockPreference === 's1') {
      // Default investments only - go to confirmation
      console.log('[SurveyComponent] User chose default investments only');
      this.router.navigate(['/confirm-investment']);
    } else if (stockPreference === 's2') {
      // Default + custom stocks - go to stock selection but mark as optional
      console.log('[SurveyComponent] User chose default + custom stocks');
      this.router.navigate(['/stock-selection'], { queryParams: { mode: 'optional' } });
    } else if (stockPreference === 's3') {
      // All custom investments - go to stock selection as required
      console.log('[SurveyComponent] User chose all custom investments');
      this.router.navigate(['/stock-selection'], { queryParams: { mode: 'required' } });
    } else {
      // Fallback to default path
      console.log('[SurveyComponent] No clear stock preference, defaulting to confirmation');
      this.router.navigate(['/confirm-investment']);
    }
  }

  get totalQuestionsInActiveSurvey(): number {
    return this.activeSurveyQuestions.length;
  }

  get progressPercentage(): number {
    return ((this.currentQuestionIndex + 1) / this.totalQuestionsInActiveSurvey) * 100;
  }
}