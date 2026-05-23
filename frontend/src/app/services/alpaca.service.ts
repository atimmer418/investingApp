import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';

export interface CreateAlpacaAccountRequest {
  emailAddress: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string; // YYYY-MM-DD
  taxId: string;
  taxIdType: string; // "USA_SSN"
  countryOfTaxResidence: string; // "USA"
  fundingSource: string[];
  isControlPerson: boolean;
  isAffiliatedExchangeOrFinra: boolean;
  isPoliticallyExposed: boolean;
  immediateFamilyExposed: boolean;
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

export interface AccountStatusResponse {
  accountStatus: string;
  hasActionRequired: boolean;
}

export interface UpdateKycRequest {
  emailAddress?: string;
  phoneNumber?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  givenName?: string;
  familyName?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  fundingSource?: string[];
  isControlPerson?: boolean;
  isAffiliatedExchangeOrFinra?: boolean;
  isPoliticallyExposed?: boolean;
  immediateFamilyExposed?: boolean;
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
    return headers;
  }

  /**
   * Create an Alpaca trading account for the user with full KYC data
   */
  createAlpacaAccount(request: CreateAlpacaAccountRequest): Observable<AlpacaAccountResponse> {
    return this.http.post<AlpacaAccountResponse>(
      `${this.baseUrl}/alpaca/create-account`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get current user's Alpaca account status
   */
  getMyAccountStatus(): Observable<AccountStatusResponse> {
    return this.http.get<AccountStatusResponse>(
      `${this.baseUrl}/alpaca/my-account-status`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Upload a verification document to Alpaca
   */
  uploadDocument(request: { documentType: string; mimeType: string; content: string }): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/alpaca/upload-document`,
      request,
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
   * Get ACH relationships for an account
   */
  getAchRelationships(accountId: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/alpaca/accounts/${accountId}/ach-relationships`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Fetch current user's KYC data from Alpaca (for pre-filling the edit form)
   */
  getKycData(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/alpaca/account/kyc`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update current user's KYC data via Alpaca PATCH API
   */
  updateKyc(request: UpdateKycRequest): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/alpaca/account/kyc`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }
}
