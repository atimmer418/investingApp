import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaycheckSource } from '../models/plaid/paycheck-source.model';
import { SelectedPaycheck } from '../models/plaid/selected-paycheck.model';
import { environment } from '../../environments/environment';

// ngrok
const BACKEND_API_URL = environment.backendApiUrl;

@Injectable({
  providedIn: 'root'
})
export class PlaidDataService {

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    const token = localStorage.getItem('jwtToken');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    // --- ADD THIS HEADER TO SKIP NGROK BROWSER WARNING ---
    if (BACKEND_API_URL.includes("ngrok")) {
        headers = headers.set('ngrok-skip-browser-warning', 'true'); // Or any non-empty value
    }
    return headers;
  }

  getPaycheckSources(): Observable<PaycheckSource[]> {
    return this.http.get<PaycheckSource[]>(`${BACKEND_API_URL}/income/paycheck_sources`, { headers: this.getAuthHeaders() });
  }

  savePaycheckConfiguration(configs: SelectedPaycheck[]): Observable<any> { // Backend returns MessageResponse
    return this.http.post(`${BACKEND_API_URL}/income/paycheck_configurations`, configs, { headers: this.getAuthHeaders() });
  }
}