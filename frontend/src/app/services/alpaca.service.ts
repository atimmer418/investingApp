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

export interface AlpacaAsset {
  id: string;
  class: string;
  exchange: string;
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easy_to_borrow: boolean;
  fractionable: boolean;
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
   * Get tradeable assets from Alpaca (public endpoint, but include auth if available)
   */
  getAssets(status: string = 'active', assetClass: string = 'us_equity'): Observable<any> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (assetClass) params.append('asset_class', assetClass);
    
    // Use the same header building logic as getAuthHeaders for consistency
    const headers = this.getAuthHeaders();
    
    return this.http.get(
      `${this.baseUrl}/alpaca/assets?${params.toString()}`,
      { headers }
    );
  }

  /**
   * Get account status by account ID
   */
  getAccountStatus(accountId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/alpaca/account/${accountId}/status`);
  }

  /**
   * Create ACH relationship using Plaid data
   */
  createAchRelationshipFromPlaid(accountId: string, plaidAccessToken: string, plaidAccountId: string, accountOwnerName: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/alpaca/accounts/${accountId}/ach-relationships/plaid`,
      {
        plaidAccessToken,
        plaidAccountId,
        accountOwnerName
      },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get ACH relationships for an account
   */
  getAchRelationships(accountId: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/alpaca/accounts/${accountId}/ach-relationships`,
      { headers: this.getAuthHeaders() }
    );
  }

    /**
   * Create account data from user information
   * This would typically come from user registration/KYC data, etc.
   */
  prepareAccountData(userEmail: string, kycData?: any): CreateAccountRequest {
    // Generate a realistic test SSN based on user email for consistency
    const generateTestSSN = (email: string): string => {
      // Use email hash to generate consistent but unique SSN parts
      let hash = 0;
      for (let i = 0; i < email.length; i++) {
        const char = email.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // Ensure positive hash
      hash = Math.abs(hash);
      
      // Generate valid SSN format: AAA-GG-SSSS
      // Area number (001-899, avoid 666 and 900-999)
      const area = (hash % 665) + 1; // 1-665, avoiding 666
      const areaStr = area.toString().padStart(3, '0');
      
      // Group number (01-99)
      const group = ((hash >> 10) % 99) + 1; // 1-99
      const groupStr = group.toString().padStart(2, '0');
      
      // Serial number (0001-9999)
      const serial = ((hash >> 20) % 9999) + 1; // 1-9999
      const serialStr = serial.toString().padStart(4, '0');
      
      return `${areaStr}-${groupStr}-${serialStr}`;
    };

    const generateTestPhone = (email: string): string => {
      // Use email hash to generate consistent but unique phone number
      let hash = 0;
      for (let i = 0; i < email.length; i++) {
        const char = email.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // Ensure positive hash and use different bit shifting than SSN
      hash = Math.abs(hash);
      
      // Generate phone format: XXX-555-XXXX (using 555 as middle digits for test numbers)
      // Area code (200-999, avoiding some reserved ranges)
      const areaCode = ((hash >> 8) % 800) + 200; // 200-999
      const areaStr = areaCode.toString();
      
      // Always use 555 for middle digits (common for test/fake numbers)
      const exchange = '555';
      
      // Last 4 digits (0000-9999)
      const subscriber = ((hash >> 16) % 10000);
      const subscriberStr = subscriber.toString().padStart(4, '0');
      
      return `${areaStr}-${exchange}-${subscriberStr}`;
    };

    // In a real app, this data would come from user registration/KYC process
    // For now, using placeholder data with realistic test SSN and phone
    return {
      email: userEmail,
      firstName: kycData?.firstName || 'John',
      lastName: kycData?.lastName || 'Doe',
      dateOfBirth: kycData?.dateOfBirth || '1990-01-01',
      ssn: kycData?.ssn || generateTestSSN(userEmail), // Generate unique test SSN
      phone: kycData?.phone || generateTestPhone(userEmail), // Generate unique test phone
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
