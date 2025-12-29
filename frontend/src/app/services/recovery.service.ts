import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RecoveryResponse {
  success: boolean;
  message: string;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecoveryService {
  private apiUrl = `${environment.backendApiUrl}/auth/recovery`;

  constructor(private http: HttpClient) {}

  async initiateRecovery(ssn: string): Promise<RecoveryResponse> {
    return await firstValueFrom(
      this.http.post<RecoveryResponse>(`${this.apiUrl}/initiate`, { ssn })
    );
  }

  async verifyRecovery(ssn: string, otp: string): Promise<RecoveryResponse> {
    return await firstValueFrom(
      this.http.post<RecoveryResponse>(`${this.apiUrl}/verify`, { ssn, otp })
    );
  }
}
