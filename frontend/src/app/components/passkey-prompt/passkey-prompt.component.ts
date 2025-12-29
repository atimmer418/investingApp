import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { PasskeyService } from '../../services/passkey.service';
import { get } from '@github/webauthn-json';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { lockClosedOutline, fingerPrintOutline } from 'ionicons/icons';

@Component({
  selector: 'app-passkey-prompt',
  templateUrl: './passkey-prompt.component.html',
  styleUrls: ['./passkey-prompt.component.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton, IonSpinner]
})
export class PasskeyPromptComponent implements OnInit {

  isUnlocking = false;

  constructor(
    private modalController: ModalController,
    private passkeyService: PasskeyService,
    private authService: AuthService,
    private toastController: ToastController
  ) { 
    addIcons({ lockClosedOutline, fingerPrintOutline });
  }

  ngOnInit() {
    // Auto-trigger authentication when the modal opens
    this.authenticate();
  }

  async authenticate() {
    if (this.isUnlocking) return;
    this.isUnlocking = true;

    this.passkeyService.startAuthentication().subscribe({
      next: async (response) => {
        try {
          console.log('🔍 [PasskeyPrompt] Start response:', response);
          
          let requestOptions;
          if (typeof response.requestOptions === 'string') {
            requestOptions = JSON.parse(response.requestOptions);
          } else {
            requestOptions = response.requestOptions;
          }

          console.log('🔍 [PasskeyPrompt] Parsed options:', requestOptions);

          // Handle structure where challenge is inside publicKey
          const challenge = requestOptions.challenge || (requestOptions.publicKey && requestOptions.publicKey.challenge);

          // Ensure challenge exists
          if (!challenge) {
            throw new Error('Missing key: challenge in request options');
          }
          
          // Trigger the browser/device WebAuthn prompt
          // If requestOptions already has publicKey, pass it directly. 
          // Otherwise wrap it (legacy behavior if backend returned just the inner part)
          const credential = requestOptions.publicKey ? 
              await get(requestOptions) : 
              await get({ publicKey: requestOptions });
          
          // Send the credential back to the server
          this.passkeyService.finishAuthentication(credential, response.sessionId).subscribe({
            next: (finishResponse) => {
              if (finishResponse.success) {
                this.showToast('Authentication successful', 'success');
                this.modalController.dismiss({ authenticated: true });
              } else {
                this.showToast('Authentication failed: ' + finishResponse.message, 'danger');
                this.isUnlocking = false;
              }
            },
            error: (err) => {
              console.error('Passkey finish error', err);
              this.showToast('Authentication failed. Please try again.', 'danger');
              this.isUnlocking = false;
            }
          });
        } catch (error) {
          console.error('WebAuthn error', error);
          // User might have cancelled the prompt
          // Don't show toast for cancellation to avoid annoyance on auto-prompt
          // this.showToast('Authentication cancelled or failed.', 'warning');
          this.isUnlocking = false;
        }
      },
      error: (err) => {
        console.error('Passkey start error', err);
        this.showToast('Could not start authentication.', 'danger');
        this.isUnlocking = false;
      }
    });
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}
