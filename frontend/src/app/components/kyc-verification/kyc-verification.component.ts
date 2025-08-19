// src/app/components/kyc-verification/kyc-verification.component.ts

import { Component } from '@angular/core';
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
export class KycVerificationComponent {
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController
  ) {}

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
    this.router.navigate(['/link-bank'], { replaceUrl: true});
  }

}