import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonItem, IonLabel, IonInput, IonButton, IonNote, IonSpinner, IonToast, IonIcon
} from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { PasskeyService } from '../../services/passkey.service';
import { PinService } from '../../services/pin.service';
import { JwtTokenUtils } from '../../utils/jwt-token.utils';
import { addIcons } from 'ionicons';
import { mailOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-change-email',
  templateUrl: './change-email.page.html',
  styleUrls: ['./change-email.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
    IonItem, IonLabel, IonInput, IonButton, IonNote, IonSpinner, IonToast, IonIcon
  ]
})
export class ChangeEmailPage implements OnInit {
  currentEmail: string = '';
  newEmail: string = '';
  confirmEmail: string = '';
  
  isLoading = false;
  errorMessage: string = '';
  
  isToastOpen = false;
  toastMessage = '';
  toastColor = 'success';

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private passkeyService: PasskeyService,
    private pinService: PinService
  ) {
    addIcons({ mailOutline, alertCircleOutline });
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
           this.confirmEmail.length > 0 && 
           this.newEmail === this.confirmEmail &&
           this.isValidEmail(this.newEmail) &&
           this.newEmail !== this.currentEmail;
  }

  async saveEmail() {
    if (!this.canSave()) return;

    this.isLoading = true;
    this.errorMessage = '';

    // Step 1: Re-authenticate with PIN if enabled
    const hasPin = await this.pinService.hasPin();

    if (hasPin) {
      const verified = await this.pinService.promptPin('verify');
      if (!verified) {
        this.isLoading = false;
        this.errorMessage = 'Authentication required to change email.';
        this.showToast(this.errorMessage, 'warning');
        return;
      }
    }

    // Step 2: Proceed with Email Update
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
              // Update JWT token as well since it contains the email
              JwtTokenUtils.storeJwtToken(response.jwtToken, undefined, response.newEmail);
            }

            this.showToast('Email updated successfully', 'success');
            
            // Navigate back after a short delay
            setTimeout(() => {
              this.router.navigate(['/security-settings']);
            }, 1500);
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Error updating email:', error);
            this.errorMessage = error.error?.message || 'Failed to update email. Please try again.';
            this.showToast(this.errorMessage, 'danger');
          }
        });
  }

  // Helper methods for WebAuthn
  private base64urlToArrayBuffer(base64url: string): ArrayBuffer {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) { base64 += '='; }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
    return bytes.buffer;
  }

  private arrayBufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private credentialToJson(credential: any): any {
    return {
      id: credential.id,
      rawId: this.arrayBufferToBase64url(credential.rawId),
      response: {
        authenticatorData: this.arrayBufferToBase64url(credential.response.authenticatorData),
        clientDataJSON: this.arrayBufferToBase64url(credential.response.clientDataJSON),
        signature: this.arrayBufferToBase64url(credential.response.signature),
        userHandle: credential.response.userHandle ? this.arrayBufferToBase64url(credential.response.userHandle) : null
      },
      type: credential.type,
      clientExtensionResults: credential.getClientExtensionResults()
    };
  }

  showToast(message: string, color: string) {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
  }
}
