// src/app/components/kyc-verification/kyc-verification.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner, 
  IonText, IonIcon, IonProgressBar, NavController
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-kyc-verification',
  templateUrl: './kyc-verification.component.html',
  styleUrls: ['./kyc-verification.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner,
    IonText, IonIcon, IonProgressBar
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
    private navCtrl: NavController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Mark this step as incomplete when user enters/returns to this page
    this.authService.markStepIncomplete('kycVerification').subscribe({
      next: () => console.log('KycVerification step marked as incomplete'),
      error: (err) => console.error('Failed to mark KycVerification step as incomplete:', err)
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
    // Complete the kycVerification step
    this.authService.completeStep('kycVerification').subscribe({
      next: () => {
        console.log('KycVerification step completed successfully');
        // Navigate to the survey page with all required parameters
        this.router.navigate(['/link-bank'], { replaceUrl: true});
      },
      error: (err) => {
        console.error('Failed to complete KycVerification step:', err);
        // Still navigate even if progress update fails
        this.router.navigate(['/link-bank'], { replaceUrl: true});
      }
    });
  }

}