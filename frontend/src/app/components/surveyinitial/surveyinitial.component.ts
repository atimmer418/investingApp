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
  // Raw numeric values - these are the "source of truth"
  monthlyInvestment: number = 7000;
  retirementIncome: number = 100000;

  // Formatted string values for display only
  formattedMonthlyInvestment: string = '7,000';
  formattedRetirementIncome: string = '100,000';

  // The dynamic result property
  timeToIndependence: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    // Set initial formatted values and calculate timeline once
    this.updateFormattedValues();
    this.calculateTimeline();
  }

  // --- NEW: Specific Slider Handlers ---
  // The Fix: This function is now specific to the monthly investment slider
  onMonthlySliderChange() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toLocaleString('en-US');
    this.calculateTimeline();
  }

  // The Fix: This function is now specific to the retirement income slider
  onIncomeSliderChange() {
    this.formattedRetirementIncome = this.retirementIncome.toLocaleString('en-US');
    this.calculateTimeline();
  }

  // --- Text Input Handlers (These were already good!) ---
  unformatMonthlyInvestment() {
    this.formattedMonthlyInvestment = this.monthlyInvestment.toString();
  }

  formatAndSetMonthlyInvestment() {
    const numericValue = parseInt(this.formattedMonthlyInvestment.replace(/,/g, ''), 10);
    this.monthlyInvestment = isNaN(numericValue) ? 100 : numericValue;
    this.updateFormattedValues(); // Use helper to format and calc
    this.calculateTimeline();
  }

  unformatRetirementIncome() {
    this.formattedRetirementIncome = this.retirementIncome.toString();
  }

  formatAndSetRetirementIncome() {
    const numericValue = parseInt(this.formattedRetirementIncome.replace(/,/g, ''), 10);
    this.retirementIncome = isNaN(numericValue) ? 40000 : numericValue;
    this.updateFormattedValues(); // Use helper to format and calc
    this.calculateTimeline();
  }

  // Helper to keep formatted values in sync
  private updateFormattedValues() {
      this.formattedMonthlyInvestment = this.monthlyInvestment.toLocaleString('en-US');
      this.formattedRetirementIncome = this.retirementIncome.toLocaleString('en-US');
  }

  // --- The Core Calculation Logic (Unchanged) ---
  private calculateTimeline() {
    const SUSTAINABILITY_MULTIPLIER = 15;
    const annualReturn = 0.08;
    const targetPortfolio = this.retirementIncome * SUSTAINABILITY_MULTIPLIER;
    const monthlyReturn = annualReturn / 12;
    const numberOfMonths = Math.log((targetPortfolio * monthlyReturn / this.monthlyInvestment) + 1) / Math.log(1 + monthlyReturn);
    const years = numberOfMonths / 12;
    this.timeToIndependence = isFinite(years) ? years.toFixed(1) : '∞';
  }

  // --- The Final Action ---
  continueToLinking() {
    console.log('Continuing to bank linking with:', {
      monthly: this.monthlyInvestment,
      annual: this.retirementIncome,
    });
    // Navigate to the next step, e.g., linking a bank account
    this.router.navigate(['/link-account']);
  }
}