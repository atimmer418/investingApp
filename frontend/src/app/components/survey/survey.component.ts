
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Option {
  text: string;
  score: number;
}

interface Question {
  questionText: string;
  options: Option[];
}

@Component({
  selector: 'app-survey',
  templateUrl: './survey.component.html',
  styleUrls: ['./survey.component.scss'],
})
export class SurveyComponent implements OnInit {
  surveyQuestions: Question[] = [];
  currentQuestionIndex: number = 0;
  totalScore: number = 0;

  // Manually parsed questions from risk_assessment_survey.txt
  private allQuestions: Question[] = [
    {
      questionText: "1. What is your primary investment goal?",
      options: [
        { text: "Preserving my initial capital with minimal risk.", score: 1 },
        { text: "Generating a steady stream of income, with some capital growth.", score: 2 },
        { text: "Achieving significant capital growth, even if it means taking on higher risk.", score: 3 },
        { text: "Maximizing returns through aggressive growth strategies, understanding this involves substantial risk.", score: 4 }
      ]
    },
    {
      questionText: "2. How long do you plan to keep your money invested before needing to access a significant portion of it?",
      options: [
        { text: "Less than 3 years.", score: 1 },
        { text: "3 to 5 years.", score: 2 },
        { text: "6 to 10 years.", score: 3 },
        { text: "More than 10 years.", score: 4 }
      ]
    },
    {
      questionText: "3. How would you describe your knowledge of investments and financial markets?",
      options: [
        { text: "Limited: I am new to investing and have minimal understanding of financial markets.", score: 1 },
        { text: "Basic: I have some understanding of basic investment concepts.", score: 2 },
        { text: "Good: I am comfortable with most investment concepts and have some experience.", score: 3 },
        { text: "Extensive: I have a strong understanding of complex investment strategies and financial markets.", score: 4 }
      ]
    },
    {
      questionText: "4. Imagine your investment portfolio lost 20% of its value in a short period due to market fluctuations. How would you most likely react?",
      options: [
        { text: "Sell all or most of my investments to avoid further losses.", score: 1 },
        { text: "Sell some of my investments and move into more conservative options.", score: 2 },
        { text: "Hold onto my investments and wait for the market to recover.", score: 3 },
        { text: "View it as a buying opportunity and consider investing more.", score: 4 }
      ]
    },
    {
      questionText: "5. What percentage of your total liquid assets are you comfortable investing in moderate to high-risk investments?",
      options: [
        { text: "Less than 10%.", score: 1 },
        { text: "10% to 25%.", score: 2 },
        { text: "26% to 50%.", score: 3 },
        { text: "More than 50%.", score: 4 }
      ]
    },
    {
      questionText: "6. When considering a new investment opportunity, which factor is most important to you?",
      options: [
        { text: "Low risk and high security of funds.", score: 1 },
        { text: "A balance between risk and potential return.", score: 2 },
        { text: "High potential returns, even if it comes with higher risk.", score: 3 },
        { text: "Innovative or cutting-edge potential, accepting of speculative risks.", score: 4 }
      ]
    },
    {
      questionText: "7. How stable is your current and future income (e.g., salary, business income)?",
      options: [
        { text: "Not very stable; I expect significant fluctuations.", score: 1 },
        { text: "Moderately stable; some fluctuations are possible.", score: 2 },
        { text: "Stable; I expect it to remain consistent.", score: 3 },
        { text: "Very stable and likely to increase.", score: 4 }
      ]
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadSurvey();
  }

  loadSurvey(): void {
    // In a real application, you might fetch this from a service or a file
    this.surveyQuestions = this.allQuestions;
  }

  get currentQuestion(): Question | null {
    if (this.surveyQuestions.length > 0 && this.currentQuestionIndex < this.surveyQuestions.length) {
      return this.surveyQuestions[this.currentQuestionIndex];
    }
    return null;
  }

  selectAnswer(selectedOption: Option): void {
    if (!this.currentQuestion) {
      return; // Should not happen if surveyQuestions is populated
    }

    this.totalScore += selectedOption.score;
    this.nextQuestion();
  }

  nextQuestion(): void {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex >= this.surveyQuestions.length) {
      this.navigateToResults();
    }
  }

  navigateToResults(): void {
    localStorage.setItem('surveyCompleted', 'true');
    // Navigate to the results page with the total score
    // The actual route and how parameters are passed might depend on your app's routing setup
    this.router.navigate(['/survey-results'], { queryParams: { score: this.totalScore } });
  }
}
