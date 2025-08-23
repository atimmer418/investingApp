// src/app/components/kyc-verification/kyc-verification.component.ts

import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner, 
  IonText, IonProgressBar, IonIcon, NavController
} from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { KycService, KycVerificationRequest } from '../../services/kyc.service';
import { PersonaClient, PersonaClientConfig } from '../../../types/persona';

@Component({
  selector: 'app-kyc-verification',
  templateUrl: './kyc-verification.component.html',
  styleUrls: ['./kyc-verification.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner,
    IonText, IonProgressBar, IonIcon
  ]
})
export class KycVerificationComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  private routeSub: Subscription | null = null;
  private personaClient: PersonaClient | null = null;
  private currentReferenceId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private kycService: KycService
  ) {}

  ngOnInit() {
    // Check if user already has successful KYC verification
    this.checkExistingVerification();
  }

  ngOnDestroy() {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    // Clean up Persona client
    if (this.personaClient) {
      try {
        this.personaClient.exit(true);
      } catch (error) {
        console.warn('Error cleaning up Persona client:', error);
      }
    }
  }

  private checkExistingVerification() {
    this.isLoading = true;
    this.kycService.getVerificationStatus().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.hasVerification && response.status === 'completed' && response.verificationResult === 'passed') {
          this.successMessage = 'Identity verification already completed successfully.';
          setTimeout(() => {
            this.continueToNextStep();
          }, 2000);
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.warn('Could not check existing verification status:', error);
        // Continue with verification process if status check fails
      }
    });
  }

  startVerification() {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    // Start KYC verification process
    this.kycService.startVerification().subscribe({
      next: (response) => {
        this.currentReferenceId = response.referenceId;
        this.initializePersonaClient(response.referenceId);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to start verification process';
        console.error('Error starting KYC verification:', error);
      }
    });
  }

  private initializePersonaClient(referenceId: string) {
    // Check if Persona SDK is loaded
    if (!window.Persona) {
      this.isLoading = false;
      this.errorMessage = 'Verification service is not available. Please refresh the page and try again.';
      return;
    }

    const config: PersonaClientConfig = {
      templateId: environment.persona.templateId,
      environmentId: environment.persona.environmentId,
      referenceId: referenceId,
      onReady: () => {
        console.log('Persona client ready');
        this.isLoading = false;
      },
      onComplete: (inquiryId: string, status: string, fields: any) => {
        console.log('Persona verification completed:', { inquiryId, status, fields });
        this.handleVerificationComplete(inquiryId, status, fields);
      },
      onCancel: (inquiryId: string, sessionToken: string) => {
        console.log('Persona verification canceled:', { inquiryId, sessionToken });
        this.handleVerificationCancel(inquiryId);
      },
      onError: (error) => {
        console.error('Persona verification error:', error);
        this.handleVerificationError(error);
      }
    };

    try {
      this.personaClient = new window.Persona.Client(config);
      this.personaClient.open();
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = 'Failed to initialize verification. Please try again.';
      console.error('Error initializing Persona client:', error);
    }
  }

  private handleVerificationComplete(inquiryId: string, status: string, fields: any) {
    if (!this.currentReferenceId) {
      this.errorMessage = 'Verification reference ID is missing. Please try again.';
      return;
    }

    this.isLoading = true;
    this.successMessage = 'Processing verification results...';

    const request: KycVerificationRequest = {
      referenceId: this.currentReferenceId,
      personaInquiryId: inquiryId,
      status: 'completed',
      verificationResult: status,
      personaResponse: JSON.stringify({ inquiryId, status, fields }),
      identityVerified: status === 'passed' || status === 'completed',
      addressVerified: status === 'passed' || status === 'completed',
      pepScreeningPassed: status === 'passed' || status === 'completed'
    };

    this.kycService.submitVerificationResult(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.verificationResult === 'passed') {
          this.successMessage = 'Identity verification completed successfully!';
          setTimeout(() => {
            this.continueToNextStep();
          }, 2000);
        } else if (response.verificationResult === 'needs_review') {
          this.errorMessage = 'Your verification is under review. We\'ll contact you once the review is complete.';
        } else {
          this.errorMessage = 'Verification failed. Please ensure your documents are clear and try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to process verification results';
        console.error('Error submitting verification results:', error);
      }
    });
  }

  private handleVerificationCancel(inquiryId?: string) {
    if (!this.currentReferenceId) {
      this.errorMessage = 'Verification was canceled.';
      return;
    }

    const request: KycVerificationRequest = {
      referenceId: this.currentReferenceId,
      personaInquiryId: inquiryId,
      status: 'canceled',
      failureReason: 'User canceled verification process'
    };

    this.kycService.submitVerificationResult(request).subscribe({
      next: () => {
        this.errorMessage = 'Verification was canceled. You can restart the process anytime.';
      },
      error: (error) => {
        console.error('Error updating canceled verification:', error);
        this.errorMessage = 'Verification was canceled.';
      }
    });
  }

  private handleVerificationError(error: any) {
    if (!this.currentReferenceId) {
      this.errorMessage = error.message || 'Verification failed due to an error.';
      return;
    }

    const request: KycVerificationRequest = {
      referenceId: this.currentReferenceId,
      status: 'failed',
      failureReason: error.message || 'Unknown error during verification',
      personaResponse: JSON.stringify(error)
    };

    this.kycService.submitVerificationResult(request).subscribe({
      next: () => {
        this.errorMessage = 'Verification failed due to a technical error. Please try again.';
      },
      error: (submitError) => {
        console.error('Error updating failed verification:', submitError);
        this.errorMessage = 'Verification failed. Please try again.';
      }
    });
  }

  private continueToNextStep() {
    // Navigate to the next step (link-bank component)
    this.router.navigate(['/link-bank'], { replaceUrl: true });
  }
}