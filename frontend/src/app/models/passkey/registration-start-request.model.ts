export interface RegistrationStartRequest {
    email: string;
    temporaryUserId?: string; // Optional - from the Plaid flow
}