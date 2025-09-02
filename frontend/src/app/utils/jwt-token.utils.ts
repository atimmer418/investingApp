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
      
      console.log('JWT stored with expiration:', new Date(payload.exp * 1000));
    } else {
      console.error('Failed to decode JWT, storing token only');
      localStorage.setItem('jwtToken', token);
    }
  }

  /**
   * Check if stored JWT is expired (client-side check)
   */
  static isJwtExpired(): boolean {
    const token = localStorage.getItem('jwtToken');
    const expiration = localStorage.getItem('jwtExpiration');
    
    if (!token || !expiration) {
      return true; // No token or expiration info = expired
    }

    const expirationTime = parseInt(expiration) * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    // Add a 5-minute buffer to refresh before actual expiration
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return currentTime >= (expirationTime - bufferTime);
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
   * Clear all JWT-related data from localStorage
   */
  static clearJwtData(): void {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('jwtExpiration');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
  }

  /**
   * Get stored JWT token if it's not expired
   */
  static getValidJwtToken(): string | null {
    if (this.isJwtExpired()) {
      console.log('JWT token is expired, clearing data');
      this.clearJwtData();
      return null;
    }
    
    return localStorage.getItem('jwtToken');
  }
}
