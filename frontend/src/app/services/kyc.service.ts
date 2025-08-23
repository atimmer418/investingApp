// frontend/src/app/services/kyc.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface KycVerificationRequest {
  referenceId: string;
  personaInquiryId?: string;
  status: string;
  verificationResult?: string;
  personaResponse?: string;
  failureReason?: string;
  identityVerified?: boolean;
  addressVerified?: boolean;
  pepScreeningPassed?: boolean;
}

export interface KycStartResponse {
  referenceId: string;
  status: string;
  message: string;
}

export interface KycVerifyResponse {
  referenceId: string;
  status: string;
  verificationResult?: string;
  identityVerified: boolean;
  addressVerified: boolean;
  pepScreeningPassed: boolean;
  completedAt?: string;
  message: string;
}

export interface KycStatusResponse {
  hasVerification: boolean;
  referenceId?: string;
  status?: string;
  verificationResult?: string;
  identityVerified?: boolean;
  addressVerified?: boolean;
  pepScreeningPassed?: boolean;
  createdAt?: string;
  completedAt?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class KycService {
  private apiUrl = `${environment.backendApiUrl}/kyc`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Start a new KYC verification process
   */
  startVerification(): Observable<KycStartResponse> {
    return this.http.post<KycStartResponse>(`${this.apiUrl}/start`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Submit verification results to backend
   */
  submitVerificationResult(request: KycVerificationRequest): Observable<KycVerifyResponse> {
    return this.http.post<KycVerifyResponse>(`${this.apiUrl}/verify`, request, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get current KYC verification status
   */
  getVerificationStatus(): Observable<KycStatusResponse> {
    return this.http.get<KycStatusResponse>(`${this.apiUrl}/status`, {
      headers: this.getAuthHeaders()
    });
  }
}