import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { JwtTokenUtils } from '../utils/jwt-token.utils';
import { environment } from '../../environments/environment';

const BACKEND_API_URL = environment.backendApiUrl;

@Injectable({ providedIn: 'root' })
export class PushNotificationService {

  constructor(private http: HttpClient) {}

  async registerDeviceToken(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    // @capacitor/push-notifications must be installed and FCM configured for push to work.
    // Run: npm install @capacitor/push-notifications
    // Add GoogleService-Info.plist to the iOS Xcode target after setting up a Firebase project.
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.requestPermissions();
      if (result.receive !== 'granted') return;

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token: { value: string }) => {
        this.storePushToken(token.value);
      });
    } catch {
      // Plugin not installed or FCM not configured — push notifications disabled.
    }
  }

  private storePushToken(token: string): void {
    const jwtToken = JwtTokenUtils.getValidJwtToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    });
    this.http.patch(`${BACKEND_API_URL}/user/push-token`, { pushToken: token }, { headers }).subscribe({
      error: (err) => console.warn('[Push] Failed to store push token:', err)
    });
  }
}
