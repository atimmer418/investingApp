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
    private authService: AuthService
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

    const payload = {
      currentEmail: this.currentEmail,
      newEmail: this.newEmail
    };

    this.http.post<any>(`${environment.backendApiUrl}/api/user/update-email`, payload)
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

  showToast(message: string, color: string) {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
  }
}
