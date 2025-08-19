// src/app/components/kyc-verification/kyc-verification.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner, 
  IonText, IonProgressBar, IonBackButton, IonButtons, IonIcon, NavController
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-kyc-verification',
  templateUrl: './kyc-verification.component.html',
  styleUrls: ['./kyc-verification.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner,
    IonText, IonProgressBar, IonBackButton, IonButtons, IonIcon
  ]
})
export class KycVerificationComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  hasRequiredParams: boolean = false;

  // Store parameters that need to be passed to next step
  planId: string | null = null;
  timeToFI: string | null = null;
  targetPortfolio: number | null = null;
  retirementIncome: number | null = null;
  monthlyInvestment: number | null = null;

  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    // Extract parameters from route query params (passed from authfinalize)
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const pParam = params.get('p');
      const rIParam = params.get('rI');
      const mIParam = params.get('mI');

      this.planId = params.get('plan');
      this.timeToFI = params.get('t');
      this.targetPortfolio = pParam !== null ? +pParam : null;
      this.retirementIncome = rIParam !== null ? +rIParam : null;
      this.monthlyInvestment = mIParam !== null ? +mIParam : null;

      // Check if we have all required parameters
      this.hasRequiredParams = !!(
        this.planId && 
        this.timeToFI && 
        this.targetPortfolio !== null && 
        this.retirementIncome !== null && 
        this.monthlyInvestment !== null
      );

      if (!this.hasRequiredParams) {
        console.warn('KYC Verification: Missing required parameters from route');
      }
    });
  }

  startVerification() {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    // For now, simulate the verification process since we're not implementing Persona yet
    // In a real implementation, this would initialize the Persona embedded flow
    setTimeout(() => {
      this.isLoading = false;
      this.successMessage = 'Identity verification will be implemented in the next phase.';
      
      // After a brief delay, continue to the next step
      setTimeout(() => {
        this.continueToSurvey();
      }, 1500);
    }, 2000);
  }

  private continueToSurvey() {
    // Navigate to the survey page with all required parameters
    if (this.hasRequiredParams) {
      this.router.navigate(['/survey'], {
        queryParams: {
          plan: this.planId,
          t: this.timeToFI,
          p: this.targetPortfolio,
          rI: this.retirementIncome,
          mI: this.monthlyInvestment
        },
        replaceUrl: true
      });
    } else {
      // If we don't have parameters, just navigate to survey without them
      this.router.navigate(['/survey'], { replaceUrl: true });
    }
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
  }
}