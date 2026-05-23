import { Component, Input, AfterViewInit, OnDestroy, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';
import { PasskeyService } from '../../services/passkey.service';
import { get } from '@github/webauthn-json';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { NativePasskeyService } from '../../services/native-passkey.service';

@Component({
  selector: 'app-passkey-prompt',
  templateUrl: './passkey-prompt.component.html',
  styleUrls: ['./passkey-prompt.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class PasskeyPromptComponent implements AfterViewInit, OnDestroy {

  @Input() userEmail?: string;
  @Input() jwtExpired = false;
  @Input() onLottieReady?: () => void;

  @ViewChild('lottieContainer') lottieContainer!: ElementRef<HTMLElement>;

  isUnlocking = false;
  isFounder = false;
  private unlockButton: HTMLButtonElement | null = null;

  constructor(
    private modalController: ModalController,
    private passkeyService: PasskeyService,
    private authService: AuthService,
    private toastService: ToastService,
    private nativePasskeyService: NativePasskeyService,
    private zone: NgZone
  ) {
    this.authService.userProgress$.subscribe(progress => {
      this.isFounder = progress?.privateBeta === true;
    });
  }

  ngOnDestroy() {
    this.destroyUnlockButton();
  }

  ngAfterViewInit() {
    const lottie = (window as any).lottie;
    if (!lottie) {
      // Lottie unavailable — unblock native overlay and proceed with auth
      setTimeout(() => {
        this.zone.run(() => {
          this.onLottieReady?.();
          this.authenticate();
        });
      }, 400);
      return;
    }

    const anim = lottie.loadAnimation({
      container: this.lottieContainer.nativeElement,
      path: 'assets/lottie/coin-drop.json',
      renderer: 'svg',
      loop: true,
      autoplay: true,
      rendererSettings: { preserveAspectRatio: 'xMidYMid slice' },
    });

    anim.addEventListener('DOMLoaded', () => {
      // RAF runs inside Angular's zone because Zone.js patches requestAnimationFrame
      requestAnimationFrame(() => {
        this.onLottieReady?.();
        this.authenticate();
      });
    });
  }

  /**
   * Appends the Unlock pill to document.body so it is completely outside the
   * Ionic modal's stacking/compositing context. Lottie's GPU-composited SVG
   * layers can sit above any z-index inside the modal; appending to body
   * sidesteps that entirely.
   *
   * On subsequent calls (retry after another failed biometric), the existing
   * button is re-enabled rather than re-created.
   */
  private revealUnlockButton(): void {
    this.zone.run(() => {
      this.isUnlocking = false;
      if (this.unlockButton) {
        this.unlockButton.disabled = false;
        this.unlockButton.style.opacity = '1';
        this.unlockButton.textContent = 'Unlock';
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Unlock';
        btn.style.cssText = [
          'position:fixed',
          'left:50%',
          'top:70%',
          'transform:translate(-50%,-50%)',
          'z-index:2147483647',
          'min-width:200px',
          'height:52px',
          'padding:0 32px',
          'border:none',
          'border-radius:999px',
          'background:#2563EB',
          'color:#ffffff',
          "font-family:'Manrope',sans-serif",
          'font-weight:600',
          'font-size:1rem',
          'display:inline-flex',
          'align-items:center',
          'justify-content:center',
          'cursor:pointer',
          'box-shadow:0 4px 12px rgba(37,99,235,0.25)',
          '-webkit-tap-highlight-color:transparent',
          '-webkit-user-select:none',
          'user-select:none',
        ].join(';');
        btn.addEventListener('click', () => this.zone.run(() => this.authenticate()));
        document.body.appendChild(btn);
        this.unlockButton = btn;
      }
    });
  }

  private destroyUnlockButton(): void {
    this.unlockButton?.remove();
    this.unlockButton = null;
  }

  async authenticate() {
    if (this.isUnlocking) return;
    this.isUnlocking = true;
    if (this.unlockButton) {
      this.unlockButton.disabled = true;
      this.unlockButton.style.opacity = '0.7';
      this.unlockButton.textContent = 'Unlocking…';
    }

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
                this.destroyUnlockButton();
                this.authService.handleSuccessfulAuthentication(
                  finishResponse.jwtToken,
                  finishResponse.userId,
                  finishResponse.email
                );
                this.modalController.dismiss({ authenticated: true });
              } else {
                this.showToast('Authentication failed: ' + finishResponse.message, 'danger');
                this.revealUnlockButton();
              }
            },
            error: (err) => {
              console.error('Passkey finish error', err);
              this.showToast('Authentication failed. Please try again.', 'danger');
              this.revealUnlockButton();
            }
          });
        } catch (error: any) {
          this.revealUnlockButton();
        }
      },
      error: (err) => {
        console.error('Passkey start error', err);
        this.showToast('Could not start authentication.', 'danger');
        this.revealUnlockButton();
      }
    });
  }

  async showToast(message: string, color: string) {
    this.toastService.showToast(message, color);
  }
}
