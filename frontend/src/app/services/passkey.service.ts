import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { RegistrationStartRequest } from '../models/passkey/registration-start-request.model';
import { RegistrationStartResponse } from '../models/passkey/registration-start-response.model';
import { RegistrationFinishRequest } from '../models/passkey/registration-finish-request.model';
import { RegistrationFinishResponse } from '../models/passkey/registration-finish-response.model';

// ngrok
const localhost = 'https://796b-2600-4040-2a92-8800-a865-27f2-f55c-bf44.ngrok-free.app';
// const localhost = 'http://192.168.1.166:8080';
// Set your backend API's base URL
const API_URL = `${localhost}/api/passkey`; // Or your production URL

@Injectable({
  providedIn: 'root'
})
export class PasskeyService {

  constructor(private http: HttpClient) { }

  startRegistration(data: RegistrationStartRequest): Observable<RegistrationStartResponse> {
    return this.http.post<RegistrationStartResponse>(`${API_URL}/register/start`, data);
  }

  finishRegistration(data: RegistrationFinishRequest): Observable<RegistrationFinishResponse> {
    const finishUrl = `${API_URL}/register/finish`; // Ensure this uses ngrok URL for backend
    return this.http.post<RegistrationFinishResponse>(finishUrl, data)
      .pipe(
        tap(response => {
          if (response.success && response.jwtToken) {
            // Store the JWT (e.g., in localStorage or a secure cookie)
            localStorage.setItem('jwtToken', response.jwtToken);
            // You might also want to store user info or update an authentication state service
            // e.g., this.authStatusService.login(response.userId, response.email);
            console.log('User registered and logged in. JWT stored.');
          }
        })
      );
  }
}