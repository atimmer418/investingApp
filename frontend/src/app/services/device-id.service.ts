import { Injectable } from '@angular/core';
import { Device } from '@capacitor/device';

@Injectable({
  providedIn: 'root'
})
export class DeviceIdService {
  private deviceId: string | null = null;
  private deviceName: string | null = null;
  private readonly DEVICE_ID_KEY = 'fred_device_id';

  constructor() {
    this.initializeDeviceId();
    this.initializeDeviceName();
  }

  /**
   * Get or generate a stable device ID for this browser/app
   * This persists across app restarts and browser sessions
   */
  getDeviceId(): string {
    if (!this.deviceId) {
      this.initializeDeviceId();
    }
    return this.deviceId!;
  }

  /**
   * Get the friendly name of the device (e.g. "iPhone 15 Pro")
   */
  async getDeviceName(): Promise<string> {
    if (this.deviceName) return this.deviceName;
    
    try {
      const info = await Device.getInfo();
      // Combine model and platform for clarity, e.g. "iPhone 15 Pro (iOS)" or "Chrome (Web)"
      if (info.platform === 'web') {
        this.deviceName = `${this.getBrowserName()} (Web)`;
      } else {
        this.deviceName = `${info.model} (${info.platform})`;
      }
    } catch (e) {
      console.warn('Failed to get device info', e);
      this.deviceName = 'Unknown Device';
    }
    return this.deviceName!;
  }

  private getBrowserName(): string {
    const agent = window.navigator.userAgent.toLowerCase();
    if (agent.indexOf('chrome') > -1 && !!(<any>window).chrome) return 'Chrome';
    if (agent.indexOf('safari') > -1) return 'Safari';
    if (agent.indexOf('firefox') > -1) return 'Firefox';
    return 'Browser';
  }

  private initializeDeviceId(): void {
    // First check if we already have a device ID stored
    const storedId = localStorage.getItem(this.DEVICE_ID_KEY);
    
    if (storedId) {
      this.deviceId = storedId;
      console.log('[DeviceIdService] Loaded existing device ID:', storedId.substring(0, 8) + '...');
      return;
    }

    // Generate a new device ID - prioritize randomness for uniqueness
    const timestamp = Date.now().toString();
    const randomBytes1 = this.generateRandomId(); // 32 random hex chars
    const randomBytes2 = this.generateRandomId(); // Another 32 random hex chars
    const microTimestamp = (performance.now() * 1000).toString(); // High precision timing
    
    // Combine multiple random sources for maximum uniqueness
    const combined = timestamp + randomBytes1 + microTimestamp + randomBytes2;
    this.deviceId = this.hashString(combined).substring(0, 32);
    
    // Store it persistently - this is what makes it "same every time"
    localStorage.setItem(this.DEVICE_ID_KEY, this.deviceId);
    console.log('[DeviceIdService] Generated new device ID:', this.deviceId.substring(0, 8) + '...');
  }

  private async initializeDeviceName() {
    // Pre-fetch device name
    await this.getDeviceName();
  }

  private generateRandomId(): string {
    // Generate a cryptographically strong random component
    const array = new Uint8Array(32); // 256 bits of randomness
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private hashString(str: string): string {
    // Simple hash function (for production, consider using crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16) + this.generateRandomId();
  }

  /**
   * Reset device ID (for testing or privacy reset)
   */
  resetDeviceId(): void {
    localStorage.removeItem(this.DEVICE_ID_KEY);
    this.deviceId = null;
    this.initializeDeviceId();
    console.log('[DeviceIdService] Device ID reset');
  }
}
