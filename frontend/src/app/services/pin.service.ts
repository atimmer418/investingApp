import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';
import { ModalController } from '@ionic/angular/standalone';
import { PinPromptComponent } from '../components/pin-prompt/pin-prompt.component';

export interface PinResponse {
  success: boolean;
  message: string;
  lockedOut: boolean;
  lockoutDurationSeconds: number;
}

@Injectable({
  providedIn: 'root'
})
export class PinService {
  private apiUrl = `${environment.backendApiUrl}/user/pin`;

  constructor(
    private http: HttpClient,
    private modalController: ModalController
  ) {}

  private getHeaders(): HttpHeaders {
    const token = JwtTokenUtils.getValidJwtToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ── Step-up PIN marker helpers ────────────────────────────────────────────
  // Stores a per-user, non-sensitive boolean marker in localStorage so that if
  // the /user/pin/status call fails (network error), we still gate the user who
  // has a step-up PIN (fail-closed), while genuine no-PIN users pass straight
  // through. Only a boolean marker is stored — never the raw PIN.

  private static stepUpMarkerKey(): string | null {
    const userId = localStorage.getItem('userId');
    return userId ? `stepUpEnabled:${userId}` : null;
  }

  markStepUpEnabled(): void {
    const key = PinService.stepUpMarkerKey();
    if (key) localStorage.setItem(key, 'true');
  }

  clearStepUpMarker(): void {
    const key = PinService.stepUpMarkerKey();
    if (key) localStorage.removeItem(key);
  }

  private getStepUpMarker(): boolean {
    const key = PinService.stepUpMarkerKey();
    return key ? localStorage.getItem(key) === 'true' : false;
  }

  async hasPin(): Promise<boolean> {
    try {
      const result = await firstValueFrom(this.http.get<boolean>(`${this.apiUrl}/status`, { headers: this.getHeaders() }));
      // Keep the marker in sync with the authoritative backend response.
      if (result) {
        this.markStepUpEnabled();
      } else {
        this.clearStepUpMarker();
      }
      return result;
    } catch (e) {
      // Network error: fall back to localStorage marker so a step-up user is
      // still gated (fail-closed). A genuine no-PIN user has no marker → false.
      return this.getStepUpMarker();
    }
  }

  async checkLockout(): Promise<PinResponse> {
    return await firstValueFrom(
      this.http.get<PinResponse>(`${this.apiUrl}/lockout-status`, { headers: this.getHeaders() })
    );
  }

  async setPin(pin: string): Promise<PinResponse> {
    return await firstValueFrom(
      this.http.post<PinResponse>(`${this.apiUrl}/set`, { pin }, { headers: this.getHeaders() })
    );
  }

  async verifyPin(pin: string): Promise<PinResponse> {
    return await firstValueFrom(
      this.http.post<PinResponse>(`${this.apiUrl}/verify`, { pin }, { headers: this.getHeaders() })
    );
  }

  async deletePin(): Promise<PinResponse> {
    const result = await firstValueFrom(
      this.http.delete<PinResponse>(`${this.apiUrl}/delete`, { headers: this.getHeaders() })
    );
    // PIN is now gone — clear the localStorage marker so hasPin() fail-open
    // logic no longer gates this user.
    this.clearStepUpMarker();
    return result;
  }

  /**
   * Opens the PIN prompt modal.
   * @param mode 'create' | 'verify'
   * @returns Promise<boolean> true if successful (verified or created), false if cancelled or failed
   */
  async promptPin(mode: 'create' | 'verify'): Promise<boolean> {
    const modal = await this.modalController.create({
      component: PinPromptComponent,
      componentProps: { mode },
      backdropDismiss: false,
      cssClass: 'full-screen-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    return data?.success === true;
  }
}
