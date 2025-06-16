export interface RegistrationFinishResponse {
    success: boolean;
    message: string;
    jwtToken?: string; // Make optional as it's only on success
    userId?: number;   // Or string
    email?: string;
  }