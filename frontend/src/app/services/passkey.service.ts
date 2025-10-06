import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { RegistrationStartRequest } from '../models/passkey/registration-start-request.model';
import { RegistrationStartResponse } from '../models/passkey/registration-start-response.model';
import { RegistrationFinishRequest } from '../models/passkey/registration-finish-request.model';
import { RegistrationFinishResponse } from '../models/passkey/registration-finish-response.model';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';
import { DeviceIdService } from './device-id.service';

// ngrok
const BACKEND_API_URL = environment.backendApiUrl;

@Injectable({
  providedIn: 'root'
})
export class PasskeyService {

  constructor(private http: HttpClient, private deviceIdService: DeviceIdService) { }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    
    // Add device ID to all passkey requests for proper device tracking
    const deviceId = this.deviceIdService.getDeviceId();
    headers = headers.set('X-Device-ID', deviceId);
    
    // Add JWT token if available
    const token = JwtTokenUtils.getValidJwtToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (BACKEND_API_URL.includes("ngrok")) {
      headers = headers.set('ngrok-skip-browser-warning', 'true');
    }
    
    return headers;
  }

  startRegistration(data: RegistrationStartRequest): Observable<RegistrationStartResponse> {
    return this.http.post<RegistrationStartResponse>(`${BACKEND_API_URL}/passkey/register/start`, data, 
      { headers: this.getHeaders() });
  }

  finishRegistration(data: RegistrationFinishRequest): Observable<RegistrationFinishResponse> {
    const finishUrl = `${BACKEND_API_URL}/passkey/register/finish`; // Ensure this uses ngrok URL for backend
    return this.http.post<RegistrationFinishResponse>(finishUrl, data, { headers: this.getHeaders() })
      .pipe(
        tap(response => {
          if (response.success && response.jwtToken) {
            // Store JWT with expiration info and user details
            JwtTokenUtils.storeJwtToken(response.jwtToken, response.userId, response.email);
            console.log('User registered and logged in. JWT stored with expiration info.');
          }
        })
      );
  }

  /**
   * Start passkey authentication - NO EMAIL REQUIRED!
   * Uses discoverable credentials to identify user from their passkey
   */
  startAuthentication(): Observable<{requestOptions: string, sessionId: string}> {
    return this.http.post<{requestOptions: string, sessionId: string}>(`${BACKEND_API_URL}/passkey/authenticate/start`, {}, 
      { headers: this.getHeaders() });
  }

  /**
   * Finish passkey authentication using the credential response and session ID
   */
  finishAuthentication(credentialResponse: any, sessionId: string): Observable<any> {
    const finishUrl = `${BACKEND_API_URL}/passkey/authenticate/finish`;
    return this.http.post<any>(finishUrl, {
      credential: credentialResponse,
      sessionId: sessionId
    }, { headers: this.getHeaders() }).pipe(
      tap(response => {
        if (response.success && response.jwtToken) {
          // Store JWT with expiration info and user details
          JwtTokenUtils.storeJwtToken(response.jwtToken, response.userId, response.email);
          console.log('User authenticated with passkey. JWT stored with expiration info.');
        }
      })
    );
  }
}