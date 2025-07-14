import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonProgressBar,
  IonInput,
  IonRange,
  IonButton,
  IonFooter,
  IonButtons,
  IonBackButton,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-surveyinitial',
  templateUrl: './surveyinitial.component.html',
  styleUrls: ['./surveyinitial.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonProgressBar,
    IonInput,
    IonRange,
    IonButton,
    IonFooter,
    IonButtons,
    IonBackButton,
  ],
})
export class SurveyInitialComponent implements OnInit {
  // Raw numeric values for calculation
  monthlyInvestment: number = 500;
  retirementIncome: number = 85000;

  // Formatted string values for display
  formattedMonthlyInvestment: string = '500';
  formattedRetirementIncome: string = '85,000';

  constructor(private router: Router) {}

  ngOnInit() {
    // Set initial formatted values
    this.formatAndSetMonthlyInvestment();
    this.formatAndSetRetirementIncome();
  }

  // --- Monthly Investment Handlers ---
  onMonthlyInvestmentChange() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toLocaleString('en-US');
  }

  unformatMonthlyInvestment() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toString();
  }

  formatAndSetMonthlyInvestment() {
    const numericValue = parseInt(this.formattedMonthlyInvestment.replace(/,/g, ''), 10);
    this.monthlyInvestment = isNaN(numericValue) ? 100 : numericValue;
    this.formattedMonthlyInvestment = this.monthlyInvestment.toLocaleString('en-US');
  }

  // --- Retirement Income Handlers ---
  onRetirementIncomeChange() {
    this.formattedRetirementIncome = this.retirementIncome.toLocaleString('en-US');
  }

  unformatRetirementIncome() {
    this.formattedRetirementIncome = this.retirementIncome.toString();
  }

  formatAndSetRetirementIncome() {
    const numericValue = parseInt(this.formattedRetirementIncome.replace(/,/g, ''), 10);
    this.retirementIncome = isNaN(numericValue) ? 40000 : numericValue;
    this.formattedRetirementIncome = this.retirementIncome.toLocaleString('en-US');
  }

  calculateTimeline() {
    console.log('Calculating timeline with:', {
      monthly: this.monthlyInvestment,
      annual: this.retirementIncome,
    });

    // Navigate to the results page, passing the values as query parameters
    this.router.navigate(['/results'], {
      queryParams: {
        x: this.retirementIncome,
        y: this.monthlyInvestment,
      },
    });
  }
}