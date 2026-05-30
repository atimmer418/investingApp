import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonContent,
  IonInput, IonSpinner
} from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { PasskeyService } from '../../services/passkey.service';
import { PinService } from '../../services/pin.service';
import { ToastService } from '../../services/toast.service';
import { JwtTokenUtils } from '../../utils/jwt-token.utils';
import { addIcons } from 'ionicons';
import { mailOutline, alertCircleOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { get } from '@github/webauthn-json';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-change-email',
  templateUrl: './change-email.page.html',
  styleUrls: ['./change-email.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonHeader, IonToolbar, IonContent,
    IonInput, IonSpinner
  ]
})
export class ChangeEmailPage implements OnInit {
  currentEmail: string = '';
  newEmail: string = '';
  
  isLoading = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private passkeyService: PasskeyService,
    private pinService: PinService,
    private toastService: ToastService,
    private navCtrl: NavController
  ) {
    addIcons({ mailOutline, alertCircleOutline, shieldCheckmarkOutline });
  }

  goBack() {
    this.navCtrl.navigateBack('/security-settings');
  }

  ngOnInit() {
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      this.currentEmail = storedEmail;
    }
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  canSave(): boolean {
    return this.newEmail.length > 0 && 
           this.isValidEmail(this.newEmail) &&
           this.newEmail !== this.currentEmail;
  }

  async initiateEmailChange() {
    if (!this.canSave()) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // 1. Try Biometric / Passkey Re-authentication first
      await this.performBiometricVerification();
      
      // 2. If successful, proceed to update email
      await this.performEmailUpdate();

    } catch (error: any) {
      console.error('Biometric Verification Failed:', error);
      
      // Fallback: If biometrics fail or not available, allow PIN as backup check
      // This is a UX fallback.
      if (await this.pinService.hasPin()) {
         try {
            const pinVerified = await this.pinService.promptPin('verify');
            if (pinVerified) {
                await this.performEmailUpdate();
                return;
            }
         } catch (pinError) {
             console.error('PIN verification failed', pinError);
         }
      }

      this.isLoading = false;
      this.errorMessage = 'Authentication required to update email.';
      this.toastService.showToast(this.errorMessage, 'danger');
    }
  }

  // Uses WebAuthn (Passkey) to re-verify user presence
  private async performBiometricVerification(): Promise<void> {
    try {
      // Get challenge from backend
      const startResponse = await firstValueFrom(this.passkeyService.startAuthentication());
      
      let requestOptions;
      if (typeof startResponse.requestOptions === 'string') {
        requestOptions = JSON.parse(startResponse.requestOptions);
      } else {
        requestOptions = startResponse.requestOptions;
      }

      // Handle structure where challenge is inside publicKey
      // This logic is copied from PasskeyPromptComponent to ensure consistency
      // The @github/webauthn-json library handles base64url decoding of challenge/id automatically
      if (!requestOptions.publicKey && requestOptions.challenge) {
          // If options are flat (legacy), wrap them
          requestOptions = { publicKey: requestOptions };
      }

      // Trigger the browser/device WebAuthn prompt using the library
      const credential = await get(requestOptions);

      // Verify the assertion with backend
      const finishResponse = await firstValueFrom(
          this.passkeyService.finishAuthentication(credential, startResponse.sessionId)
      );

      if (!finishResponse.success) {
         throw new Error('Backend verification failed: ' + (finishResponse.message || 'Unknown error'));
      }
      
      return; // Success
    } catch (e) {
      console.error('Biometric verification error:', e);
      throw e;
    }
  }

  private async performEmailUpdate() {
    const payload = {
      currentEmail: this.currentEmail,
      newEmail: this.newEmail
    };

    this.http.post<any>(`${environment.backendApiUrl}/user/update-email`, payload)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          
          // Update localStorage
          localStorage.setItem('userEmail', response.newEmail);
          if (response.jwtToken) {
            JwtTokenUtils.storeJwtToken(response.jwtToken, undefined, response.newEmail);
          }

          this.toastService.showToast('Email updated successfully', 'success');
          
          setTimeout(() => {
            this.router.navigate(['/security-settings']);
          }, 1500);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error updating email:', error);
          this.errorMessage = error.error?.message || 'Failed to update email.';
          this.toastService.showToast(this.errorMessage, 'danger');
        }
      });
  }

  // --- WebAuthn Helpers (Removed manual implementation) ---
}
