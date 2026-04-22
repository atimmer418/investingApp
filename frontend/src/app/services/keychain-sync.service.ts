import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { environment } from '../../environments/environment';

/**
 * TypeScript interface for the native KeychainSyncPlugin.
 */
interface KeychainSyncPluginInterface {
  set(options: { key: string; value: string }): Promise<{ success: boolean }>;
  get(options: { key: string }): Promise<{ value: string | null }>;
  remove(options: { key: string }): Promise<{ success: boolean }>;
}

const KeychainSync = registerPlugin<KeychainSyncPluginInterface>('KeychainSync');

/**
 * Service for storing/retrieving tokens in the iCloud-synced Keychain.
 *
 * - Only operates on native iOS in production builds.
 * - On web or non-production, all methods are safe no-ops that return null/false.
 * - The stored token syncs via iCloud Keychain to all devices on the same Apple ID,
 *   allowing automatic passkey re-auth on new devices.
 */
@Injectable({
  providedIn: 'root'
})
export class KeychainSyncService {

  private readonly ACCOUNT_EMAIL_KEY = 'fred_account_email';

  /**
   * Whether iCloud Keychain sync is available on this platform.
   * Only true on native iOS in production builds.
   */
  get isAvailable(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  /**
   * Store the user's email in the iCloud-synced Keychain.
   * Called after successful authentication.
   */
  async storeAccountEmail(email: string): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      const result = await KeychainSync.set({
        key: this.ACCOUNT_EMAIL_KEY,
        value: email
      });
      console.log('[KeychainSync] Stored account email in iCloud Keychain');
      return result.success;
    } catch (error) {
      console.warn('[KeychainSync] Failed to store email:', error);
      return false;
    }
  }

  /**
   * Retrieve the stored account email from iCloud Keychain.
   * Returns null if no email is stored or if not on native iOS.
   */
  async getAccountEmail(): Promise<string | null> {
    if (!this.isAvailable) return null;

    try {
      const result = await KeychainSync.get({
        key: this.ACCOUNT_EMAIL_KEY
      });
      if (result.value) {
        console.log('[KeychainSync] Found account email in iCloud Keychain');
      }
      return result.value;
    } catch (error) {
      console.warn('[KeychainSync] Failed to read email:', error);
      return null;
    }
  }

  /**
   * Remove the stored account email (e.g., on explicit sign-out).
   */
  async clearAccountEmail(): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      const result = await KeychainSync.remove({
        key: this.ACCOUNT_EMAIL_KEY
      });
      console.log('[KeychainSync] Cleared account email from iCloud Keychain');
      return result.success;
    } catch (error) {
      console.warn('[KeychainSync] Failed to clear email:', error);
      return false;
    }
  }
}
