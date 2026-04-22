import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { PasskeyService } from '../../services/passkey.service';
import { get } from '@github/webauthn-json';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { NativePasskeyService } from '../../services/native-passkey.service';
import { JwtTokenUtils } from '../../utils/jwt-token.utils';
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

  /**
   * When provided, uses account-specific passkey auth (allowCredentials scoped to this user).
   * When absent, falls back to discoverable credentials (usernameless flow).
   */
  @Input() userEmail?: string;
  @Input() jwtExpired = false;
  isUnlocking = false;

  constructor(
    private modalController: ModalController,
    private passkeyService: PasskeyService,
    private authService: AuthService,
    private toastService: ToastService,
    private nativePasskeyService: NativePasskeyService
  ) {
    addIcons({ lockClosedOutline, fingerPrintOutline });
  }

  ngOnInit() {
    // No-op: authentication is triggered after modal render in ionViewDidEnter
  }

  /**
   * Fires after the modal enter animation completes, so the lock screen
   * is fully visible before we trigger the WebAuthn / biometric prompt.
   */
  ionViewDidEnter() {
    this.authenticate();
  }

  async authenticate() {
    if (this.isUnlocking) return;
    this.isUnlocking = true;

    // Always use the full FIDO2 ceremony (ASAuthorizationController on iOS, WebAuthn on web).
    // This guarantees the "Use passkey" sheet always appears, avoids the LAContext biometric
    // session cache (which can silently succeed with no visible UI), and always issues a fresh
    // JWT from the backend regardless of whether the current token is expired or still valid.
    const start$ = this.userEmail
      ? this.passkeyService.startAuthenticationForUser(this.userEmail)
      : this.passkeyService.startAuthentication();

    start$.subscribe({
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
          
          const publicKey = requestOptions.publicKey ?? requestOptions;
          const rpId = publicKey.rpId ?? publicKey.rp?.id;
          const userVerification = publicKey.userVerification;
          const allowedCredentials = (publicKey.allowCredentials ?? []).map((c: any) => ({ id: c.id }));

          let credential: any;
          if (this.nativePasskeyService.isAvailable) {
            credential = await this.nativePasskeyService.authenticate({
              challenge,
              rpId,
              userVerification,
              allowedCredentials
            });
          } else {
            credential = requestOptions.publicKey ?
              await get(requestOptions) :
              await get({ publicKey: requestOptions });
          }

          // Send the credential back to the server
          this.passkeyService.finishAuthentication(credential, response.sessionId).subscribe({
            next: (finishResponse) => {
              if (finishResponse.success) {
                // Always update auth state — stores fresh JWT, sets isLoggedIn, loads DB progress.
                // Needed whether JWT was expired (resumes navigation) or still valid (refreshes token).
                this.authService.handleSuccessfulAuthentication(
                  finishResponse.jwtToken,
                  finishResponse.userId,
                  finishResponse.email
                );
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
        } catch (error: any) {
          if (error?.message === 'USER_CANCELLED') {
            this.isUnlocking = false;
            return;
          }
          console.error('WebAuthn error', error);
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
    this.toastService.showToast(message, color);
  }
}
