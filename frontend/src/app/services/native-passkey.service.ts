import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativePasskeyPluginInterface {
  authenticate(options: {
    biometricOnly?: boolean;
    reason?: string;
    challenge?: string;
    rpId?: string;
    userVerification?: string;
    allowedCredentials?: Array<{ id: string }>;
  }): Promise<{
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle?: string;
    };
    type: string;
    clientExtensionResults: Record<string, any>;
  }>;
}

const NativePasskey = registerPlugin<NativePasskeyPluginInterface>('NativePasskey');

@Injectable({
  providedIn: 'root'
})
export class NativePasskeyService {

  get isAvailable(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  async verifyBiometric(reason = 'Unlock FRED'): Promise<{ verified: boolean }> {
    return NativePasskey.authenticate({ biometricOnly: true, reason }) as any;
  }

  async authenticate(options: {
    challenge: string;
    rpId: string;
    userVerification?: string;
    allowedCredentials?: Array<{ id: string }>;
  }): Promise<{
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle?: string;
    };
    type: string;
    clientExtensionResults: Record<string, any>;
  }> {
    return NativePasskey.authenticate(options);
  }
}
