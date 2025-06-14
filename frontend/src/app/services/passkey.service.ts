import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RegistrationStartRequest } from '../models/passkey/registration-start-request.model';
import { RegistrationStartResponse } from '../models/passkey/registration-start-response.model';
import { RegistrationFinishRequest } from '../models/passkey/registration-finish-request.model';

// Set your backend API's base URL
const API_URL = 'http://localhost:8080/api/passkey'; // Or your production URL

@Injectable({
  providedIn: 'root'
})
export class PasskeyService {

  constructor(private http: HttpClient) { }

  startRegistration(data: RegistrationStartRequest): Observable<RegistrationStartResponse> {
    return this.http.post<RegistrationStartResponse>(`${API_URL}/register/start`, data);
  }

  finishRegistration(data: RegistrationFinishRequest): Observable<string> {
    // The backend returns a simple string on success/failure
    return this.http.post(`${API_URL}/register/finish`, data, { responseType: 'text' });
  }
}