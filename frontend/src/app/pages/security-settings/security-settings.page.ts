import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { JwtTokenUtils } from '../../utils/jwt-token.utils';
import {
  IonHeader, IonToolbar, IonContent,
  IonCard, IonCardContent, IonList, IonItem, IonLabel, IonToggle, IonButton,
  IonIcon, IonNote, IonSpinner
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline, phonePortraitOutline,
  lockClosedOutline, mailOutline, personOutline, trashOutline,
  addCircleOutline, logOutOutline, alertCircleOutline, checkmarkCircle,
  cardOutline, copyOutline
} from 'ionicons/icons';

interface UserSession {
  id: number;
  deviceInfo: string;
  location: string;
  active: boolean;
  lastActive: string;
  createdAt: string;
}

interface SessionsResponse {
  currentSessionId: number;
  sessions: UserSession[];
}

import { AppLockService } from '../../services/app-lock.service';
import { PinService } from '../../services/pin.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-security-settings',
  templateUrl: './security-settings.page.html',
  styleUrls: ['./security-settings.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonHeader, IonToolbar, IonContent,
    IonCard, IonCardContent, IonList, IonItem, IonLabel, IonToggle, IonButton,
    IonIcon, IonNote, IonSpinner
  ]
})
export class SecuritySettingsPage implements OnInit {
  isAuthenticated = false;
  isAuthenticating = true;

  // Settings State
  appLockEnabled = false;
  sensitiveAuthEnabled = false; // Default to false until loaded
  userEmail: string = '';

  // Real Data
  sessions: UserSession[] = [];
  currentSessionId: number = -1;
  alpacaAccountNumber: string | null = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    private appLockService: AppLockService,
    private pinService: PinService,
    private toastService: ToastService
  ) {
    addIcons({
      shieldCheckmarkOutline, phonePortraitOutline,
      lockClosedOutline, mailOutline, personOutline, trashOutline,
      addCircleOutline, logOutOutline, alertCircleOutline, checkmarkCircle,
      cardOutline, copyOutline
    });
  }

  async ngOnInit() {
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      this.userEmail = storedEmail;
    }

    // Sync App Lock state
    this.appLockEnabled = this.appLockService.isEnabled();

    // Check if PIN is set (Sensitive Auth Enabled)
    this.sensitiveAuthEnabled = await this.pinService.hasPin();

    // If Sensitive Auth is enabled, require PIN to enter this page
    if (this.sensitiveAuthEnabled) {
      const verified = await this.pinService.promptPin('verify');
      if (!verified) {
        // User cancelled or failed PIN -> Go back
        this.router.navigate(['/tabs/tab3']); // Or wherever back is
        return;
      }
    }

    // No pre-authentication required to view settings (or already passed PIN)
    this.isAuthenticated = true;
    this.isAuthenticating = false;

    this.loadSessions();
    this.syncAlpacaAccountNumber();
  }

  loadSessions() {
    const token = JwtTokenUtils.getValidJwtToken();
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<SessionsResponse>(`${environment.backendApiUrl}/user/sessions`, { headers }).subscribe({
      next: (data) => {
        this.sessions = data.sessions;
        this.currentSessionId = data.currentSessionId;
      },
      error: (err) => {
        console.error('Failed to load sessions', err);
      }
    });
  }

  syncAlpacaAccountNumber() {
    const token = JwtTokenUtils.getValidJwtToken();
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.post<any>(`${environment.backendApiUrl}/alpaca/sync-account-number`, {}, { headers }).subscribe({
      next: (response) => {
        if (response && response.account_number) {
          this.alpacaAccountNumber = response.account_number;
          console.log('Synced Alpaca Account Number:', this.alpacaAccountNumber);
        }
      },
      error: (err) => {
        console.warn('Failed to sync Alpaca account number', err);
        // Silent fail - user might not have an account yet
      }
    });
  }

  async copyAccountNumber() {
    if (this.alpacaAccountNumber) {
      await navigator.clipboard.writeText(this.alpacaAccountNumber);
      this.toastService.showToast('Account number copied to clipboard', 'success');
    }
  }

  async authenticateUser() {
    this.isAuthenticating = true;
    // Simulate API delay for Passkey prompt
    setTimeout(() => {
      this.isAuthenticating = false;
      this.isAuthenticated = true;
    }, 1500);
  }

  toggleAppLock() {
    this.appLockService.setEnabled(this.appLockEnabled);
    console.log('App lock toggled:', this.appLockEnabled);
  }

  async toggleSensitiveAuth() {
    if (this.sensitiveAuthEnabled) {
      // User turned it ON
      const success = await this.pinService.promptPin('create');
      if (success) {
        this.presentToast('Sensitive Action PIN enabled.');
      } else {
        // Creation cancelled
        this.sensitiveAuthEnabled = false;
      }
    } else {
      // User turned it OFF
      await this.pinService.deletePin();
      this.presentToast('Sensitive Action PIN disabled.');
    }
  }

  async presentToast(message: string) {
    this.toastService.showToast(message);
  }

  revokeSession(id: number) {
    const token = JwtTokenUtils.getValidJwtToken();
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.post(`${environment.backendApiUrl}/user/sessions/${id}/revoke`, {}, { headers }).subscribe({
      next: () => {
        this.sessions = this.sessions.filter(s => s.id !== id);
      },
      error: (err) => {
        console.error('Failed to revoke session', err);
      }
    });
  }

  changeEmail() {
    this.router.navigate(['/change-email']);
  }
}
