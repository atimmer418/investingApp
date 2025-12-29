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

  async hasPin(): Promise<boolean> {
    try {
      return await firstValueFrom(this.http.get<boolean>(`${this.apiUrl}/status`, { headers: this.getHeaders() }));
    } catch (e) {
      return false;
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
    return await firstValueFrom(
      this.http.delete<PinResponse>(`${this.apiUrl}/delete`, { headers: this.getHeaders() })
    );
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
