import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { lockClosedOutline, backspaceOutline } from 'ionicons/icons';
import { PinService } from '../../services/pin.service';

@Component({
  selector: 'app-pin-prompt',
  templateUrl: './pin-prompt.component.html',
  styleUrls: ['./pin-prompt.component.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonIcon]
})
export class PinPromptComponent implements OnInit, OnDestroy {
  @Input() mode: 'create' | 'verify' = 'verify';
  
  pin = '';
  confirmPin = '';
  step: 'enter' | 'confirm' = 'enter'; // For create mode
  
  isError = false;
  isLockedOut = false;
  errorMessage = '';
  isLoading = false;
  private lockoutInterval: any;

  constructor(
    private modalController: ModalController,
    private pinService: PinService
  ) {
    addIcons({ lockClosedOutline, backspaceOutline });
  }

  async ngOnInit() {
    // If verifying, step is always 'enter'
    // If creating, step starts at 'enter' (Create PIN) then goes to 'confirm' (Confirm PIN)
    
    if (this.mode === 'verify') {
      try {
        const status = await this.pinService.checkLockout();
        if (status.lockedOut) {
          this.handleLockout(status.message, status.lockoutDurationSeconds);
        }
      } catch (e) {
        console.error('Failed to check lockout status', e);
      }
    }
  }

  ngOnDestroy() {
    if (this.lockoutInterval) {
      clearInterval(this.lockoutInterval);
    }
  }

  getTitle(): string {
    if (this.mode === 'verify') return 'Enter PIN';
    return this.step === 'enter' ? 'Create PIN' : 'Confirm PIN';
  }

  getSubtitle(): string {
    if (this.mode === 'verify') return 'Enter your 4-digit security PIN';
    return this.step === 'enter' ? 'Enter a new 4-digit PIN' : 'Re-enter your PIN to confirm';
  }

  addDigit(digit: string) {
    if (this.pin.length < 4 && !this.isLoading && !this.isLockedOut) {
      this.pin += digit;
      this.isError = false;
      this.errorMessage = '';
      
      if (this.pin.length === 4) {
        this.handleComplete();
      }
    }
  }

  removeDigit() {
    if (this.pin.length > 0 && !this.isLoading && !this.isLockedOut) {
      this.pin = this.pin.slice(0, -1);
      this.isError = false;
      this.errorMessage = '';
    }
  }

  async handleComplete() {
    this.isLoading = true;
    
    // Small delay for UX so user sees the 4th dot fill
    setTimeout(async () => {
      if (this.mode === 'verify') {
        await this.verifyPin();
      } else {
        this.handleCreateStep();
      }
    }, 100);
  }

  async verifyPin() {
    try {
      const response = await this.pinService.verifyPin(this.pin);
      if (response.success) {
        this.modalController.dismiss({ success: true });
      } else {
        this.handleError(response.message);
      }
    } catch (error: any) {
      // Handle 401/429 errors from backend
      const errorBody = error.error;
      if (errorBody && errorBody.lockedOut) {
        this.handleLockout(errorBody.message, errorBody.lockoutDurationSeconds);
      } else {
        const msg = errorBody?.message || 'Verification failed';
        this.handleError(msg);
      }
    } finally {
      this.isLoading = false;
    }
  }

  handleLockout(msg: string, seconds: number) {
    this.isError = true;
    this.isLockedOut = true;
    this.errorMessage = msg;
    this.pin = '';
    
    // Clear any existing interval
    if (this.lockoutInterval) {
      clearInterval(this.lockoutInterval);
    }

    // Start countdown
    let remaining = seconds;
    this.lockoutInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(this.lockoutInterval);
        this.errorMessage = 'Lockout expired. You may try again.';
        this.isError = false;
        this.isLockedOut = false;
      } else {
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        this.errorMessage = `Locked out. Try again in ${minutes}m ${secs}s`;
      }
    }, 1000);
  }

  handleCreateStep() {
    if (this.step === 'enter') {
      // First entry complete, move to confirm
      this.confirmPin = this.pin;
      this.pin = '';
      this.step = 'confirm';
      this.isLoading = false;
    } else {
      // Confirmation complete
      if (this.pin === this.confirmPin) {
        this.saveNewPin();
      } else {
        this.handleError('PINs do not match. Try again.');
        // Reset to start
        this.step = 'enter';
        this.confirmPin = '';
      }
    }
  }

  async saveNewPin() {
    try {
      const response = await this.pinService.setPin(this.pin);
      if (response.success) {
        this.modalController.dismiss({ success: true });
      } else {
        this.handleError(response.message);
      }
    } catch (error: any) {
      this.handleError('Failed to set PIN');
    } finally {
      this.isLoading = false;
    }
  }

  handleError(msg: string) {
    this.isError = true;
    this.errorMessage = msg;
    this.pin = ''; // Clear input
    
    // Vibrate if on device?
    // Haptics.notification({ type: NotificationType.Error });
  }

  cancel() {
    this.modalController.dismiss({ success: false });
  }
}
