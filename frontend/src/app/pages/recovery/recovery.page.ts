import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardContent, IonList, IonItem, IonLabel, IonInput, IonButton,
  IonIcon, IonNote, IonSpinner, IonToast, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, keyOutline, mailOutline } from 'ionicons/icons';
import { RecoveryService } from '../../services/recovery.service';
import { JwtTokenUtils } from '../../utils/jwt-token.utils';

@Component({
  selector: 'app-recovery',
  templateUrl: './recovery.page.html',
  styleUrls: ['./recovery.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
    IonCard, IonCardContent, IonList, IonItem, IonLabel, IonInput, IonButton,
    IonIcon, IonNote, IonSpinner, IonToast
  ]
})
export class RecoveryPage implements OnInit {
  step: 'ssn' | 'otp' = 'ssn';
  ssn: string = '';
  otp: string = '';
  isLoading = false;
  
  constructor(
    private recoveryService: RecoveryService,
    private router: Router,
    private toastController: ToastController
  ) {
    addIcons({ shieldCheckmarkOutline, keyOutline, mailOutline });
  }

  ngOnInit() {}

  async sendCode() {
    if (!this.ssn) return;
    
    this.isLoading = true;
    try {
      const response = await this.recoveryService.initiateRecovery(this.ssn);
      if (response.success) {
        this.step = 'otp';
        this.presentToast('Recovery code sent to your email.');
      } else {
        this.presentToast(response.message || 'Failed to initiate recovery.');
      }
    } catch (e) {
      this.presentToast('An error occurred. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async verifyCode() {
    if (!this.otp) return;

    this.isLoading = true;
    try {
      const response = await this.recoveryService.verifyRecovery(this.ssn, this.otp);
      if (response.success && response.token) {
        // Save token
        JwtTokenUtils.storeJwtToken(response.token);
        
        this.presentToast('Recovery successful! Please register a new passkey immediately.');
        
        // Redirect to Settings to register new passkey
        this.router.navigate(['/tabs/tab3']);
      } else {
        this.presentToast(response.message || 'Verification failed.');
      }
    } catch (e) {
      this.presentToast('Invalid code or error occurred.');
    } finally {
      this.isLoading = false;
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }
}
