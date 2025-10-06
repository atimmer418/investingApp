import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DeviceIdService {
  private deviceId: string | null = null;
  private readonly DEVICE_ID_KEY = 'fred_device_id';

  constructor() {
    this.initializeDeviceId();
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

  private generateBrowserFingerprint(): string {
    const nav = navigator as any;
    
    // Collect device-specific characteristics
    const fingerprint = [
      nav.userAgent || '',
      nav.language || '',
      nav.languages?.join(',') || '',
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      screen.pixelDepth,
      new Date().getTimezoneOffset(),
      nav.platform || '',
      nav.cookieEnabled,
      nav.doNotTrack || '',
      nav.hardwareConcurrency || '', // CPU cores
      nav.deviceMemory || '',         // RAM (if available)
      // Add more device-specific characteristics
      screen.availWidth + 'x' + screen.availHeight,
      window.devicePixelRatio || '',
      nav.maxTouchPoints || '',       // Touch capabilities
    ].join('|');
    
    return fingerprint;
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
