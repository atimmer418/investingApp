// JWT token utilities for managing authentication tokens
export class JwtTokenUtils {
  
  /**
   * Decode JWT payload to extract expiration and other claims
   * Note: This only decodes, does not verify signature (that's done on backend)
   */
  static decodeJwtPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT payload:', error);
      return null;
    }
  }

  /**
   * Store JWT with expiration info in localStorage
   */
  static storeJwtToken(token: string, userId?: number, email?: string): void {
    const payload = this.decodeJwtPayload(token);
    
    if (payload) {
      localStorage.setItem('jwtToken', token);
      localStorage.setItem('jwtExpiration', payload.exp.toString()); // exp is Unix timestamp
      
      if (userId) localStorage.setItem('userId', userId.toString());
      if (email) localStorage.setItem('userEmail', email);
    } else {
      console.error('Failed to decode JWT, storing token only');
      localStorage.setItem('jwtToken', token);
    }
  }

  /**
   * Check if stored JWT is expired (client-side check).
   * This is a pure check — does NOT clear any data.
   */
  static isJwtExpired(): boolean {
    const token = localStorage.getItem('jwtToken');
    const expiration = localStorage.getItem('jwtExpiration');
    
    if (!token || !expiration) {
      return true; // No token or expiration info = expired
    }

    const expirationTime = parseInt(expiration) * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return currentTime >= expirationTime;
  }

  /**
   * Check if the token should be refreshed (within 30 minutes of expiry).
   * Returns true if the token is valid but will expire soon.
   * Using half the token lifetime (30 of 60 min) ensures any user
   * active past the halfway point gets a refresh, giving a consistent
   * minimum inactivity timeout of ~30 minutes.
   */
  static shouldRefreshToken(): boolean {
    if (this.isJwtExpired()) {
      return false; // Already expired, can't refresh
    }

    const minutesLeft = this.getMinutesUntilExpiration();
    return minutesLeft !== null && minutesLeft <= 30;
  }

  /**
   * Get time until token expires (in minutes)
   */
  static getMinutesUntilExpiration(): number | null {
    const expiration = localStorage.getItem('jwtExpiration');
    
    if (!expiration) {
      return null;
    }

    const expirationTime = parseInt(expiration) * 1000;
    const currentTime = Date.now();
    const minutesLeft = Math.floor((expirationTime - currentTime) / (1000 * 60));
    
    return minutesLeft > 0 ? minutesLeft : 0;
  }

  /**
   * Clear all JWT-related data from localStorage, including the step-up PIN
   * marker so a logged-out or switched user is never falsely gated.
   */
  static clearJwtData(): void {
    // Derive and clear the per-user step-up marker BEFORE removing userId,
    // since the marker key is scoped to the current userId.
    const userId = localStorage.getItem('userId');
    if (userId) {
      localStorage.removeItem(`stepUpEnabled:${userId}`);
    }
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('jwtExpiration');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
  }

  /**
   * Get stored JWT token if it's not expired.
   * Non-destructive: does NOT clear data if expired. Use clearJwtData() explicitly when needed.
   */
  static getValidJwtToken(): string | null {
    if (this.isJwtExpired()) {
      return null;
    }
    
    return localStorage.getItem('jwtToken');
  }
}
