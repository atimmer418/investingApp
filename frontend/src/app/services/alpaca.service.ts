import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';

export interface CreateAccountRequest {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD format
  ssn: string;
  phone: string;
  address?: {
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface AlpacaAccountResponse {
  account_id: string;
  status: string;
  created_at: string;
  raw_response: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlpacaService {
  private baseUrl = environment.backendApiUrl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    const token = JwtTokenUtils.getValidJwtToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    if (this.baseUrl.includes("ngrok")) {
      headers = headers.set('ngrok-skip-browser-warning', 'true');
    }
    return headers;
  }

  /**
   * Create an Alpaca trading account for the user
   */
  createAccount(accountData: CreateAccountRequest): Observable<AlpacaAccountResponse> {
    return this.http.post<AlpacaAccountResponse>(
      `${this.baseUrl}/alpaca/create-account`, 
      accountData,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get current account information
   */
  getAccountInfo(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/alpaca/account`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get account status by account ID
   */
  getAccountStatus(accountId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/alpaca/account/${accountId}/status`);
  }

  /**
   * Create account data from user information
   * This would typically come from user profile, KYC data, etc.
   */
  prepareAccountData(userEmail: string, kycData?: any): CreateAccountRequest {
    // In a real app, this data would come from user registration/KYC process
    // For now, using placeholder data
    return {
      email: userEmail,
      firstName: kycData?.firstName || 'John',
      lastName: kycData?.lastName || 'Doe',
      dateOfBirth: kycData?.dateOfBirth || '1990-01-01',
      ssn: kycData?.ssn || '123-45-6789', // In real app, this should be properly encrypted/handled
      phone: kycData?.phone || '+1234567890',
      address: {
        street_address: kycData?.address?.street || '123 Main St',
        city: kycData?.address?.city || 'New York',
        state: kycData?.address?.state || 'NY',
        postal_code: kycData?.address?.zip || '10001',
        country: 'USA'
      }
    };
  }
}
