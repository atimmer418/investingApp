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

const BACKEND_API_URL = environment.backendApiUrl;

@Injectable({
  providedIn: 'root'
})
export class PasskeyService {

  constructor(private http: HttpClient, private deviceIdService: DeviceIdService) { }

  private async getHeadersAsync(): Promise<HttpHeaders> {
    let headers = new HttpHeaders();
    
    // Add device ID
    const deviceId = this.deviceIdService.getDeviceId();
    headers = headers.set('X-Device-ID', deviceId);

    // Add friendly device name
    const deviceName = await this.deviceIdService.getDeviceName();
    headers = headers.set('X-Device-Name', deviceName);
    
    // Add JWT token if available
    const token = JwtTokenUtils.getValidJwtToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  // Helper to wrap async headers in Observable flow if needed, 
  // but for now we'll just use from() in the methods
  
  startRegistration(data: RegistrationStartRequest): Observable<RegistrationStartResponse> {
    // We need to convert the async header retrieval to an Observable
    return new Observable(observer => {
      this.getHeadersAsync().then(headers => {
        this.http.post<RegistrationStartResponse>(`${BACKEND_API_URL}/passkey/register/start`, data, { headers })
          .subscribe({
            next: res => { observer.next(res); observer.complete(); },
            error: err => observer.error(err)
          });
      });
    });
  }

  finishRegistration(data: RegistrationFinishRequest): Observable<RegistrationFinishResponse> {
    const finishUrl = `${BACKEND_API_URL}/passkey/register/finish`;
    return new Observable(observer => {
      this.getHeadersAsync().then(headers => {
        this.http.post<RegistrationFinishResponse>(finishUrl, data, { headers })
          .pipe(
            tap(response => {
              if (response.success && response.jwtToken) {
                JwtTokenUtils.storeJwtToken(response.jwtToken, response.userId, response.email);
                console.log('User registered and logged in. JWT stored with expiration info.');
              }
            })
          )
          .subscribe({
            next: res => { observer.next(res); observer.complete(); },
            error: err => observer.error(err)
          });
      });
    });
  }

  /**
   * Start passkey authentication - NO EMAIL REQUIRED!
   * Uses discoverable credentials to identify user from their passkey
   */
  startAuthentication(): Observable<{requestOptions: string, sessionId: string}> {
    return new Observable(observer => {
      this.getHeadersAsync().then(headers => {
        this.http.post<{requestOptions: string, sessionId: string}>(`${BACKEND_API_URL}/passkey/authenticate/start`, {}, { headers })
          .subscribe({
            next: res => { observer.next(res); observer.complete(); },
            error: err => observer.error(err)
          });
      });
    });
  }

  /**
   * Finish passkey authentication using the credential response and session ID
   */
  finishAuthentication(credentialResponse: any, sessionId: string): Observable<any> {
    const finishUrl = `${BACKEND_API_URL}/passkey/authenticate/finish`;
    return new Observable(observer => {
      this.getHeadersAsync().then(headers => {
        this.http.post<any>(finishUrl, {
          credential: credentialResponse,
          sessionId: sessionId
        }, { headers })
        .pipe(
          tap(response => {
            if (response.success && response.jwtToken) {
              JwtTokenUtils.storeJwtToken(response.jwtToken, response.userId, response.email);
              console.log('User authenticated with passkey. JWT stored with expiration info.');
            }
          })
        )
        .subscribe({
          next: res => { observer.next(res); observer.complete(); },
          error: err => observer.error(err)
        });
      });
    });
  }
}